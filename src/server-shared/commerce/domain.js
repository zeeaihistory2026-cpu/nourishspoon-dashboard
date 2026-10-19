// Business calculations run on the server. Prices and stock never come from the client.
const STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];
const { deliveryCharge } = require("../lib/delivery");
function text(value, label, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max)
    throw new Error(`Enter a valid ${label}.`);
  return value.trim();
}
function address(input) {
  const phone = text(input.phone, "phone number", 30).replace(/[\s()-]/g, "");
  if (!/^(?:\+?92|0)?3\d{9}$/.test(phone))
    throw new Error("Enter a valid Pakistani mobile number.");
  return {
    name: text(input.name, "name", 80),
    phone,
    city: text(input.city, "city", 80),
    line: text(input.line, "address", 300),
  };
}
function priceOrder(lines, products, _settings, method) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 10)
    throw new Error("Choose between 1 and 10 items.");
  if (!["tcs_nationwide", "sargodha_sameday", "self_pickup"].includes(method))
    throw new Error("Choose a delivery method.");
  const seen = new Set();
  const items = lines.map((line) => {
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > 20 ||
      seen.has(line.variant_id)
    )
      throw new Error("Check item quantities.");
    seen.add(line.variant_id);
    const product = products.find((p) => p.id === line.product_id && p.active);
    const variant = product?.variants.find(
      (v) => v.id === line.variant_id && v.active,
    );
    if (!variant) throw new Error("An item is no longer available.");
    if (variant.stock != null && variant.stock < line.quantity)
      throw new Error(`${product.name} has insufficient stock.`);
    const unit_price = variant.sale_price ?? variant.regular_price;
    if (!Number.isSafeInteger(unit_price) || unit_price <= 0)
      throw new Error("A product price needs confirmation.");
    return {
      product_id: product.id,
      variant_id: variant.id,
      product_name: product.name,
      variant_weight: variant.weight,
      quantity: line.quantity,
      unit_price,
      total_price: unit_price * line.quantity,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  for (const product of products) {
    const quantity = items
      .filter((item) => item.product_id === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);
    if (product.legacy_stock != null && quantity > product.legacy_stock)
      throw new Error(`${product.name} has insufficient stock.`);
  }
  const delivery_fee = deliveryCharge(subtotal, method);
  return {
    items,
    subtotal,
    discount: 0,
    delivery_fee,
    total: subtotal + delivery_fee,
    quote_pending: false,
  };
}
function statusChange(from, to) {
  if (!STATUSES.includes(to) || ["delivered", "cancelled"].includes(from))
    throw new Error("This order cannot be changed to that status.");
  if (to !== "cancelled" && STATUSES.indexOf(to) !== STATUSES.indexOf(from) + 1)
    throw new Error("Complete the preceding order stage first.");
}
module.exports = { address, priceOrder, statusChange, text, STATUSES };
