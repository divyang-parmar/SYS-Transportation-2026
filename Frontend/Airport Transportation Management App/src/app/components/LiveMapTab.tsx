import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2, MapPinned, MapPinOff, Wifi, WifiOff } from "lucide-react";
import { API_BASE } from "../lib/api";

interface SarthiLocation {
  id: string;
  name: string;
  phone: string;
  email: string;
  last_location?: {
    lat: number;
    lng: number;
    accuracy: number | null;
    recorded_at: string;
  };
}

const REFRESH_MS = 15_000;
const FRESH_MS = 90_000;
const STALE_MS = 5 * 60_000;
const EWR = { lat: 40.6925, lng: -74.1687, zoom: 12 };

function divIcon(name: string, stale: boolean): L.DivIcon {
  const bg = stale ? "var(--muted-foreground)" : "var(--accent)";
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const html = `
    <div style="
      display:flex;align-items:center;justify-content:center;
      width:36px;height:36px;border-radius:50%;
      background:${bg};color:#fff;
      font-weight:700;font-size:14px;
      box-shadow:0 4px 14px rgba(0,0,0,0.25);
      border:3px solid #fff;
    ">${initial}</div>`;
  return L.divIcon({ html, className: "", iconSize: [36, 36], iconAnchor: [18, 18] });
}

function ageLabel(recordedAt: string): { label: string; status: "live" | "recent" | "stale" } {
  const dt = new Date(recordedAt).getTime();
  const age = Date.now() - dt;
  if (age < FRESH_MS) return { label: "live", status: "live" };
  if (age < STALE_MS) return { label: `${Math.round(age / 60_000)} min ago`, status: "recent" };
  return { label: `${Math.round(age / 60_000)} min ago`, status: "stale" };
}

export function LiveMapTab() {
  const [sarthis, setSarthis] = useState<SarthiLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (mapRef.current || !mapNodeRef.current) return;
    const map = L.map(mapNodeRef.current, { center: [EWR.lat, EWR.lng], zoom: EWR.zoom, zoomControl: true });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const resp = await fetch(`${API_BASE}/sarthi/locations`);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as SarthiLocation[];
        if (!cancelled) {
          setSarthis(data);
          setError("");
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load locations");
          setLoading(false);
        }
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const stillVisible = new Set<string>();

    for (const s of sarthis) {
      if (!s.last_location) continue;
      stillVisible.add(s.id);
      const { lat, lng } = s.last_location;
      const { status } = ageLabel(s.last_location.recorded_at);
      const stale = status === "stale";
      const existing = markersRef.current.get(s.id);
      if (existing) {
        existing.setLatLng([lat, lng]);
        existing.setIcon(divIcon(s.name, stale));
      } else {
        const m = L.marker([lat, lng], { icon: divIcon(s.name, stale) });
        m.on("click", () => setSelectedId(s.id));
        m.bindTooltip(s.name, { direction: "top", offset: [0, -16] });
        m.addTo(map);
        markersRef.current.set(s.id, m);
      }
    }

    for (const [id, marker] of markersRef.current) {
      if (!stillVisible.has(id)) {
        map.removeLayer(marker);
        markersRef.current.delete(id);
      }
    }
  }, [sarthis]);

  const sorted = useMemo(() => {
    return [...sarthis].sort((a, b) => {
      const at = a.last_location ? new Date(a.last_location.recorded_at).getTime() : 0;
      const bt = b.last_location ? new Date(b.last_location.recorded_at).getTime() : 0;
      return bt - at;
    });
  }, [sarthis]);

  const liveCount = sorted.filter((s) => s.last_location && ageLabel(s.last_location.recorded_at).status === "live").length;

  const focusOn = (s: SarthiLocation) => {
    if (!s.last_location || !mapRef.current) return;
    setSelectedId(s.id);
    mapRef.current.setView([s.last_location.lat, s.last_location.lng], 15, { animate: true });
    markersRef.current.get(s.id)?.openTooltip();
  };

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(260px, 320px) 1fr" }}>
      <div className="flex flex-col gap-3 min-w-0">
        <div className="card-warm" style={{ padding: 14 }}>
          <div className="flex items-center gap-2 mb-1">
            <h3>Live Sarthis</h3>
            <span className="badge-pill badge--ok ml-auto">{liveCount} live</span>
          </div>
          <p className="text-muted-foreground" style={{ fontSize: 12 }}>
            Auto-refreshes every {REFRESH_MS / 1000}s.
          </p>
        </div>

        {loading && (
          <div className="card-warm flex items-center justify-center" style={{ padding: 28 }}>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--primary)" }} />
          </div>
        )}

        {!loading && error && (
          <div className="card-warm flex items-center gap-2" style={{ padding: 14, color: "var(--danger)" }}>
            <WifiOff className="w-4 h-4" />
            <span style={{ fontSize: 13 }}>{error}</span>
          </div>
        )}

        {!loading && !error && sorted.length === 0 && (
          <div className="card-warm text-center text-muted-foreground" style={{ padding: 28, fontSize: 13 }}>
            <MapPinOff className="w-5 h-5 mx-auto mb-2" />
            No sarthis are sharing location yet.
          </div>
        )}

        <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: 540 }}>
          {sorted.map((s) => {
            if (!s.last_location) return null;
            const { label, status } = ageLabel(s.last_location.recorded_at);
            const variant = status === "live" ? "badge--ok" : status === "recent" ? "badge--info" : "badge--neutral";
            const isSelected = selectedId === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => focusOn(s)}
                className="card-warm text-left transition-colors"
                style={{
                  padding: 12,
                  cursor: "pointer",
                  borderColor: isSelected ? "var(--accent-line)" : "var(--line)",
                  background: isSelected ? "var(--accent-tint)" : "var(--surface)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="avatar-warm" style={{ width: 32, height: 32, fontSize: 12 }}>
                    {(s.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--head)" }}>
                      {s.name || "Unknown"}
                    </div>
                    <div className="text-muted-foreground truncate" style={{ fontSize: 12 }}>
                      {s.phone || s.email}
                    </div>
                  </div>
                  <span className={`badge-pill ${variant}`}>
                    {status === "live" ? <Wifi className="w-3 h-3" /> : null}
                    {label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card-warm overflow-hidden" style={{ padding: 0 }}>
        <div ref={mapNodeRef} style={{ width: "100%", height: 620 }} />
      </div>
    </div>
  );
}

void MapPinned;
