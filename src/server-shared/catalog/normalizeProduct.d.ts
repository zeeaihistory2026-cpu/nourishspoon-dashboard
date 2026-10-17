import { Product } from "../types";
export function normalizeProduct(
  id: string,
  raw: Record<string, any>,
  fallback?: Partial<Product>,
): Product & { legacy_stock: number | null };
