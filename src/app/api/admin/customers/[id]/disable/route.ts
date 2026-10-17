import { z } from "zod";
import { adminDb, adminAuth, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";

/** Enable/disable a customer's Firebase Auth account (server-side privileged). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const { disabled } = z.object({ disabled: z.boolean() }).parse(await req.json());

    await adminAuth().updateUser(id, { disabled });
    if (disabled) {
      await adminAuth().revokeRefreshTokens(id).catch(() => null);
    }
    await adminDb().collection("users").doc(id).update({
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.uid,
    });

    return Response.json({ ok: true, disabled });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid data." }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
