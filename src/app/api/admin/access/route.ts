import { z } from "zod";
import {
  assertSameOrigin,
  requireAdminRole,
  authErrorResponse,
} from "@/lib/auth-server";
import {
  listAccessUsers,
  upsertAccessUser,
  removeAccessUser,
} from "@/lib/access";

const emailSchema = z.string().trim().toLowerCase().email().max(254);
export async function GET() {
  try {
    await requireAdminRole();
    return Response.json({ users: await listAccessUsers() });
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdminRole();
    const input = z
      .object({
        email: emailSchema,
        name: z.string().trim().min(1).max(80),
        role: z.enum(["admin", "child"]),
      })
      .parse(await request.json());
    return Response.json({
      user: await upsertAccessUser(input, admin.email || admin.uid),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdminRole();
    await removeAccessUser(
      emailSchema.parse(new URL(request.url).searchParams.get("email")),
    );
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
