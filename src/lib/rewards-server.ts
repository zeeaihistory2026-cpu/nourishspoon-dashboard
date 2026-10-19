import "server-only";
import { createHash } from "node:crypto";
import rules from "../server-shared/commerce/rewardRules.js";
export { rules };
export function emptyWallet(uid: string) {
  return {
    uid,
    balance: 0,
    lifetime_earned: 0,
    referral_code:
      "NS" +
      createHash("sha256").update(uid).digest("hex").slice(0, 10).toUpperCase(),
    referred_by: "",
    referral_paid: false,
    has_delivered_order: false,
  };
}
