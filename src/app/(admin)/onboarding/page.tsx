"use client";

import { Suspense, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpwardOutlined";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownwardOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import { useApi, api } from "@/lib/api";
import { PageHeader, ConfirmDialog, FormDrawer, ErrorState, StatusChip, Thumb } from "@/components/ui";
import { FormField } from "@/components/forms";
import { onboardingSlideSchema } from "@/lib/schemas";
import type { OnboardingSlide } from "@/lib/types";

function PhonePreview({ slide }: { slide: OnboardingSlide | null }) {
  if (!slide) return null;
  return (
    <Box
      sx={{
        width: 300,
        height: 620,
        borderRadius: 7,
        border: "10px solid #1b3a28",
        overflow: "hidden",
        background: "#f8f4e8",
        position: "relative",
        mx: "auto",
      }}
    >
      {slide.imageUrl ? (
        <Box component="img" src={slide.imageUrl} alt={slide.title} sx={{ width: "100%", height: 340, objectFit: "cover" }} />
      ) : (
        <Box sx={{ height: 340, background: "#f4e9c8", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography sx={{ fontFamily: '"Pinyon Script", cursive', fontSize: 26, color: "#8f6b1f" }}>
            Nourish Spoon
          </Typography>
        </Box>
      )}
      <Box sx={{ p: 3, textAlign: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 800, whiteSpace: "pre-line" }}>{slide.title}</Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 1 }}>{slide.body}</Typography>
        {slide.ctaLabel && (
          <Button variant="contained" sx={{ mt: 2.5 }} fullWidth>
            {slide.ctaLabel}
          </Button>
        )}
      </Box>
      <Box sx={{ position: "absolute", bottom: 14, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 1 }}>
        {[0, 1, 2].map((i) => (
          <Box key={i} sx={{ width: i === 0 ? 22 : 8, height: 8, borderRadius: 4, background: i === 0 ? "#1b3a28" : "#d8cba4" }} />
        ))}
      </Box>
    </Box>
  );
}

function Page() {
  const { data, loading, error, refresh } = useApi<{ items: OnboardingSlide[] }>("/api/admin/onboarding?limit=100");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<OnboardingSlide | null>(null);
  const [deleting, setDeleting] = useState<OnboardingSlide | null>(null);
  const [preview, setPreview] = useState<OnboardingSlide | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const rows = useMemo(
    () => [...(data?.items ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [data]
  );

  const form = useForm({ resolver: zodResolver(onboardingSlideSchema), defaultValues: { title: "", body: "", imageUrl: "", ctaLabel: "", sortOrder: 0, isActive: true } });
  const { control, handleSubmit, reset } = form;

  function openCreate() {
    setEditing(null);
    reset({ title: "", body: "", imageUrl: "", ctaLabel: "", sortOrder: rows.length, isActive: true });
    setFormError(null);
    setDrawerOpen(true);
  }
  function openEdit(row: OnboardingSlide) {
    setEditing(row);
    reset({ ...row, imageUrl: row.imageUrl ?? "", ctaLabel: row.ctaLabel ?? "" });
    setFormError(null);
    setDrawerOpen(true);
  }

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true);
    setFormError(null);
    try {
      if (editing) await api(`/api/admin/onboarding/${editing.id}`, { method: "PATCH", body: JSON.stringify(values) });
      else await api("/api/admin/onboarding", { method: "POST", body: JSON.stringify(values) });
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
      await api(`/api/admin/onboarding/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function move(row: OnboardingSlide, dir: -1 | 1) {
    const idx = rows.findIndex((r) => r.id === row.id);
    const other = rows[idx + dir];
    if (!other) return;
    try {
      await api(`/api/admin/onboarding/${row.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: other.sortOrder ?? 0 }) });
      await api(`/api/admin/onboarding/${other.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: row.sortOrder ?? 0 }) });
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Reorder failed.");
    }
  }

  if (error) return (<><PageHeader title="Onboarding" /><ErrorState message={error} onRetry={refresh} /></>);

  return (
    <Box>
      <PageHeader
        title="Onboarding"
        subtitle="The slides new customers see when they first open the app. At least one slide must stay active."
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Slide</Button>}
      />

      <Box className="grid gap-4" sx={{ gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", xl: "1fr 1fr 1fr" } }}>
        {loading && [0, 1, 2].map((i) => <Card key={i} sx={{ height: 150 }} />)}
        {rows.map((s, i) => (
          <Card key={s.id} sx={{ p: 2, display: "flex", gap: 2 }}>
            <Thumb src={s.imageUrl ?? ""} alt={s.title} size={84} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box className="flex items-center gap-2">
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>SLIDE {i + 1}</Typography>
                <StatusChip status={s.isActive ? "active" : "inactive"} />
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 800, mt: 0.5, whiteSpace: "pre-line" }}>{s.title}</Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {s.body}
              </Typography>
              <Box className="flex items-center gap-1 mt-2">
                <IconButton size="small" aria-label="Preview" onClick={() => setPreview(s)} sx={{ border: "1px solid #e7ddc2", width: 30, height: 30 }}>
                  <VisibilityOutlined sx={{ fontSize: 15 }} />
                </IconButton>
                <IconButton size="small" aria-label="Edit" onClick={() => openEdit(s)} sx={{ border: "1px solid #e7ddc2", width: 30, height: 30 }}>
                  <EditIcon sx={{ fontSize: 15 }} />
                </IconButton>
                <IconButton size="small" aria-label="Delete" onClick={() => setDeleting(s)} sx={{ border: "1px solid #e7ddc2", width: 30, height: 30, color: "#c0392b" }}>
                  <DeleteIcon sx={{ fontSize: 15 }} />
                </IconButton>
                <Box sx={{ flex: 1 }} />
                <IconButton size="small" aria-label="Move up" disabled={i === 0} onClick={() => move(s, -1)}>
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(s, 1)}>
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          </Card>
        ))}
        {!loading && !rows.length && (
          <Card><CardContent sx={{ py: 6, textAlign: "center", color: "text.secondary" }}>No onboarding slides yet.</CardContent></Card>
        )}
      </Box>

      <FormDrawer
        open={drawerOpen}
        title={editing ? "Edit Slide" : "Add Slide"}
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button variant="outlined" onClick={() => setDrawerOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="contained" disabled={busy} onClick={onSubmit} startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}>
              {editing ? "Save changes" : "Add Slide"}
            </Button>
          </>
        }
      >
        <Box className="flex flex-col gap-4">
          {formError && <Typography variant="body2" sx={{ color: "#c0392b", background: "#fdecea", p: 1.5, borderRadius: 2 }}>{formError}</Typography>}
          {[
            { name: "title", label: "Title", type: "text" as const, required: true, hint: "Use \\n for a line break, like the app does." },
            { name: "body", label: "Body copy", type: "textarea" as const, rows: 3 },
            { name: "imageUrl", label: "Illustration", type: "image" as const },
            { name: "ctaLabel", label: "Button label (optional)", type: "text" as const },
            { name: "sortOrder", label: "Display order", type: "number" as const, min: 0 },
            { name: "isActive", label: "Active (shown in app)", type: "switch" as const },
          ].map((f) => <FormField key={f.name} def={f} control={control} errors={form.formState.errors} />)}
        </Box>
      </FormDrawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete slide?"
        message={deleting ? `Delete "${deleting.title}"? The app must always keep at least one active slide.` : ""}
        confirmLabel="Delete"
        danger
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />

      <Dialog open={Boolean(preview)} onClose={() => setPreview(null)} maxWidth="xs">
        <DialogContent sx={{ pt: 3 }}>
          <Box className="flex justify-end mb-2">
            <IconButton size="small" onClick={() => setPreview(null)} aria-label="Close preview"><CloseIcon /></IconButton>
          </Box>
          <PhonePreview slide={preview} />
          <Typography variant="caption" sx={{ color: "text.secondary", display: "block", textAlign: "center", mt: 2 }}>
            Preview at a representative mobile size
          </Typography>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
