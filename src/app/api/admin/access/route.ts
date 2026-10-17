import { requireAdminRole, authErrorResponse } from "@/lib/auth-server";
import {
  listAccessUsers,
  upsertAccessUser,
  removeAccessUser,
  type AccessRole,
} from "@/lib/access";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** GET: list all users with dashboard access (admin only). */
export async function GET() {
  try {
    await requireAdminRole();
    const users = await listAccessUsers();
    return Response.json({ users });
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** POST: give access — { name, email, role: "admin" | "child" } (admin only). */
export async function POST(req: Request) {
  try {
    const session = await requireAdminRole();
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role: AccessRole = body.role === "child" ? "child" : "admin";
    if (!name) return Response.json({ error: "Name is required." }, { status: 400 });
    if (!EMAIL_RE.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    const user = await upsertAccessUser(
      { name, email, role },
      (session.email as string) ?? ""
    );
    return Response.json({ user });
  } catch (err) {
    return authErrorResponse(err);
  }
}

/** DELETE: remove access — ?email=... (admin only). */
export async function DELETE(req: Request) {
  try {
    await requireAdminRole();
    const email = new URL(req.url).searchParams.get("email") ?? "";
    if (!EMAIL_RE.test(email.trim().toLowerCase())) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    await removeAccessUser(email);
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
