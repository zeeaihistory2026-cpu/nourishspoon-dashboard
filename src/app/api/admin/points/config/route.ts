import {
  assertSameOrigin,
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

import { rules } from "@/lib/rewards-server";
import { z } from "zod";
const schema = z.object({
  spendPerPoint: z.number().int().min(1).max(100000),
  pointsPerUnit: z.number().int().min(1).max(100000).optional(),
  maximumRedemptionPercent: z.number().int().min(1).max(100).optional(),
  maximumRedemptionPoints: z.number().int().min(1).nullable().optional(),
  redeemValuePerPoint: z.number().int().min(1).max(100000),
  minRedeemPoints: z.number().int().min(1).max(100000),
  referralReward: z.number().int().min(0).max(100000),
  isActive: z.boolean(),
  notes: z.string().max(2000).default(""),
});
function view(value: ReturnType<typeof rules.rewardsConfig>, notes = "") {
  return {
    spendPerPoint: value.spend_per_point,
    pointsPerUnit: value.earn_points,
    maximumRedemptionPercent: value.maximum_redemption_percent,
    maximumRedemptionPoints: value.maximum_redemption_points,
    redeemValuePerPoint: value.point_value,
    minRedeemPoints: value.minimum_redemption,
    referralReward: value.referral_points,
    isActive: value.enabled,
    notes,
  };
}
export async function GET() {
  try {
    await requireAdmin();
    const db = adminDb();
    const [settings, notes] = await Promise.all([
      db.doc("settings/rewards").get(),
      db.doc("adminSettings/rewards").get(),
    ]);
    return Response.json({
      item: view(rules.rewardsConfig(settings.data()), notes.data()?.notes),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const input = schema.parse(await request.json());
    const db = adminDb();
    const config = await db.runTransaction(async (tx) => {
      const ref = db.doc("settings/rewards"),
        previous = await tx.get(ref);
      const value = rules.rewardsConfig({
        ...previous.data(),
        enabled: input.isActive,
        spend_per_point: input.spendPerPoint,
        point_value: input.redeemValuePerPoint,
        minimum_redemption: input.minRedeemPoints,
        referral_points: input.referralReward,
        ...(input.pointsPerUnit !== undefined
          ? { earn_points: input.pointsPerUnit }
          : {}),
        ...(input.maximumRedemptionPercent !== undefined
          ? { maximum_redemption_percent: input.maximumRedemptionPercent }
          : {}),
        ...(input.maximumRedemptionPoints !== undefined
          ? { maximum_redemption_points: input.maximumRedemptionPoints }
          : {}),
      });
      tx.set(ref, value);
      tx.set(db.doc("adminSettings/rewards"), {
        notes: input.notes,
        updated_by: admin.uid,
        updated_at: new Date().toISOString(),
      });
      tx.create(db.collection("rewardAudit").doc(), {
        action: "loyalty_settings",
        by: admin.uid,
        reason: input.notes || "Update loyalty earning and redemption rules",
        before: previous.data() || {},
        after: value,
        at: new Date().toISOString(),
      });
      return value;
    });
    return Response.json({ item: view(config, input.notes) });
  } catch (error) {
    return authErrorResponse(error);
  }
}
