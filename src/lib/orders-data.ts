import "server-only";
import { adminDb } from "./firebase-admin";
import { orderView, type Data } from "./contracts";
export async function recentOrders(limit: number) {
  const snapshot = await adminDb().collection("orders").orderBy("created_at", "desc").limit(limit).get();
  return snapshot.docs.map(document => ({ raw: document.data() as Data, item: orderView(document.id, document.data()) }));
}

