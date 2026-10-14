import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { referralUpdateSchema } from "@/lib/schemas";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const parsed = referralUpdateSchema.parse(await req.json());
    const ref = adminDb().collection("referrals").doc(id);
    const snap = await ref.get();
    const doc = docToJSON(snap);
    if (!doc) return Response.json({ error: "Not found." }, { status: 404 });

    await ref.update({
      status: parsed.status,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.uid,
      // Append-only audit trail for corrections (PRD 9.7).
      auditTrail: FieldValue.arrayUnion({
        from: doc.status,
        to: parsed.status,
        note: parsed.note ?? "",
        by: admin.uid,
        byEmail: (admin.email as string) ?? "",
        at: new Date().toISOString(),
      }),
    });
    const updated = await ref.get();
    return Response.json({ item: docToJSON(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
