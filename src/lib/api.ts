"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (body as { error?: string }).error || `Request failed (${res.status})`
    );
  }
  return body as T;
}

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!path) return;
    const my = ++seq.current;
    setLoading(true);
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
  }, [path]);

  useEffect(() => {
    setData(null);
    setLoading(Boolean(path));
    load();
    return () => { ++seq.current; };
  }, [load]);

  return { data, loading, error, refresh: load, setData };
}
