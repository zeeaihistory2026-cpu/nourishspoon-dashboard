import { adminDb, docToJSON } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") ?? "").toLowerCase().trim();
    const status = url.searchParams.get("status") ?? "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200", 10) || 200, 1000);
    const snap = await adminDb().collection("referrals").orderBy("createdAt", "desc").limit(limit).get();
    let items = snap.docs.map((d) => docToJSON(d)).filter(Boolean) as Record<string, unknown>[];
    if (status) items = items.filter((r) => r.status === status);
    if (search) {
      items = items.filter((r) =>
        [r.referrerName, r.referredName, r.code, r.referrerId, r.referredId]
          .map((v) => String(v ?? "").toLowerCase())
          .some((v) => v.includes(search))
      );
    }
    return Response.json({ items, total: items.length });
  } catch (err) {
    return authErrorResponse(err);
  }
}
