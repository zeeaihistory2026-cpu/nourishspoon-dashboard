import { requireAdmin, assertSameOrigin, AuthError, authErrorResponse } from "@/lib/auth-server";
import { adminDb, adminAuth, docToJSON } from "@/lib/firebase-admin";

import {couponSchema} from "@/lib/schemas";
import {offerView,offerWrite} from "@/lib/offers-server";
import {rules} from "@/lib/rewards-server";
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const admin=await requireAdmin();const {id}=await context.params;const data=offerWrite(couponSchema.parse(await request.json()));if(data.code!==id)throw new AuthError(400,"Create a new offer to use a different promo code.");await adminDb().collection("promoCodes").doc(id).set({...data,updated_by:admin.uid,updated_at:new Date().toISOString()},{merge:true});return Response.json({item:offerView(id,data)});}catch(error){return authErrorResponse(error);}}
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const admin=await requireAdmin();const {id}=await context.params;const reference=adminDb().collection("promoCodes").doc(id);const snapshot=await reference.get();const data=snapshot.data()||(id==="PROMO10"?rules.DEFAULT_PROMO:null);if(!data)throw new AuthError(404,"Offer not found.");await reference.set({...data,active:false,updated_at:new Date().toISOString(),updated_by:admin.uid});return Response.json({ok:true});}catch(error){return authErrorResponse(error);}}

