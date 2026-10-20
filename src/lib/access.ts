import "server-only";
import { adminDb, toJSON } from "./firebase-admin";

export type AccessRole = "admin" | "child";

export interface AccessUser {
  email: string;
  name: string;
  role: AccessRole;
  createdAt?: string;
  createdBy?: string;
}

const COLLECTION = "adminAccess";

/** Doc id is the lowercased email (Firestore ids allow dots). */
function docId(email: string) {
  return email.trim().toLowerCase();
}

export async function getAccessRecord(
  email: string,
): Promise<AccessUser | null> {
  if (!email) return null;
  const snap = await adminDb().collection(COLLECTION).doc(docId(email)).get();
  if (!snap.exists) return null;
  const data = toJSON(
    snap.data() as Record<string, unknown>,
  ) as Partial<AccessUser>;
  if (data.role !== "admin" && data.role !== "child") return null;
  return {
    email: (data.email as string) ?? email.toLowerCase(),
    name: (data.name as string) ?? "",
    role: data.role,
    createdAt: data.createdAt as string | undefined,
    createdBy: data.createdBy as string | undefined,
  };
}

export async function listAccessUsers(): Promise<AccessUser[]> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs
    .filter((d) => ["admin", "child"].includes(d.data().role))
    .map((d) => {
      const data = toJSON(
        d.data() as Record<string, unknown>,
      ) as Partial<AccessUser>;
      return {
        email: (data.email as string) ?? d.id,
        name: (data.name as string) ?? "",
        role: data.role === "child" ? "child" : "admin",
        createdAt: data.createdAt as string | undefined,
        createdBy: data.createdBy as string | undefined,
      };
    });
}

export async function upsertAccessUser(
  input: { email: string; name: string; role: AccessRole },
  createdBy: string,
): Promise<AccessUser> {
  const email = input.email.trim().toLowerCase();
  const user: AccessUser = {
    email,
    name: input.name.trim(),
    role: input.role,
    createdAt: new Date().toISOString(),
    createdBy,
  };
  const ref = adminDb().collection(COLLECTION).doc(docId(email));
  await adminDb().runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      user.createdAt = existing.data()?.createdAt || user.createdAt;
      user.createdBy = existing.data()?.createdBy || createdBy;
    }
    tx.set(ref, user);
  });
  return user;
}

export async function removeAccessUser(email: string): Promise<void> {
  await adminDb().collection(COLLECTION).doc(docId(email)).delete();
}
