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
    const products = productsSnap.docs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((p) => p.isActive !== false && !p.deletedAt);
    const totalProducts = products.length;
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

    // ---- Product control center (featured first, then latest) ----
    const controlProducts = [...products]
      .sort((a, b) => {
        const fa = a.isFeatured ? 0 : 1;
        const fb = b.isFeatured ? 0 : 1;
        if (fa !== fb) return fa - fb;
        return tsOf(b.createdAt) - tsOf(a.createdAt);
      })
      .slice(0, 4)
      .map((p) => ({
        id: p.id as string,
        name: (p.name as string) ?? "",
        weight: (p.weight as string) ?? "",
        price: (p.price as number) ?? 0,
        stock: (p.stock as number) ?? 0,
        isActive: p.isActive !== false,
        isFeatured: p.isFeatured === true,
        image: Array.isArray(p.images) ? (p.images[0] as string) ?? "" : "",
      }));

    return Response.json({
      stats,
      recentOrders,
      trackRequests,
      controlProducts,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
