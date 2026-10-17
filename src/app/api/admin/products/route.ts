import { requireAdmin, assertSameOrigin, AuthError, authErrorResponse } from "@/lib/auth-server";
import { adminDb, docToJSON } from "@/lib/firebase-admin";

import { productSchema } from "@/lib/schemas";
import { productView,productWrite,boundedLimit } from "@/lib/contracts";
export async function GET(request:Request){try{await requireAdmin();const params=new URL(request.url).searchParams;const search=(params.get("search")||"").toLowerCase();const snapshot=await adminDb().collection("products").limit(boundedLimit(params.get("limit"),300)).get();const items=snapshot.docs.filter(doc=>!doc.data().deletedAt).map(doc=>productView(doc.id,doc.data())).filter(item=>!search||[item.name,item.slug,item.categoryName].join(" ").toLowerCase().includes(search)).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));return Response.json({items,total:items.length});}catch(error){return authErrorResponse(error);}}
export async function POST(request:Request){try{assertSameOrigin(request);const admin=await requireAdmin();const input=productSchema.parse(await request.json());const reference=adminDb().collection("products").doc();const data={...productWrite(reference.id,input),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),updated_by:admin.uid};await reference.create(data);return Response.json({item:productView(reference.id,data)},{status:201});}catch(error){return authErrorResponse(error);}}

