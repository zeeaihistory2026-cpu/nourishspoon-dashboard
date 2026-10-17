import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";

let cached: App | null = null;

function readPrivateKey(): string {
  const raw = process.env.FIREBASE_PRIVATE_KEY ?? "";
  // Vercel-style escaped newlines
  return raw.replace(/\\n/g, "\n");
}

/** Lazily initialised Admin SDK. Throws a descriptive error when env is missing. */
export function getAdmin(): App {
  if (cached) return cached;
  const existing = getApps();
  if (existing.length) {
    cached = existing[0]!;
    return cached;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = readPrivateKey();
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY."
    );
  }
  cached = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
  return cached;
}

export const adminDb = () => getFirestore(getAdmin());
export const adminAuth = () => getAuth(getAdmin());
export const adminStorage = () => getStorage(getAdmin());
export const adminMessaging = () => getMessaging(getAdmin());
export { FieldValue, Timestamp };

export function toJSON<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_k, v) =>
      v && typeof v === "object" && "_seconds" in v
        ? new Date((v as { _seconds: number })._seconds * 1000).toISOString()
        : v
    )
  );
}

export function docToJSON(
  snap: DocumentSnapshot
): Record<string, unknown> | null {
  if (!snap.exists) return null;
  const data = toJSON(snap.data() as Record<string, unknown>);
  return { id: snap.id, ...data };
}
