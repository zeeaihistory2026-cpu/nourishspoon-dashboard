import { cookies } from "next/headers";
import { z } from "zod";
import { adminAuth } from "@/lib/firebase-admin";
import {
  SESSION_COOKIE,
  allowedAdmin,
  assertSameOrigin,
  AuthError,
  authErrorResponse,
} from "@/lib/auth-server";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { idToken } = z
      .object({ idToken: z.string().min(1).max(10000) })
      .parse(await request.json());
    const auth = adminAuth();
    const account = await auth.verifyIdToken(idToken, true);
    if (!allowedAdmin(account))
      throw new AuthError(403, "Verified administrator access is required.");
    if (!account.auth_time || Date.now() / 1000 - account.auth_time > 300)
      throw new AuthError(
        401,
        "Please sign in again to start a dashboard session.",
      );
    const expiresIn = 8 * 60 * 60 * 1000;
    const session = await auth.createSessionCookie(idToken, { expiresIn });
    (await cookies()).set(SESSION_COOKIE, session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
