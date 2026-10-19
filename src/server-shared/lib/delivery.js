/** All amounts are whole PKR. Free shipping uses the product total after savings. */
function deliveryCharge(productTotal, method) {
  if (!Number.isSafeInteger(productTotal) || productTotal < 0)
    throw new Error("Check the product total.");
  if (!["tcs_nationwide", "sargodha_sameday", "self_pickup"].includes(method))
    throw new Error("Choose a delivery method.");
  return method === "self_pickup" || productTotal > 2500 ? 0 : 250;
}

module.exports = { deliveryCharge };
