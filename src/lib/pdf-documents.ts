import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Data } from "./contracts";
import type { salesReport } from "./sales";

const green = rgb(0, .24, .19), gold = rgb(.66, .41, .1), grey = rgb(.38, .42, .4);
const money = (value: number) => `PKR ${value.toLocaleString("en-PK")}`;
const date = (value: string | number) => new Date(value).toLocaleString("en-GB", { timeZone: "Asia/Karachi" });

async function document(title: string, reference: string) {
  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(await readFile(path.join(process.cwd(), "public/assets/brand/logo-transparent.png")));
  // Standard fonts support Latin names. Unsupported glyphs are replaced rather
  // than preventing an otherwise valid financial document from downloading.
  const safe = (value: unknown) => Array.from(String(value ?? "")).map(char => {
    try { normal.encodeText(char); return char; } catch { return "?"; }
  }).join("").replace(/[\r\n\t]/g, " ");
  let page = pdf.addPage([612, 792]), y = 0;
  const text = (value: unknown, x: number, top: number, size = 10, strong = false, color = green) =>
    page.drawText(safe(value), { x, y: top, size, font: strong ? bold : normal, color });
  function next() {
    if (y) page = pdf.addPage([612, 792]);
    page.drawImage(logo, { x: 42, y: 682, width: 92, height: 92 * logo.height / logo.width });
    text(title, 166, 731, 20, true);
    text(reference, 166, 710, 10, false, grey);
    page.drawLine({ start: { x: 42, y: 670 }, end: { x: 570, y: 670 }, thickness: 1, color: gold });
    y = 644;
  }
  function line(label: string, value = "", strong = false) {
    if (y < 80) next();
    const available = value ? 350 : 528;
    const words = safe(label).split(/\s+/);
    let row = "";
    for (const word of words) {
      if (normal.widthOfTextAtSize(`${row} ${word}`, 10) > available && row) {
        text(row, 42, y, 10, strong); y -= 16; row = word;
        if (y < 80) next();
      } else row = `${row} ${word}`.trim();
    }
    text(row, 42, y, 10, strong);
    if (value) text(value, 570 - (strong ? bold : normal).widthOfTextAtSize(safe(value), 10), y, 10, strong);
    y -= 23;
  }
  next();
  return { pdf, line, gap: () => { y -= 13; }, async finish() {
    pdf.getPages().forEach((p, index, pages) => p.drawText(`Nourish Spoon | ${index + 1} / ${pages.length} | All amounts in PKR`, { x: 42, y: 35, size: 9, font: normal, color: grey }));
    pdf.setTitle(title); pdf.setAuthor("Nourish Spoon");
    return pdf.save();
  } };
}

export async function receiptPdf(order: Data) {
  if (order.quote_pending || !Number.isSafeInteger(order.total) || order.total < 0)
    throw new Error("Your final amount is awaiting confirmation. Please download the receipt after it is confirmed.");
  const expected = order.subtotal + order.delivery_fee - order.discount;
  if (!Number.isSafeInteger(order.refunded_eligible_spend || 0) || (order.refunded_eligible_spend || 0) < 0 || (order.refunded_eligible_spend || 0) > order.subtotal - order.discount) throw new Error("The refund amount needs verification. Please contact Nourish Spoon.");
  if (![order.subtotal, order.delivery_fee, order.discount].every(Number.isSafeInteger) || expected !== order.total)
    throw new Error("The order amount needs verification. Please contact Nourish Spoon.");
  if (!Array.isArray(order.items) || !order.items.length || order.items.reduce((sum: number, item: Data) => sum + item.total_price, 0) !== order.subtotal)
    throw new Error("The order items need verification. Please contact Nourish Spoon.");
  const status = order.payment_status === "paid" ? "PAID" : order.payment_status === "refunded" ? "REFUNDED" : order.payment_status === "submitted" ? "PAYMENT UNDER REVIEW" : "AWAITING PAYMENT";
  const doc = await document("Order Receipt", String(order.order_number || order.id));
  doc.line(`Payment status: ${status}`, "", true);
  doc.line(`Order placed: ${date(order.created_at)}`);
  if (order.paid_at && order.payment_status === "paid") doc.line(`Payment received: ${date(order.paid_at)}`);
  doc.line(`Customer: ${order.customer_name || order.customer_email || "Customer"}`);
  doc.line(`Payment method: ${String(order.payment_method_code).replaceAll("_", " ")}`);
  doc.gap(); doc.line("ITEMS", "AMOUNT", true);
  for (const item of order.items || []) {
    if (!Number.isSafeInteger(item.total_price) || item.total_price !== item.unit_price * item.quantity)
      throw new Error("An order item needs verification. Please contact Nourish Spoon.");
    doc.line(`${item.product_name} (${item.variant_weight})`, money(item.total_price), true);
    doc.line(`${item.quantity} x ${money(item.unit_price)}`);
  }
  doc.gap(); doc.line("Subtotal", money(order.subtotal));
  if (order.discount) doc.line("Discounts and rewards", `- ${money(order.discount)}`);
  doc.line("Delivery charges", money(order.delivery_fee));
  doc.line("ORDER TOTAL", money(order.total), true);
  if (order.refunded_eligible_spend) doc.line("Food refund recorded", `- ${money(order.refunded_eligible_spend)}`);
  doc.line(order.payment_status === "paid" ? "NET AMOUNT PAID" : "AMOUNT PAID (currently verified)", money(order.payment_status === "paid" ? order.total - (order.refunded_eligible_spend || 0) : 0), true);
  if (order.payment_status !== "paid") doc.line("This document does not confirm payment received.");
  return doc.finish();
}

export async function revenuePdf(report: ReturnType<typeof salesReport>, period: "weekly" | "monthly") {
  const summary = report[period];
  const doc = await document(`${period === "weekly" ? "Weekly" : "Monthly"} Revenue`, "Money received from Paid orders");
  doc.line(`Period: ${date(summary.from)} to ${date(summary.until)} (Pakistan time)`);
  doc.line("REVENUE RECEIVED", money(summary.total), true);
  doc.line("Paid orders", String(summary.orders));
  doc.line("Final order amounts after discounts and recorded food refunds, including delivery. Fully refunded payments are excluded.");
  doc.gap(); doc.line("DAILY TOTALS", "RECEIVED", true);
  for (const point of summary.points) doc.line(`${point.date} | ${point.orders} paid orders`, money(point.revenue));
  doc.gap(); doc.line("PAID ORDERS", "RECEIVED", true);
  if (!summary.payments.length) doc.line("No paid orders in this period.");
  for (const payment of summary.payments) doc.line(`${payment.orderNumber} | ${date(payment.at)}${payment.legacyDate ? " (legacy order date)" : ""}`, money(payment.amount));
  doc.gap();
  if (report.accounting.legacyPaymentDates) doc.line("Older orders without a recorded payment date use their order date.");
  if (report.accounting.invalidPaidOrders) doc.line(`${report.accounting.invalidPaidOrders} paid order(s) excluded because their final amount needs verification.`);
  doc.line("This report is a snapshot of the shared order database at download time.");
  return doc.finish();
}
