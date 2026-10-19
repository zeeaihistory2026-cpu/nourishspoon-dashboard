import { authErrorResponse, requireAdmin } from "@/lib/auth-server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

import { boundedLimit, customerView, newest } from "@/lib/contracts";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const db = adminDb();
    const snapshot = await db
      .collection("users")
      .limit(boundedLimit(params.get("limit")))
      .get();
    const wallets = snapshot.empty
      ? []
      : await db.getAll(
          ...snapshot.docs.map((doc) =>
            db.collection("rewardWallets").doc(doc.id),
          ),
        );
    const balances = new Map(wallets.map((doc) => [doc.id, doc.data()]));
    let items = snapshot.docs
      .map((doc) => customerView(doc.id, doc.data(), balances.get(doc.id)))
      .sort(newest);
    const search = (params.get("search") || "").trim().toLowerCase();
    if (search)
      items = items.filter((item) =>
        [item.fullName, item.email, item.phone, item.uid]
          .join(" ")
          .toLowerCase()
          .includes(search),
      );
    const disabled = new Map<string, boolean>();
    for (let offset = 0; offset < items.length; offset += 100) {
      const accounts = await adminAuth().getUsers(
        items.slice(offset, offset + 100).map((item) => ({ uid: item.id })),
      );
      accounts.users.forEach((user) => disabled.set(user.uid, user.disabled));
    }
    return Response.json({
      items: items.map((item) => ({
        ...item,
        disabled: disabled.get(item.id) ?? false,
      })),
      total: items.length,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
