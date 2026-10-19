import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse } from "@/lib/auth-server";
import { productView, iso } from "@/lib/contracts";
import { recentOrders } from "@/lib/orders-data";
import { rules } from "@/lib/rewards-server";

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
    const [catalog, loaded, offers, customers] = await Promise.all([
      db.collection("products").limit(1000).get(),
      recentOrders(2000),
      db.collection("promoCodes").limit(1000).get(),
      db.collection("users").limit(1000).get(),
    ]);
    const products = catalog.docs
      .map((doc) => productView(doc.id, doc.data()))
      .filter((item) => item.isActive);
    const orders = loaded.map((row) => row.item);
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
    const paid = (order: (typeof orders)[number]) =>
      order.orderStatus === "delivered" && order.paymentStatus === "paid";
    const revenue = (items: typeof orders) =>
      items
        .filter(paid)
        .reduce((total, order) => total + (order.total || 0), 0);
    const pending = orders.filter((order) => order.orderStatus === "pending");
    const allOffers = offers.docs.map((doc) => doc.data());
    if (!offers.docs.some((doc) => doc.id === "PROMO10"))
      allOffers.push(rules.DEFAULT_PROMO);
    const activeOffers = allOffers.filter(
      (item) =>
        item.active && (!item.expires_at || time(item.expires_at) > Date.now()),
    ).length;
    const weeklySales = Array.from({ length: 7 }, (_, index) => {
      const at = dayStart - (6 - index) * 86400000;
      const items = orders.filter(
        (order) =>
          time(order.createdAt) >= at && time(order.createdAt) < at + 86400000,
      );
      return {
        date: new Date(at + 5 * 3600000).toISOString().slice(0, 10),
        label: new Intl.DateTimeFormat("en", {
          weekday: "short",
          timeZone: "Asia/Karachi",
        }).format(at),
        revenue: revenue(items),
        orders: items.length,
      };
    });
    let newCustomers = 0;
    for (let offset = 0; offset < customers.size; offset += 100) {
      const accounts = await adminAuth().getUsers(customers.docs.slice(offset, offset + 100).map((user) => ({ uid: user.id })));
      newCustomers += accounts.users.filter((user) => Date.parse(user.metadata.creationTime) >= dayStart - 6 * 86400000).length;
    }
    return Response.json({
      newCustomers,
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
        revenue: revenue(orders),
        revenueDelta: delta(revenue(thisMonth), revenue(lastMonth)),
        activeOffers,
        offersDelta: 0,
      },
      recentOrders: orders
        .slice(0, 5)
        .map((order) => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customer: order.customerName,
          items: order.items.reduce((sum, item) => sum + item.qty, 0),
          amount: order.total,
          status: order.orderStatus,
          date: order.createdAt,
        })),
      weeklySales,
      trackRequests: orders
        .filter((order) => order.trackingNumber)
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
        ordersLimit: 2000,
        productsLimit: 1000,
        truncated: loaded.length === 2000 || catalog.size === 1000,
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
