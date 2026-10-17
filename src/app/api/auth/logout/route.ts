import { cookies } from "next/headers";
import { SESSION_COOKIE, assertSameOrigin, authErrorResponse } from "@/lib/auth-server";
export async function POST(request: Request) {
  try { assertSameOrigin(request); (await cookies()).delete(SESSION_COOKIE); return Response.json({ ok: true }); }
  catch (error) { return authErrorResponse(error); }
}

