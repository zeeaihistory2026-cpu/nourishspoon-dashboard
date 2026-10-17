import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { reviewModerateSchema } from "@/lib/schemas";

/** Moderate visibility only — the customer's original text is never altered. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const parsed = reviewModerateSchema.parse(await req.json());
    const ref = adminDb().collection("reviews").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Not found." }, { status: 404 });
    await ref.update({
      visibility: parsed.visibility,
      moderatedBy: admin.uid,
      moderatedByEmail: (admin.email as string) ?? "",
      moderatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
