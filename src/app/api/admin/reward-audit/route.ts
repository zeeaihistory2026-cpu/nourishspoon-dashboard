import { adminDb, docToJSON } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const referral = new URL(request.url).searchParams.get("referral");
    const collection = adminDb().collection("rewardAudit");
    const snapshot = await (
      referral ? collection.where("referral_id", "==", referral) : collection
    ).get();
    const items = snapshot.docs
      .map((doc) => docToJSON(doc) as Record<string, any>)
      .sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(0, 100);
    return Response.json({ items });
  } catch (error) {
    return authErrorResponse(error);
  }
}
