import { normalizeProduct } from "../server-shared/catalog/normalizeProduct.js";

export type Data = Record<string, any>;
export class ContractError extends Error {}
export const rows = (value: unknown): Data[] =>
  Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object")
    : [];
export function iso(value: any): string | null {
  if (typeof value === "string")
    return Number.isFinite(Date.parse(value)) ? value : null;
  if (value?.toDate) return value.toDate().toISOString();
  const seconds = value?._seconds ?? value?.seconds;
  return typeof seconds === "number"
    ? new Date(seconds * 1000).toISOString()
    : null;
}
export const boundedLimit = (value: string | null, fallback = 200) =>
  Math.max(1, Math.min(1000, Math.trunc(Number(value) || fallback)));
export const newest = (a: Data, b: Data) =>
  String(b.createdAt ?? b.updatedAt ?? "").localeCompare(
    String(a.createdAt ?? a.updatedAt ?? ""),
  );
export const orderStates = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export const paymentStates = [
  "awaiting_payment",
  "submitted",
  "paid",
  "refunded",
] as const;
const categoryLabels: Record<string, string> = {
  panjeeri: "Panjeeri",
  energy_balls: "Energy Balls",
  combos: "Combos",
};

/** Camel-case view models keep the supplied dashboard design; stored fields remain canonical. */
export function productView(id: string, raw: Data) {
  const product = normalizeProduct(id, raw);
  const variants = product.variants.map((variant) => ({
    id: variant.id,
    label: variant.weight,
    price: variant.sale_price ?? variant.regular_price,
    compareAtPrice: variant.regular_price,
    stock: variant.stock,
    active: variant.active,
  }));
  const activeVariant = variants.find((item) => item.active) || variants[0];
  return {
    id,
    name: product.name,
    slug: product.slug ?? id,
    description: product.short_description,
    categoryId: product.category,
    categoryName: categoryLabels[product.category] || product.category,
    price: activeVariant?.price ?? 0,
    compareAtPrice: activeVariant?.compareAtPrice,
    weight: activeVariant?.label ?? "",
    variants,
    stock:
      product.legacy_stock ??
      (variants.some((variant) => variant.stock != null)
        ? variants.reduce((total, variant) => total + (variant.stock ?? 0), 0)
        : null),
    inventoryMode:
      raw.inventory_mode === "per_variant" ? "per_variant" : "aggregate",
    images: raw.featured_image
      ? [raw.featured_image]
      : Array.isArray(raw.images)
        ? raw.images
        : [],
    ingredients: (product.ingredients ?? []).map((item) => ({
      name: item.name,
      imageUrl: item.image_url ?? "",
    })),
    benefits: Array.isArray(raw.benefits)
      ? raw.benefits.map((item) =>
          typeof item === "string" ? { icon: "leaf", label: item } : item,
        )
      : [],
    rating: raw.average_rating ?? raw.rating ?? 0,
    reviewCount: product.review_count,
    isFeatured: product.is_featured,
    isActive: product.active && !raw.deletedAt,
    sortOrder: product.sort_order,
    createdAt: iso(raw.created_at ?? raw.createdAt),
    updatedAt: iso(raw.updated_at ?? raw.updatedAt),
  };
}
export function productWrite(id: string, input: Data, existing: Data = {}) {
  const previous = normalizeProduct(id, existing);
  const next: Data = {};
  for (const key of ["name", "slug", "images"])
    if (input[key] !== undefined) next[key] = input[key];
  if (input.benefits !== undefined)
    next.benefits = rows(input.benefits).map((item) => item.label);
  if (input.description !== undefined)
    next.short_description = input.description;
  if (input.categoryId !== undefined) next.category = input.categoryId;
  if (input.isActive !== undefined) {
    next.active = input.isActive;
    next.isActive = input.isActive;
  }
  if (input.isFeatured !== undefined) next.is_featured = input.isFeatured;
  if (input.sortOrder !== undefined) next.sort_order = input.sortOrder;
  if (input.images !== undefined) next.featured_image = input.images[0] ?? "";
  if (input.isActive === true && existing.deletedAt) next.deletedAt = null;
  if (input.ingredients !== undefined)
    next.ingredients = rows(input.ingredients).map((ingredient, index) => ({
      ...previous.ingredients?.find((item) => item.name === ingredient.name),
      ...ingredient,
      id:
        previous.ingredients?.find((item) => item.name === ingredient.name)
          ?.id || id + ":ingredient:" + index,
      image_url:
        ingredient.imageUrl ??
        previous.ingredients?.find((item) => item.name === ingredient.name)
          ?.image_url ??
        "",
      slug:
        ingredient.slug ||
        ingredient.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      sort_order: index + 1,
    }));
  const inventoryMode =
    input.inventoryMode ?? existing.inventory_mode ?? "aggregate";
  next.inventory_mode = inventoryMode;
  if (input.stock !== undefined && inventoryMode !== "per_variant")
    next.stock = input.stock;
  if (
    input.variants !== undefined ||
    input.price !== undefined ||
    !previous.variants.length
  ) {
    const sizes = rows(input.variants).length
      ? rows(input.variants)
      : previous.variants.length
        ? previous.variants.map((variant, index) => ({
            id: variant.id,
            label: variant.weight,
            price:
              index === 0 && input.price !== undefined
                ? input.price
                : (variant.sale_price ?? variant.regular_price),
            compareAtPrice: variant.regular_price,
            stock: variant.stock,
            active: variant.active,
          }))
        : [{ label: input.weight || "Standard", price: input.price }];
    const ids = new Set<string>();
    next.variants = sizes.map((size, index) => {
      const old = previous.variants.find(
        (variant) => variant.id === size.id || variant.weight === size.label,
      );
      const variantId = old?.id || `${id}:${size.label}`;
      if (ids.has(variantId))
        throw new ContractError("Each product size must be unique.");
      ids.add(variantId);
      const priorPrice = old?.sale_price ?? old?.regular_price;
      const price =
        index === 0 &&
        input.price !== undefined &&
        input.price !== priorPrice &&
        size.price === priorPrice
          ? input.price
          : (size.price ?? input.price);
      if (!Number.isSafeInteger(price) || price < 1)
        throw new ContractError(
          "Enter a whole-number price greater than zero.",
        );
      const regular = Math.max(size.compareAtPrice ?? price, price);
      return {
        ...old,
        id: variantId,
        product_id: id,
        weight: size.label,
        regular_price: regular,
        sale_price: price < regular ? price : null,
        stock:
          inventoryMode === "per_variant"
            ? size.stock !== undefined
              ? size.stock
              : (old?.stock ?? null)
            : null,
        active: size.active ?? old?.active ?? true,
        is_default: index === 0,
        sort_order: index + 1,
      };
    });
  }
  return next;
}
export function orderView(id: string, raw: Data) {
  return {
    id,
    orderNumber: raw.order_number ?? raw.orderNumber ?? id,
    source: raw.source ?? "app",
    userId: raw.customer_uid ?? raw.userId ?? "",
    customerName: raw.customer_name ?? raw.customerName ?? "Customer",
    customerEmail: raw.customer_email ?? raw.customerEmail ?? "",
    customerPhone: raw.customer_phone ?? raw.customerPhone ?? "",
    orderStatus:
      raw.status ??
      (({ placed: "pending", packed: "preparing" } as Record<string, string>)[
        raw.orderStatus
      ] ||
        raw.orderStatus),
    paymentStatus:
      raw.payment_status ??
      (raw.paymentStatus === "pending"
        ? "awaiting_payment"
        : raw.paymentStatus),
    paidAt: iso(raw.paid_at),
    paymentMethod: raw.payment_method_code ?? raw.paymentMethod ?? "",
    deliveryMethod: raw.delivery_method_code ?? "",
    trackingNumber: raw.tracking_number ?? "",
    quotePending: raw.quote_pending === true,
    subtotal: raw.subtotal ?? 0,
    discount: raw.discount ?? 0,
    deliveryFee: raw.delivery_fee ?? raw.deliveryFee ?? null,
    total: raw.total ?? null,
    shippingAddress: raw.shippingAddress ?? {
      fullName: raw.customer_name ?? "",
      phone: raw.customer_phone ?? "",
      line1: raw.delivery_address ?? "",
      city: raw.delivery_city ?? "",
      label: "Delivery",
    },
    items: rows(raw.items).map((item) => ({
      productId: item.product_id ?? item.productId,
      name: item.product_name ?? item.name,
      weight: item.variant_weight ?? item.weight,
      price: item.unit_price ?? item.price,
      qty: item.quantity ?? item.qty,
      image: item.image ?? "",
    })),
    createdAt: iso(raw.created_at ?? raw.createdAt),
    updatedAt: iso(raw.updated_at ?? raw.updatedAt),
  };
}
export function trackingView(id: string, raw: Data) {
  const order = orderView(id, raw);
  return {
    id,
    orderId: id,
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    trackingNumber: order.trackingNumber,
    carrier: "TCS",
    current: order.orderStatus,
    milestones: rows(raw.status_history).map((event) => ({
      key: event.status,
      label: String(event.status).replaceAll("_", " "),
      at: iso(event.at),
    })),
    updatedAt: order.updatedAt,
  };
}
export function reviewView(id: string, raw: Data) {
  return {
    id,
    photoUrl: raw.has_photo ? `/api/admin/reviews/${id}/photo` : undefined,
    productId: raw.product_id ?? raw.productId,
    productName: raw.product_name ?? raw.productName,
    userId: raw.customer_uid ?? raw.userId,
    userName: raw.customer_name ?? raw.userName,
    rating: raw.rating,
    comment: raw.comment,
    city: raw.location ?? raw.city,
    moderatedBy: raw.moderated_by ?? raw.moderatedBy,
    moderatedAt: iso(raw.moderated_at ?? raw.moderatedAt),
    verifiedPurchase:
      raw.verified ?? raw.verified_purchase ?? raw.verifiedPurchase ?? false,
    visibility:
      raw.status === "approved"
        ? raw.is_featured
          ? "featured"
          : "visible"
        : (raw.status ?? raw.visibility ?? "pending"),
    createdAt: iso(raw.review_date ?? raw.created_at ?? raw.createdAt),
  };
}
export function customerView(id: string, raw: Data, wallet: Data = {}) {
  return {
    id,
    uid: id,
    fullName:
      raw.fullName ??
      raw.name ??
      raw.full_name ??
      raw.displayName ??
      "Customer",
    email: raw.email ?? "",
    phone: raw.phone ?? "",
    city: raw.city ?? "",
    photoURL: raw.photoURL ?? "",
    role: "customer",
    points: wallet.balance ?? 0,
    createdAt: iso(raw.created_at ?? raw.createdAt),
    updatedAt: iso(raw.updated_at ?? raw.updatedAt),
  };
}
