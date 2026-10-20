import {
  assertSameOrigin,
  authErrorResponse,
  requireAdmin,
} from "@/lib/auth-server";

import { updateOrderRecord } from "@/lib/commerce-server";
import { boundedLimit, trackingView } from "@/lib/contracts";
import { recentOrders, resolveOrderId } from "@/lib/orders-data";
import { z } from "zod";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const search = (params.get("search") || "").toLowerCase();
    const loaded = await recentOrders(boundedLimit(params.get("limit")));
    const items = loaded
      .filter((row) => row.item.trackingNumber)
      .map((row) => trackingView(row.item.id, row.raw))
      .filter(
        (row) =>
          !search ||
          [row.trackingNumber, row.orderNumber, row.customerName]
            .join(" ")
            .toLowerCase()
            .includes(search),
      );
    return Response.json({ items });
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const input = z
      .object({
        orderId: z.string().min(1).max(80),
        trackingNumber: z
          .string()
          .regex(/^\d{8,20}$/, "Enter an 8-20 digit TCS consignment number."),
      })
      .parse(await request.json());
    let orderId;
    try {
      orderId = await resolveOrderId(input.orderId);
    } catch (error) {
      return Response.json(
        { error: error instanceof Error ? error.message : "Order not found." },
        { status: 404 },
      );
    }
    const updated = await updateOrderRecord(
      { id: orderId, tracking_number: input.trackingNumber },
      admin,
    );
    return Response.json(
      { item: trackingView(orderId, updated) },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
