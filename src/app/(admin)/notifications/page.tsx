"use client";

import { Suspense, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import SendIcon from "@mui/icons-material/SendOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import { useApi, api } from "@/lib/api";
import { PageHeader, ErrorState, DataTable, ConfirmDialog, StatusChip, type Column } from "@/components/ui";
import { FormField } from "@/components/forms";
import { notificationSchema } from "@/lib/schemas";
import { fmtDateTime } from "@/lib/format";
import type { AdminNotification } from "@/lib/types";

function PhonePreview({ n }: { n: AdminNotification }) {
  return (
    <Box sx={{ width: 300, borderRadius: 4, overflow: "hidden", border: "1px solid #e7ddc2", background: "#fffdf7", mx: "auto" }}>
      <Box sx={{ background: "#1b3a28", color: "#fffdf7", px: 2, py: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Box component="img" src="/assets/brand/logo.png" alt="" sx={{ height: 22, filter: "brightness(0) invert(1)" }} />
        <Typography variant="caption" sx={{ fontWeight: 700 }}>Nourish Spoon · now</Typography>
      </Box>
      <Box sx={{ p: 2 }}>
        {n.imageUrl && <Box component="img" src={n.imageUrl} alt="" sx={{ width: "100%", borderRadius: 2, mb: 1 }} />}
        <Typography variant="body2" sx={{ fontWeight: 800 }}>{n.title}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>{n.body}</Typography>
      </Box>
    </Box>
  );
}

function Page() {
  const { data, loading, error, refresh } = useApi<{ items: AdminNotification[] }>("/api/admin/notifications?limit=200");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<AdminNotification | null>(null);
  const [deleting, setDeleting] = useState<AdminNotification | null>(null);
  const [sending, setSending] = useState<AdminNotification | null>(null);
  const [preview, setPreview] = useState<AdminNotification | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const rows = useMemo(() => data?.items ?? [], [data]);

  const form = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: { title: "", body: "", imageUrl: "", deepLink: "", audience: "all" as const, segment: "" },
  });
  const { control, handleSubmit, reset } = form;

  function openCreate() {
    setEditing(null);
    reset({ title: "", body: "", imageUrl: "", deepLink: "", audience: "all", segment: "" });
    setFormError(null);
    setDrawerOpen(true);
  }
  function openEdit(row: AdminNotification) {
    if (row.status === "sent") {
      setPreview(row);
      return;
    }
    setEditing(row);
    reset({ title: row.title, body: row.body, imageUrl: row.imageUrl ?? "", deepLink: row.deepLink ?? "", audience: row.audience ?? "all", segment: row.segment ?? "" });
    setFormError(null);
    setDrawerOpen(true);
  }

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true);
    setFormError(null);
    try {
      const payload = { ...values, imageUrl: values.imageUrl || null, deepLink: values.deepLink || null, segment: values.segment || null };
      if (editing) await api(`/api/admin/notifications/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
      else await api("/api/admin/notifications", { method: "POST", body: JSON.stringify(payload) });
      setDrawerOpen(false);
      refresh();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  });

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api(`/api/admin/notifications/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmSend() {
    if (!sending) return;
    setBusy(true);
    try {
      const res = await api<{ reached: number }>(`/api/admin/notifications/${sending.id}/send`, { method: "POST" });
      alert(`Notification sent to ${res.reached} device(s).`);
      setSending(null);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setBusy(false);
    }
  }

  const columns: Column<AdminNotification>[] = useMemo(() => [
    {
      key: "title",
      header: "Notification",
      render: (r) => (
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>{r.title}</Typography>
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", maxWidth: 420, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {r.body}
          </Typography>
        </Box>
      ),
    },
    {
      key: "audience",
      header: "Audience",
      width: 120,
      render: (r) => <Typography variant="body2" className="capitalize">{r.audience}{r.segment ? ` · ${r.segment}` : ""}</Typography>,
    },
    {
      key: "status",
      header: "Status",
      width: 130,
      render: (r) => <StatusChip status={r.status} />,
    },
    {
      key: "sent",
      header: "Sent",
      width: 150,
      render: (r) => (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {r.status === "sent" ? `${r.sentCount ?? 0} delivered` : "—"}
        </Typography>
      ),
    },
    {
      key: "date",
      header: "Created",
      width: 150,
      render: (r) => <Typography variant="body2" sx={{ color: "text.secondary" }}>{fmtDateTime(r.createdAt).split(",")[0]}</Typography>,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      width: 170,
      render: (r) => (
        <Box className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <IconButton size="small" aria-label="Preview" onClick={() => setPreview(r)} sx={{ border: "1px solid #e7ddc2", backgroundColor: "#fffdf7", width: 30, height: 30 }}>
            <VisibilityOutlined sx={{ fontSize: 15 }} />
          </IconButton>
          {r.status === "draft" && (
            <>
              <IconButton size="small" aria-label="Edit" onClick={() => openEdit(r)} sx={{ border: "1px solid #e7ddc2", backgroundColor: "#fffdf7", width: 30, height: 30 }}>
                <EditIcon sx={{ fontSize: 15 }} />
              </IconButton>
              <IconButton size="small" aria-label="Send" onClick={() => setSending(r)} sx={{ border: "1px solid #1b3a28", backgroundColor: "#1b3a28", color: "#fffdf7", width: 30, height: 30 }}>
                <SendIcon sx={{ fontSize: 15 }} />
              </IconButton>
              <IconButton size="small" aria-label="Delete" onClick={() => setDeleting(r)} sx={{ border: "1px solid #e7ddc2", backgroundColor: "#fffdf7", width: 30, height: 30, color: "#c0392b" }}>
                <DeleteIcon sx={{ fontSize: 15 }} />
              </IconButton>
            </>
          )}
        </Box>
      ),
    },
  ], []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return (<><PageHeader title="Notifications" /><ErrorState message={error} onRetry={refresh} /></>);

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="Compose push notifications, preview them, and publish to the app."
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>New Notification</Button>}
      />

      <DataTable columns={columns} rows={rows} loading={loading} emptyText="No notifications yet." />

      <Dialog open={drawerOpen} onClose={() => setDrawerOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontFamily: 'var(--font-display)' }}>
          {editing ? "Edit notification" : "New notification"}
        </DialogTitle>
        <DialogContent className="flex flex-col gap-4" sx={{ pt: 1 }}>
          {formError && <Typography variant="body2" sx={{ color: "#c0392b", background: "#fdecea", p: 1.5, borderRadius: 2 }}>{formError}</Typography>}
          {[
            { name: "title", label: "Title", type: "text" as const, required: true },
            { name: "body", label: "Message", type: "textarea" as const, rows: 3, required: true },
            { name: "imageUrl", label: "Image (optional)", type: "image" as const },
            { name: "deepLink", label: "In-app destination (optional)", type: "text" as const, hint: "Deep link the app opens, e.g. nourishspoon://product/abc" },
          ].map((f) => <FormField key={f.name} def={f} control={control} errors={form.formState.errors} />)}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button variant="outlined" onClick={() => setDrawerOpen(false)} disabled={busy}>Cancel</Button>
          <Button variant="contained" onClick={onSubmit} disabled={busy}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {editing ? "Save draft" : "Save draft"}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete notification?"
        message={deleting ? `Delete the draft "${deleting.title}"?` : ""}
        confirmLabel="Delete"
        danger
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={Boolean(sending)}
        title="Send notification?"
        message={sending ? (
          <>Send <b>“{sending.title}”</b> as a push notification to all app users now? Sent notifications cannot be edited or unsent.</>
        ) : ""}
        confirmLabel="Send now"
        busy={busy}
        onClose={() => setSending(null)}
        onConfirm={confirmSend}
      />

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="xs">
        <DialogContent sx={{ pt: 3 }}>
          <Box className="flex justify-end mb-2">
            <IconButton size="small" onClick={() => setPreview(null)} aria-label="Close preview"><CloseIcon /></IconButton>
          </Box>
          {preview && <PhonePreview n={preview} />}
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textAlign: "center", mt: 2 }}>
            How it appears on a phone
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
