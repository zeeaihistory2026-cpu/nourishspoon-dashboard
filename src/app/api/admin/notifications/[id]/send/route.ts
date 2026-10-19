import { authErrorResponse, requireAdminMutation } from "@/lib/auth-server";
import { broadcastNotification } from "@/lib/broadcast-notification";

export const maxDuration = 60;
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdminMutation(request);
    const { id } = await ctx.params;
    return Response.json(await broadcastNotification(id, admin));
  } catch (error) {
    return authErrorResponse(error);
  }
}
