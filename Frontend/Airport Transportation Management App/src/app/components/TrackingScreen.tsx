import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Plane,
  Loader2,
  PhoneCall,
  MessageCircle,
  PlaneLanding,
  PlaneTakeoff,
  CircleAlert,
  Wifi,
  WifiOff,
  Hourglass,
  CheckCircle2,
  Users,
  Luggage,
  Accessibility,
  RefreshCw,
  Pencil,
  X,
  Check,
} from "lucide-react";
import { API_BASE } from "../lib/api";
import { ShareLink } from "./ShareLink";

interface PublicLastLocation {
  lat: number;
  lng: number;
  recorded_at: string;
}

interface PublicSarthi {
  name: string;
  phone: string | null;
  vehicle: {
    make: string | null;
    name: string | null;
    type: string | null;
    number_plate: string | null;
    capacity: number | null;
  } | null;
  last_location: PublicLastLocation | null;
}

interface PublicDirection {
  direction: "arrival" | "departure";
  flight_name: string | null;
  flight_number: string | null;
  airport: string | null;
  scheduled_at: string | null;
  status: "pending" | "assigned" | "completed";
  sarthi: PublicSarthi | null;
  assigned_at?: string | null;
  completed_at?: string | null;
}

interface TrackingPayload {
  reference: string;
  contact: { first_name: string; last_name: string };
  transportation_requirement: string | null;
  passengers_count: number | null;
  bags_count: number;
  stroller_required: boolean;
  mandal: string | null;
  arrival: PublicDirection | null;
  departure: PublicDirection | null;
  created_at: string | null;
}

const REFRESH_MS = 20_000;
const LIVE_MS = 90_000;
const STALE_MS = 5 * 60_000;

const BG_STYLE: React.CSSProperties = {
  background:
    "radial-gradient(60% 50% at 85% 8%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 60%), radial-gradient(55% 45% at 8% 92%, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 55%), var(--background)",
};

function token(): string {
  const path = window.location.pathname;
  const idx = path.indexOf("/track/");
  if (idx < 0) return "";
  return path.slice(idx + "/track/".length).split(/[/?#]/)[0];
}

function ageBadge(recordedAt: string): { label: string; variant: string } {
  const dt = new Date(recordedAt).getTime();
  const age = Date.now() - dt;
  if (age < LIVE_MS) return { label: "live", variant: "badge--ok" };
  if (age < STALE_MS) return { label: `${Math.round(age / 60_000)} min ago`, variant: "badge--info" };
  return { label: `${Math.round(age / 60_000)} min ago`, variant: "badge--neutral" };
}

function formatScheduled(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function TrackingScreen() {
  const tok = useMemo(() => token(), []);
  const [data, setData] = useState<TrackingPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    if (!tok) {
      setError("Missing tracking token");
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const resp = await fetch(`${API_BASE}/track/${encodeURIComponent(tok)}`);
        if (resp.status === 404) {
          throw new Error("This tracking link isn't recognized. Please check the URL or contact the team.");
        }
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = (await resp.json()) as TrackingPayload;
        if (!cancelled) {
          setData(json);
          setError("");
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Unable to load tracking");
          setLoading(false);
        }
      }
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [tok, refetchKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={BG_STYLE}>
        <Loader2 className="w-7 h-7 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={BG_STYLE}>
        <div className="w-full max-w-md text-center bg-surface border border-line shadow-warm-3" style={{ borderRadius: "var(--r-xl)", padding: "32px 28px" }}>
          <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--danger-tint)" }}>
            <CircleAlert className="w-7 h-7" style={{ color: "var(--danger)" }} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--head)" }}>Link not found</h1>
          <p className="mt-3 text-muted-foreground" style={{ fontSize: 13.5, lineHeight: 1.5 }}>{error || "Tracking unavailable"}</p>
        </div>
      </div>
    );
  }

  const directions = [data.arrival, data.departure].filter(Boolean) as PublicDirection[];

  return (
    <div className="min-h-screen" style={BG_STYLE}>
      <div style={{ height: 4, background: "linear-gradient(90deg, var(--accent), var(--primary))" }} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Header data={data} />

        <div className="flex flex-col gap-5 mt-6">
          {directions.length === 0 && (
            <div className="bg-surface border border-line text-center shadow-warm-1" style={{ borderRadius: "var(--r-xl)", padding: 28 }}>
              <p className="text-muted-foreground" style={{ fontSize: 14 }}>
                No flight details on file. We'll reach out if anything's missing.
              </p>
            </div>
          )}
          {directions.map((d) => <DirectionCard key={d.direction} d={d} />)}
        </div>

        <BookingDetails data={data} onEdit={() => setEditing(true)} />

        <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground" style={{ fontSize: 12 }}>
          <RefreshCw className="w-3.5 h-3.5" />
          Auto-refreshes every {REFRESH_MS / 1000}s
        </div>
      </div>

      {editing && (
        <EditModal
          token={tok}
          data={data}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); setRefetchKey((k) => k + 1); }}
        />
      )}
    </div>
  );
}

