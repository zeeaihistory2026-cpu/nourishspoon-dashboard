import "server-only";
import { rules } from "./rewards-server";
import type { Data } from "./contracts";
export function offerView(code: string, raw: Data) {
  return {
    id: code,
    code,
    description: raw.description ?? "",
    discountType: raw.type,
    value: raw.value,
    isActive: raw.active === true,
    minSubtotal: raw.minimum_spend ?? 0,
    maximumDiscount: raw.maximum_discount ?? null,
    expiresAt: raw.expires_at ?? null,
    startsAt: raw.starts_at ?? null,
    usageLimit: raw.usage_limit ?? null,
    usageLimitPerUser: raw.usage_limit_per_user ?? null,
    newUsersOnly: raw.new_users_only === true,
    usageCount: raw.usage_count || 0,
  };
}
export function offerWrite(input: Data) {
  return {
    ...rules.promoConfig({
      code: input.code,
      active: input.isActive,
      type: input.discountType,
      value: input.value,
      minimum_spend: input.minSubtotal ?? 0,
      maximum_discount: input.maximumDiscount ?? null,
      expires_at: input.expiresAt || null,
      starts_at: input.startsAt || null,
      usage_limit: input.usageLimit ?? null,
      usage_limit_per_user: input.usageLimitPerUser ?? null,
      new_users_only: input.newUsersOnly === true,
    }),
    description: input.description ?? "",
  };
}
