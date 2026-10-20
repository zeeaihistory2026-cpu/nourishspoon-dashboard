import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export async function GET() {
  try {
    await adminDb().doc("settings/commerce").get();
    return Response.json(
      {
        status: "ok",
        commerce: true,
        schemaVersion: "commerce-2026-10-20-fulfilment",
        projectId:
          process.env.FIREBASE_PROJECT_ID ||
          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "configuration_required", commerce: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
