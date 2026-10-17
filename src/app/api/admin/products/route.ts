import { crudRoutes } from "@/lib/crud-factory";
import { productSchema } from "@/lib/schemas";
import { slugify } from "@/lib/format";

const { GET, POST } = crudRoutes({
  collection: "products",
  createSchema: productSchema,
  // Order by name (every product has one) — orderBy("updatedAt") silently
  // excluded app-seeded products that lack updatedAt, so they never loaded.
  orderBy: "name",
  orderDir: "asc",
  searchFields: ["name", "categoryName", "slug"],
  pageSize: 300,
  beforeCreate: (data) => {
    if (!data.slug && typeof data.name === "string") data.slug = slugify(data.name);
    if (typeof data.rating !== "number") data.rating = 0;
    if (typeof data.reviewCount !== "number") data.reviewCount = 0;
  },
});

export { GET, POST };
