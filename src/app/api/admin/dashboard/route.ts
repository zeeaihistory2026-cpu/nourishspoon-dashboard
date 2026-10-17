import { adminDb, toJSON } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import type { DashboardStats } from "@/lib/types";

interface OrderDoc {
  orderNumber?: string;
  userId?: string;
  items?: { qty?: number }[];
  total?: number;
  subtotal?: number;
  orderStatus?: string;
  paymentStatus?: string;
  createdAt?: { _seconds: number } | string;
}

function tsOf(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "string") {
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof v === "object" && v !== null && "_seconds" in v) {
    return (v as { _seconds: number })._seconds * 1000;
  }
  return 0;
}

function pctDelta(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function GET() {
  try {
    await requireAdmin();
    const db = adminDb();

    const now = Date.now();
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const lastMonthStart = new Date(monthStart);
    lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
    const yesterdayStart = new Date(now - 24 * 60 * 60 * 1000);
    yesterdayStart.setHours(0, 0, 0, 0);
    const dayBeforeStart = new Date(yesterdayStart.getTime() - 24 * 60 * 60 * 1000);

    // ---- Products ----
    const productsSnap = await db.collection("products").limit(500).get();
    const allProducts = productsSnap.docs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((p) => !p.deletedAt);
    const products = allProducts.filter((p) => p.isActive !== false);
    // "Total Products" must count every non-deleted product (11), not just
    // the active ones (10) — otherwise the KPI disagrees with the Products tab.
    const totalProducts = allProducts.length;
    const newThisMonth = products.filter(
      (p) => tsOf(p.createdAt) >= monthStart.getTime()
    ).length;
    const newLastMonth = products.filter((p) => {
      const t = tsOf(p.createdAt);
      return t >= lastMonthStart.getTime() && t < monthStart.getTime();
    }).length;

    // ---- Orders ----
    const ordersSnap = await db
      .collection("orders")
      .orderBy("createdAt", "desc")
      .limit(2000)
      .get();
    const orders = ordersSnap.docs.map((d) => {
      const data = d.data() as OrderDoc;
      return { id: d.id, t: tsOf(data.createdAt), ...data };
    });
    const valid = (o: (typeof orders)[number]) =>
      o.orderStatus !== "cancelled" && o.paymentStatus !== "failed";

    const totalOrders = orders.length;
    const thisMonthOrders = orders.filter((o) => o.t >= monthStart.getTime());
    const lastMonthOrders = orders.filter((o) => {
      return o.t >= lastMonthStart.getTime() && o.t < monthStart.getTime();
    });

    const pendingOrders = orders.filter((o) => o.orderStatus === "placed").length;
    const placedYesterday = orders.filter(
      (o) => o.orderStatus === "placed" && o.t >= yesterdayStart.getTime()
    ).length;
    const placedDayBefore = orders.filter((o) => {
      return (
        o.orderStatus === "placed" &&
        o.t >= dayBeforeStart.getTime() &&
        o.t < yesterdayStart.getTime()
      );
    }).length;

    const revenue = orders.filter(valid).reduce((s, o) => s + (o.total ?? 0), 0);
    const revenueThisMonth = thisMonthOrders
      .filter(valid)
      .reduce((s, o) => s + (o.total ?? 0), 0);
    const revenueLastMonth = lastMonthOrders
      .filter(valid)
      .reduce((s, o) => s + (o.total ?? 0), 0);

    // ---- Offers ----
    const couponsSnap = await db.collection("coupons").limit(200).get();
    const coupons = couponsSnap.docs.map((d) => d.data() as { isActive?: boolean });
    const activeOffers = coupons.filter((c) => c.isActive !== false).length;

    const stats: DashboardStats = {
      totalProducts,
      productsDelta: pctDelta(newThisMonth, newLastMonth),
      pendingOrders,
      pendingDelta: pctDelta(placedYesterday, placedDayBefore),
      totalOrders,
      ordersDelta: pctDelta(thisMonthOrders.length, lastMonthOrders.length),
      revenue: Math.round(revenue),
      revenueDelta: pctDelta(revenueThisMonth, revenueLastMonth),
      activeOffers,
      offersDelta: 0,
    };

    // ---- Recent orders (enrich with customer name) ----
    const recentRaw = orders.slice(0, 5);
    const userIds = [...new Set(recentRaw.map((o) => o.userId).filter(Boolean))] as string[];
    const userMap = new Map<string, string>();
    await Promise.all(
      userIds.map(async (uid) => {
        const u = await db.collection("users").doc(uid).get();
        if (u.exists) {
          const d = u.data() as { fullName?: string; email?: string };
          userMap.set(uid, d.fullName || d.email || "Customer");
        }
      })
    );
    const recentOrders = recentRaw.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber ?? o.id.slice(0, 8).toUpperCase(),
      customer: o.userId ? userMap.get(o.userId) ?? "Customer" : "Customer",
      items: (o.items ?? []).reduce((s, i) => s + (i.qty ?? 1), 0),
      amount: o.total ?? 0,
      status: o.orderStatus ?? "placed",
      date: o.t ? new Date(o.t).toISOString() : null,
    }));

    // ---- Tracking requests ----
    const trackingSnap = await db
      .collection("tracking")
      .orderBy("updatedAt", "desc")
      .limit(5)
      .get()
      .catch(() => null);
    const trackRequests = (trackingSnap?.docs ?? []).map((d) => {
      const t = toJSON(d.data()) as Record<string, unknown>;
      return {
        id: d.id,
        trackingNumber: (t.trackingNumber as string) ?? d.id,
        orderNumber: (t.orderNumber as string) ?? "",
        customer: (t.customerName as string) ?? "",
        status: (t.current as string) ?? "placed",
        updatedAt: (t.updatedAt as string) ?? null,
      };
    });

    // Plain (unbranded) food photos for the circular Control Center avatars —
    // the branded thumbnails carry a name band that a circle crop would cut.
    const PLAIN_PHOTOS: Record<string, string> = {
      "classic-panjeeri-with-sugar": "sq-panjeeri-bowl-v2.jpg",
      "classic-panjeeri-without-sugar": "sq-panjeeri-cook.jpg",
      "homemade-panjeeri": "sq-panjeeri-jars.jpg",
      "date-and-nuts-energy-balls": "sq-balls-hands.jpg",
      "date-nut-balls": "sq-balls-plate.jpg",
      "daily-nourishment-pack": "sq-combo-spread.jpg",
      "energy-pack-combo": "sq-combo-ghee.jpg",
      "family-combo": "sq-combo-ingredients.jpg",
      "gym-freaks-combo": "sq-combo-hero.jpg",
      "postpartum-care-combo": "sq-combo-dates.jpg",
      "power-breakfast-combo": "sq-combo-cook2.jpg",
    };
    const ASSET_BASE = "https://nourishspoon-dashboard.vercel.app/assets/products";

    // ---- Product control center (featured first, then latest) ----
    const controlProducts = [...products]
      .sort((a, b) => {
        const fa = a.isFeatured ? 0 : 1;
        const fb = b.isFeatured ? 0 : 1;
        if (fa !== fb) return fa - fb;
        const ta = tsOf(a.createdAt);
        const tb = tsOf(b.createdAt);
        if (tb !== ta) return tb - ta;
        // Deterministic tiebreaker: products without createdAt tie at 0 —
        // without this the order varied between loads.
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
      })
      .slice(0, 4)
      .map((p) => {
        const branded = Array.isArray(p.images) && p.images[0] ? (p.images[0] as string) : ((p.image as string) ?? "");
        const plain = PLAIN_PHOTOS[p.id as string];
        return {
          id: p.id as string,
          name: (p.name as string) ?? "",
          weight: (p.weight as string) ?? "",
          price: (p.price as number) ?? 0,
          stock: (p.stock as number) ?? 0,
          isActive: p.isActive !== false,
          isFeatured: p.isFeatured === true,
          image: branded,
          thumb: plain ? `${ASSET_BASE}/${plain}` : branded,
        };
      });

    // ---- Weekly sales (last 7 days, real order data only) ----
    const dayLabels: string[] = [];
    const weeklySales: { date: string; label: string; revenue: number; orders: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      const dayOrders = orders.filter((o) => o.t >= d.getTime() && o.t < next.getTime() && valid(o));
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      dayLabels.push(label);
      weeklySales.push({
        date: d.toISOString().slice(0, 10),
        label,
        revenue: Math.round(dayOrders.reduce((s, o) => s + (o.total ?? 0), 0)),
        orders: dayOrders.length,
      });
    }

    return Response.json({
      stats,
      recentOrders,
      trackRequests,
      controlProducts,
      weeklySales,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