function Header({ data }: { data: TrackingPayload }) {
  return (
    <div className="flex items-start gap-4">
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{
          width: 56, height: 56, borderRadius: 18,
          background: "linear-gradient(160deg, var(--accent) 0%, var(--accent-strong) 100%)",
          boxShadow: "0 10px 28px color-mix(in srgb, var(--accent) 38%, transparent)",
        }}
      >
        <Plane className="text-white" style={{ width: 26, height: 26 }} strokeWidth={1.6} />
      </div>
      <div className="flex-1 min-w-0">
        <h1 style={{ fontSize: 22, fontWeight: 600, color: "var(--head)" }}>
          Hi {data.contact.first_name},
        </h1>
        <p className="text-muted-foreground" style={{ fontSize: 13 }}>
          Reference <span className="font-mono" style={{ color: "var(--head)" }}>{data.reference}</span> · Suhradam Parivar Shibir
        </p>
      </div>
    </div>
  );
}

function DirectionCard({ d }: { d: PublicDirection }) {
  const isArrival = d.direction === "arrival";
  const Icon = isArrival ? PlaneLanding : PlaneTakeoff;
  return (
    <section className="bg-surface border border-line shadow-warm-1" style={{ borderRadius: "var(--r-xl)", overflow: "hidden" }}>
      <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ background: "var(--surface-2)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="iconbtn" style={{ width: 36, height: 36, background: "var(--accent-tint)", borderColor: "var(--accent-line)", color: "var(--accent-strong)" }}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold truncate" style={{ color: "var(--head)", fontSize: 14 }}>
              {isArrival ? "Arrival" : "Departure"}
              {d.flight_number ? <> · <span className="font-mono">{d.flight_number}</span></> : null}
            </div>
            <div className="text-muted-foreground truncate" style={{ fontSize: 12.5 }}>
              {[d.flight_name, d.airport, formatScheduled(d.scheduled_at)].filter(Boolean).join(" · ") || "Flight details TBD"}
            </div>
          </div>
        </div>
        <StatusPill status={d.status} />
      </div>

      {d.status === "pending" && (
        <div className="px-5 py-5 flex items-center gap-3 text-muted-foreground" style={{ fontSize: 13.5 }}>
          <Hourglass className="w-4 h-4" style={{ color: "var(--warn)" }} />
          We'll let you know as soon as a Sarthi is assigned.
        </div>
      )}

      {d.status === "assigned" && d.sarthi && (
        <SarthiBlock sarthi={d.sarthi} />
      )}

      {d.status === "completed" && d.sarthi && (
        <CompletedBlock sarthi={d.sarthi} completedAt={d.completed_at ?? null} />
      )}
    </section>
  );
}

function StatusPill({ status }: { status: "pending" | "assigned" | "completed" }) {
  if (status === "completed") {
    return <span className="badge-pill badge--ok"><CheckCircle2 className="w-3 h-3" />Picked up</span>;
  }
  if (status === "assigned") {
    return <span className="badge-pill badge--ok"><CheckCircle2 className="w-3 h-3" />Sarthi assigned</span>;
  }
  return <span className="badge-pill badge--warn"><Hourglass className="w-3 h-3" />Pending</span>;
}

