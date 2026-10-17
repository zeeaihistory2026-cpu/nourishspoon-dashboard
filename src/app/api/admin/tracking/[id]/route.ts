import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { trackingUpdateSchema } from "@/lib/schemas";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const snap = await adminDb().collection("tracking").doc(id).get();
    const doc = docToJSON(snap);
    if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
    return Response.json({ item: doc });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const parsed = trackingUpdateSchema.parse(await req.json());
    const db = adminDb();
    const ref = db.collection("tracking").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Not found." }, { status: 404 });

    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.uid,
      updatedByEmail: (admin.email as string) ?? "",
    };
    if (parsed.trackingNumber !== undefined) updates.trackingNumber = parsed.trackingNumber;
    if (parsed.carrier !== undefined) updates.carrier = parsed.carrier;
    if (parsed.milestone) {
      updates.current = parsed.milestone.key;
      updates.milestones = FieldValue.arrayUnion({
        key: parsed.milestone.key,
        label: parsed.milestone.label,
        at: FieldValue.serverTimestamp(),
        by: admin.uid,
      });
    }
    await ref.update(updates);
    const updated = await ref.get();
    return Response.json({ item: docToJSON(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    await adminDb().collection("tracking").doc(id).delete();
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
