import { adminDb } from "@/lib/firebase-admin";
import {
  requireAdmin,
  requireAdminMutation,
  authErrorResponse,
  AuthError,
} from "@/lib/auth-server";
import { orderView } from "@/lib/contracts";

export async function GET() {
  try {
    const admin = await requireAdmin();
    const db = adminDb();
    const state = await db.doc(`adminOrderInbox/${admin.uid}`).get();
    const readThrough = state.data()?.readThrough || "1970-01-01T00:00:00.000Z";
    const orders = db.collection("orders").orderBy("created_at", "desc");
    const [snapshot, count] = await Promise.all([
      orders.limit(30).get(),
      db
        .collection("orders")
        .where("created_at", ">", readThrough)
        .count()
        .get(),
    ]);
    return Response.json(
      {
        unreadCount: count.data().count,
        readThrough,
        items: snapshot.docs.map((doc) => {
          const order = orderView(doc.id, doc.data());
          return {
            id: doc.id,
            number: order.orderNumber,
            customer: order.customerName,
            createdAt: order.createdAt,
            status: order.orderStatus,
            unread: (order.createdAt || "") > readThrough,
          };
        }),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const admin = await requireAdminMutation(request);
    const { through } = await request.json();
    const date = typeof through === "string" ? Date.parse(through) : NaN;
    if (!Number.isFinite(date) || date > Date.now() + 300000)
      throw new AuthError(400, "Choose a received notification.");
    const canonical = new Date(date).toISOString();
    const ref = adminDb().doc(`adminOrderInbox/${admin.uid}`);
    await adminDb().runTransaction(async (tx) => {
      const current = await tx.get(ref);
      if (canonical > (current.data()?.readThrough || ""))
        tx.set(ref, { readThrough: canonical });
    });
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
