import { authErrorResponse, requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

import { boundedLimit, iso } from "@/lib/contracts";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const uid = params.get("userId");
    const db = adminDb();
    const query = uid
      ? db.collection("rewardWallets").doc(uid).collection("history")
      : db.collectionGroup("history");
    const snapshot = await query
      .orderBy("created_at", "desc")
      .limit(boundedLimit(params.get("limit"), 100))
      .get();
    const items = snapshot.docs
      .filter((doc) => doc.ref.parent.parent?.parent.id === "rewardWallets")
      .map((doc) => ({
        id: doc.id,
        userId: doc.ref.parent.parent!.id,
        delta: doc.data().points,
        reason: doc.data().title,
        by: doc.data().by ?? "system",
        byEmail: doc.data().by_email ?? "",
        at: iso(doc.data().created_at),
      }));
    return Response.json({ items });
  } catch (error) {
    return authErrorResponse(error);
  }
}
