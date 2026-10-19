import { crudItemRoutes } from "@/lib/crud-factory";
import { productSchema } from "@/lib/schemas";
import { slugify } from "@/lib/format";

const { GET, PATCH, DELETE } = crudItemRoutes({
  collection: "products",
  createSchema: productSchema,
  updateSchema: productSchema.partial(),
  // Soft delete: historical order lines keep their snapshots; product is hidden.
  softDelete: true,
  beforeCreate: undefined,
});

// Keep slug in sync when the name changes via PATCH
async function PATCHwithSlug(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => ({}));
  const wrapped = new Request(req.url, {
    method: "PATCH",
    headers: req.headers,
    body: JSON.stringify(
      body && typeof body.name === "string" && !body.slug
        ? { ...body, slug: slugify(body.name) }
        : body
    ),
  });
  return PATCH(wrapped, ctx);
}

export { GET, DELETE };
export { PATCHwithSlug as PATCH };
