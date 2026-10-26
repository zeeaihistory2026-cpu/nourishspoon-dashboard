const { createHash } = require("node:crypto");
const rules = require("./rewardRules");
const { deliveryCharge } = require("../lib/delivery");

const codeFor = (uid) =>
  `NS${createHash("sha256").update(uid).digest("hex").slice(0, 10).toUpperCase()}`;
const emptyWallet = (uid) => ({
  uid,
  balance: 0,
  pending_points: 0,
  lifetime_earned: 0,
  lifetime_redeemed: 0,
  lifetime_expired: 0,
  referral_code: codeFor(uid),
  referred_by: "",
  referral_paid: false,
  has_delivered_order: false,
});
const walletData = (uid, snapshot) => ({
  ...emptyWallet(uid),
  ...snapshot?.data(),
});
const terminalReferral = (referral) =>
  ["completed", "rewarded", "reversed", "rejected"].includes(referral?.status);

function createLoyaltyEngine({ db, auth }) {
  const walletRef = (uid) => db.doc(`rewardWallets/${uid}`);
  const referralRef = (uid) => db.doc(`referrals/${uid}`);
  const ledger = (
    tx,
    uid,
    id,
    points,
    type,
    title,
    orderId,
    before,
    after,
    extra = {},
  ) =>
    tx.create(db.doc(`rewardWallets/${uid}/history/${id}`), {
      points,
      transaction_type: type,
      reference_type: type.startsWith("REFERRAL") ? "REFERRAL" : "ORDER",
      reference_id: type.startsWith("REFERRAL")
        ? extra.referral_id || orderId
        : orderId,
      title,
      order_id: orderId,
      before,
      after,
      status: "completed",
      created_at: new Date().toISOString(),
      ...extra,
    });
  const notify = (tx, uid, id, title, body, orderId = "") =>
    tx.set(db.doc(`users/${uid}/notifications/${id}`), {
      title,
      body,
      order_id: orderId,
      created_at: new Date().toISOString(),
      read: false,
    });
  const getAccount = async (uid) => {
    if (!auth)
      throw Error("Account verification is unavailable. Please try again.");
    try {
      return await auth.getUser(uid);
    } catch {
      throw Error("This referral account is unavailable.");
    }
  };

  async function checkout(tx, uid, input, priced) {
    const selected = rules.benefitInput(input);
    const [
      walletDoc,
      settingsDoc,
      relationDoc,
      userDoc,
      priorOrders,
      couponDoc,
    ] = await Promise.all([
      tx.get(walletRef(uid)),
      tx.get(db.doc("settings/rewards")),
      tx.get(referralRef(uid)),
      tx.get(db.doc(`users/${uid}`)),
      tx.get(db.collection("orders").where("customer_uid", "==", uid).limit(1)),
      selected.promo
        ? tx.get(db.doc(`promoCodes/${selected.promo}`))
        : Promise.resolve(null),
    ]);
    const config = rules.rewardsConfig(settingsDoc.data());
    const wallet = walletData(uid, walletDoc),
      relation = rules.referralData(relationDoc.data(), config);
    const coupon = selected.promo
      ? couponDoc.exists
        ? couponDoc.data()
        : selected.promo === "PROMO10"
          ? rules.DEFAULT_PROMO
          : null
      : null;
    if (selected.promo && !coupon)
      throw Error("This promo code is unavailable for this order.");
    let usageRef, usageDoc;
    if (coupon) {
      usageRef = db.doc(`promoCodes/${selected.promo}/users/${uid}`);
      usageDoc = await tx.get(usageRef);
      const normalized = rules.promoConfig(coupon);
      if (
        (normalized.usage_limit !== null &&
          (coupon.usage_count || 0) >= normalized.usage_limit) ||
        (normalized.usage_limit_per_user !== null &&
          (usageDoc.data()?.count || 0) >= normalized.usage_limit_per_user) ||
        (normalized.new_users_only &&
          (!priorOrders.empty || userDoc.data()?.has_order))
      )
        throw Error(
          "This promo code has reached its limit or is for new customers only.",
        );
    }
    let result = rules.savings(
      priced.subtotal,
      coupon,
      selected.points,
      wallet.balance,
      config,
    );
    let phoneRef,
      phoneClaim,
      phoneKey = "";
    const now = Date.now();
    const attributionEligible =
      relation &&
      !terminalReferral(relation) &&
      config.referrals_enabled &&
      config.enabled &&
      now <= Date.parse(relation.expires_at || "9999-01-01") &&
      (!config.referral_ends_at ||
        now <= Date.parse(config.referral_ends_at)) &&
      priced.subtotal >=
        (relation.minimum_order_value ?? config.referral_minimum);
    if (selected.type === "REFERRAL") {
      if (
        !attributionEligible ||
        wallet.has_delivered_order ||
        (relation.welcome_status &&
          !["available", "restored"].includes(relation.welcome_status))
      )
        throw Error(
          "Your referral welcome reward is unavailable, reserved, used or expired.",
        );
      const [customer, referrer] = await Promise.all([
        getAccount(uid),
        getAccount(relation.referrerId),
      ]);
      if (customer.disabled || referrer.disabled)
        throw Error("This referral account is unavailable.");
      phoneKey = rules.phoneHash(customer.phoneNumber);
      if (!phoneKey)
        throw Error(
          "Verify your phone number before using the referral welcome reward.",
        );
      if (customer.phoneNumber === referrer.phoneNumber)
        throw Error("Self-referrals are not allowed.");
      phoneRef = db.doc(`welcomePhoneClaims/${phoneKey}`);
      phoneClaim = await tx.get(phoneRef);
      const claim = phoneClaim.data();
      if (claim && (claim.uid !== uid || claim.status !== "restored"))
        throw Error(
          "This verified phone has already claimed a welcome reward.",
        );
      const value = relation.welcome_reward_value ?? config.welcome_value;
      const discount = Math.min(
        priced.subtotal,
        (relation.welcome_reward_type ?? config.welcome_type) === "percent"
          ? Math.floor((priced.subtotal * value) / 100)
          : value,
      );
      result = { ...result, referral_discount: discount, discount };
    }
    const delivery_fee = deliveryCharge(
      priced.subtotal - result.discount,
      input.delivery_method,
    );
    const type = result.discount ? selected.type : "NONE";
    const orderBenefit = {
      type,
      source_id:
        type === "PROMO"
          ? selected.promo
          : type === "REFERRAL"
            ? uid
            : type === "POINTS"
              ? "wallet"
              : "",
      discount_amount: result.discount,
    };
    return {
      result: {
        ...result,
        referral_discount: result.referral_discount || 0,
        benefit_type: type,
        order_benefit: orderBenefit,
        promo_code: selected.promo,
        reward_rates: config,
        referral_id: relation ? uid : "",
        welcome_phone_hash: phoneKey,
        delivery_fee,
        quote_pending: false,
        total: priced.subtotal - result.discount + delivery_fee,
      },
      apply(orderId) {
        if (selected.points) {
          const after = wallet.balance - selected.points;
          tx.set(walletRef(uid), {
            ...wallet,
            balance: after,
            lifetime_redeemed: wallet.lifetime_redeemed + selected.points,
          });
          ledger(
            tx,
            uid,
            `${orderId}-redeem`,
            -selected.points,
            "REDEMPTION",
            "Nourish Points redeemed",
            orderId,
            wallet.balance,
            after,
          );
        }
        if (coupon) {
          tx.set(
            db.doc(`promoCodes/${selected.promo}`),
            {
              ...coupon,
              ...rules.promoConfig(coupon),
              usage_count: (coupon.usage_count || 0) + 1,
            },
            { merge: true },
          );
          tx.set(usageRef, { count: (usageDoc.data()?.count || 0) + 1 });
        }
        if (attributionEligible)
          tx.set(
            referralRef(uid),
            {
              status: "qualified",
              updatedAt: new Date().toISOString(),
              ...(selected.type === "REFERRAL"
                ? {
                    welcome_status: "reserved",
                    welcome_order_id: orderId,
                    welcome_phone_hash: phoneKey,
                  }
                : {}),
            },
            { merge: true },
          );
        if (phoneRef)
          tx.set(phoneRef, {
            uid,
            order_id: orderId,
            status: "reserved",
            created_at: new Date().toISOString(),
          });
      },
    };
  }

  async function settlement(tx, orderId, before, patch) {
    const uid = before.customer_uid,
      after = { ...before, ...patch },
      now = new Date().toISOString();
    const [walletDoc, configDoc, relationDoc] = await Promise.all([
      tx.get(walletRef(uid)),
      tx.get(db.doc("settings/rewards")),
      tx.get(referralRef(uid)),
    ]);
    const wallet = walletData(uid, walletDoc);
    const config = rules.rewardsConfig(before.reward_rates || configDoc.data());
    // Old orders retained one-point earning; new orders snapshot the explicit rate.
    if (before.reward_rates && before.reward_rates.earn_points === undefined)
      config.earn_points = 1;
    const relation = rules.referralData(relationDoc.data(), config);
    const successful =
      after.status === "delivered" && after.payment_status === "paid";
    const fullRefund =
      after.payment_status === "refunded" || after.status === "cancelled";
    const refundedSpend = fullRefund
      ? Math.max(0, before.subtotal - before.discount)
      : after.refunded_eligible_spend || 0;
    const originalEarned = before.points_earned || 0;
    const targetEarned = Math.min(
      before.rewards_settled ? originalEarned : Infinity,
      rules.purchasePoints(
        before.subtotal,
        before.discount,
        config,
        refundedSpend,
      ),
    );
    const earned = successful && !before.rewards_settled ? targetEarned : 0;
    const reverseEarned =
      before.rewards_settled && !before.rewards_reversed
        ? Math.max(
            0,
            originalEarned - targetEarned - (before.points_earn_reversed || 0),
          )
        : 0;
    const restore =
      fullRefund && !before.rewards_reversed ? before.points_redeemed || 0 : 0;
    const referrerUid =
      before.reward_referrer || relation?.referrerId || wallet.referred_by;
    const qualifyingDelivery =
      successful &&
      relation &&
      !terminalReferral(relation) &&
      !wallet.referral_paid &&
      config.enabled &&
      config.referrals_enabled &&
      before.subtotal >=
        (relation.minimum_order_value ?? config.referral_minimum) &&
      Date.parse(before.created_at) <=
        Date.parse(relation.expires_at || "9999-01-01") &&
      (!relation.orderId || relation.orderId === orderId);
    const canComplete = qualifyingDelivery && !relation.review_required;
    const reverseBonus =
      fullRefund && !before.rewards_reversed
        ? Math.max(
            0,
            (before.referral_bonus || 0) -
              (before.referral_bonus_reversed || 0),
          )
        : 0;
    let referrerDoc, monthDoc, referrerAccount, bonusEntry;
    const month = rules.referralMonth();
    const monthRef = referrerUid
      ? db.doc(`referralMonthly/${referrerUid}/months/${month}`)
      : null;
    if (referrerUid && (canComplete || reverseBonus)) {
      [referrerDoc, monthDoc, bonusEntry] = await Promise.all([
        tx.get(walletRef(referrerUid)),
        tx.get(monthRef),
        tx.get(db.doc(`rewardWallets/${referrerUid}/history/referral-${uid}`)),
      ]);
      if (canComplete)
        referrerAccount = await getAccount(referrerUid).catch(() => ({
          disabled: true,
        }));
    }
    const limit = relation?.monthly_limit ?? config.referral_monthly_limit;
    const monthCount = monthDoc?.data()?.count || 0;
    const issueReferral =
      canComplete &&
      !bonusEntry?.exists &&
      !referrerAccount.disabled &&
      monthCount < limit;
    const bonus = issueReferral ? relation.reward_points : 0;
    const phoneKey = before.welcome_phone_hash;
    const phoneRef = phoneKey ? db.doc(`welcomePhoneClaims/${phoneKey}`) : null;
    const phoneDoc = phoneRef ? await tx.get(phoneRef) : null;
    let couponRef, couponDoc, usageRef, usageDoc;
    if (fullRefund && !before.rewards_reversed && before.promo_code) {
      couponRef = db.doc(`promoCodes/${before.promo_code}`);
      usageRef = couponRef.collection("users").doc(uid);
      [couponDoc, usageDoc] = await Promise.all([
        tx.get(couponRef),
        tx.get(usageRef),
      ]);
    }
    return () => {
      let balance = wallet.balance;
      const walletPatch = { ...wallet };
      const adjust = (id, points, type, title) => {
        const previous = balance;
        balance += points;
        ledger(tx, uid, id, points, type, title, orderId, previous, balance);
      };
      if (successful && !before.rewards_settled) {
        if (earned)
          adjust(
            `${orderId}-earn`,
            earned,
            "ORDER_EARN",
            "Paid and delivered order",
          );
        Object.assign(walletPatch, {
          lifetime_earned: wallet.lifetime_earned + earned,
          has_delivered_order: true,
        });
        Object.assign(patch, {
          rewards_settled: true,
          points_earned: earned,
          points_earn_reversed: 0,
        });
        if (
          relation &&
          !["used", "expired_first_order", "expired_date"].includes(
            relation.welcome_status,
          ) &&
          relation.welcome_order_id !== orderId
        )
          tx.set(
            referralRef(uid),
            { welcome_status: "expired_first_order", updatedAt: now },
            { merge: true },
          );
      }
      if (issueReferral) {
        const referrer = walletData(referrerUid, referrerDoc);
        tx.set(walletRef(referrerUid), {
          ...referrer,
          balance: referrer.balance + bonus,
          lifetime_earned: referrer.lifetime_earned + bonus,
        });
        ledger(
          tx,
          referrerUid,
          `referral-${uid}`,
          bonus,
          "REFERRAL_EARN",
          "Friend’s qualifying delivery",
          orderId,
          referrer.balance,
          referrer.balance + bonus,
          { referral_id: uid },
        );
        tx.set(monthRef, { count: monthCount + 1, updated_at: now });
        tx.set(
          referralRef(uid),
          {
            status: "completed",
            rewardState: "",
            review_required: false,
            rewardAmount: bonus,
            reward_points: bonus,
            orderId,
            reward_given_at: now,
            rewarded_month: month,
            welcome_status:
              before.benefit_type === "REFERRAL"
                ? "used"
                : "expired_first_order",
            updatedAt: now,
          },
          { merge: true },
        );
        walletPatch.referral_paid = true;
        Object.assign(patch, {
          referral_bonus: bonus,
          reward_referrer: referrerUid,
        });
        notify(
          tx,
          referrerUid,
          `referral-${uid}`,
          "Referral completed",
          `You earned ${bonus} Nourish Points.`,
          orderId,
        );
      } else if (canComplete && !bonusEntry?.exists) {
        tx.set(
          referralRef(uid),
          {
            status: "qualified",
            orderId,
            rewardState: referrerAccount.disabled
              ? "account_disabled"
              : "monthly_limit",
            updatedAt: now,
          },
          { merge: true },
        );
      } else if (qualifyingDelivery && relation.review_required) {
        tx.set(
          referralRef(uid),
          {
            status: "qualified",
            orderId,
            rewardState: "fraud_review",
            updatedAt: now,
          },
          { merge: true },
        );
      }
      if (reverseEarned) {
        adjust(
          `${orderId}-earn-reverse-${refundedSpend}`,
          -reverseEarned,
          "REFUND_REVERSAL",
          "Refunded food spend points reversal",
        );
        patch.points_earn_reversed =
          (before.points_earn_reversed || 0) + reverseEarned;
      }
      if (restore) {
        adjust(
          `${orderId}-redeem-restore`,
          restore,
          "REDEMPTION_REVERSAL",
          "Cancelled or refunded redemption restored",
        );
        walletPatch.lifetime_redeemed = Math.max(
          0,
          wallet.lifetime_redeemed - restore,
        );
      }
      if (reverseBonus && referrerUid) {
        const referrer = walletData(referrerUid, referrerDoc);
        tx.set(walletRef(referrerUid), {
          ...referrer,
          balance: referrer.balance - reverseBonus,
        });
        ledger(
          tx,
          referrerUid,
          `${orderId}-referral-reverse`,
          -reverseBonus,
          "REFERRAL_REVERSAL",
          "Refunded referral reward reversal",
          orderId,
          referrer.balance,
          referrer.balance - reverseBonus,
          { referral_id: uid },
        );
        tx.set(
          referralRef(uid),
          { status: "reversed", updatedAt: now },
          { merge: true },
        );
        patch.referral_bonus_reversed =
          (before.referral_bonus_reversed || 0) + reverseBonus;
      }
      if (fullRefund && !before.rewards_reversed) {
        patch.rewards_reversed = true;
        if (couponDoc?.exists)
          tx.set(
            couponRef,
            {
              usage_count: Math.max(0, (couponDoc.data().usage_count || 0) - 1),
            },
            { merge: true },
          );
        if (usageDoc?.exists)
          tx.set(
            usageRef,
            { count: Math.max(0, (usageDoc.data().count || 0) - 1) },
            { merge: true },
          );
        if (relation?.welcome_order_id === orderId && !before.rewards_settled) {
          const available =
            !wallet.has_delivered_order &&
            Date.parse(relation.expires_at) > Date.now();
          tx.set(
            referralRef(uid),
            {
              status: available ? "pending" : "expired",
              welcome_status: available ? "restored" : "expired_date",
              welcome_order_id: "",
              updatedAt: now,
            },
            { merge: true },
          );
          if (phoneDoc?.data()?.order_id === orderId)
            tx.set(phoneRef, { status: "restored" }, { merge: true });
        }
      }
      if (successful && before.benefit_type === "REFERRAL") {
        tx.set(
          referralRef(uid),
          { welcome_status: "used", updatedAt: now },
          { merge: true },
        );
        if (phoneDoc?.data()?.order_id === orderId)
          tx.set(phoneRef, { status: "used" }, { merge: true });
      }
      if (successful || earned || reverseEarned || restore || bonus)
        tx.set(walletRef(uid), { ...walletPatch, balance });
    };
  }
  return { checkout, settlement, walletRef, referralRef, getAccount, notify };
}
module.exports = { createLoyaltyEngine, emptyWallet, codeFor };
