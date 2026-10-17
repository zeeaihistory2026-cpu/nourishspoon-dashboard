import "server-only";
import { z } from "zod";
import {
  adminDb,
  docToJSON,
  toJSON,
  FieldValue,
  Timestamp,
} from "./firebase-admin";
import { requireAdmin, assertSameOrigin, authErrorResponse } from "./auth-server";

export interface CrudOptions {
  collection: string;
  /** zod schema for POST */
  createSchema: z.ZodTypeAny;
  /** zod schema for PATCH (defaults to partial of createSchema when it is a ZodObject) */
  updateSchema?: z.ZodTypeAny;
  /** soft-delete (sets isActive=false + deletedAt) instead of hard delete */
  softDelete?: boolean;
  /** default ordering */
  orderBy?: string;
  orderDir?: "asc" | "desc";
  /** fields searched by ?search= (case-insensitive substring, in-memory) */
  searchFields?: string[];
  /** max docs read per list call */
  pageSize?: number;
  /** hook to enrich/transform a doc before returning */
  mapDoc?: (doc: Record<string, unknown>) => Record<string, unknown>;
  /** hook before create (may mutate data) */
  beforeCreate?: (data: Record<string, unknown>, admin: { uid: string; email?: string }) => void | Promise<void>;
  /** guard before delete, e.g. onboarding "at least one active" rule */
  beforeDelete?: (doc: Record<string, unknown>) => void | Promise<void>;
}

function zodError(e: z.ZodError) {
  const first = e.issues[0];
  return Response.json(
    { error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid data." },
    { status: 400 }
  );
}

function stamp(data: Record<string, unknown>, admin: { uid: string; email?: string }, isCreate: boolean) {
  if (isCreate) {
    data.createdAt = FieldValue.serverTimestamp();
    data.createdBy = admin.uid;
    if (admin.email) data.createdByEmail = admin.email;
  }
  data.updatedAt = FieldValue.serverTimestamp();
  data.updatedBy = admin.uid;
  if (admin.email) data.updatedByEmail = admin.email;
  return data;
}

export function crudRoutes(opts: CrudOptions) {
  const updateSchema =
    opts.updateSchema ??
    (opts.createSchema instanceof z.ZodObject ? opts.createSchema.partial() : opts.createSchema);

  async function GET(req: Request) {
    try {
      await requireAdmin();
      const db = adminDb();
      const url = new URL(req.url);
      const search = (url.searchParams.get("search") ?? "").toLowerCase().trim();
      const limit = Math.max(1, Math.min(
        parseInt(url.searchParams.get("limit") ?? String(opts.pageSize ?? 200), 10) || 200,
        1000
      ));

      let q: FirebaseFirestore.Query = db.collection(opts.collection);
      if (opts.orderBy) q = q.orderBy(opts.orderBy, opts.orderDir ?? "desc");
      const snap = await q.limit(limit).get();

      let docs = snap.docs
        .map((d) => docToJSON(d))
        .filter((d): d is Record<string, unknown> => d !== null);
      if (opts.mapDoc) docs = docs.map(opts.mapDoc);

      if (search && opts.searchFields?.length) {
        docs = docs.filter((d) =>
          opts.searchFields!.some((f) =>
            String(d[f] ?? "").toLowerCase().includes(search)
          )
        );
      }
      return Response.json({ items: docs, total: docs.length });
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err);
      return authErrorResponse(err);
    }
  }

  async function POST(req: Request) {
    try {
      assertSameOrigin(req);
      const admin = await requireAdmin();
      const body = await req.json();
      const parsed = (await opts.createSchema.parseAsync(body)) as Record<string, unknown>;
      if (opts.beforeCreate) await opts.beforeCreate(parsed, { uid: admin.uid, email: (admin.email as string) ?? undefined });
      stamp(parsed, { uid: admin.uid, email: (admin.email as string) ?? undefined }, true);
      const ref = await adminDb().collection(opts.collection).add(parsed);
      const snap = await ref.get();
      return Response.json({ item: docToJSON(snap) }, { status: 201 });
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err);
      return authErrorResponse(err);
    }
  }

  return { GET, POST };
}

export function crudItemRoutes(opts: CrudOptions) {
  const updateSchema =
    opts.updateSchema ??
    (opts.createSchema instanceof z.ZodObject ? opts.createSchema.partial() : opts.createSchema);

  async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
      await requireAdmin();
      const { id } = await ctx.params;
      const snap = await adminDb().collection(opts.collection).doc(id).get();
      const doc = docToJSON(snap);
      if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
      return Response.json({ item: opts.mapDoc ? opts.mapDoc(doc) : doc });
    } catch (err) {
      return authErrorResponse(err);
    }
  }

  async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
      assertSameOrigin(req);
      const admin = await requireAdmin();
      const { id } = await ctx.params;
      const body = await req.json();
      const parsed = (await updateSchema.parseAsync(body)) as Record<string, unknown>;
      // Strip undefined so partial updates don't null fields
      for (const k of Object.keys(parsed)) if (parsed[k] === undefined) delete parsed[k];
      stamp(parsed, { uid: admin.uid, email: (admin.email as string) ?? undefined }, false);
      const ref = adminDb().collection(opts.collection).doc(id);
      const snap = await ref.get();
      if (!snap.exists) return Response.json({ error: "Not found." }, { status: 404 });
      await ref.update(parsed);
      const updated = await ref.get();
      return Response.json({ item: docToJSON(updated) });
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err);
      return authErrorResponse(err);
    }
  }

  async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
    try {
      assertSameOrigin(_req);
      const admin = await requireAdmin();
      const { id } = await ctx.params;
      const ref = adminDb().collection(opts.collection).doc(id);
      const snap = await ref.get();
      const doc = docToJSON(snap);
      if (!doc) return Response.json({ error: "Not found." }, { status: 404 });
      if (opts.beforeDelete) await opts.beforeDelete(doc);
      if (opts.softDelete) {
        await ref.update({
          isActive: false,
          deletedAt: FieldValue.serverTimestamp(),
          deletedBy: admin.uid,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: admin.uid,
        });
      } else {
        await ref.delete();
      }
      return Response.json({ ok: true });
    } catch (err) {
      if (err instanceof z.ZodError) return zodError(err);
      if (err instanceof Error && err.message.startsWith("GUARD:")) {
        return Response.json({ error: err.message.replace("GUARD:", "").trim() }, { status: 400 });
      }
      return authErrorResponse(err);
    }
  }

  return { GET, PATCH, DELETE };
}

/** Convenience: coerce Firestore Timestamp-ish values for date math. */
export function tsMillis(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "string") {
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === "object" && v !== null && "_seconds" in v) {
    return (v as { _seconds: number })._seconds * 1000;
  }
  return 0;
}

export { toJSON };
