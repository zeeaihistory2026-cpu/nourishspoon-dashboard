const rules = require("./rewardRules");
const {
  createLoyaltyEngine,
  emptyWallet,
  codeFor,
} = require("./loyaltyEngine");
module.exports = function rewardsServices({
  db,
  auth,
  callable,
  signedIn,
  owner,
}) {
  const engine = createLoyaltyEngine({ db, auth });
  const { walletRef, referralRef, getAccount, notify } = engine;
  async function getHistory(uid, cursor) {
    let query = walletRef(uid)
      .collection("history")
      .orderBy("created_at", "desc");
    if (cursor) {
      if (
        typeof cursor !== "string" ||
        cursor.length > 160 ||
        cursor.includes("/")
      )
        throw Error("Invalid history cursor.");
      const previous = await walletRef(uid)
        .collection("history")
        .doc(cursor)
        .get();
      if (!previous.exists)
        throw Error("Refresh your points history and try again.");
      query = query.startAfter(previous);
    }
    const result = await query.limit(31).get();
    const documents = result.docs.slice(0, 30);
    return {
      items: documents.map((doc) => ({ id: doc.id, ...doc.data() })),
      has_more: result.size > 30,
      cursor: documents.at(-1)?.id || "",
    };
  }
  const getRewards = callable(async (request) => {
    const uid = signedIn(request),
      reference = walletRef(uid),
      codeRef = db.doc(`referralCodes/${codeFor(uid)}`);
    const accountRequest = db.runTransaction(async (tx) => {
      const [snapshot, code] = await Promise.all([
        tx.get(reference),
        tx.get(codeRef),
      ]);
      if (code.exists && code.data().uid !== uid)
        throw Error("Referral code unavailable. Contact our team.");
      const wallet = { ...emptyWallet(uid), ...snapshot.data() };
      if (!snapshot.exists) tx.set(reference, wallet);
      if (!code.exists) tx.set(codeRef, { uid });
      return wallet;
    });
    const [
      wallet,
      settings,
      history,
      program,
      relationDoc,
      outgoing,
      user,
      prior,
    ] = await Promise.all([
      accountRequest,
      db.doc("settings/rewards").get(),
      getHistory(uid),
      db.doc("appConfig/referral").get(),
      referralRef(uid).get(),
      db.collection("referrals").where("referrerId", "==", uid).get(),
      getAccount(uid),
      db.collection("orders").where("customer_uid", "==", uid).limit(1).get(),
    ]);
    const config = rules.rewardsConfig(settings.data());
    const viewed = rules.referralView(relationDoc.data(), config);
    const referral = viewed ? { ...viewed, id: uid } : null;
    const referrals = outgoing.docs
      .map((doc) => {
        const item = rules.referralView(doc.data(), config);
        return {
          id: doc.id,
          code: item.code,
          status: item.status,
          rewardAmount: item.rewardAmount || 0,
          createdAt: item.createdAt,
        };
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return {
      ...wallet,
      config,
      verified_phone: !!rules.phoneHash(user.phoneNumber),
      can_attach_referral:
        !wallet.referred_by && !wallet.has_delivered_order && prior.empty,
      referral,
      referrals,
      history: history.items,
      history_has_more: history.has_more,
      history_cursor: history.cursor,
      referral_program: {
        headline: program.data()?.headline || "",
        copy: program.data()?.copy || "",
        terms: program.data()?.terms || "",
      },
      referral_summary: {
        joined: referrals.length,
        completed: referrals.filter((item) =>
          ["completed", "rewarded"].includes(item.status),
        ).length,
        pending: referrals.filter((item) =>
          ["pending", "qualified"].includes(item.status),
        ).length,
        points_earned: referrals
          .filter((item) => ["completed", "rewarded"].includes(item.status))
          .reduce((sum, item) => sum + (item.rewardAmount || 0), 0),
      },
    };
  });
  const applyReferral = callable(async (request) => {
    const uid = signedIn(request),
      customer = await getAccount(uid);
    if (
      customer.disabled ||
      (request.auth.token.email_verified !== true && !customer.phoneNumber)
    )
      throw Error("Verify your email or phone before adding a referral.");
    const code = rules.promoCode(
      request.data.code || request.data.referral_code,
    );
    if (!code) throw Error("Enter your friend’s referral code.");
    return db.runTransaction(async (tx) => {
      const [referralCode, walletDoc, orders, configDoc, existing] =
        await Promise.all([
          tx.get(db.doc(`referralCodes/${code}`)),
          tx.get(walletRef(uid)),
          tx.get(
            db.collection("orders").where("customer_uid", "==", uid).limit(1),
          ),
          tx.get(db.doc("settings/rewards")),
          tx.get(referralRef(uid)),
        ]);
      const config = rules.rewardsConfig(configDoc.data()),
        wallet = { ...emptyWallet(uid), ...walletDoc.data() };
      if (
        !config.enabled ||
        !config.referrals_enabled ||
        (config.referral_ends_at &&
          Date.parse(config.referral_ends_at) <= Date.now())
      )
        throw Error("The referral program is paused or expired.");
      if (!referralCode.exists || referralCode.data().uid === uid)
        throw Error("Enter a valid referral code from another customer.");
      if (
        wallet.referred_by ||
        wallet.has_delivered_order ||
        !orders.empty ||
        existing.exists
      )
        throw Error("Add a referral once, before your first order.");
      const referrerId = referralCode.data().uid,
        referrer = await getAccount(referrerId);
      if (
        referrer.disabled ||
        (customer.phoneNumber && customer.phoneNumber === referrer.phoneNumber)
      )
        throw Error(
          "This referral is unavailable or belongs to the same customer.",
        );
      const now = new Date().toISOString(),
        expires = new Date(
          Date.now() + config.referral_valid_days * 86400000,
        ).toISOString();
      const expires_at =
        config.referral_ends_at && Date.parse(config.referral_ends_at) < Date.parse(expires)
          ? config.referral_ends_at
          : expires;
      tx.set(walletRef(uid), {
        ...wallet,
        referred_by: referrerId,
        referral_attached_at: now,
      });
      tx.set(referralRef(uid), {
        referrerId,
        referredId: uid,
        code,
        status: "pending",
        welcome_status: "available",
        welcome_reward_type: config.welcome_type,
        welcome_reward_value: config.welcome_value,
        minimum_order_value: config.referral_minimum,
        reward_points: config.referral_points,
        monthly_limit: config.referral_monthly_limit,
        rewardAmount: 0,
        expires_at,
        createdAt: now,
        updatedAt: now,
      });
      tx.set(
        db.doc(`users/${uid}`),
        { referred_by_user_id: referrerId, referral_attached_at: now },
        { merge: true },
      );
      notify(
        tx,
        uid,
        `referral-attached-${uid}`,
        "Referral applied",
        `You unlocked ${config.welcome_type === "fixed" ? "Rs. " : ""}${config.welcome_value}${config.welcome_type === "percent" ? "%" : ""} off your first qualifying order. Verify your phone to use it.`,
      );
      notify(
        tx,
        referrerId,
        `friend-joined-${uid}`,
        "Your friend joined",
        `You will receive ${config.referral_points} points after their first qualifying delivered order.`,
      );
      return {
        applied: true,
        reward: {
          type: config.welcome_type,
          value: config.welcome_value,
          minimum_order: config.referral_minimum,
          expires_at,
        },
      };
    });
  });
  const quoteOrder = callable(async (request) => {
    const uid = signedIn(request),
      input = request.data;
    if (
      !Array.isArray(input.items) ||
      !input.items.length ||
      input.items.length > 10
    )
      throw Error("Choose between 1 and 10 items.");
    const ids = [...new Set(input.items.map((item) => item?.product_id))];
    if (
      ids.some(
        (id) => typeof id !== "string" || !/^[A-Za-z0-9_-]{1,160}$/.test(id),
      )
    )
      throw Error("An item is no longer available.");
    return db.runTransaction(
      async (tx) => {
        const documents = await tx.getAll(
          ...ids.map((id) => db.doc(`products/${id}`)),
        );
        const normalize = require("../lib/normalizeProduct").normalizeProduct;
        const priced = require("./domain").priceOrder(
          input.items,
          documents
            .filter((doc) => doc.exists)
            .map((doc) => normalize(doc.id, doc.data())),
          {},
          input.delivery_method,
        );
        const quoted = await engine.checkout(tx, uid, input, priced);
        return { ...priced, ...quoted.result };
      },
      { readOnly: true },
    );
  });
  const saveRewardsSettings = callable(async (request) => {
    owner(request);
    const config = rules.rewardsConfig(request.data);
    await db.runTransaction(async (tx) => {
      const ref = db.doc("settings/rewards"),
        previous = await tx.get(ref);
      tx.set(ref, config);
      tx.create(db.collection("rewardAudit").doc(), {
        action: "settings",
        by: request.auth.uid,
        reason: String(request.data.reason || "Update rewards configuration"),
        before: previous.data() || {},
        after: config,
        at: new Date().toISOString(),
      });
    });
    return config;
  });
  const savePromoCode = callable(async (request) => {
    owner(request);
    const coupon = rules.promoConfig(request.data);
    await db.runTransaction(async (tx) => {
      const ref = db.doc(`promoCodes/${coupon.code}`),
        previous = await tx.get(ref);
      tx.set(ref, coupon, { merge: true });
      tx.create(db.collection("rewardAudit").doc(), {
        action: "promo_settings",
        by: request.auth.uid,
        reason: String(request.data.reason || "Update promo configuration"),
        before: previous.data() || {},
        after: coupon,
        at: new Date().toISOString(),
      });
    });
    return coupon;
  });
  return {
    checkout: engine.checkout,
    settlement: engine.settlement,
    getRewards,
    applyReferral,
    quoteOrder,
    getRewardsHistory: callable((request) =>
      getHistory(signedIn(request), request.data.cursor),
    ),
    saveRewardsSettings,
    savePromoCode,
  };
};
