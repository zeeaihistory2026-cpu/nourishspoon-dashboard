import {
  assertSameOrigin,
  AuthError,
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth-server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

import { customerView, iso, orderView } from "@/lib/contracts";
import { customerUpdateSchema } from "@/lib/schemas";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const db = adminDb();
    const snapshot = await db.collection("users").doc(id).get();
    if (!snapshot.exists) throw new AuthError(404, "Customer not found.");
    const [wallet, addresses, orders, history, wishlist] = await Promise.all([
      db.collection("rewardWallets").doc(id).get(),
      snapshot.ref.collection("addresses").get(),
      db.collection("orders").where("customer_uid", "==", id).limit(100).get(),
      db
        .collection("rewardWallets")
        .doc(id)
        .collection("history")
        .orderBy("created_at", "desc")
        .limit(50)
        .get(),
      snapshot.ref.collection("wishlist").get(),
    ]);
    const account = await adminAuth()
      .getUser(id)
      .catch(() => null);
    return Response.json({
      item: {
        ...customerView(id, snapshot.data()!, wallet.data()),
        disabled: account?.disabled ?? false,
      },
      addresses: addresses.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        fullName: doc.data().name,
        line1: doc.data().line,
      })),
      orders: orders.docs
        .map((doc) => orderView(doc.id, doc.data()))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
      pointsHistory: history.docs.map((doc) => ({
        id: doc.id,
        userId: id,
        delta: doc.data().points,
        reason: doc.data().title,
        at: iso(doc.data().created_at),
      })),
      wishlist: wishlist.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
        userId: id,
        productId: doc.data().product_id ?? doc.id,
      })),
      referrals: [],
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;
    const input = customerUpdateSchema.parse(await request.json());
    if (input.fullName !== undefined)
      await adminAuth().updateUser(id, { displayName: input.fullName });
    const reference = adminDb().collection("users").doc(id);
    await reference.update({
      ...input,
      updatedAt: new Date().toISOString(),
      updatedBy: admin.uid,
    });
    const snapshot = await reference.get();
    const wallet = await adminDb().collection("rewardWallets").doc(id).get();
    return Response.json({
      item: customerView(id, snapshot.data()!, wallet.data()),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
