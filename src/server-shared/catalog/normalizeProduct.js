// Read the existing Firebase catalogue and the app's canonical schema.
// Display defaults supply website copy, never override a published price or availability.
export function normalizeProduct(id, raw, fallback = {}) {
  const category =
    raw.category ||
    (/combo|nourishment.pack/i.test(raw.name || id)
      ? "combos"
      : /panjeeri/i.test(raw.name || id)
        ? "panjeeri"
        : "energy_balls");
  // Earlier imports used generic nuts/seeds cards; replace only that known placeholder list.
  const placeholderIngredients =
    category === "panjeeri" &&
    raw.ingredients?.some((ingredient) => ingredient.slug === "nuts") &&
    raw.ingredients?.some((ingredient) => ingredient.slug === "seeds") &&
    fallback.ingredients?.some((ingredient) => ingredient.slug === "almonds");
  const variants = (raw.variants || []).map((value, index) => {
    const weight =
      value.weight ||
      value.label ||
      (index === 0 ? raw.weight : "") ||
      `${index + 1}`;
    const defaults = fallback.variants?.find((v) => v.weight === weight) || {};
    const regular =
      value.regular_price ?? value.compareAtPrice ?? value.price ?? raw.price;
    const sale = Object.prototype.hasOwnProperty.call(value, "sale_price")
      ? value.sale_price
      : (value.price ?? null);
    return {
      ...defaults,
      ...value,
      id: value.id || `${id}:${weight}`,
      product_id: id,
      weight,
      regular_price: regular,
      sale_price: sale,
      stock: Number.isInteger(value.stock) ? value.stock : null,
      active: value.active !== false,
      is_default: value.is_default ?? index === 0,
      sort_order: value.sort_order ?? index + 1,
    };
  });
  return {
    ...fallback,
    ...raw,
    id,
    category,
    variants,
    active: raw.deletedAt ? false : (raw.active ?? raw.isActive ?? false),
    is_featured: raw.is_featured ?? raw.isFeatured ?? false,
    short_description:
      raw.short_description ||
      fallback.short_description ||
      raw.description ||
      "",
    ingredients:
      !placeholderIngredients &&
      raw.ingredients?.length &&
      raw.ingredients.every((value) => typeof value === "object" && value.slug)
        ? raw.ingredients
        : fallback.ingredients || [],
    ingredient_notes: placeholderIngredients
      ? fallback.ingredient_notes
      : raw.ingredient_notes || fallback.ingredient_notes || "",
    nutrition_facts: raw.nutrition_facts || fallback.nutrition_facts || [],
    storage_instructions:
      raw.storage_instructions || fallback.storage_instructions || "",
    legacy_stock:
      raw.inventory_mode !== "per_variant" && Number.isInteger(raw.stock)
        ? raw.stock
        : null,
    sort_order: raw.sort_order ?? (category === "panjeeri" ? 2 : 1),
    review_count:
      raw.review_count ?? raw.reviewCount ?? fallback.review_count ?? 0,
  };
}
