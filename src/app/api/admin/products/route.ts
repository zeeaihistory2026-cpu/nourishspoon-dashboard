import { crudRoutes } from "@/lib/crud-factory";
import { productSchema } from "@/lib/schemas";
import { slugify } from "@/lib/format";

const { GET, POST } = crudRoutes({
  collection: "products",
  createSchema: productSchema,
  orderBy: "updatedAt",
  orderDir: "desc",
  searchFields: ["name", "categoryName", "slug"],
  pageSize: 300,
  beforeCreate: (data) => {
    if (!data.slug && typeof data.name === "string") data.slug = slugify(data.name);
    if (typeof data.rating !== "number") data.rating = 0;
    if (typeof data.reviewCount !== "number") data.reviewCount = 0;
  },
});

export { GET, POST };
