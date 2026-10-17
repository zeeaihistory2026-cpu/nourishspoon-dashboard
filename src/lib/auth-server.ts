import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";

export const SESSION_COOKIE = "ns_admin_session";

export class AuthError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Verify the session cookie and return the decoded claims, or null. */
export async function getSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const decoded = await adminAuth().verifySessionCookie(token, true);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Require an authenticated admin for a server route / layout.
 * Access = email on ADMIN_EMAILS allowlist OR Firebase custom claim admin=true.
 */
export async function requireAdmin() {
  // Dev-only bypass, mirroring the (admin) layout gate. Never active in production.
  if (process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "1") {
    return { uid: "dev-admin", email: "dev@nourishspoon.local", admin: true } as unknown as {
      uid: string;
      email?: string;
      admin?: boolean;
    };
  }
  const session = await getSession();
  if (!session) throw new AuthError(401, "Not signed in.");
  const email = (session.email ?? "").toLowerCase();
  const allowed =
    (email && adminAllowlist().includes(email)) || session.admin === true;
  if (!allowed) throw new AuthError(403, "This account is not an admin.");
  return session;
}

export function authErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof Error && err.message.includes("not configured")) {
    return Response.json(
      { error: "Server is not connected to Firebase yet. Ask the owner to add the service-account credentials." },
      { status: 503 }
    );
  }
  console.error("[admin-api]", err);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}