function CompletedBlock({ sarthi, completedAt }: { sarthi: PublicSarthi; completedAt: string | null }) {
  const when = completedAt ? new Date(completedAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
  return (
    <div className="px-5 py-5 flex items-start gap-3" style={{ background: "var(--ok-tint)" }}>
      <div
        className="flex items-center justify-center flex-shrink-0"
        style={{ width: 36, height: 36, borderRadius: 999, background: "var(--ok)", color: "#fff" }}
      >
        <CheckCircle2 className="w-5 h-5" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--head)" }}>
          Picked up by {sarthi.name || "your Sarthi"}
        </div>
        {when && (
          <div className="text-muted-foreground" style={{ fontSize: 12.5 }}>
            {when}
          </div>
        )}
        <div className="mt-2 text-muted-foreground" style={{ fontSize: 13 }}>
          Wishing you safe travels with the Suhradam Parivar Shibir family.
        </div>
      </div>
    </div>
  );
}

function SarthiBlock({ sarthi }: { sarthi: PublicSarthi }) {
  return (
    <div className="px-5 py-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div className="avatar-warm" style={{ width: 44, height: 44, fontSize: 17 }}>
          {(sarthi.name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold" style={{ color: "var(--head)", fontSize: 15 }}>{sarthi.name || "Your Sarthi"}</div>
          {sarthi.vehicle && (
            <div className="text-muted-foreground" style={{ fontSize: 12.5 }}>
              {[sarthi.vehicle.make, sarthi.vehicle.name].filter(Boolean).join(" ")}
              {sarthi.vehicle.number_plate ? <span className="font-mono"> · {sarthi.vehicle.number_plate}</span> : null}
              {sarthi.vehicle.capacity ? <> · {sarthi.vehicle.capacity} seats</> : null}
            </div>
          )}
        </div>
      </div>

      {sarthi.phone && (
        <div className="flex flex-col sm:flex-row gap-2">
          <a className="btn btn--primary justify-center" href={`tel:${sarthi.phone}`}>
            <PhoneCall className="w-4 h-4" /> Call {sarthi.name?.split(" ")[0] || "Sarthi"}
          </a>
          <a
            className="btn btn--secondary justify-center"
            href={`sms:${sarthi.phone}`}
          >
            <MessageCircle className="w-4 h-4" /> Send SMS
          </a>
        </div>
      )}

      {sarthi.last_location ? (
        <LiveMapBlock lat={sarthi.last_location.lat} lng={sarthi.last_location.lng} recordedAt={sarthi.last_location.recorded_at} name={sarthi.name} />
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground" style={{ fontSize: 12.5 }}>
          <WifiOff className="w-3.5 h-3.5" />
          Live location not shared yet
        </div>
      )}
    </div>
  );
}

function LiveMapBlock({ lat, lng, recordedAt, name }: { lat: number; lng: number; recordedAt: string; name: string }) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const badge = ageBadge(recordedAt);

  useEffect(() => {
    if (mapRef.current || !nodeRef.current) return;
    const map = L.map(nodeRef.current, { center: [lat, lng], zoom: 14, zoomControl: true, attributionControl: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    L.control.attribution({ prefix: false }).addAttribution("© OSM").addTo(map);
    mapRef.current = map;
    const initial = (name || "?").trim().charAt(0).toUpperCase();
    const icon = L.divIcon({
      html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:var(--accent);color:#fff;font-weight:700;font-size:14px;box-shadow:0 4px 14px rgba(0,0,0,0.25);border:3px solid #fff;">${initial}</div>`,
      className: "",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
    markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([lat, lng]);
    mapRef.current.setView([lat, lng], mapRef.current.getZoom(), { animate: true });
  }, [lat, lng]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: 12.5 }}>
          <Wifi className="w-3.5 h-3.5" />
          Live location
        </div>
        <span className={`badge-pill ${badge.variant}`}>{badge.label}</span>
      </div>
      <div ref={nodeRef} style={{ width: "100%", height: 220, borderRadius: "var(--r)", overflow: "hidden", border: "1px solid var(--line)" }} />
    </div>
  );
}

function BookingDetails({ data, onEdit }: { data: TrackingPayload; onEdit: () => void }) {
  return (
    <div className="mt-5 bg-surface border border-line shadow-warm-1" style={{ borderRadius: "var(--r-xl)", padding: 20 }}>
      <div className="flex items-center justify-between mb-3">
        <h2 style={{ fontSize: 15 }}>Your details</h2>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Detail icon={<Users className="w-3.5 h-3.5" />} label="Travelers" value={String(data.passengers_count ?? "—")} />
        <Detail icon={<Luggage className="w-3.5 h-3.5" />} label="Bags" value={String(data.bags_count ?? 0)} />
        <Detail icon={<Accessibility className="w-3.5 h-3.5" />} label="Stroller" value={data.stroller_required ? "Yes" : "No"} />
        <Detail icon={null} label="Mandal" value={data.mandal ?? "—"} />
      </div>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {icon}
        {label}
      </div>
      <div className="mt-1" style={{ fontSize: 14, fontWeight: 600, color: "var(--head)" }}>{value}</div>
    </div>
  );
}

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(s: string): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function EditModal({
  token, data, onClose, onSaved,
}: {
  token: string;
  data: TrackingPayload;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [family, setFamily] = useState(data.passengers_count ?? 1);
  const [bags, setBags] = useState(data.bags_count ?? 0);
  const [stroller, setStroller] = useState(data.stroller_required ?? false);
  const [arrivalAt, setArrivalAt] = useState(toLocalInput(data.arrival?.scheduled_at ?? null));
  const [arrivalNum, setArrivalNum] = useState(data.arrival?.flight_number ?? "");
  const [departureAt, setDepartureAt] = useState(toLocalInput(data.departure?.scheduled_at ?? null));
  const [departureNum, setDepartureNum] = useState(data.departure?.flight_number ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const handleSave = async () => {
    setBusy(true); setErr("");
    try {
      const body: Record<string, unknown> = {
        family_count: Math.max(1, Math.min(30, Number(family) || 1)),
        bags_count: Math.max(0, Math.min(50, Number(bags) || 0)),
        stroller_required: stroller,
      };
      if (data.arrival) {
        body.arrival = { flight_number: arrivalNum.trim(), scheduled_at: fromLocalInput(arrivalAt) };
      }
      if (data.departure) {
        body.departure = { flight_number: departureNum.trim(), scheduled_at: fromLocalInput(departureAt) };
      }
      const resp = await fetch(`${API_BASE}/track/${encodeURIComponent(token)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.error || `HTTP ${resp.status}`);
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(20,12,6,0.42)", zIndex: 9999 }} onClick={onClose}>
      <div
        className="w-full max-w-lg bg-surface border border-line shadow-warm-3"
        style={{ borderRadius: "var(--r-xl)", maxHeight: "92vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 sticky top-0" style={{ background: "var(--surface)", borderBottom: "1px solid var(--line)", zIndex: 1 }}>
          <h2 style={{ fontSize: 16 }}>Edit your request</h2>
          <div className="flex items-center gap-2">
            <ShareLink
              trackingToken={token}
              passengerName={`${data.contact.first_name} ${data.contact.last_name}`.trim()}
            />
            <button className="iconbtn" onClick={onClose} aria-label="Close"><X className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="p-5 flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label>Travelers</label>
              <input type="number" min={1} max={30} className="input-warm" value={family} onChange={(e) => setFamily(Number(e.target.value) || 1)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label>Bags</label>
              <input type="number" min={0} max={50} className="input-warm" value={bags} onChange={(e) => setBags(Number(e.target.value) || 0)} />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={stroller} onChange={(e) => setStroller(e.target.checked)} />
            <span style={{ fontSize: 13.5, color: "var(--ink)" }}>Stroller required</span>
          </label>

          {data.arrival && (
            <div className="p-4 rounded-[var(--r)] border" style={{ borderColor: "var(--accent-line)", background: "var(--accent-tint)" }}>
              <h3 className="mb-3" style={{ fontSize: 14 }}>Arrival flight</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label>Flight number</label>
                  <input className="input-warm" value={arrivalNum} onChange={(e) => setArrivalNum(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label>Date and time</label>
                  <input type="datetime-local" className="input-warm" value={arrivalAt} onChange={(e) => setArrivalAt(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {data.departure && (
            <div className="p-4 rounded-[var(--r)] border" style={{ borderColor: "var(--accent-line)", background: "var(--accent-tint)" }}>
              <h3 className="mb-3" style={{ fontSize: 14 }}>Departure flight</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label>Flight number</label>
                  <input className="input-warm" value={departureNum} onChange={(e) => setDepartureNum(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label>Date and time</label>
                  <input type="datetime-local" className="input-warm" value={departureAt} onChange={(e) => setDepartureAt(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {err && <p style={{ color: "var(--danger)", fontSize: 13 }}>{err}</p>}

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn--accent" onClick={handleSave} disabled={busy}>
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Save changes</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
