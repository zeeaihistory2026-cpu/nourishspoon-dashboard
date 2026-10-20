import "server-only";
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  type App,
} from "firebase-admin/app";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";
export class FirebaseConfigurationError extends Error {}
let cached: App | undefined;
export function getAdmin(): App {
  if (cached) return cached;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (
    !projectId ||
    (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
      projectId !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)
  )
    throw new FirebaseConfigurationError(
      "Dashboard server and customer app must use the same Firebase project.",
    );
  const emulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  if (
    process.env.FIREBASE_AUTH_EMULATOR_HOST &&
    (!emulator ||
      !/^(127\.0\.0\.1|localhost):\d+$/.test(
        process.env.FIREBASE_AUTH_EMULATOR_HOST,
      ))
  )
    throw new FirebaseConfigurationError(
      "Authentication emulation requires the isolated local database.",
    );
  if (
    emulator &&
    (projectId !== "demo-nourish-spoon" ||
      !/^(127\.0\.0\.1|localhost):\d+$/.test(
        process.env.FIRESTORE_EMULATOR_HOST!,
      ))
  )
    throw new FirebaseConfigurationError(
      "Local testing requires the isolated demo project and local emulators.",
    );
  const existing = getApps().find((app) => app.name === "nourish-dashboard");
  if (existing) {
    cached = existing;
    return cached;
  }
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (
    !emulator &&
    !(clientEmail && privateKey) &&
    !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
    !process.env.K_SERVICE
  )
    throw new FirebaseConfigurationError(
      "Dashboard server credentials are not configured. Add Firebase Admin credentials for the app's project.",
    );
  cached = initializeApp(
    {
      projectId,
      ...(emulator
        ? {}
        : {
            credential:
              clientEmail && privateKey
                ? cert({ projectId, clientEmail, privateKey })
                : applicationDefault(),
          }),
      storageBucket:
        process.env.FIREBASE_STORAGE_BUCKET ||
        process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    },
    "nourish-dashboard",
  );
  return cached;
}
export const adminDb = () => getFirestore(getAdmin());
export const adminAuth = () => getAuth(getAdmin());
export const adminStorage = () => getStorage(getAdmin());
export const adminMessaging = () => getMessaging(getAdmin());
export { FieldValue, Timestamp };
export function toJSON<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_key, value) =>
      value && typeof value === "object" && typeof value.toDate === "function"
        ? value.toDate().toISOString()
        : value && typeof value === "object" && "_seconds" in value
          ? new Date(value._seconds * 1000).toISOString()
          : value,
    ),
  );
}
export function docToJSON(
  snapshot: DocumentSnapshot,
): Record<string, unknown> | null {
  return snapshot.exists
    ? { ...toJSON(snapshot.data()!), id: snapshot.id }
    : null;
}
