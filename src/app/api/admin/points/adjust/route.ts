import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { pointsAdjustSchema } from "@/lib/schemas";

/** Adjust a customer's points with mandatory reason logging (PRD 9.6). */
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = pointsAdjustSchema.parse(await req.json());
    const db = adminDb();

    const userRef = db.collection("users").doc(parsed.userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return Response.json({ error: "Customer not found." }, { status: 404 });
    const userData = userSnap.data() as { points?: number; fullName?: string };
    const before = userData.points ?? 0;
    const after = before + parsed.delta;

    const batch = db.batch();
    batch.update(userRef, {
      points: after,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.uid,
    });
    const txRef = db.collection("rewardTransactions").doc();
    batch.set(txRef, {
      userId: parsed.userId,
      userName: userData.fullName ?? "",
      delta: parsed.delta,
      before,
      after,
      reason: parsed.reason,
      by: admin.uid,
      byEmail: (admin.email as string) ?? "",
      at: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    const txSnap = await txRef.get();
    return Response.json({ item: docToJSON(txSnap), balance: after }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
