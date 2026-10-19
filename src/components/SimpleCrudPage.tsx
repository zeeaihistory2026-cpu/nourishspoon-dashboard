"use client";

import React, { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpwardOutlined";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownwardOutlined";
import { useApi, api } from "@/lib/api";
import {
  PageHeader,
  DataTable,
  ConfirmDialog,
  FormDrawer,
  ErrorState,
  StatusChip,
  type Column,
} from "./ui";
import { FormField, type FieldDef } from "./forms";

export interface SimpleCrudPageProps<T extends { id: string }> {
  title: string;
  subtitle?: string;
  endpoint: string;
  itemName: string;
  columns: Column<T>[];
  fields: FieldDef[];
  schema: z.ZodTypeAny;
  defaults?: Record<string, unknown>;
  reorder?: boolean;
  searchPlaceholder?: string;
  deleteConfirm?: (row: T) => string;
  onSaved?: () => void;
  hideHeader?: boolean;
}

export default function SimpleCrudPage<T extends { id: string }>({
  title,
  subtitle,
  endpoint,
  itemName,
  columns,
  fields,
  schema,
  defaults = {},
  reorder = false,
  searchPlaceholder = "Search...",
  deleteConfirm,
  onSaved,
  hideHeader,
}: SimpleCrudPageProps<T>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [appliedSearch, setAppliedSearch] = useState(searchParams.get("search") ?? "");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const path = useMemo(
    () => `${endpoint}?limit=500${appliedSearch ? `&search=${encodeURIComponent(appliedSearch)}` : ""}`,
    [endpoint, appliedSearch]
  );
  const { data, loading, error, refresh } = useApi<{ items: T[] }>(path);
  const rows = useMemo(() => data?.items ?? [], [data]);

  const form = useForm<Record<string, unknown>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: defaults as never,
  });
  const { control, handleSubmit, reset, formState } = form;

  function openCreate() {
    setEditing(null);
    reset(defaults as never);
    setFormError(null);
    setDrawerOpen(true);
  }

  function openEdit(row: T) {
    setEditing(row);
    reset({ ...defaults, ...row } as never);
    setFormError(null);
    setDrawerOpen(true);
  }

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true);
    setFormError(null);
    try {
      if (editing) {
        await api(`${endpoint}/${editing.id}`, { method: "PATCH", body: JSON.stringify(values) });
      } else {
        await api(endpoint, { method: "POST", body: JSON.stringify(values) });
      }
      setDrawerOpen(false);
      refresh();
      onSaved?.();
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
      await api(`${endpoint}/${deleting.id}`, { method: "DELETE" });
      setDeleting(null);
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  async function move(row: T, dir: -1 | 1) {
    const sorted = [...rows].sort((a, b) => ((a as any).sortOrder ?? 0) - ((b as any).sortOrder ?? 0));
    const idx = sorted.findIndex((r) => r.id === row.id);
    const other = sorted[idx + dir];
    if (!other) return;
    try {
      const aOrder = (row as any).sortOrder ?? 0;
      const bOrder = (other as any).sortOrder ?? 0;
      await api(`${endpoint}/${row.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: bOrder }) });
      await api(`${endpoint}/${other.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: aOrder }) });
      refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Reorder failed.");
    }
  }

  const allColumns: Column<T>[] = useMemo(() => {
    const cols = [...columns];
    if (reorder) {
      cols.push({
        key: "_order",
        header: "Order",
        width: 110,
        render: (row) => (
          <Box className="flex items-center gap-1">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); move(row, -1); }} aria-label="Move up">
              <ArrowUpwardIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); move(row, 1); }} aria-label="Move down">
              <ArrowDownwardIcon fontSize="small" />
            </IconButton>
          </Box>
        ),
      });
    }
    cols.push({
      key: "_actions",
      header: "Actions",
      width: 110,
      align: "right",
      render: (row) => (
        <Box className="flex items-center gap-1 justify-end">
          <IconButton size="small" aria-label="Edit" onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            sx={{ border: "1px solid #e7ddc2", backgroundColor: "#fffdf7", width: 30, height: 30 }}>
            <EditIcon sx={{ fontSize: 15 }} />
          </IconButton>
          <IconButton size="small" aria-label="Delete" onClick={(e) => { e.stopPropagation(); setDeleting(row); }}
            sx={{ border: "1px solid #e7ddc2", backgroundColor: "#fffdf7", width: 30, height: 30, color: "#c0392b" }}>
            <DeleteIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Box>
      ),
    });
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, reorder, rows]);

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setAppliedSearch(search.trim());
    const p = new URLSearchParams(searchParams.toString());
    if (search.trim()) p.set("search", search.trim());
    else p.delete("search");
    router.replace(`?${p.toString()}`, { scroll: false });
  }

  if (error) return (<>{!hideHeader && <PageHeader title={title} subtitle={subtitle} />}<ErrorState message={error} onRetry={refresh} /></>);

  return (
    <Box>
      {!hideHeader && (
        <PageHeader
          title={title}
          subtitle={subtitle}
          action={
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Add {itemName}
            </Button>
          }
        />
      )}
      {hideHeader && (
        <Box className="flex justify-end mb-3">
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add {itemName}
          </Button>
        </Box>
      )}

      <Card sx={{ mb: 2, p: 1.5 }}>
        <Box component="form" onSubmit={submitSearch} sx={{ maxWidth: 420 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#8d8670", fontSize: 19 }} />
                </InputAdornment>
              ),
            },
          }}
          />
        </Box>
      </Card>

      <DataTable columns={allColumns} rows={rows} loading={loading} onRowClick={openEdit} />

      <FormDrawer
        open={drawerOpen}
        title={editing ? `Edit ${itemName}` : `Add ${itemName}`}
        onClose={() => setDrawerOpen(false)}
        footer={
          <>
            <Button variant="outlined" onClick={() => setDrawerOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={busy || !formState.isDirty}
              onClick={onSubmit}
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {editing ? "Save changes" : `Add ${itemName}`}
            </Button>
          </>
        }
      >
        <Box className="flex flex-col gap-4">
          {formError && (
            <Typography variant="body2" sx={{ color: "#c0392b", background: "#fdecea", p: 1.5, borderRadius: 2 }}>
              {formError}
            </Typography>
          )}
          {fields.map((f) => (
            <FormField key={f.name} def={f} control={control} errors={form.formState.errors} />
          ))}
          {!formState.isDirty && editing && (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              No changes yet.
            </Typography>
          )}
        </Box>
      </FormDrawer>

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${itemName}?`}
        message={deleting ? deleteConfirm?.(deleting) ?? `This will permanently delete this ${itemName.toLowerCase()}. This cannot be undone.` : ""}
        confirmLabel="Delete"
        danger
        busy={busy}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}

export { StatusChip };
