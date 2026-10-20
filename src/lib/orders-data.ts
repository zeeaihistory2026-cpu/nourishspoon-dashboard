import "server-only";
import { adminDb } from "./firebase-admin";
import { orderView, type Data } from "./contracts";
export async function recentOrders(limit: number) {
  const snapshot = await adminDb()
    .collection("orders")
    .orderBy("created_at", "desc")
    .limit(limit)
    .get();
  return snapshot.docs.map((document) => ({
    raw: document.data() as Data,
    item: orderView(document.id, document.data()),
  }));
}

/** Accept the customer-facing order number as well as an internal ID. */
export async function resolveOrderId(value: string) {
  const input = value.trim();
  if (!input || input.length > 80 || input.includes("/"))
    throw new Error("Choose a valid order.");
  const orders = adminDb().collection("orders");
  const direct = await orders.doc(input).get();
  if (direct.exists) return direct.id;
  const found = await orders
    .where("order_number", "==", input.toUpperCase())
    .limit(2)
    .get();
  if (found.size === 1) return found.docs[0].id;
  throw new Error("Order not found. Choose an order from the list.");
}
