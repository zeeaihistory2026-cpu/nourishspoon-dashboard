/**
 * Temporary diagnostic endpoint — reports server environment status WITHOUT
 * exposing secret values. Used to diagnose the Vercel 500. Remove after fix.
 */
export async function GET() {
  const diag: Record<string, unknown> = {
    node: process.version,
    vercel: process.env.VERCEL === "1",
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyLength: (process.env.FIREBASE_PRIVATE_KEY ?? "").length,
    hasAdminEmails: !!process.env.ADMIN_EMAILS,
    hasStorageBucket: !!process.env.FIREBASE_STORAGE_BUCKET,
  };
  try {
    const mod = await import("@/lib/firebase-admin");
    diag.importOk = true;
    try {
      mod.getAdmin();
      diag.initOk = true;
    } catch (e) {
      diag.initOk = false;
      diag.initError = e instanceof Error ? e.message : String(e);
    }
  } catch (e) {
    diag.importOk = false;
    diag.importError = e instanceof Error ? `${e.message}\n${e.stack ?? ""}` : String(e);
  }
  return Response.json(diag);
}
