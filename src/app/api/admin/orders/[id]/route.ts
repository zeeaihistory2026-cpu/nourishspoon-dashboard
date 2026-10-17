import { requireAdmin, assertSameOrigin, AuthError, authErrorResponse } from "@/lib/auth-server";
import { adminDb, docToJSON } from "@/lib/firebase-admin";

import { z } from "zod";
import { orderView, trackingView, customerView, rows, orderStates, paymentStates } from "@/lib/contracts";
import { updateOrderRecord } from "@/lib/commerce-server";
const schema=z.object({orderStatus:z.enum(orderStates).optional(),paymentStatus:z.enum(paymentStates).optional(),deliveryFee:z.number().int().min(0).max(10000).optional(),trackingNumber:z.string().max(20).optional(),note:z.string().max(500).optional()});
export async function GET(_request:Request,context:{params:Promise<{id:string}>}) {
  try {
    await requireAdmin();const {id}=await context.params;const db=adminDb();const snapshot=await db.collection("orders").doc(id).get();
    if(!snapshot.exists)throw new AuthError(404,"Order not found.");const raw=snapshot.data()!;const item=orderView(id,raw);
    const [customer,events]=await Promise.all([item.userId?db.collection("users").doc(item.userId).get():null,snapshot.ref.collection("events").orderBy("at","desc").limit(50).get()]);
    return Response.json({item,customer:customer?.exists?customerView(customer.id,customer.data()!):null,tracking:trackingView(id,raw),events:events.empty?rows(raw.status_history).map((event,index)=>({id:String(index),to:event.status,at:event.at})).reverse():events.docs.map(docToJSON)});
  } catch(error){return authErrorResponse(error);}
}
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}) {
  try {assertSameOrigin(request);const admin=await requireAdmin();const {id}=await context.params;const input=schema.parse(await request.json());
    const updated=await updateOrderRecord({id,status:input.orderStatus,payment_status:input.paymentStatus,...(input.deliveryFee!==undefined?{delivery_fee:input.deliveryFee}:{}),...(input.trackingNumber!==undefined?{tracking_number:input.trackingNumber}:{}),note:input.note},admin);
    return Response.json({item:orderView(id,updated)});
  } catch(error){return authErrorResponse(error);}
}

