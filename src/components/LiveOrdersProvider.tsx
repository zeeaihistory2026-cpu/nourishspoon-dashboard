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
    let stopReceived: (() => void) | undefined;
    let stopCustomers: (() => void) | undefined;
    let stopOrders: (() => void) | undefined;
    let stopReviews: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(getFirebaseAuth(), (user) => {
      stopOrders?.();
      stopCustomers?.();
      stopReceived?.();
      stopReviews?.();
      setConnected(false);
      if (!user) return;
      stopReviews = onSnapshot(
        query(
          collection(getFirebaseDatabase(), "reviews"),
          orderBy("updated_at", "desc"),
          limit(1),
        ),
        () => setRevision((value) => value + 1),
        () => {},
      );
      stopCustomers = onSnapshot(
        query(
          collection(getFirebaseDatabase(), "users"),
          orderBy("updatedAt", "desc"),
          limit(1),
        ),
        () => setRevision((value) => value + 1),
        () => {},
      );
      stopReceived = onSnapshot(
        query(
          collection(getFirebaseDatabase(), "orders"),
          orderBy("created_at", "desc"),
          limit(30),
        ),
        (snapshot) => {
          if (snapshot.metadata.fromCache) return;
          const arrived = snapshot.docs.filter(
            (doc) =>
              !seen.has(doc.id) &&
              Date.parse(doc.data().created_at) >= connectedAt,
          );
          snapshot.docs.forEach((doc) => seen.add(doc.id));
          if (arrived.length)
            setNotice({
              id: arrived[0].id,
              number:
                arrived.length === 1
                  ? arrived[0].data().order_number || "New order"
                  : `${arrived.length} new orders`,
            });
        },
        () => {},
      );
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
      stopReceived?.();
      stopReviews?.();
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
