"use client";

import React from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/CloseOutlined";

/* ---------------------------------- Page header ---------------------------------- */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <Box className="flex flex-wrap items-start justify-between gap-3 mb-5">
      <Box>
        <Typography
          variant="h4"
          sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, fontSize: 30 }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box className="flex items-center gap-2">{action}</Box>}
    </Box>
  );
}

/* ---------------------------------- Status chip ---------------------------------- */

const STATUS_STYLES: Record<string, { bg: string; fg: string; dot: string }> = {
  pending: { bg: "#fdf3dd", fg: "#a07c14", dot: "#d9a416" },
  placed: { bg: "#fdf3dd", fg: "#a07c14", dot: "#d9a416" },
  confirmed: { bg: "#e7f4ea", fg: "#2e7d4f", dot: "#2e9e5b" },
  packed: { bg: "#e7f0fa", fg: "#2f6f8f", dot: "#3d8ab5" },
  shipped: { bg: "#e7f0fa", fg: "#2f6f8f", dot: "#3d8ab5" },
  dispatched: { bg: "#e3f2f0", fg: "#1f7a6d", dot: "#26a393" },
  in_transit: { bg: "#e7f0fa", fg: "#2f6f8f", dot: "#3d8ab5" },
  out_for_delivery: { bg: "#efe7fa", fg: "#6d4bb0", dot: "#8a63d2" },
  delivered: { bg: "#e7f4ea", fg: "#2e7d4f", dot: "#2e9e5b" },
  active: { bg: "#e7f4ea", fg: "#2e7d4f", dot: "#2e9e5b" },
  visible: { bg: "#e7f4ea", fg: "#2e7d4f", dot: "#2e9e5b" },
  featured: { bg: "#f4e9c8", fg: "#8f6b1f", dot: "#c9a227" },
  sent: { bg: "#e7f4ea", fg: "#2e7d4f", dot: "#2e9e5b" },
  rewarded: { bg: "#e7f4ea", fg: "#2e7d4f", dot: "#2e9e5b" },
  completed: { bg: "#e7f4ea", fg: "#2e7d4f", dot: "#2e9e5b" },
  cancelled: { bg: "#fdecea", fg: "#c0392b", dot: "#e05240" },
  removed: { bg: "#fdecea", fg: "#c0392b", dot: "#e05240" },
  delayed: { bg: "#fdecea", fg: "#c0392b", dot: "#e05240" },
  reversed: { bg: "#fdecea", fg: "#c0392b", dot: "#e05240" },
  failed: { bg: "#fdecea", fg: "#c0392b", dot: "#e05240" },
  hidden: { bg: "#efe9d8", fg: "#8d8670", dot: "#b3a983" },
  draft: { bg: "#efe9d8", fg: "#8d8670", dot: "#b3a983" },
  archived: { bg: "#efe9d8", fg: "#8d8670", dot: "#b3a983" },
  inactive: { bg: "#efe9d8", fg: "#8d8670", dot: "#b3a983" },
};

export function StatusChip({ status, label }: { status: string; label?: string }) {
  const key = status.toLowerCase().replace(/[\s-]+/g, "_");
  const s = STATUS_STYLES[key] ?? { bg: "#efe9d8", fg: "#57523f", dot: "#b3a983" };
  const text =
    label ??
    status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Chip
      size="small"
      label={
        <span className="inline-flex items-center gap-1.5">
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: s.dot,
              display: "inline-block",
            }}
          />
          {text}
        </span>
      }
      sx={{ backgroundColor: s.bg, color: s.fg, fontWeight: 700, fontSize: 12 }}
    />
  );
}

/* ---------------------------------- Data table ---------------------------------- */

export interface Column<T> {
  key: string;
  header: string;
  width?: string | number;
  align?: "left" | "center" | "right";
  render: (row: T) => React.ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  loading,
  emptyText = "No records yet.",
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent>
          <Skeleton variant="rounded" height={36} sx={{ mb: 1 }} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={52} sx={{ mb: 1 }} />
          ))}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card sx={{ overflow: "hidden" }}>
      <TableContainer sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow>
              {columns.map((c) => (
                <TableCell key={c.key} width={c.width} align={c.align ?? "left"}>
                  {c.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                hover
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                sx={onRowClick ? { cursor: "pointer" } : undefined}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} align={c.align ?? "left"}>
                    {c.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    {emptyText}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}

/* ---------------------------------- Row actions ---------------------------------- */

export function RowActions({ children }: { children: React.ReactNode }) {
  return <Box className="flex items-center gap-1 justify-end">{children}</Box>;
}

export function ActionButton({
  title,
  onClick,
  children,
  danger,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <IconButton
      size="small"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      sx={{
        color: danger ? "#c0392b" : "#57523f",
        border: "1px solid #e7ddc2",
        backgroundColor: "#fffdf7",
        width: 30,
        height: 30,
        "&:hover": {
          backgroundColor: danger ? "#fdecea" : "#f4e9c8",
          borderColor: danger ? "#e05240" : "#c9a227",
        },
      }}
    >
      {children}
    </IconButton>
  );
}

/* ---------------------------------- Confirm dialog ---------------------------------- */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
        {title}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {message}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="outlined" disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          disabled={busy}
          color={danger ? "error" : "primary"}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/* ---------------------------------- Form drawer ---------------------------------- */

export function FormDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: { xs: "100vw", sm: wide ? 640 : 480 }, maxWidth: "100vw", height: "100%", display: "flex", flexDirection: "column" }}>
        <Box className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b" sx={{ borderColor: "#ece4cb" }}>
          <Box>
            <Typography variant="h5" sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <IconButton onClick={onClose} aria-label="Close" sx={{ border: "1px solid #e7ddc2" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box className="flex-1 overflow-y-auto px-6 py-5">{children}</Box>
        {footer && (
          <Box className="px-6 py-4 border-t flex items-center justify-end gap-2" sx={{ borderColor: "#ece4cb", background: "#fbf7ea" }}>
            {footer}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}

/* ---------------------------------- Misc ---------------------------------- */

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <CardContent sx={{ textAlign: "center", py: 6 }}>
        <Typography variant="body1" sx={{ fontWeight: 700, mb: 1 }}>
          Couldn't load this section
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          {message}
        </Typography>
        {onRetry && (
          <Button variant="outlined" onClick={onRetry}>
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Typography variant="caption" sx={{ color: "#c0392b", mt: 0.5, display: "block" }}>
      {message}
    </Typography>
  );
}

export function Thumb({ src, alt, size = 44, circle = false }: { src?: string; alt: string; size?: number; circle?: boolean }) {
  if (!src) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: circle ? "50%" : 2,
          background: "#f4e9c8",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8f6b1f",
          fontWeight: 800,
          fontSize: size * 0.4,
          flexShrink: 0,
        }}
      >
        {alt.charAt(0).toUpperCase()}
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      sx={{
        width: size,
        height: size,
        borderRadius: circle ? "50%" : 2,
        objectFit: circle ? "cover" : "contain",
        flexShrink: 0,
        border: "1px solid #ece4cb",
        background: "#f8f4e8",
      }}
    />
  );
}
