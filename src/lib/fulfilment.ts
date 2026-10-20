/** Shared dashboard language mirrors the canonical app order states. */
export const DELIVERY_STAGES = [
  { key: "pending", label: "Order received", action: "Received" },
  { key: "confirmed", label: "Confirmed", action: "Confirm order" },
  { key: "preparing", label: "Preparing", action: "Start preparing" },
  {
    key: "out_for_delivery",
    label: "Out for delivery",
    action: "Dispatch order",
  },
  { key: "delivered", label: "Delivered", action: "Mark delivered" },
] as const;
export function canAdvanceDelivery(from: string, to: string) {
  const current = DELIVERY_STAGES.findIndex((stage) => stage.key === from);
  const next = DELIVERY_STAGES.findIndex((stage) => stage.key === to);
  return current >= 0 && from !== "delivered" && next > current;
}
export function deliveryAction(status: string) {
  const index = DELIVERY_STAGES.findIndex((stage) => stage.key === status);
  return index < 0 ? undefined : DELIVERY_STAGES[index + 1];
}
