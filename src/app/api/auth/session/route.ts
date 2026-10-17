import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";
import { SESSION_COOKIE, adminAllowlist } from "@/lib/auth-server";

/**
 * Exchange a Firebase ID token (from client sign-in) for an httpOnly
 * session cookie. Also bootstraps the `admin` custom claim for emails on
 * the ADMIN_EMAILS allowlist, so Firestore rules recognise the admin too.
 */
export async function POST(req: Request) {
  try {
    const { idToken } = (await req.json()) as { idToken?: string };
    if (!idToken) return Response.json({ error: "Missing ID token." }, { status: 400 });

    const auth = adminAuth();
    const decoded = await auth.verifyIdToken(idToken, true);
    const email = (decoded.email ?? "").toLowerCase();
    const allowlist = adminAllowlist();
    const isAllowlisted = email !== "" && allowlist.includes(email);
    const hasClaim = decoded.admin === true;

    if (!isAllowlisted && !hasClaim) {
      return Response.json(
        { error: "This account is not authorised for the admin dashboard." },
        { status: 403 }
      );
    }

    // Bootstrap the custom claim once for allowlisted emails.
    // Narrowly constructed: only the admin flag, never the decoded token payload.
    if (isAllowlisted && !hasClaim) {
      await auth.setCustomUserClaims(decoded.uid, { admin: true });
    }

    const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const store = await cookies();
    store.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresIn / 1000,
    });

    return Response.json({ ok: true, email: decoded.email, name: decoded.name ?? null });
  } catch (err) {
    if (err instanceof Error && err.message.includes("not configured")) {
      return Response.json(
        { error: "Server is not connected to Firebase yet." },
        { status: 503 }
      );
    }
    console.error("[auth/session]", err);
    return Response.json({ error: "Sign-in failed. Please try again." }, { status: 401 });
  }
}
