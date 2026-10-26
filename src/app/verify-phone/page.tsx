"use client";
import { useEffect, useRef, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  inMemoryPersistence,
  signInWithCustomToken,
  linkWithPhoneNumber,
  RecaptchaVerifier,
  connectAuthEmulator,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";
import { Alert, Box, Button, Card, TextField, Typography } from "@mui/material";

export default function VerifyPhonePage() {
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [verified, setVerified] = useState(false),
    [sent, setSent] = useState(false);
  const [phone, setPhone] = useState(""),
    [code, setCode] = useState(""),
    [message, setMessage] = useState("");
  const authRef = useRef<Auth | null>(null),
    confirmation = useRef<ConfirmationResult | null>(null),
    captcha = useRef<RecaptchaVerifier | null>(null);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const parameters = new URLSearchParams(location.hash.slice(1));
    const sessionCode = parameters.get("code"),
      verifier = parameters.get("verifier");
    history.replaceState(null, "", location.pathname);
    if (!sessionCode || !verifier) {
      setMessage(
        "Start phone verification from Refer & Earn in the Nourish Spoon app.",
      );
      return;
    }
    void (async () => {
      const app =
        getApps().find((item) => item.name === "phone-verification") ||
        initializeApp(
          {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
          },
          "phone-verification",
        );
      let auth: Auth;
      try {
        auth = initializeAuth(app, { persistence: inMemoryPersistence });
      } catch {
        auth = getAuth(app);
      }
      const host = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
      if (
        host &&
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "demo-nourish-spoon"
      ) {
        try {
          connectAuthEmulator(auth, `http://${host}`, {
            disableWarnings: true,
          });
        } catch {}
      }
      authRef.current = auth;
      const response = await fetch("/api/phone-verification/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: sessionCode, verifier }),
      });
      const result = await response.json();
      if (!response.ok)
        throw Error(
          result.error ||
            "Verification session expired. Return to the app and try again.",
        );
      await signInWithCustomToken(auth, result.token);
      if (auth.currentUser?.phoneNumber) setVerified(true);
      setReady(true);
    })().catch((error) =>
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not start verification.",
      ),
    );
    return () => {
      captcha.current?.clear();
    };
  }, []);
  async function send() {
    if (!authRef.current?.currentUser || busy) return;
    if (!/^\+[1-9]\d{7,14}$/.test(phone.trim())) {
      setMessage(
        "Enter your mobile number with its country code, for example +923001234567.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      if (!captcha.current)
        captcha.current = new RecaptchaVerifier(
          authRef.current,
          "phone-recaptcha",
          { size: "normal" },
        );
      confirmation.current = await linkWithPhoneNumber(
        authRef.current.currentUser,
        phone.trim(),
        captcha.current,
      );
      setSent(true);
    } catch (error: any) {
      setMessage(
        error?.code === "auth/credential-already-in-use"
          ? "This phone is linked to another account. Use that account or contact Nourish Spoon."
          : error?.code === "auth/operation-not-allowed"
            ? "Phone verification has not been enabled yet. Contact Nourish Spoon; your referral stays linked."
            : "Could not send the SMS. Check the number, complete reCAPTCHA and try again.",
      );
      captcha.current?.clear();
      captcha.current = null;
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!confirmation.current || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await confirmation.current.confirm(code.trim());
      setVerified(true);
    } catch {
      setMessage(
        "The SMS code is invalid or expired. Check it or request another code.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Box
      sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 3 }}
    >
      <Card
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography variant="h4" sx={{ fontFamily: "var(--font-display)" }}>
          Verify your phone
        </Typography>
        <Typography>
          Nourish Spoon uses a verified phone to protect the first-order welcome
          reward.
        </Typography>
        {message && <Alert severity="error">{message}</Alert>}
        {verified ? (
          <>
            <Alert severity="success">
              Your phone is verified. Return to the app and refresh Refer &
              Earn.
            </Alert>
            <Button variant="contained" href="nourishspoon://phone-verified">
              Return to Nourish Spoon
            </Button>
          </>
        ) : (
          <>
            <TextField
              label="Mobile number with country code"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={!ready || busy || sent}
              autoComplete="tel"
            />
            <Typography variant="body2">
              By requesting a code, you agree to receive a verification SMS.
              Google processes the number for authentication and abuse
              prevention. Standard message rates may apply.
            </Typography>
            <Box id="phone-recaptcha" />
            {!sent ? (
              <Button
                variant="contained"
                disabled={!ready || busy}
                onClick={send}
              >
                {busy ? "Sending…" : "Send verification code"}
              </Button>
            ) : (
              <>
                <TextField
                  label="SMS code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  slotProps={{
                    htmlInput: { inputMode: "numeric", maxLength: 6 },
                  }}
                />
                <Button
                  variant="contained"
                  disabled={busy || !/^\d{6}$/.test(code)}
                  onClick={confirm}
                >
                  {busy ? "Verifying…" : "Verify phone"}
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => {
                    setSent(false);
                    confirmation.current = null;
                  }}
                >
                  Use another number or resend
                </Button>
              </>
            )}
          </>
        )}
      </Card>
    </Box>
  );
}
