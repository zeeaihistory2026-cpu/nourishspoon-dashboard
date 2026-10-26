import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import {
  requireAdmin,
  authErrorResponse,
  requireAdminMutation,
} from "@/lib/auth-server";
import { referralConfigSchema } from "@/lib/schemas";
import { rules } from "@/lib/rewards-server";

const DOC = "referral";

export async function GET() {
  try {
    await requireAdmin();
    const db = adminDb();
    const [snap, settings] = await Promise.all([
      db.collection("appConfig").doc(DOC).get(),
      db.doc("settings/rewards").get(),
    ]);
    const config = rules.rewardsConfig(settings.data());
    return Response.json({
      item: {
        ...docToJSON(snap),
        id: DOC,
        referrerReward: config.referral_points,
        isActive: config.referrals_enabled,
        welcomeValue: config.welcome_value,
        welcomeType: config.welcome_type,
        minimumOrder: config.referral_minimum,
        validityDays: config.referral_valid_days,
        monthlyLimit: config.referral_monthly_limit,
        campaignEndsAt: config.referral_ends_at,
        requiresVerifiedPhone: true,
      },
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdminMutation(req);
    const parsed = referralConfigSchema.parse(await req.json());
    const ref = adminDb().collection("appConfig").doc(DOC);
    await adminDb().runTransaction(async (tx) => {
      const settings = adminDb().doc("settings/rewards");
      const [previous, copy] = await Promise.all([
        tx.get(settings),
        tx.get(ref),
      ]);
      const next = rules.rewardsConfig({
        ...previous.data(),
        referral_points: parsed.referrerReward,
        referrals_enabled: parsed.isActive,
        ...(parsed.welcomeValue !== undefined
          ? { welcome_value: parsed.welcomeValue }
          : {}),
        ...(parsed.welcomeType !== undefined
          ? { welcome_type: parsed.welcomeType }
          : {}),
        ...(parsed.minimumOrder !== undefined
          ? { referral_minimum: parsed.minimumOrder }
          : {}),
        ...(parsed.validityDays !== undefined
          ? { referral_valid_days: parsed.validityDays }
          : {}),
        ...(parsed.monthlyLimit !== undefined
          ? { referral_monthly_limit: parsed.monthlyLimit }
          : {}),
        ...(parsed.campaignEndsAt !== undefined
          ? { referral_ends_at: parsed.campaignEndsAt || null }
          : {}),
      });
      tx.set(
        ref,
        {
          ...parsed,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: admin.uid,
          updatedByEmail: admin.email || "",
        },
        { merge: true },
      );
      tx.set(settings, next);
      tx.create(adminDb().collection("rewardAudit").doc(), {
        action: "referral_settings",
        by: admin.uid,
        reason: "Update referral campaign configuration",
        before: { settings: previous.data() || {}, copy: copy.data() || {} },
        after: { settings: next, copy: parsed },
        at: new Date().toISOString(),
      });
    });
    const snap = await ref.get();
    return Response.json({ item: docToJSON(snap) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json(
        { error: err.issues[0]?.message ?? "Invalid data." },
        { status: 400 },
      );
    }
    return authErrorResponse(err);
  }
}
