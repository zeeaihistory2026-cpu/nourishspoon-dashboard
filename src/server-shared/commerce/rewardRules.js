const DEFAULT_REWARDS = {
  enabled: true,
  spend_per_point: 100,
  earn_points: 2,
  point_value: 1,
  minimum_redemption: 100,
  referral_points: 100,
  referrals_enabled: true,
  welcome_value: 150,
  welcome_type: "fixed",
  referral_minimum: 599,
  referral_valid_days: 30,
  referral_monthly_limit: 10,
  maximum_redemption_percent: 100,
  maximum_redemption_points: null,
  referral_ends_at: null,
  referral_requires_verified_phone: true,
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
    "earn_points",
    "welcome_value",
    "referral_minimum",
    "referral_valid_days",
    "referral_monthly_limit",
    "maximum_redemption_percent",
  ])
    if (
      !Number.isSafeInteger(value[key]) ||
      value[key] <
        (["referral_points", "welcome_value", "referral_minimum"].includes(key)
          ? 0
          : 1) ||
      value[key] > 100000
    )
      throw Error("Check reward rates.");
  if (
    !["fixed", "percent"].includes(value.welcome_type) ||
    (value.welcome_type === "percent" && value.welcome_value > 100) ||
    value.maximum_redemption_percent > 100 ||
    (value.maximum_redemption_points !== null &&
      (!Number.isSafeInteger(value.maximum_redemption_points) ||
        value.maximum_redemption_points < 1)) ||
    (value.referral_ends_at &&
      !Number.isFinite(Date.parse(value.referral_ends_at)))
  )
    throw Error("Check referral and redemption limits.");
  return {
    ...value,
    enabled: value.enabled === true,
    referrals_enabled: value.referrals_enabled === true,
    // Phone ownership is a launch requirement, not a client-editable bypass.
    referral_requires_verified_phone: true,
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
  if (
    raw.starts_at &&
    (!Number.isFinite(Date.parse(raw.starts_at)) ||
      (expiry && Date.parse(raw.starts_at) >= Date.parse(expiry)))
  )
    throw Error("Check promo start date.");
  for (const key of ["usage_limit", "usage_limit_per_user"])
    if (raw[key] != null && (!Number.isSafeInteger(raw[key]) || raw[key] < 1))
      throw Error("Check promo usage limits.");
  return {
    code,
    active: raw.active === true,
    type: raw.type,
    value: raw.value,
    minimum_spend: min,
    maximum_discount: cap,
    expires_at: expiry,
    starts_at: raw.starts_at || null,
    usage_limit: raw.usage_limit ?? null,
    usage_limit_per_user: raw.usage_limit_per_user ?? null,
    new_users_only: raw.new_users_only === true,
  };
}
function benefitInput(input = {}) {
  if (
    input.benefit != null &&
    (typeof input.benefit !== "object" || Array.isArray(input.benefit))
  )
    throw Error("Choose a valid benefit.");
  if (
    (input.benefit_type &&
      input.benefit?.type &&
      input.benefit_type !== input.benefit.type) ||
    (input.promo_code &&
      input.benefit?.code &&
      promoCode(input.promo_code) !== promoCode(input.benefit.code)) ||
    (input.reward_points != null &&
      input.benefit?.points != null &&
      input.reward_points !== input.benefit.points)
  )
    throw Error(
      "Use only one benefit per order: promo, referral reward or points.",
    );
  const promo = promoCode(input.promo_code || input.benefit?.code);
  const points = input.reward_points ?? input.benefit?.points ?? 0;
  const type =
    input.benefit?.type ??
    input.benefit_type ??
    (promo ? "PROMO" : points ? "POINTS" : "NONE");
  if (
    !["NONE", "PROMO", "REFERRAL", "POINTS"].includes(type) ||
    !Number.isSafeInteger(points) ||
    points < 0 ||
    (promo && type !== "PROMO") ||
    (points && type !== "POINTS") ||
    (type === "PROMO" && !promo) ||
    (type === "POINTS" && !points)
  )
    throw Error(
      "Use only one benefit per order: promo, referral reward or points.",
    );
  return { type, promo, points };
}
function purchasePoints(subtotal, discount, config, refunded = 0) {
  const value = Math.max(0, subtotal - discount - refunded);
  return config.enabled
    ? Math.floor((value * config.earn_points) / config.spend_per_point)
    : 0;
}
function referralData(raw, config) {
  if (!raw) return null;
  return {
    welcome_reward_type: config.welcome_type,
    welcome_reward_value: config.welcome_value,
    minimum_order_value: config.referral_minimum,
    reward_points: config.referral_points,
    monthly_limit: config.referral_monthly_limit,
    expires_at: new Date(
      (Date.parse(raw.createdAt) || Date.now()) +
        config.referral_valid_days * 86400000,
    ).toISOString(),
    ...raw,
  };
}
function referralView(raw, config, now = Date.now()) {
  const referral = referralData(raw, config);
  if (!referral) return null;
  const expired = Date.parse(referral.expires_at) <= now;
  return {
    ...referral,
    status:
      expired && referral.status === "pending" ? "expired" : referral.status,
    welcome_status:
      expired &&
      !["used", "reserved", "expired_first_order"].includes(
        referral.welcome_status,
      )
        ? "expired_date"
        : referral.welcome_status ||
          (["completed", "rewarded", "reversed"].includes(referral.status)
            ? "expired_first_order"
            : "available"),
  };
}
function referralMonth(now = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date(now));
  return `${parts.find((part) => part.type === "year").value}-${parts.find((part) => part.type === "month").value}`;
}
function phoneHash(phone) {
  if (typeof phone !== "string" || !/^\+[1-9]\d{7,14}$/.test(phone)) return "";
  return require("node:crypto")
    .createHash("sha256")
    .update(phone)
    .digest("hex");
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
  if (coupon && requestedPoints)
    throw Error(
      "Use only one benefit per order: promo, referral reward or points.",
    );
  let promo_discount = 0;
  if (coupon) {
    const p = promoConfig(coupon);
    if (
      !p.active ||
      (p.starts_at && Date.parse(p.starts_at) > now) ||
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
    reward_discount > subtotal - promo_discount ||
    reward_discount >
      Math.floor((subtotal * rules.maximum_redemption_percent) / 100) ||
    (rules.maximum_redemption_points !== null &&
      requestedPoints > rules.maximum_redemption_points)
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
  benefitInput,
  purchasePoints,
  referralMonth,
  phoneHash,
  referralData,
  referralView,
};
