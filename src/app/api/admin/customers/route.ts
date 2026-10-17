import { adminDb, docToJSON } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") ?? "").toLowerCase().trim();
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200", 10) || 200, 1000);

    // No orderBy("createdAt") — Firestore orderBy silently drops docs missing
    // that field (one customer had no createdAt and never appeared). Sort below.
    const snap = await adminDb().collection("users").limit(limit).get();
    let items = snap.docs.map((d) => docToJSON(d)).filter(Boolean) as Record<string, unknown>[];
    items.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
    if (search) {
      items = items.filter((u) =>
        [u.fullName, u.email, u.phone, u.uid, u.id]
          .map((v) => String(v ?? "").toLowerCase())
          .some((v) => v.includes(search))
      );
    }

    // Attach Auth disabled state (batch).
    const auth = (await import("@/lib/firebase-admin")).adminAuth();
    await Promise.all(
      items.slice(0, 100).map(async (u) => {
        try {
          const rec = await auth.getUser(u.uid as string);
          u.disabled = rec.disabled;
        } catch {
          u.disabled = false;
        }
      })
    );

    return Response.json({ items, total: items.length });
  } catch (err) {
    return authErrorResponse(err);
  }
}
