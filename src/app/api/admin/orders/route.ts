import { requireAdmin, assertSameOrigin, AuthError, authErrorResponse } from "@/lib/auth-server";

import { recentOrders } from "@/lib/orders-data";
import { boundedLimit } from "@/lib/contracts";
export async function GET(request: Request) {
  try {
    await requireAdmin(); const params=new URL(request.url).searchParams;
    const limit=boundedLimit(params.get("limit"));
    const loaded=await recentOrders(limit); const search=(params.get("search")||"").trim().toLowerCase(); const status=params.get("status");
    const items=loaded.map(row=>row.item).filter(order=>(!status||order.orderStatus===status)&&(!search||[order.orderNumber,order.customerName,order.customerEmail,order.customerPhone].join(" ").toLowerCase().includes(search)));
    return Response.json({items,total:items.length,hasMore:loaded.length===limit});
  } catch(error){return authErrorResponse(error);}
}

