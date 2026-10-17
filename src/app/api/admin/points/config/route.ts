import { requireAdmin, assertSameOrigin, AuthError, authErrorResponse } from "@/lib/auth-server";
import { adminDb, adminAuth, docToJSON } from "@/lib/firebase-admin";

import { z } from "zod";
import { rules } from "@/lib/rewards-server";
const schema=z.object({spendPerPoint:z.number().int().min(1).max(100000),redeemValuePerPoint:z.number().int().min(1).max(100000),minRedeemPoints:z.number().int().min(1).max(100000),referralReward:z.number().int().min(0).max(100000),isActive:z.boolean(),notes:z.string().max(2000).default("")});
function view(value:ReturnType<typeof rules.rewardsConfig>,notes=""){return {spendPerPoint:value.spend_per_point,redeemValuePerPoint:value.point_value,minRedeemPoints:value.minimum_redemption,referralReward:value.referral_points,isActive:value.enabled,notes};}
export async function GET(){try{await requireAdmin();const db=adminDb();const [settings,notes]=await Promise.all([db.doc("settings/rewards").get(),db.doc("adminSettings/rewards").get()]);return Response.json({item:view(rules.rewardsConfig(settings.data()),notes.data()?.notes)});}catch(error){return authErrorResponse(error);}}
export async function PUT(request:Request){try{assertSameOrigin(request);const admin=await requireAdmin();const input=schema.parse(await request.json());const config=rules.rewardsConfig({enabled:input.isActive,spend_per_point:input.spendPerPoint,point_value:input.redeemValuePerPoint,minimum_redemption:input.minRedeemPoints,referral_points:input.referralReward});const db=adminDb();const batch=db.batch();batch.set(db.doc("settings/rewards"),config);batch.set(db.doc("adminSettings/rewards"),{notes:input.notes,updated_by:admin.uid,updated_at:new Date().toISOString()});await batch.commit();return Response.json({item:view(config,input.notes)});}catch(error){return authErrorResponse(error);}}

