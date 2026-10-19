import { adminDb, docToJSON } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") ?? "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 500);
    let q = adminDb().collection("rewardTransactions").orderBy("at", "desc");
    const snap = await (userId ? q.where("userId", "==", userId) : q).limit(limit).get();
    return Response.json({ items: snap.docs.map((d) => docToJSON(d)) });
  } catch (err) {
    return authErrorResponse(err);
  }
}
