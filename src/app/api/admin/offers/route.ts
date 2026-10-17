import { crudRoutes } from "@/lib/crud-factory";
import { couponSchema } from "@/lib/schemas";

const { GET, POST } = crudRoutes({
  collection: "coupons",
  createSchema: couponSchema,
  orderBy: "updatedAt",
  orderDir: "desc",
  searchFields: ["code", "description"],
  beforeCreate: (data) => {
    if (typeof data.code === "string") data.code = data.code.trim().toUpperCase();
    data.usageCount = 0;
  },
});

export { GET, POST };
