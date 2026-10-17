import { z } from "zod";
import { adminDb, adminAuth, docToJSON, FieldValue } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { customerUpdateSchema } from "@/lib/schemas";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await ctx.params;
    const db = adminDb();
    const snap = await db.collection("users").doc(id).get();
    const profile = docToJSON(snap);
    if (!profile) return Response.json({ error: "Customer not found." }, { status: 404 });

    const [addrSnap, ordersSnap, pointsSnap, wishlistSnap, refSnap] = await Promise.all([
      db.collection("users").doc(id).collection("addresses").get(),
      db.collection("orders").where("userId", "==", id).orderBy("createdAt", "desc").limit(50).get(),
      db.collection("rewardTransactions").where("userId", "==", id).orderBy("at", "desc").limit(50).get(),
      db.collection("users").doc(id).collection("wishlist").get(),
      db.collection("referrals").where("referrerId", "==", id).orderBy("createdAt", "desc").limit(50).get().catch(() => null),
    ]);

    let disabled = false;
    try {
      disabled = (await adminAuth().getUser(id)).disabled;
    } catch {
      /* user may not exist in Auth */
    }

    // Enrich wishlist with product names.
    const wishlist = await Promise.all(
      wishlistSnap.docs.map(async (d) => {
        const w = docToJSON(d) as Record<string, unknown>;
        if (w.productId) {
          const p = await db.collection("products").doc(w.productId as string).get().catch(() => null);
          if (p?.exists) {
            const pd = p.data() as { name?: string; images?: string[] };
            w.productName = pd.name ?? "";
            w.productImage = pd.images?.[0] ?? "";
          }
        }
        return { ...w, userId: id };
      })
    );

    return Response.json({
      item: { ...profile, disabled },
      addresses: addrSnap.docs.map((d) => docToJSON(d)),
      orders: ordersSnap.docs.map((d) => docToJSON(d)),
      pointsHistory: pointsSnap.docs.map((d) => docToJSON(d)),
      wishlist,
      referrals: refSnap ? refSnap.docs.map((d) => docToJSON(d)) : [],
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const parsed = customerUpdateSchema.parse(await req.json());
    const data: Record<string, unknown> = { ...parsed };
    for (const k of Object.keys(data)) if (data[k] === undefined) delete data[k];
    data.updatedAt = FieldValue.serverTimestamp();
    data.updatedBy = admin.uid;
    const ref = adminDb().collection("users").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Customer not found." }, { status: 404 });
    await ref.update(data);
    const updated = await ref.get();
    return Response.json({ item: docToJSON(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.issues[0]?.message ?? "Invalid data." }, { status: 400 });
    }
    return authErrorResponse(err);
  }
}
