"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { Alert, Button, Snackbar } from "@mui/material";
import Link from "next/link";
import { getFirebaseDatabase, getFirebaseAuth } from "@/lib/firebase-client";

const Revision = createContext({ revision: 0, connected: false });
export const useOrderRevision = () => useContext(Revision);

/** Firestore invalidates authenticated API views; the API remains the write authority. */
export function LiveOrdersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [revision, setRevision] = useState(0);
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState<{ id: string; number: string } | null>(
    null,
  );
  useEffect(() => {
    const connectedAt = Date.now();
    const seen = new Set<string>();
    let stopCustomers: (() => void) | undefined;
    let stopOrders: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(getFirebaseAuth(), (user) => {
      stopOrders?.();
      stopCustomers?.();
      setConnected(false);
      if (!user) return;
      stopCustomers = onSnapshot(
        query(
          collection(getFirebaseDatabase(), "users"),
          orderBy("updatedAt", "desc"),
          limit(1),
        ),
        () => setRevision((value) => value + 1),
        () => {},
      );
      let initial = true;
      stopOrders = onSnapshot(
        query(
          collection(getFirebaseDatabase(), "orders"),
          orderBy("updated_at", "desc"),
          limit(1),
        ),
        { includeMetadataChanges: true },
        (snapshot) => {
          setConnected(!snapshot.metadata.fromCache);
          setRevision((value) => value + 1);
          const latest = snapshot.docs[0];
          if (
            !initial &&
            latest &&
            !seen.has(latest.id) &&
            Date.parse(latest.data().created_at) >= connectedAt
          ) {
            setNotice({
              id: latest.id,
              number: latest.data().order_number || "New order",
            });
          }
          if (latest) seen.add(latest.id);
          initial = false;
        },
        () => {
          setConnected(false);
        },
      );
    });
    return () => {
      stopAuth();
      stopOrders?.();
      stopCustomers?.();
    };
  }, []);
  return (
    <Revision.Provider value={{ revision, connected }}>
      {children}
      <Snackbar
        open={!!notice}
        autoHideDuration={10000}
        onClose={() => setNotice(null)}
      >
        <Alert
          severity="info"
          onClose={() => setNotice(null)}
          action={
            <Button
              color="inherit"
              component={Link}
              href={`/orders?view=${notice?.id}`}
              onClick={() => setNotice(null)}
            >
              View
            </Button>
          }
        >
          {notice?.number} received
        </Alert>
      </Snackbar>
    </Revision.Provider>
  );
}
