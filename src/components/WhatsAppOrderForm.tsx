"use client";

import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { api, useApi } from "@/lib/api";
import { FormDrawer, ErrorState } from "@/components/ui";
import { rs } from "@/lib/format";
import type { Order } from "@/lib/types";

type Product = {
  id: string;
  name: string;
  isActive: boolean;
  variants: {
    id: string;
    label: string;
    price: number;
    stock: number | null;
    active: boolean;
  }[];
};
type Line = { product_id: string; variant_id: string; quantity: number };

export function WhatsAppOrderForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (order: Order) => void;
}) {
  const { data, loading, error, refresh } = useApi<{ items: Product[] }>(
    "/api/admin/products?limit=1000",
  );
  const choices = (data?.items ?? [])
    .filter((product) => product.isActive)
    .flatMap((product) =>
      product.variants
        .filter((variant) => variant.active)
        .map((variant) => ({
          ...variant,
          product_id: product.id,
          name: `${product.name} · ${variant.label}`,
        })),
    );
  const [lines, setLines] = useState<Line[]>([
    { product_id: "", variant_id: "", quantity: 1 },
  ]);
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    city: "",
    line: "",
  });
  const [delivery, setDelivery] = useState("tcs_nationwide");
  const [payment, setPayment] = useState("to_confirm");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const request = useRef({ key: "", id: "" });
  const submitting = useRef(false);
  const subtotal = lines.reduce(
    (sum, line) =>
      sum +
      (choices.find((choice) => choice.id === line.variant_id)?.price ?? 0) *
        line.quantity,
    0,
  );

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const input = {
      items: lines,
      address,
      delivery_method: delivery,
      payment_method: payment,
      is_gift: false,
      gift_message: "",
    };
    const key = JSON.stringify(input);
    if (request.current.key !== key)
      request.current = { key, id: crypto.randomUUID() };
    submitting.current = true;
    setBusy(true);
    setMessage("");
    try {
      const result = await api<{ item: Order }>("/api/admin/orders", {
        method: "POST",
        body: JSON.stringify({ ...input, request_id: request.current.id }),
      });
      onCreated(result.item);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not save the order. Please retry.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <FormDrawer
      open
      title="Add WhatsApp Order"
      subtitle="Record an order received directly on WhatsApp."
      onClose={() => {
        if (!busy) onClose();
      }}
      wide
    >
      {error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <Box
          component="form"
          onSubmit={save}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <Alert severity="info">
            Saved as awaiting confirmation and payment. This order is tracked in
            the dashboard; entering a phone number does not link it to an app
            account.
          </Alert>
          <Box
            component="fieldset"
            disabled={busy}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              border: 0,
              p: 0,
              m: 0,
            }}
          >
            <Typography sx={{ fontWeight: 800 }}>
              Customer and delivery
            </Typography>
            {(
              [
                ["name", "Customer name", 80],
                ["phone", "WhatsApp / mobile number", 30],
                ["city", "City", 80],
                ["line", "Delivery address", 300],
              ] as const
            ).map(([field, label, maxLength]) => (
              <TextField
                key={field}
                label={label}
                required
                value={address[field]}
                onChange={(event) =>
                  setAddress({ ...address, [field]: event.target.value })
                }
                slotProps={{ htmlInput: { maxLength } }}
              />
            ))}
            <TextField
              select
              label="Delivery method"
              value={delivery}
              onChange={(event) => setDelivery(event.target.value)}
            >
              <MenuItem value="tcs_nationwide">TCS Nationwide</MenuItem>
              <MenuItem value="sargodha_sameday">Sargodha Same Day</MenuItem>
              <MenuItem value="self_pickup">Self Pickup</MenuItem>
            </TextField>
            <TextField
              select
              label="Payment method"
              value={payment}
              onChange={(event) => setPayment(event.target.value)}
            >
              <MenuItem value="to_confirm">
                To be confirmed on WhatsApp
              </MenuItem>
              <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
              <MenuItem value="easypaisa">Easypaisa</MenuItem>
              <MenuItem value="jazzcash">JazzCash</MenuItem>
            </TextField>
            <Typography sx={{ fontWeight: 800 }}>Order items</Typography>
            {lines.map((line, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  p: 2,
                  border: "1px solid #e7ddc2",
                  borderRadius: 2,
                }}
              >
                <TextField
                  select
                  required
                  label={`Product / size ${index + 1}`}
                  value={line.variant_id}
                  disabled={loading}
                  onChange={(event) => {
                    const choice = choices.find(
                      (item) => item.id === event.target.value,
                    );
                    if (choice)
                      setLines(
                        lines.map((item, row) =>
                          row === index
                            ? {
                                ...line,
                                product_id: choice.product_id,
                                variant_id: choice.id,
                              }
                            : item,
                        ),
                      );
                  }}
                >
                  {choices.map((choice) => (
                    <MenuItem
                      key={choice.id}
                      value={choice.id}
                      disabled={
                        choice.stock === 0 ||
                        lines.some(
                          (item, row) =>
                            row !== index && item.variant_id === choice.id,
                        )
                      }
                    >
                      {choice.name} · {rs(choice.price)}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label={`Quantity ${index + 1}`}
                  type="number"
                  required
                  value={line.quantity}
                  slotProps={{ htmlInput: { min: 1, max: 20, step: 1 } }}
                  onChange={(event) =>
                    setLines(
                      lines.map((item, row) =>
                        row === index
                          ? { ...line, quantity: Number(event.target.value) }
                          : item,
                      ),
                    )
                  }
                />
                {lines.length > 1 && (
                  <Button
                    color="error"
                    onClick={() =>
                      setLines(lines.filter((_, row) => row !== index))
                    }
                  >
                    Remove item
                  </Button>
                )}
              </Box>
            ))}
            <Button
              variant="outlined"
              disabled={lines.length >= 10 || loading || !choices.length}
              onClick={() =>
                setLines([
                  ...lines,
                  { product_id: "", variant_id: "", quantity: 1 },
                ])
              }
            >
              Add another item
            </Button>
            {!loading && !choices.length && (
              <Alert severity="warning">
                No active products are available. Activate a product before
                creating an order.
              </Alert>
            )}
            <Typography sx={{ fontWeight: 700 }}>
              Products subtotal: {rs(subtotal)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Prices and stock are checked when saving. Confirm delivery charges
              and the payment method in order details. Saving reserves stock;
              cancel abandoned requests to release it.
            </Typography>
          </Box>
          {message && (
            <Alert severity="error" role="alert">
              {message}
            </Alert>
          )}
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            <Button disabled={busy} onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={busy || loading || !choices.length}
            >
              {busy ? "Saving…" : "Save WhatsApp Order"}
            </Button>
          </Box>
        </Box>
      )}
    </FormDrawer>
  );
}
