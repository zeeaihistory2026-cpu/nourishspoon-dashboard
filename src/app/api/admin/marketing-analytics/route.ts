import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { rules } from "@/lib/rewards-server";
export async function GET() {
  try {
    await requireAdmin();
    const db = adminDb();
    const [relations, accounts, purchases, settings] = await Promise.all([
      db.collection("referrals").get(),
      db.collection("rewardWallets").get(),
      db
        .collection("orders")
        .select(
          "customer_uid",
          "status",
          "payment_status",
          "total",
          "subtotal",
          "discount",
          "benefit_type",
          "promo_code",
          "reward_discount",
          "refunded_eligible_spend",
          "quote_pending",
        )
        .get(),
      db.doc("settings/rewards").get(),
    ]);
    const config = rules.rewardsConfig(settings.data());
    const referrals = relations.docs.map((doc) => rules.referralView(doc.data(), config)),
      wallets = accounts.docs.map((doc) => doc.data()),
      orders = purchases.docs.map((doc) => doc.data());
    const completed = referrals.filter((item) =>
      ["completed", "rewarded"].includes(item.status),
    );
    const byBenefit = [
      "NONE",
      "PROMO",
      "REFERRAL",
      "POINTS",
      "LEGACY_STACKED",
    ].map((type) => {
      const rows = orders.filter(
        (order) =>
          (order.benefit_type ||
            (order.promo_code && order.reward_discount
              ? "LEGACY_STACKED"
              : order.promo_code
                ? "PROMO"
                : order.reward_discount
                  ? "POINTS"
                  : "NONE")) === type,
      );
      const paid = rows.filter(
        (order) =>
          order.payment_status === "paid" && !order.quote_pending && Number.isSafeInteger(order.total) && order.total >= 0 && Number.isSafeInteger(order.refunded_eligible_spend || 0) && (order.refunded_eligible_spend || 0) >= 0 && (order.refunded_eligible_spend || 0) <= order.total,
      );
      const revenue = paid.reduce(
        (sum, order) =>
          sum + order.total - (order.refunded_eligible_spend || 0),
        0,
      );
      return {
        type,
        orders: rows.length,
        paid_orders: paid.length,
        revenue,
        average_order_value: paid.length
          ? Math.round(revenue / paid.length)
          : 0,
        discount_cost: paid.reduce(
          (sum, order) => sum + (order.discount || 0),
          0,
        ),
      };
    });
    return Response.json({
      referrals: {
        joined: referrals.length,
        pending: referrals.filter((item) =>
          ["pending", "qualified"].includes(item.status),
        ).length,
        completed: completed.length,
        review: referrals.filter(
          (item) => item.review_required || item.rewardState,
        ).length,
        conversion_rate: referrals.length
          ? Math.round((completed.length * 100) / referrals.length)
          : 0,
        referral_points_issued: completed.reduce(
          (sum, item) => sum + (item.rewardAmount || 0),
          0,
        ),
      },
      loyalty: {
        wallets: wallets.length,
        points_issued: wallets.reduce(
          (sum, item) => sum + (item.lifetime_earned || 0),
          0,
        ),
        points_redeemed: wallets.reduce(
          (sum, item) => sum + (item.lifetime_redeemed || 0),
          0,
        ),
        outstanding_points: wallets.reduce(
          (sum, item) => sum + Math.max(0, item.balance || 0),
          0,
        ),
        outstanding_value:
          wallets.reduce(
            (sum, item) => sum + Math.max(0, item.balance || 0),
            0,
          ) * config.point_value,
      },
      by_benefit: byBenefit,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
