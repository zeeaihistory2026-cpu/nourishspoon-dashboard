import { requireAdmin, assertSameOrigin, AuthError, authErrorResponse } from "@/lib/auth-server";
import { adminDb, docToJSON } from "@/lib/firebase-admin";

import { reviewModerateSchema } from "@/lib/schemas";
import {reviewView} from "@/lib/contracts";
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const admin=await requireAdmin();const {id}=await context.params;const input=reviewModerateSchema.parse(await request.json());const reference=adminDb().collection("reviews").doc(id);await reference.update({status:["visible","featured"].includes(input.visibility)?"approved":"hidden",is_featured:input.visibility==="featured",moderated_by:admin.uid,moderated_at:new Date().toISOString()});const snapshot=await reference.get();return Response.json({item:reviewView(id,snapshot.data()!)});}catch(error){return authErrorResponse(error);}}

