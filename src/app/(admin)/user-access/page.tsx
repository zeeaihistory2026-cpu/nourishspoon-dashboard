"use client";

import { Suspense, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutline from "@mui/icons-material/DeleteOutlineOutlined";
import { api, useApi } from "@/lib/api";

interface AccessUser {
  email: string;
  name: string;
  role: "admin" | "child";
  createdAt?: string;
}

function Page() {
  const {
    data,
    loading,
    error,
    refresh: load,
  } = useApi<{ users: AccessUser[] }>("/api/admin/access");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "child">("child");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<AccessUser | null>(null);
  const [removing, setRemoving] = useState(false);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);
    setSaving(true);
    try {
      await api("/api/admin/access", {
        method: "POST",
        body: JSON.stringify({ name, email, role }),
      });
      setNotice(`${name} can now sign in with ${email}.`);
      setName("");
      setEmail("");
      setRole("child");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add user.");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser() {
    if (!deleting) return;
    setRemoving(true);
    try {
      await api(
        `/api/admin/access?email=${encodeURIComponent(deleting.email)}`,
        { method: "DELETE" },
      );
      setNotice(`Removed access for ${deleting.name} (${deleting.email}).`);
      setDeleting(null);
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Could not remove user.",
      );
    } finally {
      setRemoving(false);
    }
  }

  const users = data?.users ?? [];

  return (
    <Box className="flex flex-col gap-5">
      <Box>
        <Typography
          variant="h4"
          sx={{
            fontFamily: '"Playfair Display", Georgia, serif',
            fontWeight: 700,
          }}
        >
          User Access
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          Give dashboard access to anyone. Admins can manage everything
          including users. Child accounts can use the dashboard but cannot
          manage users.
        </Typography>
      </Box>

      {notice && (
        <Alert severity="success" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}
      {formError && (
        <Alert severity="error" onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      <Card sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>
          Give access
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
          The person signs in with their own Google/email account on the login
          page. They must already have a Firebase account (sign up with email
          &amp; password) — this page only grants them dashboard access.
        </Typography>
        <Box
          component="form"
          onSubmit={addUser}
          className="flex flex-wrap gap-3 items-end"
        >
          <TextField
            label="Full name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ minWidth: 200, flex: 1 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Email address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ minWidth: 240, flex: 1 }}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Access level</InputLabel>
            <Select
              label="Access level"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "child")}
            >
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="child">Child</MenuItem>
            </Select>
          </FormControl>
          <Button
            type="submit"
            variant="contained"
            startIcon={<AddIcon />}
            disabled={saving}
            sx={{ px: 3, py: 1.3 }}
          >
            {saving ? "Adding..." : "Give access"}
          </Button>
        </Box>
      </Card>

      <Card sx={{ overflow: "hidden" }}>
        <Box className="overflow-x-auto">
          <table
            className="w-full text-sm"
            style={{ borderCollapse: "collapse", minWidth: 560 }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #ece4cb" }}>
                {["Name", "Email", "Access", "Added", ""].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      textAlign: i === 4 ? "right" : "left",
                      padding: "12px 16px",
                      paddingRight: i === 4 ? 20 : 16,
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: "#8d8670",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} style={{ borderBottom: "1px solid #f1ebd6" }}>
                  <td style={{ padding: "11px 16px", fontWeight: 700 }}>
                    {u.name}
                  </td>
                  <td style={{ padding: "11px 16px" }}>{u.email}</td>
                  <td style={{ padding: "11px 16px" }}>
                    <Chip
                      label={u.role === "admin" ? "Admin" : "Child"}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        background: u.role === "admin" ? "#1b3a28" : "#f4e9c8",
                        color: u.role === "admin" ? "#fff" : "#57523f",
                      }}
                    />
                  </td>
                  <td style={{ padding: "11px 16px", color: "#57523f" }}>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td
                    style={{
                      padding: "11px 20px 11px 16px",
                      textAlign: "right",
                    }}
                  >
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<DeleteOutline sx={{ fontSize: 16 }} />}
                      sx={{ color: "#c0392b" }}
                      onClick={() => setDeleting(u)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      padding: 32,
                      textAlign: "center",
                      color: "#8d8670",
                    }}
                  >
                    {loading
                      ? "Loading users..."
                      : error
                        ? error
                        : "No extra users yet. The owner account always has access."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Box>
      </Card>

      <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
        <DialogTitle>Remove access?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {deleting?.name} ({deleting?.email}) will no longer be able to sign
            in to the dashboard.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={removeUser}
            disabled={removing}
          >
            {removing ? "Removing..." : "Remove access"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function UserAccessPage() {
  return (
    <Suspense>
      <Page />
    </Suspense>
  );
}
