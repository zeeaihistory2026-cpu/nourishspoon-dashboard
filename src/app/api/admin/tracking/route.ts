import { requireAdmin, assertSameOrigin, AuthError, authErrorResponse } from "@/lib/auth-server";

import { z } from "zod";
import { recentOrders } from "@/lib/orders-data";
import { boundedLimit,trackingView } from "@/lib/contracts";
import { updateOrderRecord } from "@/lib/commerce-server";
export async function GET(request:Request){try{await requireAdmin();const params=new URL(request.url).searchParams;const search=(params.get("search")||"").toLowerCase();const loaded=await recentOrders(boundedLimit(params.get("limit")));const items=loaded.filter(row=>row.item.trackingNumber).map(row=>trackingView(row.item.id,row.raw)).filter(row=>!search||[row.trackingNumber,row.orderNumber,row.customerName].join(" ").toLowerCase().includes(search));return Response.json({items});}catch(error){return authErrorResponse(error);}}
export async function POST(request:Request){try{assertSameOrigin(request);const admin=await requireAdmin();const input=z.object({orderId:z.string().min(1).max(80),trackingNumber:z.string().regex(/^\d{8,20}$/,"Enter an 8-20 digit TCS consignment number.")}).parse(await request.json());const updated=await updateOrderRecord({id:input.orderId,tracking_number:input.trackingNumber},admin);return Response.json({item:trackingView(input.orderId,updated)},{status:201});}catch(error){return authErrorResponse(error);}}

