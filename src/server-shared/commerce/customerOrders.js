const { createHash } = require("node:crypto");
const domain = require("./domain");

/** Authoritative pricing and stock reservation for both server transports. */
exports.createOrderPlacer = function ({ db, loyalty, normalizeProduct }) {
return async function placeOrder(input, actor) {
  const uid = actor.uid;
  const shipping = domain.address(input.address || {});
  if (
    input.delivery_method === "sargodha_sameday" &&
    shipping.city.toLowerCase() !== "sargodha"
  )
    throw new Error("Choose nationwide delivery for this city.");
  if (
    !["bank_transfer", "easypaisa", "jazzcash"].includes(input.payment_method)
  )
    throw new Error("Choose a payment method.");
  // A stable client request ID makes retries safe when the response is lost.
  const requestId = domain.text(input.request_id, "request ID", 80);
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(requestId))
    throw new Error("Invalid request ID.");
  const orderRef = db
    .collection("orders")
    .doc(createHash("sha256").update(`${uid}:${requestId}`).digest("hex"));
  return db.runTransaction(async (tx) => {
    const previous = await tx.get(orderRef);
    if (previous.exists) return { id: previous.id, ...previous.data() };
    const [catalog, settingsDoc, customer] = await Promise.all([
      tx.get(db.collection("products")),
      tx.get(db.doc("settings/commerce")),
      tx.get(db.doc(`users/${uid}`)),
    ]);
    const products = catalog.docs.map((doc) =>
      normalizeProduct(doc.id, doc.data()),
    );
    const settings = settingsDoc.data() || {};
    const priced = domain.priceOrder(
      input.items,
      products,
      settings,
      input.delivery_method,
      !customer.data()?.has_order,
    );
    const discounts = await loyalty.checkout(tx, uid, input, priced);
    const order = {
      ...priced,
      ...discounts.result,
      customer_uid: uid,
      customer_name: shipping.name,
      customer_phone: shipping.phone,
      customer_email: actor.email || "",
      delivery_city: shipping.city,
      delivery_address: shipping.line,
      delivery_method_code: input.delivery_method,
      payment_method_code: input.payment_method,
      payment_status: "awaiting_payment",
      status: "pending",
      tracking_number: "",
      is_gift: input.is_gift === true,
      gift_message:
        typeof input.gift_message === "string"
          ? input.gift_message.trim().slice(0, 400)
          : "",
      order_number: `NS-${orderRef.id.slice(0, 10).toUpperCase()}`,
      status_history: [{ status: "pending", at: new Date().toISOString() }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    for (const product of products) {
      const matching = priced.items.filter(
        (item) => item.product_id === product.id,
      );
      if (!matching.length) continue;
      tx.update(db.doc(`products/${product.id}`), {
        variants: product.variants.map((v) => ({
          ...v,
          stock:
            v.stock == null
              ? null
              : v.stock -
                (matching.find((item) => item.variant_id === v.id)?.quantity ||
                  0),
        })),
        ...(product.legacy_stock != null
          ? {
              stock:
                product.legacy_stock -
                matching.reduce((sum, item) => sum + item.quantity, 0),
            }
          : {}),
      });
    }
    discounts.apply(orderRef.id);
    tx.set(orderRef, order);
    tx.set(db.doc(`users/${uid}`), { has_order: true }, { merge: true });
    return { id: orderRef.id, ...order };
  });
};
};
