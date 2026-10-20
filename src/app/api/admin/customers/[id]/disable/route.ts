import {
  assertSameOrigin,
  AuthError,
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth-server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

import { allowedAdmin } from "@/lib/auth-server";
import { z } from "zod";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;
    const { disabled } = z
      .object({ disabled: z.boolean() })
      .parse(await request.json());
    const target = await adminAuth().getUser(id);
    if (
      id === admin.uid ||
      allowedAdmin({
        admin: target.customClaims?.admin,
        email: target.email,
        email_verified: target.emailVerified,
      })
    )
      throw new AuthError(
        403,
        "Administrator accounts cannot be disabled through customer controls.",
      );
    await adminAuth().updateUser(id, { disabled });
    if (disabled) await adminAuth().revokeRefreshTokens(id);
    await adminDb()
      .collection("users")
      .doc(id)
      .update({ updatedAt: new Date().toISOString(), updatedBy: admin.uid });
    return Response.json({ ok: true, disabled });
  } catch (error) {
    return authErrorResponse(error);
  }
}
