import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "./firebase-admin";
import { getAccessRecord, type AccessRole } from "./access";

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
 * Access = email on ADMIN_EMAILS allowlist OR Firebase custom claim admin=true
 * OR an adminAccess record in Firestore (added via the User Access page).
 * Returns the session plus the resolved role and display name.
 * Role "admin" = full access incl. user management. Role "child" = can use
 * the dashboard but cannot manage users.
 */
export async function requireAdmin() {
  // Dev-only bypass, mirroring the (admin) layout gate. Never active in production.
  if (process.env.NODE_ENV !== "production" && process.env.DEV_BYPASS_AUTH === "1") {
    return {
      uid: "dev-admin",
      email: "dev@nourishspoon.local",
      admin: true,
      role: "admin" as AccessRole,
      displayName: "Tayyaba",
    };
  }
  const session = await getSession();
  if (!session) throw new AuthError(401, "Not signed in.");
  const email = (session.email ?? "").toLowerCase();
  const isOwner =
    (email && adminAllowlist().includes(email)) || session.admin === true;
  let role: AccessRole | null = isOwner ? "admin" : null;
  let displayName = "";
  if (!role) {
    try {
      const record = await getAccessRecord(email);
      if (record) {
        role = record.role;
        displayName = record.name;
      }
    } catch (err) {
      // A Firestore read failure must not become a 500 — treat as "no record".
      console.error("[requireAdmin] access lookup failed:", err);
    }
  }
  if (!role) throw new AuthError(403, "This account is not an admin.");
  if (!displayName) {
    displayName = isOwner
      ? "Tayyaba"
      : ((session.name as string | undefined) ?? "").trim() ||
        email.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
        "Admin";
  }
  return { ...session, role, displayName };
}

/** Require the Admin role (user management). Child accounts get a 403. */
export async function requireAdminRole() {
  const session = await requireAdmin();
  if (session.role !== "admin") {
    throw new AuthError(403, "Only an admin can manage user access.");
  }
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
