"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOrderRevision } from "@/components/LiveOrdersProvider";

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { error?: string }).error || `Request failed (${res.status})`,
    );
  }
  return body as T;
}

export function useApi<T>(path: string | null, live = false) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const { revision, connected } = useOrderRevision();

  const load = useCallback(
    async (background = false) => {
      if (!path) return;
      const my = ++seq.current;
      if (!background) setLoading(true);
      setError(null);
      try {
        const d = await api<T>(path);
        if (seq.current === my) setData(d);
      } catch (e) {
        if (seq.current === my)
          setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (seq.current === my) setLoading(false);
      }
    },
    [path],
  );

  useEffect(() => {
    setData(null);
    setLoading(Boolean(path));
    void load();
    return () => {
      ++seq.current;
    };
  }, [load]);

  useEffect(() => {
    if (!live || !path) return;
    void load(true);
  }, [revision, live, path, load]);

  useEffect(() => {
    if (!live || !path) return;
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void load(true);
    };
    const timer = connected
      ? undefined
      : window.setInterval(refreshVisible, 15000);
    window.addEventListener("focus", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [live, path, load, connected]);

  const refresh = useCallback(() => load(), [load]);
  return { data, loading, error, refresh, setData };
}
