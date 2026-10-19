const DEFAULT_REWARDS = {
  enabled: true,
  spend_per_point: 100,
  point_value: 1,
  minimum_redemption: 100,
  referral_points: 200,
  referrals_enabled: true,
};
const DEFAULT_PROMO = {
  code: "PROMO10",
  active: true,
  type: "percent",
  value: 10,
  minimum_spend: 0,
  maximum_discount: null,
  expires_at: null,
};
function rewardsConfig(raw = {}) {
  const value = { ...DEFAULT_REWARDS, ...raw };
  for (const key of [
    "spend_per_point",
    "point_value",
    "minimum_redemption",
    "referral_points",
  ])
    if (
      !Number.isSafeInteger(value[key]) ||
      value[key] < (key === "referral_points" ? 0 : 1) ||
      value[key] > 100000
    )
      throw Error("Check reward rates.");
  return {
    ...value,
    enabled: value.enabled === true,
    referrals_enabled: value.referrals_enabled === true,
  };
}
function promoCode(value) {
  if (!value) return "";
  if (
    typeof value !== "string" ||
    !/^[A-Z0-9_-]{4,24}$/.test(value.trim().toUpperCase())
  )
    throw Error("Enter a valid promo code.");
  return value.trim().toUpperCase();
}
function promoConfig(raw) {
  const code = promoCode(raw.code);
  if (
    !code ||
    !["percent", "fixed"].includes(raw.type) ||
    !Number.isSafeInteger(raw.value) ||
    raw.value < 1 ||
    (raw.type === "percent" && raw.value > 100)
  )
    throw Error("Check promo code and discount.");
  const min = raw.minimum_spend ?? 0,
    cap = raw.maximum_discount ?? null;
  if (
    !Number.isSafeInteger(min) ||
    min < 0 ||
    (cap !== null && (!Number.isSafeInteger(cap) || cap < 1))
  )
    throw Error("Check promo limits.");
  const expiry = raw.expires_at || null;
  if (expiry && !Number.isFinite(Date.parse(expiry)))
    throw Error("Check promo expiry.");
  return {
    code,
    active: raw.active === true,
    type: raw.type,
    value: raw.value,
    minimum_spend: min,
    maximum_discount: cap,
    expires_at: expiry,
  };
}
function savings(
  subtotal,
  coupon,
  requestedPoints = 0,
  balance = 0,
  config = DEFAULT_REWARDS,
  now = Date.now(),
) {
  if (!Number.isSafeInteger(subtotal) || subtotal < 1)
    throw Error("Check order subtotal.");
  let promo_discount = 0;
  if (coupon) {
    const p = promoConfig(coupon);
    if (
      !p.active ||
      (p.expires_at && Date.parse(p.expires_at) <= now) ||
      subtotal < p.minimum_spend
    )
      throw Error("This promo code is unavailable for this order.");
    promo_discount = Math.min(
      subtotal,
      p.type === "percent" ? Math.floor((subtotal * p.value) / 100) : p.value,
      p.maximum_discount ?? subtotal,
    );
  }
  const rules = rewardsConfig(config);
  if (!Number.isSafeInteger(requestedPoints) || requestedPoints < 0)
    throw Error("Enter a valid number of points.");
  if (
    requestedPoints &&
    (!rules.enabled ||
      requestedPoints < rules.minimum_redemption ||
      requestedPoints > balance)
  )
    throw Error("Check your available points and minimum redemption.");
  const reward_discount = requestedPoints * rules.point_value;
  if (
    !Number.isSafeInteger(reward_discount) ||
    reward_discount > subtotal - promo_discount
  )
    throw Error("Points cannot exceed the remaining product total.");
  return {
    promo_discount,
    reward_discount,
    discount: promo_discount + reward_discount,
    points_redeemed: requestedPoints,
  };
}
module.exports = {
  DEFAULT_REWARDS,
  DEFAULT_PROMO,
  rewardsConfig,
  promoCode,
  promoConfig,
  savings,
};
