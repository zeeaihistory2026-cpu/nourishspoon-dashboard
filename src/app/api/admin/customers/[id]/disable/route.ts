import { z } from "zod";
import { adminDb, adminAuth, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";

/** Enable/disable a customer's Firebase Auth account (server-side privileged). */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const { disabled } = z.object({ disabled: z.boolean() }).parse(await req.json().catch(() => null));

    try {
      await adminAuth().updateUser(id, { disabled });
    } catch (err) {
      // Unknown uid → 404, not a generic 500.
      if (err instanceof Error && /no user|not found|auth\/user-not-found/i.test(err.message)) {
        return Response.json({ error: "Customer not found." }, { status: 404 });
      }
      throw err;
    }
    if (disabled) {
      await adminAuth().revokeRefreshTokens(id).catch(() => null);
    }
    // set(merge) — the Firestore profile doc may not exist even when the
    // Auth account does; update() would throw on a missing doc.
    await adminDb().collection("users").doc(id).set({
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: admin.uid,
    }, { merge: true });

    return Response.json({ ok: true, disabled });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: "Invalid data." }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
