import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE } from "../lib/api";

export type SharingState = "off" | "starting" | "on" | "denied" | "error";

const STORAGE_KEY = "sarthi-share-prompted";
const MIN_POST_INTERVAL_MS = 25_000;

interface UseLocationSharingArgs {
  sarthiId: string | undefined;
  enabled: boolean;
}

interface UseLocationSharingResult {
  state: SharingState;
  lastSent: Date | null;
  error: string;
  start: () => void;
  stop: () => void;
}

export function useLocationSharing({ sarthiId, enabled }: UseLocationSharingArgs): UseLocationSharingResult {
  const [state, setState] = useState<SharingState>("off");
  const [lastSent, setLastSent] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const watchIdRef = useRef<number | null>(null);
  const lastPostRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);

  const postLocation = useCallback(
    async (pos: GeolocationPosition) => {
      if (!sarthiId) return;
      const now = Date.now();
      if (now - lastPostRef.current < MIN_POST_INTERVAL_MS) return;
      if (inFlightRef.current) return;
      lastPostRef.current = now;
      inFlightRef.current = true;
      try {
        const body = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        };
        const resp = await fetch(`${API_BASE}/sarthi/${sarthiId}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        setLastSent(new Date());
        setError("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "post failed");
      } finally {
        inFlightRef.current = false;
      }
    },
    [sarthiId]
  );

  const stop = useCallback(() => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setState("off");
    if (sarthiId) {
      fetch(`${API_BASE}/sarthi/${sarthiId}/location`, { method: "DELETE" }).catch(() => {});
    }
  }, [sarthiId]);

  const start = useCallback(() => {
    if (!sarthiId) return;
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported in this browser");
      setState("error");
      return;
    }
    setState("starting");
    setError("");
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setState("on");
        postLocation(pos);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setState("denied");
          setError("Permission denied");
        } else {
          setState("error");
          setError(err.message || "Geolocation error");
        }
        if (watchIdRef.current != null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
    );
    watchIdRef.current = id;
  }, [sarthiId, postLocation]);

  useEffect(() => {
    if (!enabled) {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        setState("off");
      }
    }
  }, [enabled]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return { state, lastSent, error, start, stop };
}

export function shouldAutoPromptShare(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}
