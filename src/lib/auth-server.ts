import "server-only";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { adminAuth, FirebaseConfigurationError } from "./firebase-admin";
import { ContractError } from "./contracts";
export const SESSION_COOKIE = "ns_admin_session";
export class AuthError extends Error { constructor(public status: number, message: string) { super(message); } }
export const adminAllowlist = () => (process.env.ADMIN_EMAILS ?? "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
export function allowedAdmin(account: { admin?: unknown; email?: string; email_verified?: boolean }) {
  return account.admin === true || (account.email_verified === true && adminAllowlist().includes((account.email ?? "").toLowerCase()));
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) throw new AuthError(403, "This action must come from the dashboard.");
}
export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try { return await adminAuth().verifySessionCookie(token, true); }
  catch (error) { if (error instanceof FirebaseConfigurationError) throw error; return null; }
}
export async function requireAdmin() {
  const account = await getSession();
  if (!account) throw new AuthError(401, "Please sign in to the dashboard.");
  if (!allowedAdmin(account)) throw new AuthError(403, "Verified administrator access is required.");
  return account;
}
export function authErrorResponse(error: unknown) {
  if (error && typeof error === "object" && "code" in error && error.code === 6)
    return Response.json({ error: "This item already exists." }, { status: 409 });
  if (error instanceof ContractError) return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof FirebaseConfigurationError) return Response.json({ error: error.message }, { status: 503 });
  if (error instanceof ZodError) return Response.json({ error: error.issues[0]?.message ?? "Check the entered values." }, { status: 400 });
  console.error("[admin-api]", error instanceof Error ? error.message : "Unexpected failure");
  return Response.json({ error: "Could not complete this action. Please retry." }, { status: 500 });
}

