"use client";
import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";
import { api, useApi } from "@/lib/api";
type Request = {
  id: string;
  request_id: string;
  phone: string;
  name: string;
  email: string;
  expires_at: number;
};
export function WhatsAppPhoneReview() {
  const { data, error, refresh } = useApi<{ items: Request[] }>(
    "/api/admin/phone-verifications",
  );
  const [selected, setSelected] = useState<Request | null>(null),
    [sender, setSender] = useState(""),
    [code, setCode] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function approve() {
    if (!selected || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await api("/api/admin/phone-verifications", {
        method: "POST",
        body: JSON.stringify({
          uid: selected.id,
          request_id: selected.request_id,
          sender_phone: sender,
          code,
          sender_confirmed: confirmed,
        }),
      });
      setSelected(null);
      setCode("");
      setSender("");
      setConfirmed(false);
      setMessage(
        "WhatsApp phone ownership verified. The customer can refresh Refer & Earn.",
      );
      refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Verification failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6">WhatsApp phone verification</Typography>
      <Typography sx={{ mb: 2 }}>
        Administrator only. Open the actual incoming WhatsApp conversation,
        check its sender number, and enter the one-time code from that
        conversation. Never approve a screenshot, forwarded code or a typed
        phone claim. Codes expire after 15 minutes; approvals are audited.
      </Typography>
      <Button onClick={refresh}>Refresh requests</Button>
      {error && <Alert severity="error">{error}</Alert>}
      {message && (
        <Alert severity="info" role="status">
          {message}
        </Alert>
      )}
      {data?.items.map((item) => (
        <Box
          key={item.id}
          sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
        >
          <Typography>
            {item.name || item.email || item.id} · requested {item.phone}
          </Typography>
          <Typography variant="caption">
            Request {item.request_id} · expires{" "}
            {new Date(item.expires_at).toLocaleTimeString()}
          </Typography>
          <Button
            disabled={busy}
            onClick={() => {
              setSelected(item);
              setCode("");
              setSender("");
              setConfirmed(false);
              setMessage("");
            }}
          >
            Review sender
          </Button>
        </Box>
      ))}
      {data && !data.items.length && (
        <Typography>No pending unexpired requests.</Typography>
      )}
      {selected && (
        <Box sx={{ mt: 2, display: "grid", gap: 2 }}>
          <Typography>
            Review {selected.request_id} for{" "}
            {selected.name || selected.email || selected.id}
          </Typography>
          <TextField
            label="Actual sender number from WhatsApp"
            placeholder="+923001234567"
            value={sender}
            onChange={(e) => {
              setSender(e.target.value);
              setConfirmed(false);
            }}
          />
          <TextField
            label="One-time code from the incoming message"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 40 } }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
            }
            label="I checked the actual sender in WhatsApp and received this code directly from that number."
          />
          <Button
            variant="contained"
            disabled={busy || !confirmed || !sender.trim() || !code.trim()}
            onClick={approve}
          >
            {busy ? "Verifying…" : "Confirm phone ownership"}
          </Button>
          <Button disabled={busy} onClick={() => setSelected(null)}>
            Cancel review
          </Button>
        </Box>
      )}
    </Card>
  );
}
