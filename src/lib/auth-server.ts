import "server-only";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { adminAuth, FirebaseConfigurationError } from "./firebase-admin";
import { ContractError } from "./contracts";
import { getAccessRecord } from "./access";
export const SESSION_COOKIE = "ns_admin_session";
export class AuthError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const adminAllowlist = () =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
export function allowedAdmin(account: {
  admin?: unknown;
  email?: string;
  email_verified?: boolean;
}) {
  return (
    // This owner was explicitly provisioned with a server-issued Firebase claim.
    (account.admin === true &&
      account.email?.toLowerCase() === "info@nourishspoon.com") ||
    (account.email_verified === true &&
      adminAllowlist().includes((account.email ?? "").toLowerCase()))
  );
}
export async function dashboardAccess(
  account: Parameters<typeof allowedAdmin>[0],
) {
  if (allowedAdmin(account)) return { role: "admin" as const, displayName: "" };
  if (!account.email_verified || !account.email) return null;
  const record = await getAccessRecord(account.email);
  return record ? { role: record.role, displayName: record.name } : null;
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new AuthError(403, "This action must come from the dashboard.");
}
export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await adminAuth().verifySessionCookie(token, true);
  } catch (error) {
    if (error instanceof FirebaseConfigurationError) throw error;
    return null;
  }
}
export async function requireAdmin() {
  const account = await getSession();
  if (!account) throw new AuthError(401, "Please sign in to the dashboard.");
  const access = await dashboardAccess(account);
  if (!access)
    throw new AuthError(403, "Verified administrator access is required.");
  return {
    ...account,
    ...access,
    displayName:
      access.displayName ||
      (typeof account.name === "string" ? account.name.trim() : ""),
  };
}
export async function requireAdminRole() {
  const account = await requireAdmin();
  if (account.role !== "admin")
    throw new AuthError(
      403,
      "Only administrators can manage dashboard access.",
    );
  return account;
}
export async function requireAdminMutation(request: Request) {
  assertSameOrigin(request);
  return requireAdmin();
}
export function authErrorResponse(error: unknown) {
  if (error && typeof error === "object" && "code" in error && error.code === 6)
    return Response.json(
      { error: "This item already exists." },
      { status: 409 },
    );
  if (error instanceof ContractError)
    return Response.json({ error: error.message }, { status: 400 });
  if (error instanceof AuthError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof FirebaseConfigurationError)
    return Response.json({ error: error.message }, { status: 503 });
  if (error instanceof ZodError)
    return Response.json(
      { error: error.issues[0]?.message ?? "Check the entered values." },
      { status: 400 },
    );
  console.error(
    "[admin-api]",
    error instanceof Error ? error.message : "Unexpected failure",
  );
  return Response.json(
    { error: "Could not complete this action. Please retry." },
    { status: 500 },
  );
}
