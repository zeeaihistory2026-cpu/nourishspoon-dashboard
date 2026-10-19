"use client";

import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlined from "@mui/icons-material/DeleteOutlined";
import { Controller } from "react-hook-form";
import { FieldError } from "./ui";

export type FieldType = "text" | "textarea" | "number" | "switch" | "select" | "image";

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  hint?: string;
  rows?: number;
  options?: { value: string; label: string }[];
  min?: number;
  prefix?: string;
}

/* -------------------------------- Image upload -------------------------------- */

export function ImageUpload({
  value,
  onChange,
  folder = "admin-uploads",
  label = "Image",
}: {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState("");

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const res = await fetch("/api/admin/upload", { method: "POST", body: form, credentials: "include" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Upload failed.");
      onChange(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <Box>
      <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, fontSize: 13 }}>
        {label}
      </Typography>
      {value ? (
        <Box sx={{ position: "relative", width: "100%", borderRadius: 2, overflow: "hidden", border: "1px solid #e7ddc2" }}>
          <Box component="img" src={value} alt={label} sx={{ width: "100%", height: 170, objectFit: "contain", display: "block", background: "#f8f4e8" }} />
          <Button
            size="small"
            variant="contained"
            color="error"
            startIcon={<DeleteOutlined />}
            onClick={() => onChange("")}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            Remove
          </Button>
        </Box>
      ) : (
        <Button
          variant="outlined"
          fullWidth
          startIcon={busy ? <CircularProgress size={16} /> : <CloudUploadOutlined />}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          sx={{ py: 2.2, borderStyle: "dashed", flexDirection: "column", gap: 0.5 }}
        >
          <span>{busy ? "Uploading..." : "Upload image"}</span>
          <span style={{ fontSize: 11, fontWeight: 400, color: "#8d8670" }}>JPG, PNG, WebP or GIF · max 5 MB</span>
        </Button>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={pick} />
      {error && <FieldError message={error} />}
      {!value && (
        <Box className="flex items-center gap-1" sx={{ mt: 1 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Or paste an image URL…"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            slotProps={{ htmlInput: { "aria-label": "Image URL" } }}
          />
          <Button
            variant="outlined"
            size="small"
            disabled={!/^https?:\/\/.+/i.test(urlDraft.trim())}
            onClick={() => {
              onChange(urlDraft.trim());
              setUrlDraft("");
              setError(null);
            }}
            sx={{ whiteSpace: "nowrap" }}
          >
            Use URL
          </Button>
        </Box>
      )}
    </Box>
  );
}

/* --------------------------------- Field renderer --------------------------------- */

export function FormField({
  def,
  control,
  errors,
}: {
  def: FieldDef;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  errors: any;
}) {
  const errMsg = (errors[def.name]?.message as string) ?? undefined;

  if (def.type === "switch") {
    return (
      <Controller
        name={def.name}
        control={control}
        render={({ field }) => (
          <Box>
            <FormControlLabel
              control={<Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />}
              label={<Typography variant="body2" sx={{ fontWeight: 700, fontSize: 13 }}>{def.label}</Typography>}
            />
            {def.hint && <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>{def.hint}</Typography>}
          </Box>
        )}
      />
    );
  }

  if (def.type === "image") {
    return (
      <Controller
        name={def.name}
        control={control}
        render={({ field }) => (
          <Box>
            <ImageUpload value={field.value} onChange={field.onChange} label={def.label} />
            <FieldError message={errMsg} />
          </Box>
        )}
      />
    );
  }

  if (def.type === "select") {
    return (
      <Box>
        <Controller
          name={def.name}
          control={control}
          render={({ field }) => (
            <TextField select fullWidth label={def.label} {...field} value={field.value ?? ""} size="small">
              {(def.options ?? []).map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
          )}
        />
        <FieldError message={errMsg} />
      </Box>
    );
  }

  return (
    <Box>
      <Controller
        name={def.name}
        control={control}
        render={({ field }) => (
          <TextField
            fullWidth
            size="small"
            label={def.label}
            type={def.type === "number" ? "number" : "text"}
            multiline={def.type === "textarea"}
            rows={def.type === "textarea" ? def.rows ?? 3 : undefined}
            helperText={def.hint}
            {...field}
            value={field.value ?? ""}
            onChange={(e) =>
              field.onChange(def.type === "number" ? (e.target.value === "" ? undefined : Number(e.target.value)) : e.target.value)
            }
            slotProps={def.min !== undefined ? { htmlInput: { min: def.min } } : undefined}
          />
        )}
      />
      <FieldError message={errMsg} />
    </Box>
  );
}
