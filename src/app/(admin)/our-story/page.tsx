"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpwardOutlined";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownwardOutlined";
import CloseIcon from "@mui/icons-material/CloseOutlined";
import { useApi, api } from "@/lib/api";
import { PageHeader, ErrorState, ConfirmDialog } from "@/components/ui";
import { ImageUpload } from "@/components/forms";
import type { StorySection } from "@/lib/types";

function Page() {
  const { data, loading, error, refresh } = useApi<{ item: { sections: StorySection[] } }>("/api/admin/our-story");
  const [sections, setSections] = useState<StorySection[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState<StorySection>({ heading: "", body: "", imageUrl: "" });
  const [deleting, setDeleting] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (data?.item) setSections(JSON.parse(JSON.stringify(data.item.sections ?? [])));
  }, [data]);

  const dirty = useMemo(
    () => JSON.stringify(sections) !== JSON.stringify(data?.item?.sections ?? []),
    [sections, data]
  );

  function openCreate() {
    setEditing(-1);
    setDraft({ heading: "", body: "", imageUrl: "" });
  }
  function openEdit(i: number) {
    setEditing(i);
    setDraft({ ...sections[i] });
  }
  function saveDraft() {
    if (editing === null) return;
    if (editing === -1) setSections((s) => [...s, draft]);
    else setSections((s) => s.map((x, i) => (i === editing ? draft : x)));
    setEditing(null);
  }
  function move(i: number, dir: -1 | 1) {
    setSections((s) => {
      const arr = [...s];
      const j = i + dir;
      if (j < 0 || j >= arr.length) return s;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
  }

  async function publish() {
    setSaving(true);
    setMsg(null);
    try {
      await api("/api/admin/our-story", { method: "PUT", body: JSON.stringify({ sections }) });
      setMsg("Our Story published.");
      refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (error) return (<><PageHeader title="Our Story" /><ErrorState message={error} onRetry={refresh} /></>);
  if (loading) return (<><PageHeader title="Our Story" /><Card sx={{ p: 6, textAlign: "center" }}><CircularProgress /></Card></>);

  return (
    <Box>
      <PageHeader
        title="Our Story"
        subtitle="The brand story shown in the app — structured sections, not one long blob."
        action={
          <>
            <Button variant="outlined" onClick={() => setPreview(true)}>Preview</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Section</Button>
            <Button variant="contained" disabled={saving || !dirty} onClick={publish}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
              sx={{ background: "#b08a2e", "&:hover": { background: "#8f6b1f" } }}>
              {saving ? "Publishing..." : "Publish"}
            </Button>
          </>
        }
      />

      {msg && (
        <Typography variant="body2" sx={{ mb: 2, background: msg.includes("failed") ? "#fdecea" : "#e7f4ea", color: msg.includes("failed") ? "#c0392b" : "#2e7d4f", p: 1.5, borderRadius: 2 }}>
          {msg}
        </Typography>
      )}

      <Box className="flex flex-col gap-3">
        {sections.map((s, i) => (
          <Card key={i} sx={{ p: 2.5 }}>
            <Box className="flex items-start gap-3">
              {s.imageUrl && (
                <Box component="img" src={s.imageUrl} alt="" sx={{ width: 120, height: 90, objectFit: "cover", borderRadius: 2, border: "1px solid #ece4cb", flexShrink: 0 }} />
              )}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary" }}>SECTION {i + 1}</Typography>
                {s.heading && <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{s.heading}</Typography>}
                <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-line", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
                  {s.body}
                </Typography>
              </Box>
              <Box className="flex flex-col gap-1">
                <IconButton size="small" aria-label="Edit" onClick={() => openEdit(i)} sx={{ border: "1px solid #e7ddc2", width: 30, height: 30 }}><EditIcon sx={{ fontSize: 15 }} /></IconButton>
                <IconButton size="small" aria-label="Delete" onClick={() => setDeleting(i)} sx={{ border: "1px solid #e7ddc2", width: 30, height: 30, color: "#c0392b" }}><DeleteIcon sx={{ fontSize: 15 }} /></IconButton>
                <IconButton size="small" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpwardIcon fontSize="small" /></IconButton>
                <IconButton size="small" aria-label="Move down" disabled={i === sections.length - 1} onClick={() => move(i, 1)}><ArrowDownwardIcon fontSize="small" /></IconButton>
              </Box>
            </Box>
          </Card>
        ))}
        {!sections.length && (
          <Card sx={{ p: 6, textAlign: "center", color: "text.secondary" }}>No sections yet. Add the first one.</Card>
        )}
      </Box>

      <Dialog open={editing !== null} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogContent sx={{ pt: 3 }} className="flex flex-col gap-3">
          <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            {editing === -1 ? "Add section" : "Edit section"}
          </Typography>
          <TextField size="small" fullWidth label="Heading (optional)" value={draft.heading} onChange={(e) => setDraft({ ...draft, heading: e.target.value })} />
          <TextField size="small" fullWidth label="Body" multiline rows={5} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          <ImageUpload label="Section image (optional)" folder="app-content" value={draft.imageUrl ?? ""} onChange={(url) => setDraft({ ...draft, imageUrl: url })} />
          <Box className="flex justify-end gap-2">
            <Button variant="outlined" onClick={() => setEditing(null)}>Cancel</Button>
            <Button variant="contained" onClick={saveDraft} disabled={!draft.body.trim()}>Save section</Button>
          </Box>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete section?"
        message="This section will be removed from the story."
        confirmLabel="Delete"
        danger
        onClose={() => setDeleting(null)}
        onConfirm={() => { if (deleting !== null) setSections((s) => s.filter((_, i) => i !== deleting)); setDeleting(null); }}
      />

      <Dialog open={preview} onClose={() => setPreview(false)} maxWidth="xs">
        <DialogContent sx={{ pt: 3 }}>
          <Box className="flex justify-end mb-2">
            <IconButton size="small" onClick={() => setPreview(false)} aria-label="Close preview"><CloseIcon /></IconButton>
          </Box>
          <Box sx={{ width: 300, height: 620, borderRadius: 7, border: "10px solid #1b3a28", overflow: "hidden", background: "#f8f4e8", mx: "auto" }}>
            <Box sx={{ height: 620, overflowY: "auto", p: 2.5 }}>
              {sections.map((s, i) => (
                <Box key={i} sx={{ mb: 3 }}>
                  {s.imageUrl && <Box component="img" src={s.imageUrl} alt="" sx={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 2, mb: 1.5 }} />}
                  {s.heading && <Typography variant="h6" sx={{ fontFamily: 'var(--font-display)', fontWeight: 700, mb: 1 }}>{s.heading}</Typography>}
                  <Typography variant="body2" sx={{ color: "text.secondary", whiteSpace: "pre-line" }}>{s.body}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default function OurStoryPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
