import { cookies } from "next/headers";
import { SESSION_COOKIE, getSession } from "@/lib/auth-server";
import { adminAuth } from "@/lib/firebase-admin";

export async function POST() {
  try {
    const session = await getSession();
    if (session?.uid) {
      await adminAuth().revokeRefreshTokens(session.uid);
    }
  } catch {
    /* best effort */
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
