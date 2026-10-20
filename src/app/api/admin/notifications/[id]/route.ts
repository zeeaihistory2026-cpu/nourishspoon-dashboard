import { z } from "zod";
import { adminDb, docToJSON, FieldValue } from "@/lib/firebase-admin";
import {
  requireAdmin,
  authErrorResponse,
  requireAdminMutation,
} from "@/lib/auth-server";
import { notificationSchema } from "@/lib/schemas";

const COL = "adminNotifications";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const snap = await adminDb().collection(COL).doc(id).get();
    const doc = docToJSON(snap);
    if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
    return Response.json({ item: doc });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdminMutation(req);
    const { id } = await ctx.params;
    const parsed = notificationSchema.partial().parse(await req.json());
    const ref = adminDb().collection(COL).doc(id);
    const snap = await ref.get();
    const doc = docToJSON(snap);
    if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
    if (doc.status === "sent") {
      return Response.json(
        { error: "Sent notifications are immutable." },
        { status: 400 },
      );
    }
    const data: Record<string, unknown> = { ...parsed };
    for (const k of Object.keys(data))
      if (data[k] === undefined) delete data[k];
    data.updatedAt = FieldValue.serverTimestamp();
    data.updatedBy = admin.uid;
    await ref.update(data);
    const updated = await ref.get();
    return Response.json({ item: docToJSON(updated) });
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

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminMutation(_req);
    const { id } = await ctx.params;
    await adminDb().collection(COL).doc(id).delete();
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
