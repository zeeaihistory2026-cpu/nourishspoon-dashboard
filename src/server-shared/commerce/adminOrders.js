const domain = require("./domain");
const { deliveryCharge } = require("../lib/delivery");

/** Shared by the callable backend and interactive dashboard. Caller verifies owner access. */
function createOrderUpdater({ db, loyalty, normalizeProduct }) {
  return async function updateOrder(input, actor) {
    const id = domain.text(input.id, "order ID", 80);
    if (id.includes("/")) throw new Error("Invalid order ID.");
    const ref = db.collection("orders").doc(id);
    return db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new Error("Order not found.");
      const order = snapshot.data(),
        patch = { updated_at: new Date().toISOString() };
      if (input.payment_method !== undefined) {
        if (
          !["bank_transfer", "easypaisa", "jazzcash", "to_confirm"].includes(
            input.payment_method,
          )
        )
          throw new Error("Choose a valid payment method.");
        if (
          order.payment_status === "paid" &&
          input.payment_method !== order.payment_method_code
        )
          throw new Error(
            "The method of a verified payment cannot be changed.",
          );
        patch.payment_method_code = input.payment_method;
      }
      if (input.status && input.status !== order.status) {
        domain.statusChange(order.status, input.status);
        patch.status = input.status;
        patch.status_history = [
          ...(Array.isArray(order.status_history)
            ? order.status_history
            : [{ status: "pending", at: order.created_at }]),
          { status: patch.status, at: patch.updated_at },
        ];
      }
      if (
        input.payment_status &&
        input.payment_status !== order.payment_status
      ) {
        if (
          order.payment_status === "paid" &&
          !["paid", "refunded"].includes(input.payment_status)
        )
          throw new Error(
            "A verified payment can only be changed to refunded.",
          );
        if (
          order.payment_status === "refunded" &&
          input.payment_status !== "refunded"
        )
          throw new Error("A refunded payment cannot be reopened.");
        if (
          !["awaiting_payment", "submitted", "paid", "refunded"].includes(
            input.payment_status,
          )
        )
          throw new Error("Invalid payment status.");
        patch.payment_status = input.payment_status;
        // Record receipt of money independently of fulfilment and later edits.
        if (input.payment_status === "paid") patch.paid_at = patch.updated_at;
      }
      const deliveryFee =
        input.delivery_fee ??
        (["confirmed", "preparing", "out_for_delivery", "delivered"].includes(
          patch.status,
        ) && order.quote_pending
          ? deliveryCharge(
              order.subtotal - order.discount,
              order.delivery_method_code,
            )
          : undefined);
      if (deliveryFee !== undefined) {
        const fee = deliveryFee;
        if (!Number.isSafeInteger(fee) || fee < 0 || fee > 10000)
          throw new Error("Invalid delivery fee.");
        patch.delivery_fee = fee;
        if (fee !== order.delivery_fee && order.status !== "pending")
          throw new Error("Set the delivery fee before confirming the order.");
        patch.total = order.subtotal + fee - order.discount;
        if (!Number.isSafeInteger(patch.total) || patch.total < 0)
          throw new Error("Invalid order total.");
        patch.quote_pending = false;
      }
      if (input.tracking_number !== undefined) {
        const tracking = String(input.tracking_number).trim();
        if (tracking && !/^\d{8,20}$/.test(tracking))
          throw new Error("Enter a valid TCS consignment number.");
        patch.tracking_number = tracking;
      }
      if (input.refunded_eligible_spend !== undefined) {
        const amount = input.refunded_eligible_spend;
        if (
          !Number.isSafeInteger(amount) ||
          amount < (order.refunded_eligible_spend || 0) ||
          amount > order.subtotal - order.discount ||
          !order.rewards_settled
        )
          throw new Error(
            "Enter a cumulative food refund between the previous refund and the net food spend of a completed order.",
          );
        patch.refunded_eligible_spend = amount;
      }
      if (
        ["confirmed", "preparing", "out_for_delivery", "delivered"].includes(
          patch.status,
        ) &&
        (patch.quote_pending ?? order.quote_pending)
      )
        throw new Error(
          "Confirm the delivery fee before confirming the order.",
        );
      if (
        patch.payment_status === "paid" &&
        ((patch.quote_pending ?? order.quote_pending) ||
          (patch.payment_method_code ?? order.payment_method_code) ===
            "to_confirm")
      )
        throw new Error(
          "Confirm the delivery fee and payment method before verifying payment.",
        );
      const settleRewards = order.customer_uid
        ? await loyalty.settlement(tx, ref.id, order, patch)
        : () => {};
      if (patch.status === "cancelled") {
        const productIds = [
          ...new Set(order.items.map((item) => item.product_id)),
        ];
        const products = await Promise.all(
          productIds.map((id) => tx.get(db.doc(`products/${id}`))),
        );
        products.forEach((doc) => {
          if (!doc.exists) return;
          const product = normalizeProduct(doc.id, doc.data());
          tx.update(doc.ref, {
            variants: product.variants.map((v) => ({
              ...v,
              stock:
                v.stock == null
                  ? null
                  : v.stock +
                    (order.items.find((item) => item.variant_id === v.id)
                      ?.quantity || 0),
            })),
            ...(product.legacy_stock != null
              ? {
                  stock:
                    product.legacy_stock +
                    order.items
                      .filter((item) => item.product_id === product.id)
                      .reduce((sum, item) => sum + item.quantity, 0),
                }
              : {}),
          });
        });
      }
      settleRewards();
      if (actor?.uid) patch.updated_by = actor.uid;
      if (
        order.customer_uid &&
        (patch.status ||
          patch.payment_status ||
          patch.payment_method_code ||
          patch.tracking_number !== undefined ||
          patch.refunded_eligible_spend !== undefined ||
          patch.total !== undefined)
      ) {
        const after = { ...order, ...patch };
        const noticeId = ref.collection("events").doc().id;
        patch.last_notice_id = noticeId;
        tx.set(
          db.doc(`users/${order.customer_uid}/notifications/${noticeId}`),
          {
            order_id: ref.id,
            title: `${order.order_number} updated`,
            body: `Order: ${String(after.status || "pending").replaceAll("_", " ")}. Payment: ${String(after.payment_status || "awaiting_payment").replaceAll("_", " ")}.${patch.refunded_eligible_spend !== undefined ? ` Food refunds recorded: Rs. ${patch.refunded_eligible_spend}. Related points adjusted.` : ""}`,
            created_at: patch.updated_at,
            read: false,
          },
        );
      }
      tx.update(ref, patch);
      if (actor?.uid)
        tx.set(ref.collection("events").doc(), {
          from: order.status,
          to: patch.status || order.status,
          payment_status: patch.payment_status || order.payment_status,
          ...(patch.refunded_eligible_spend !== undefined
            ? { refunded_eligible_spend: patch.refunded_eligible_spend }
            : {}),
          note: input.note ? domain.text(input.note, "note", 500) : "",
          by: actor.uid,
          at: patch.updated_at,
        });
      return { id: ref.id, ...order, ...patch };
    });
  };
}
module.exports = { createOrderUpdater };
