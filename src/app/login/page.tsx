"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import LockOutlined from "@mui/icons-material/LockOutlined";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isFirebaseConfigured()) {
      setError("The dashboard is not connected to Firebase yet (missing web config).");
      return;
    }
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        password
      );
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Sign-in failed.");
      router.push("/");
      router.refresh();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Sign-in failed. Please try again.";
      setError(
        msg.includes("auth/")
          ? "Incorrect email or password."
          : msg
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      className="min-h-screen flex items-center justify-center px-4"
      sx={{
        background:
          "radial-gradient(1200px 600px at 20% -10%, #efe6c8 0%, transparent 60%), radial-gradient(1000px 500px at 110% 110%, #e4d9b4 0%, transparent 55%), #f8f4e8",
      }}
    >
      <Card sx={{ width: 420, maxWidth: "100%", p: 1.5 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box
              component="img"
              src="/assets/brand/logo-transparent.png"
              alt="Nourish Spoon"
              sx={{ width: 150, mx: "auto", display: "block", mb: 1 }}
            />
            <Typography
              sx={{ fontFamily: '"Pinyon Script", cursive', color: "#b08a2e", fontSize: 19 }}
            >
              Crafted with Love
            </Typography>
            <Typography
              variant="h5"
              sx={{ fontFamily: '"Playfair Display", Georgia, serif', fontWeight: 700, mt: 1.5 }}
            >
              Admin Dashboard
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
              Sign in with your administrator account
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit} className="flex flex-col gap-3">
            <TextField
              label="Email address"
              type="email"
              required
              fullWidth
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              required
              fullWidth
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
              startIcon={busy ? <CircularProgress size={18} color="inherit" /> : <LockOutlined />}
              sx={{ mt: 1, py: 1.4 }}
            >
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </Box>

          <Typography
            variant="caption"
            sx={{ color: "text.secondary", display: "block", textAlign: "center", mt: 3 }}
          >
            Authorised staff only. Access is logged.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
