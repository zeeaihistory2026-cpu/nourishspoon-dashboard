import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin, authErrorResponse, AuthError } from "@/lib/auth-server";
import { salesReport } from "@/lib/sales";
import { revenuePdf } from "@/lib/pdf-documents";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const period = new URL(request.url).searchParams.get("period");
    if (period !== "weekly" && period !== "monthly") throw new AuthError(400, "Choose weekly or monthly.");
    const orders = await adminDb().collection("orders").select("total", "refunded_eligible_spend", "order_number", "payment_status", "paymentStatus", "paid_at", "quote_pending", "created_at", "createdAt").get();
    const report = salesReport(orders.docs.map(doc => ({ ...doc.data(), id: doc.id })));
    const bytes = await revenuePdf(report, period);
    return new Response(Buffer.from(bytes), { headers: {
      "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="Nourish-Spoon-${period}-revenue.pdf"`, "Cache-Control": "private, no-store",
    } });
  } catch (error) { return authErrorResponse(error); }
}
