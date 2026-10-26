import type { Data } from "./contracts";

const DAY = 86400000;
const OFFSET = 5 * 3600000;
const time = (value: unknown): number => {
  if (typeof value === "string") return Date.parse(value) || 0;
  if (value && typeof value === "object" && "toDate" in value)
    return (value as { toDate(): Date }).toDate().getTime();
  return 0;
};
export const percentageChange = (current: number, previous: number) =>
  previous ? Math.round(((current - previous) / previous) * 100) : current ? 100 : 0;

/** Money received uses the immutable checkout total, never today's catalogue price. */
export function salesReport(orders: Data[], now = Date.now()) {
  const local = new Date(now + OFFSET);
  const day = local.getUTCDate();
  const monthStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - OFFSET;
  const previousStart = Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1) - OFFSET;
  const dayStart = monthStart + (day - 1) * DAY;
  let invalidPaidOrders = 0, legacyPaymentDates = 0;
  const payments = orders.flatMap((order) => {
    if ((order.payment_status ?? order.paymentStatus) !== "paid") return [];
    const refund = order.refunded_eligible_spend || 0;
    if (order.quote_pending || !Number.isSafeInteger(order.total) || order.total < 0 || !Number.isSafeInteger(refund) || refund < 0 || refund > order.total) {
      invalidPaidOrders++;
      return [];
    }
    const paidAt = time(order.paid_at);
    // Legacy records predate paid_at. Keep their historic order-date attribution
    // explicit; unrelated tracking/status edits must never move their revenue.
    const at = paidAt || time(order.created_at ?? order.createdAt);
    if (!paidAt) legacyPaymentDates++;
    if (!at || at > now) return [];
    return [{ id: String(order.id || ""), orderNumber: String(order.order_number ?? order.orderNumber ?? order.id ?? ""), amount: (order.total as number) - refund, at, legacyDate: !paidAt }];
  });
  const sum = (rows: typeof payments) => rows.reduce((total, row) => total + row.amount, 0);
  const range = (from: number, until: number) => payments.filter(row => row.at >= from && row.at < until);
  const period = (from: number, days: number, previousFrom: number, previousUntil: number, weekly: boolean) => {
    const rows = range(from, now + 1);
    const points = Array.from({ length: days }, (_, index) => {
      const at = from + index * DAY;
      const received = range(at, Math.min(at + DAY, now + 1));
      return {
        date: new Date(at + OFFSET).toISOString().slice(0, 10),
        label: new Intl.DateTimeFormat("en", { timeZone: "Asia/Karachi", ...(weekly ? { weekday: "short" as const } : { day: "numeric" as const, month: "short" as const }) }).format(at),
        revenue: sum(received), orders: received.length,
      };
    });
    return { total: sum(rows), orders: rows.length, delta: percentageChange(sum(rows), sum(range(previousFrom, previousUntil))), points,
      rangeLabel: weekly ? "last 7 days" : "month to date", prevLabel: weekly ? "vs previous week" : "vs previous month to date",
      from: new Date(from).toISOString(), until: new Date(now).toISOString(),
      payments: rows.sort((a, b) => b.at - a.at),
    };
  };
  const weekly = period(dayStart - 6 * DAY, 7, dayStart - 13 * DAY, dayStart - 6 * DAY, true);
  const monthly = period(monthStart, day, previousStart, Math.min(monthStart, previousStart + day * DAY), false);
  return { revenue: sum(payments), revenueDelta: monthly.delta, weekly, monthly, monthStart, previousStart, dayStart,
    accounting: { basis: "paid" as const, currency: "PKR", includesDelivery: true, excludesRefunded: true, invalidPaidOrders, legacyPaymentDates },
  };
}
