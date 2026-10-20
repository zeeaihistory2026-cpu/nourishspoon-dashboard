const domain = require("./domain");
const { preparePhoto } = require("./customerPhotos");

exports.createReviewSubmitter = function ({ db }) {
  return async function submitReview(input, actor) {
    const orderId = domain.text(input.order_id, "order ID", 80);
    const productId = domain.text(input.product_id, "product ID", 120);
    if (orderId.includes("/") || productId.includes("/"))
      throw Error("Choose a valid order and product.");
    const order = await db.collection("orders").doc(orderId).get();
    if (
      !order.exists ||
      order.data().customer_uid !== actor.uid ||
      order.data().status !== "delivered"
    )
      throw Error("Reviews are available after your order is delivered.");
    const item = order
      .data()
      .items.find((item) => item.product_id === productId);
    if (
      !item ||
      !Number.isInteger(input.rating) ||
      input.rating < 1 ||
      input.rating > 5
    )
      throw Error("Choose a product and rating.");
    const comment = domain.text(input.comment, "review", 1000);
    const ref = db.collection("reviews").doc(`${order.id}_${productId}`);
    const now = new Date().toISOString();
    const photo = input.photo ? await preparePhoto(input.photo) : undefined;
    try {
      const batch = db.batch();
      batch.create(ref, {
        customer_uid: actor.uid,
        order_id: order.id,
        product_id: productId,
        product_name: item.product_name,
        customer_name: order.data().customer_name,
        location: order.data().delivery_city,
        rating: input.rating,
        comment,
        status: "pending",
        verified: true,
        helpful_count: 0,
        is_featured: false,
        review_date: now,
        updated_at: now,
        has_photo: !!photo,
      });
      if (photo) batch.create(ref.collection("media").doc("photo"), photo);
      await batch.commit();
    } catch (error) {
      if (error.code === 6 || error.code === "already-exists")
        throw Error(
          "You have already submitted a review for this product and order.",
        );
      throw error;
    }
    return { id: ref.id };
  };
};
