import { adminDb, docToJSON } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";

const TERMINAL = new Set(["delivered", "cancelled"]);

/** Allowed forward transitions (plus cancel from non-terminal).
 * Currently permissive: any status can move to any other status, so the
 * admin is never blocked. Terminal states can still be left if needed. */
const TRANSITIONS: Record<string, string[]> = {
  placed: ["placed", "packed", "out_for_delivery", "delivered", "cancelled"],
  packed: ["placed", "packed", "out_for_delivery", "delivered", "cancelled"],
  out_for_delivery: ["placed", "packed", "out_for_delivery", "delivered", "cancelled"],
  delivered: ["placed", "packed", "out_for_delivery", "delivered", "cancelled"],
  cancelled: ["placed", "packed", "out_for_delivery", "delivered", "cancelled"],
};

export function isTransitionAllowed(from: string, to: string): boolean {
  if (from === to) return true;
  return (TRANSITIONS[from] ?? []).includes(to);
}

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const db = adminDb();
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") ?? "").toLowerCase().trim();
    const status = url.searchParams.get("status") ?? "";
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200", 10) || 200, 1000);

    const snap = await db.collection("orders").orderBy("createdAt", "desc").limit(limit).get();
    let items = snap.docs.map((d) => docToJSON(d)).filter(Boolean) as Record<string, unknown>[];

    if (status) items = items.filter((o) => o.orderStatus === status);
    if (search) {
      items = items.filter((o) =>
        [o.orderNumber, o.id, o.customerName, o.customerEmail, o.customerPhone]
          .map((v) => String(v ?? "").toLowerCase())
          .some((v) => v.includes(search))
      );
    }

    // Enrich missing customer names from users (batch).
    const missing = items.filter((o) => !o.customerName && o.userId) as { userId: string }[];
    const names = new Map<string, string>();
    await Promise.all(
      [...new Set(missing.map((o) => o.userId))].slice(0, 50).map(async (uid) => {
        const u = await db.collection("users").doc(uid).get();
        if (u.exists) {
          const d = u.data() as { fullName?: string; email?: string; phone?: string };
          names.set(uid, d.fullName || d.email || "Customer");
          const target = items.find((o) => o.userId === uid);
          if (target) {
            if (!target.customerEmail) target.customerEmail = d.email ?? "";
            if (!target.customerPhone) target.customerPhone = d.phone ?? "";
          }
        }
      })
    );
    items = items.map((o) => ({
      ...o,
      customerName: o.customerName || (o.userId ? names.get(o.userId as string) : undefined) || "Customer",
    }));

    return Response.json({ items, total: items.length });
  } catch (err) {
    return authErrorResponse(err);
  }
}
