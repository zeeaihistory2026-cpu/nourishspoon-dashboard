import { authErrorResponse, requireAdmin } from "@/lib/auth-server";
import { adminDb } from "@/lib/firebase-admin";

import { boundedLimit, newest, reviewView } from "@/lib/contracts";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const params = new URL(request.url).searchParams;
    const snapshot = await adminDb()
      .collection("reviews")
      .limit(boundedLimit(params.get("limit")))
      .get();
    const search = (params.get("search") || "").toLowerCase();
    const visibility = params.get("visibility");
    const items = snapshot.docs
      .map((doc) => reviewView(doc.id, doc.data()))
      .sort(newest)
      .filter(
        (row) =>
          (!visibility || row.visibility === visibility) &&
          (!search ||
            [row.userName, row.productName, row.comment]
              .join(" ")
              .toLowerCase()
              .includes(search)),
      );
    return Response.json({ items, total: items.length });
  } catch (error) {
    return authErrorResponse(error);
  }
}
