import { authErrorResponse, requireAdmin } from "@/lib/auth-server";

import { boundedLimit } from "@/lib/contracts";
import { recentOrders } from "@/lib/orders-data";
import { requireAdminMutation } from "@/lib/auth-server";
import { createWhatsAppOrderRecord } from "@/lib/commerce-server";
import { orderView } from "@/lib/contracts";
import { z } from "zod";

const manualOrderSchema = z.object({
  request_id: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1).max(100),
        variant_id: z.string().min(1).max(120),
        quantity: z.number().int().min(1).max(20),
      }),
    )
    .min(1)
    .max(10),
  address: z.object({
    name: z.string().max(80),
    phone: z.string().max(30),
    city: z.string().max(80),
    line: z.string().max(300),
  }),
  delivery_method: z.enum([
    "tcs_nationwide",
    "sargodha_sameday",
    "self_pickup",
  ]),
  payment_method: z.enum([
    "bank_transfer",
    "easypaisa",
    "jazzcash",
    "to_confirm",
  ]),
  is_gift: z.boolean().default(false),
  gift_message: z.string().max(400).default(""),
});

export async function POST(request: Request) {
  try {
    const actor = await requireAdminMutation(request);
    const input = manualOrderSchema.parse(await request.json());
    const order = await createWhatsAppOrderRecord(input, actor);
    return Response.json({ item: orderView(order.id, order) }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const limit = boundedLimit(params.get("limit"));
    const loaded = await recentOrders(limit);
    const search = (params.get("search") || "").trim().toLowerCase();
    const status = params.get("status");
    const items = loaded
      .map((row) => row.item)
      .filter(
        (order) =>
          (!status || order.orderStatus === status) &&
          (!search ||
            [
              order.orderNumber,
              order.customerName,
              order.customerEmail,
              order.customerPhone,
            ]
              .join(" ")
              .toLowerCase()
              .includes(search)),
      );
    return Response.json({
      items,
      total: items.length,
      hasMore: loaded.length === limit,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
