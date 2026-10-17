import { requireAdmin, assertSameOrigin, AuthError, authErrorResponse } from "@/lib/auth-server";
import { adminDb, docToJSON } from "@/lib/firebase-admin";

import { z } from "zod";
import { trackingView, orderStates } from "@/lib/contracts";
import { updateOrderRecord } from "@/lib/commerce-server";
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){try{await requireAdmin();const {id}=await context.params;const snapshot=await adminDb().collection("orders").doc(id).get();if(!snapshot.exists)throw new AuthError(404,"Order not found.");return Response.json({item:trackingView(id,snapshot.data()!)});}catch(error){return authErrorResponse(error);}}
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const admin=await requireAdmin();const {id}=await context.params;const input=z.object({trackingNumber:z.string().regex(/^\d{8,20}$/,"Enter an 8-20 digit TCS consignment number.").optional(),milestone:z.object({key:z.enum(orderStates),label:z.string().optional()}).optional()}).parse(await request.json());const updated=await updateOrderRecord({id,...(input.trackingNumber!==undefined?{tracking_number:input.trackingNumber}:{}),status:input.milestone?.key},admin);return Response.json({item:trackingView(id,updated)});}catch(error){return authErrorResponse(error);}}

