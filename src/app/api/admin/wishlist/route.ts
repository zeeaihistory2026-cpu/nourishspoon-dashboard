import { adminDb, docToJSON } from "@/lib/firebase-admin";
import {
  requireAdmin,
  authErrorResponse,
  requireAdminMutation,
} from "@/lib/auth-server";

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const db = adminDb();
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") ?? "").toLowerCase().trim();
    const limit = Math.min(
      parseInt(url.searchParams.get("limit") ?? "200", 10) || 200,
      1000,
    );

    const group = await db.collectionGroup("wishlist").limit(limit).get();
    const items = await Promise.all(
      group.docs.map(async (d) => {
        const w = docToJSON(d) as Record<string, unknown>;
        const userId = d.ref.parent.parent?.id ?? "";
        let userName = "";
        let productName = "";
        let productImage = "";
        const [u, p] = await Promise.all([
          userId
            ? db
                .collection("users")
                .doc(userId)
                .get()
                .catch(() => null)
            : null,
          w.productId
            ? db
                .collection("products")
                .doc(w.productId as string)
                .get()
                .catch(() => null)
            : null,
        ]);
        if (u?.exists) {
          const ud = u.data() as { fullName?: string; email?: string };
          userName = ud.fullName || ud.email || "";
        }
        if (p?.exists) {
          const pd = p.data() as { name?: string; images?: string[] };
          productName = pd.name ?? "";
          productImage = pd.images?.[0] ?? "";
        }
        return {
          ...w,
          id: `${userId}:${d.id}`,
          itemId: d.id,
          userId,
          userName,
          productName,
          productImage,
        };
      }),
    );

    const filtered = search
      ? items.filter((w) =>
          [w.userName, w.productName]
            .map((v) => String(v ?? "").toLowerCase())
            .some((v) => v.includes(search)),
        )
      : items;
    return Response.json({ items: filtered, total: filtered.length });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdminMutation(req);
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const itemId = url.searchParams.get("itemId");
    if (!userId || !itemId)
      return Response.json(
        { error: "Missing userId/itemId." },
        { status: 400 },
      );
    await adminDb()
      .collection("users")
      .doc(userId)
      .collection("wishlist")
      .doc(itemId)
      .delete();
    return Response.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
