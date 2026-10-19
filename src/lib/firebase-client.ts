"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let database: Firestore | null = null;

export function getFirebaseDatabase(): Firestore {
  if (database) return database;
  const instance = getFirestore(getFirebaseApp());
  const host = process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_HOST;
  if (host) {
    if (
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "demo-nourish-spoon" ||
      !/^(127\.0\.0\.1|localhost):\d+$/.test(host)
    )
      throw new Error("Local previews require the isolated demo project.");
    const [hostname, port] = host.split(":");
    connectFirestoreEmulator(instance, hostname, Number(port));
  }
  database = instance;
  return database;
}

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  if (getApps().length) {
    app = getApps()[0]!;
    return app;
  }
  app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  const host = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (host) {
    if (
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "demo-nourish-spoon" ||
      !/^(127\.0\.0\.1|localhost):\d+$/.test(host)
    )
      throw new Error("Local previews require the isolated demo project.");
    connectAuthEmulator(auth, `http://${host}`, { disableWarnings: true });
  }
  return auth;
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  );
}
