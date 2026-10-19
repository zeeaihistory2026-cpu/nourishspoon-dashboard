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
    const batch = adminDb().batch();
    batch.set(
      ref,
      {
        ...parsed,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: admin.uid,
        updatedByEmail: (admin.email as string) ?? "",
      },
      { merge: true },
    );
    batch.set(
      adminDb().doc("settings/rewards"),
      {
        referral_points: parsed.referrerReward,
        referrals_enabled: parsed.isActive,
      },
      { merge: true },
    );
    await batch.commit();
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
