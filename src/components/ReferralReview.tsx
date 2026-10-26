"use client";
import { useState } from "react";
import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { FormDrawer } from "@/components/ui";
import { api, useApi } from "@/lib/api";
import type { Referral } from "@/lib/types";
import { fmtDateTime } from "@/lib/format";
export function ReferralReview({
  referral,
  onClose,
  onUpdated,
}: {
  referral: Referral;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [action, setAction] = useState("flag"),
    [reason, setReason] = useState(""),
    [code, setCode] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const { data, refresh } = useApi<{ items: any[] }>(
    `/api/admin/reward-audit?referral=${encodeURIComponent(referral.id)}`,
  );
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/referrals/${encodeURIComponent(referral.id)}`, {
        method: "PATCH",
        body: JSON.stringify({
          action,
          reason,
          ...(action === "override" ? { code } : {}),
        }),
      });
      onUpdated();
      refresh();
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormDrawer
      open
      title="Review referral"
      onClose={onClose}
      subtitle={referral.code || referral.id}
    >
      <Box className="flex flex-col gap-4">
        <Typography>Customer: {referral.referredId || referral.id}</Typography>
        <Typography>
          Status: {referral.status}. Welcome:{" "}
          {referral.welcome_status || "legacy"}. {referral.rewardState || ""}
        </Typography>
        <Typography variant="body2">
          Administrator actions require a reason and are recorded in the audit
          history. Approving a held reward rechecks its original order and the
          monthly cap.
        </Typography>
        <TextField
          select
          label="Action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          {[
            ["flag", "Hold for fraud review"],
            ["approve", "Approve / retry held reward"],
            ["reject", "Reject referral"],
            ["reverse", "Reverse issued reward"],
            ["restore_welcome", "Restore eligible welcome reward"],
            ["override", "Correct referrer attribution"],
          ].map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        {action === "override" && (
          <TextField
            label="New referrer's code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        )}
        <TextField
          label="Reason"
          multiline
          minRows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
        {error && (
          <Typography color="error" role="alert">
            {error}
          </Typography>
        )}
        <Button
          variant="contained"
          disabled={busy || reason.trim().length < 3}
          onClick={submit}
        >
          {busy ? "Applying…" : "Apply action"}
        </Button>
        <Typography variant="h6">Audit history</Typography>
        {(data?.items || []).map((entry) => (
          <Box key={entry.id}>
            <Typography>
              {entry.action}: {entry.reason}
            </Typography>
            <Typography variant="caption">
              {fmtDateTime(entry.at)} · {entry.by}
            </Typography>
          </Box>
        ))}
        {!data?.items.length && (
          <Typography>No administrator actions recorded.</Typography>
        )}
      </Box>
    </FormDrawer>
  );
}
