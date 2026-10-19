const { createHash } = require("node:crypto");
const rules = require("./rewardRules");
module.exports = function rewardsServices({ db, callable, signedIn, owner }) {
  const walletRef = (uid) => db.doc(`rewardWallets/${uid}`);
  const codeFor = (uid) =>
    `NS${createHash("sha256").update(uid).digest("hex").slice(0, 10).toUpperCase()}`;
  const empty = (uid) => ({
    uid,
    balance: 0,
    lifetime_earned: 0,
    referral_code: codeFor(uid),
    referred_by: "",
    referral_paid: false,
    has_delivered_order: false,
  });
  const entry = (tx, uid, id, points, title, orderId) =>
    tx.set(db.doc(`rewardWallets/${uid}/history/${id}`), {
      points,
      title,
      order_id: orderId,
      created_at: new Date().toISOString(),
    });
  async function checkout(tx, uid, input, priced) {
    const code = rules.promoCode(input.promo_code);
    const [walletDoc, configDoc, couponDoc] = await Promise.all([
      tx.get(walletRef(uid)),
      tx.get(db.doc("settings/rewards")),
      code ? tx.get(db.doc(`promoCodes/${code}`)) : Promise.resolve(null),
    ]);
    const config = rules.rewardsConfig(configDoc.data());
    const wallet = walletDoc.data() || empty(uid);
    const coupon = code
      ? couponDoc.exists
        ? couponDoc.data()
        : code === "PROMO10"
          ? rules.DEFAULT_PROMO
          : null
      : null;
    if (code && !coupon)
      throw Error("This promo code is unavailable for this order.");
    const result = rules.savings(
      priced.subtotal,
      coupon,
      input.reward_points ?? 0,
      wallet.balance,
      config,
    );
    return {
      result: {
        ...result,
        promo_code: code,
        reward_rates: config,
        total: priced.total === null ? null : priced.total - result.discount,
      },
      apply(orderId) {
        if (!result.points_redeemed) return;
        tx.set(walletRef(uid), {
          ...wallet,
          balance: wallet.balance - result.points_redeemed,
        });
        entry(
          tx,
          uid,
          `${orderId}-redeem`,
          -result.points_redeemed,
          "Points used at checkout",
          orderId,
        );
      },
    };
  }
  async function settlement(tx, orderId, before, patch) {
    const after = { ...before, ...patch },
      uid = before.customer_uid;
    const [walletDoc, configDoc] = await Promise.all([
      tx.get(walletRef(uid)),
      tx.get(db.doc("settings/rewards")),
    ]);
    const wallet = walletDoc.data() || empty(uid),
      config = rules.rewardsConfig(before.reward_rates || configDoc.data());
    const qualifying =
      after.status === "delivered" && after.payment_status === "paid";
    const refund =
      (after.status === "cancelled" || after.payment_status === "refunded") &&
      !before.rewards_reversed;
    const earned =
      qualifying && !before.rewards_settled && config.enabled
        ? Math.floor(
            (before.subtotal - before.discount) / config.spend_per_point,
          )
        : 0;
    const referralEligible =
      qualifying &&
      !before.rewards_settled &&
      !wallet.has_delivered_order &&
      !wallet.referral_paid &&
      wallet.referred_by &&
      config.enabled &&
      before.subtotal > before.discount;
    const bonus = referralEligible ? config.referral_points : 0;
    const referrerUid = before.reward_referrer || wallet.referred_by;
    const referrerDoc =
      referrerUid && (bonus || (refund && before.referral_bonus))
        ? await tx.get(walletRef(referrerUid))
        : null;
    // All reads finish before either this closure or the stock update writes.
    return () => {
      if (qualifying && !before.rewards_settled) {
        const updates = {
          ...wallet,
          balance: wallet.balance + earned,
          lifetime_earned: wallet.lifetime_earned + earned,
          has_delivered_order: true,
          referral_paid: wallet.referral_paid || !!bonus,
        };
        tx.set(walletRef(uid), updates);
        if (earned)
          entry(
            tx,
            uid,
            `${orderId}-earn`,
            earned,
            "Paid and delivered order",
            orderId,
          );
        if (bonus) {
          const referrer = referrerDoc?.data() || empty(referrerUid);
          tx.set(walletRef(referrerUid), {
            ...referrer,
            balance: referrer.balance + bonus,
            lifetime_earned: referrer.lifetime_earned + bonus,
          });
          entry(
            tx,
            referrerUid,
            `${orderId}-referral`,
            bonus,
            "Friend’s first paid delivery",
            orderId,
          );
        }
        Object.assign(patch, {
          rewards_settled: true,
          points_earned: earned,
          referral_bonus: bonus,
          reward_referrer: bonus ? referrerUid : "",
        });
      }
      if (refund) {
        const restored = before.points_redeemed || 0,
          reversed = before.points_earned || 0;
        if (restored || reversed) {
          tx.set(walletRef(uid), {
            ...wallet,
            balance: wallet.balance + restored - reversed,
          });
          entry(
            tx,
            uid,
            `${orderId}-reverse`,
            restored - reversed,
            "Cancelled or refunded order adjustment",
            orderId,
          );
        }
        if (before.referral_bonus && referrerUid) {
          const referrer = referrerDoc?.data() || empty(referrerUid);
          tx.set(walletRef(referrerUid), {
            ...referrer,
            balance: referrer.balance - before.referral_bonus,
          });
          entry(
            tx,
            referrerUid,
            `${orderId}-referral-reverse`,
            -before.referral_bonus,
            "Refunded referral adjustment",
            orderId,
          );
        }
        Object.assign(patch, { rewards_reversed: true });
      }
    };
  }
  const getRewards = callable(async (request) => {
    const uid = signedIn(request),
      reference = walletRef(uid),
      codeRef = db.doc(`referralCodes/${codeFor(uid)}`);
    const account = await db.runTransaction(async (tx) => {
      const [snapshot, code] = await Promise.all([
        tx.get(reference),
        tx.get(codeRef),
      ]);
      if (code.exists && code.data().uid !== uid)
        throw Error("Referral code unavailable. Contact our team.");
      const wallet = snapshot.data() || empty(uid);
      if (!snapshot.exists) tx.set(reference, wallet);
      if (!code.exists) tx.set(codeRef, { uid });
      return wallet;
    });
    const [settings, history] = await Promise.all([
      db.doc("settings/rewards").get(),
      reference
        .collection("history")
        .orderBy("created_at", "desc")
        .limit(30)
        .get(),
    ]);
    return {
      ...account,
      config: rules.rewardsConfig(settings.data()),
      history: history.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    };
  });
  const applyReferral = callable(async (request) => {
    const uid = signedIn(request);
    if (request.auth.token.email_verified !== true)
      throw Error("Verify your email before adding a referral.");
    const code = rules.promoCode(request.data.code);
    if (!code) throw Error("Enter your friend’s referral code.");
    return db.runTransaction(async (tx) => {
      const [referral, walletDoc, orders] = await Promise.all([
        tx.get(db.doc(`referralCodes/${code}`)),
        tx.get(walletRef(uid)),
        tx.get(
          db.collection("orders").where("customer_uid", "==", uid).limit(1),
        ),
      ]);
      const wallet = walletDoc.data() || empty(uid);
      if (!referral.exists || referral.data().uid === uid)
        throw Error("Enter a valid referral code from another customer.");
      if (wallet.referred_by || wallet.has_delivered_order || !orders.empty)
        throw Error("Add a referral once, before your first order.");
      tx.set(walletRef(uid), { ...wallet, referred_by: referral.data().uid });
      return { applied: true };
    });
  });
  const quoteOrder = callable(async (request) => {
    const uid = signedIn(request);
    return db.runTransaction(async (tx) => {
      const [catalog, settings, customer] = await Promise.all([
        tx.get(db.collection("products")),
        tx.get(db.doc("settings/commerce")),
        tx.get(db.doc(`users/${uid}`)),
      ]);
      const normalize = require("../lib/normalizeProduct").normalizeProduct;
      const priced = require("./domain").priceOrder(
        request.data.items,
        catalog.docs.map((doc) => normalize(doc.id, doc.data())),
        settings.data() || {},
        request.data.delivery_method,
        !customer.data()?.has_order,
      );
      const quoted = await checkout(tx, uid, request.data, priced);
      return { ...priced, ...quoted.result };
    });
  });
  const saveRewardsSettings = callable(async (request) => {
    owner(request);
    const config = rules.rewardsConfig(request.data);
    await db.doc("settings/rewards").set(config);
    return config;
  });
  const savePromoCode = callable(async (request) => {
    owner(request);
    const coupon = rules.promoConfig(request.data);
    await db.doc(`promoCodes/${coupon.code}`).set(coupon);
    return coupon;
  });
  return {
    checkout,
    settlement,
    getRewards,
    applyReferral,
    quoteOrder,
    saveRewardsSettings,
    savePromoCode,
  };
};
