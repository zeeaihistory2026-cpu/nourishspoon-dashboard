import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { productView, iso } from "@/lib/contracts";
import { recentOrders } from "@/lib/orders-data";
import { rules } from "@/lib/rewards-server";
import { salesReport } from "@/lib/sales";
import { orderView } from "@/lib/contracts";

const delta = (current: number, previous: number) =>
  previous
    ? Math.round(((current - previous) / previous) * 100)
    : current
      ? 100
      : 0;
export async function GET() {
  try {
    await requireAdmin();
    const db = adminDb();
    const [catalog, loaded, offers, accountingOrders] = await Promise.all([
      db.collection("products").limit(1000).get(),
      recentOrders(5),
      db.collection("promoCodes").limit(1000).get(),
      db.collection("orders").select("total", "refunded_eligible_spend", "payment_status", "paymentStatus", "paid_at", "quote_pending", "created_at", "createdAt", "status", "orderStatus", "tracking_number", "order_number", "customer_name", "updated_at").get(),
    ]);
    const products = catalog.docs
      .map((doc) => productView(doc.id, doc.data()))
      .filter((item) => item.isActive);
    const orders = accountingOrders.docs.map(doc => orderView(doc.id, doc.data()));
    const report = salesReport(accountingOrders.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    const recent = loaded.map(row => row.item);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const number = (key: string) =>
      Number(today.find((part) => part.type === key)!.value);
    const start = (month: number, day = 1) =>
      Date.UTC(number("year"), month, day) - 5 * 3600000;
    const month = number("month") - 1;
    const monthStart = start(month),
      lastStart = start(month - 1),
      dayStart = start(month, number("day"));
    const time = (value: unknown) => Date.parse(iso(value) || "") || 0;
    const thisMonth = orders.filter(
      (order) => time(order.createdAt) >= monthStart,
    );
    const lastMonth = orders.filter(
      (order) =>
        time(order.createdAt) >= lastStart &&
        time(order.createdAt) < monthStart,
    );
    const pending = orders.filter((order) => order.orderStatus === "pending");
    const allOffers = offers.docs.map((doc) => doc.data());
    if (!offers.docs.some((doc) => doc.id === "PROMO10"))
      allOffers.push(rules.DEFAULT_PROMO);
    const activeOffers = allOffers.filter(
      (item) =>
        item.active && (!item.expires_at || time(item.expires_at) > Date.now()),
    ).length;
    const weeklySales = report.weekly.points;
    return Response.json({
      stats: {
        totalProducts: products.length,
        productsDelta: delta(
          products.filter((item) => time(item.createdAt) >= monthStart).length,
          products.filter(
            (item) =>
              time(item.createdAt) >= lastStart &&
              time(item.createdAt) < monthStart,
          ).length,
        ),
        pendingOrders: pending.length,
        pendingDelta: delta(
          pending.filter((item) => time(item.createdAt) >= dayStart - 86400000)
            .length,
          pending.filter(
            (item) =>
              time(item.createdAt) >= dayStart - 172800000 &&
              time(item.createdAt) < dayStart - 86400000,
          ).length,
        ),
        totalOrders: orders.length,
        ordersDelta: delta(thisMonth.length, lastMonth.length),
        revenue: report.revenue,
        revenueDelta: report.revenueDelta,
        activeOffers,
        offersDelta: 0,
      },
      recentOrders: recent.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customer: order.customerName,
        items: order.items.reduce((sum, item) => sum + item.qty, 0),
        amount: order.total,
        status: order.orderStatus,
        date: order.createdAt,
      })),
      weeklySales,
      sales: { weekly: { ...report.weekly, payments: undefined }, monthly: { ...report.monthly, payments: undefined } },
      accounting: report.accounting,
      trackRequests: orders
        .filter((order) => order.trackingNumber)
        .sort((a, b) => time(b.updatedAt) - time(a.updatedAt))
        .slice(0, 5)
        .map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          trackingNumber: order.trackingNumber,
          customer: order.customerName,
          status: order.orderStatus,
          updatedAt: order.updatedAt,
        })),
      controlProducts: products
        .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
        .slice(0, 4)
        .map((product) => ({
          ...product,
          image: product.images[0] || "",
          category:
            (product as { category?: string }).category ||
            product.name.split(" ")[0] ||
            "Classic",
          thumb:
            product.images[0] || "/assets/products/sq-panjeeri-bowl-v2.jpg",
        })),
      scope: {
        ordersLimit: null,
        productsLimit: 1000,
        truncated: catalog.size === 1000,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
