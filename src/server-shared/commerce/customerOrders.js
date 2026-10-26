const { createHash } = require("node:crypto");
const domain = require("./domain");

/** Authoritative pricing and stock reservation for both server transports. */
exports.createOrderPlacer = function ({ db, loyalty, normalizeProduct }) {
  return async function placeOrder(input, actor, options = {}) {
    const uid = actor.uid;
    const source = options.source || "app";
    const whatsapp = ["whatsapp_app", "whatsapp_manual"].includes(source);
    if (!uid && !(source === "whatsapp_manual" && options.createdBy))
      throw new Error("Please sign in first.");
    const shipping = domain.address(input.address || {});
    if (
      input.delivery_method === "sargodha_sameday" &&
      shipping.city.toLowerCase() !== "sargodha"
    )
      throw new Error("Choose nationwide delivery for this city.");
    if (
      ![
        "bank_transfer",
        "easypaisa",
        "jazzcash",
        ...(whatsapp ? ["to_confirm"] : []),
      ].includes(input.payment_method)
    )
      throw new Error("Choose a payment method.");
    // A stable client request ID makes retries safe when the response is lost.
    const requestId = domain.text(input.request_id, "request ID", 80);
    if (!/^[A-Za-z0-9_-]{16,80}$/.test(requestId))
      throw new Error("Invalid request ID.");
    const orderRef = db.collection("orders").doc(
      createHash("sha256")
        .update(`${uid || `admin:${options.createdBy}`}:${requestId}`)
        .digest("hex"),
    );
    return db.runTransaction(async (tx) => {
      const previous = await tx.get(orderRef);
      if (previous.exists) return { id: previous.id, ...previous.data() };
      const [catalog, settingsDoc, customer] = await Promise.all([
        tx.get(db.collection("products")),
        tx.get(db.doc("settings/commerce")),
        uid ? tx.get(db.doc(`users/${uid}`)) : Promise.resolve(null),
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
        !customer?.data()?.has_order,
      );
      const discounts = uid
        ? await loyalty.checkout(tx, uid, input, priced)
        : { result: { benefit_type: "NONE", order_benefit: { type: "NONE", source_id: "", discount_amount: 0 } }, apply() {} };
      const order = {
        ...priced,
        ...discounts.result,
        customer_uid: uid || null,
        source,
        ...(options.createdBy ? { created_by: options.createdBy } : {}),
        customer_name: shipping.name,
        customer_phone: shipping.phone,
        customer_email: actor.email || "",
        delivery_city: shipping.city,
        delivery_address: shipping.line,
        delivery_method_code: input.delivery_method,
        payment_method_code: input.payment_method,
        payment_status: "awaiting_payment",
        ...(whatsapp
          ? { quote_pending: true, delivery_fee: null, total: null }
          : {}),
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
                  (matching.find((item) => item.variant_id === v.id)
                    ?.quantity || 0),
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
      if (uid) {
        tx.set(db.doc(`users/${uid}/notifications/${orderRef.id}-placed`), {
          order_id: orderRef.id,
          title: `${order.order_number} received`,
          body: whatsapp
            ? "Your request is saved. Send the WhatsApp message to confirm it with our team."
            : "Your order has been received. We will notify you when it is confirmed.",
          created_at: order.created_at,
          read: false,
        });
        tx.set(db.doc(`users/${uid}`), { has_order: true }, { merge: true });
      }
      if (options.createdBy)
        tx.set(orderRef.collection("events").doc(), {
          to: "pending",
          by: options.createdBy,
          at: order.created_at,
          note: "WhatsApp order entered in the dashboard. Awaiting confirmation.",
        });
      return { id: orderRef.id, ...order };
    });
  };
};
