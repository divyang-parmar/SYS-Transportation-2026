import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Plane, ChevronLeft, ChevronRight, Check, Plus, Trash2, CircleCheck, Loader2, Copy, ExternalLink, Link2 } from "lucide-react";
import { API_BASE } from "../lib/api";
import { useTheme } from "../hooks/useTheme";

interface Contact {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mandal: string;
}

interface Traveler {
  first_name: string;
  last_name: string;
  phone: string;
  mandal: string;
}

interface FlightInput {
  flight_name: string;
  other_flight_name: string;
  flight_number: string;
  airport: string;
  scheduled_at: string;
}

const EMPTY_FLIGHT: FlightInput = {
  flight_name: "",
  other_flight_name: "",
  flight_number: "",
  airport: "",
  scheduled_at: "",
};

type TransportType = "Arrival" | "Departure" | "Both" | "None";

const AIRPORTS = ["EWR", "PHL"];

const STEPS = ["Contact", "Travel", "Travelers", "Review"] as const;
type Step = (typeof STEPS)[number];

function bgStyle(): React.CSSProperties {
  return {
    background:
      "radial-gradient(60% 50% at 85% 8%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 60%), radial-gradient(55% 45% at 8% 92%, color-mix(in srgb, var(--primary) 12%, transparent) 0%, transparent 55%), var(--background)",
  };
}

function isoOrNull(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function IntakeScreen() {
  const { isDark } = useTheme();
  void isDark;
  const [step, setStep] = useState<Step>("Contact");
  const [contact, setContact] = useState<Contact>({ first_name: "", last_name: "", email: "", phone: "", mandal: "" });
  const [transport, setTransport] = useState<TransportType>("Arrival");
  const [familyCount, setFamilyCount] = useState(1);
  const [bagsCount, setBagsCount] = useState(0);
  const [stroller, setStroller] = useState(false);
  const [arrival, setArrival] = useState<FlightInput>(EMPTY_FLIGHT);
  const [departure, setDeparture] = useState<FlightInput>(EMPTY_FLIGHT);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [trackingToken, setTrackingToken] = useState("");
  const [mandals, setMandals] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/mandals`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => Array.isArray(data) ? setMandals(data.map((d: { name: string }) => d.name)) : null)
      .catch(() => {});
  }, []);

  const needArrival = transport === "Arrival" || transport === "Both";
  const needDeparture = transport === "Departure" || transport === "Both";

  const contactValid =
    contact.first_name.trim().length > 0 &&
    contact.last_name.trim().length > 0 &&
    /^.+@.+\..+$/.test(contact.email) &&
    contact.phone.trim().length >= 7 &&
    contact.mandal.trim().length > 0;

  const flightValid = (f: FlightInput) => f.flight_number.trim().length > 0 && f.scheduled_at.length > 0;
  const travelValid =
    (transport === "None") ||
    (needArrival ? flightValid(arrival) : true) && (needDeparture ? flightValid(departure) : true);

  const travelersValid = travelers.every((t) => t.first_name.trim().length > 0);

  const stepIndex = STEPS.indexOf(step);
  const canNext =
    (step === "Contact" && contactValid) ||
    (step === "Travel" && travelValid) ||
    (step === "Travelers" && travelersValid) ||
    step === "Review";

  const addTraveler = () => {
    if (travelers.length >= 10) return;
    setTravelers([...travelers, { first_name: "", last_name: "", phone: "", mandal: contact.mandal }]);
  };
  const removeTraveler = (i: number) => setTravelers(travelers.filter((_, idx) => idx !== i));
  const updateTraveler = (i: number, patch: Partial<Traveler>) =>
    setTravelers(travelers.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        contact,
        transportation_requirement: transport,
        family_count: familyCount,
        bags_count: bagsCount,
        stroller_required: stroller,
        travelers,
      };
      if (needArrival) {
        const at = isoOrNull(arrival.scheduled_at);
        payload.arrival = { ...arrival, scheduled_at: at };
      }
      if (needDeparture) {
        const at = isoOrNull(departure.scheduled_at);
        payload.departure = { ...departure, scheduled_at: at };
      }
      const resp = await fetch(`${API_BASE}/intake/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const errBody = await resp.json().catch(() => ({}));
        throw new Error(errBody?.detail?.[0]?.msg || errBody?.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setBookingId(data.booking_id);
      setTrackingToken(data.tracking_token ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (bookingId) {
    return <Confirmation bookingId={bookingId} trackingToken={trackingToken} />;
  }

  return (
    <div className="min-h-screen flex flex-col" style={bgStyle()}>
      <div style={{ height: 4, background: "linear-gradient(90deg, var(--accent), var(--primary))" }} />

      <div className="flex-1 flex flex-col items-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl">
          <Header />
          <Steps current={stepIndex} />
          <ErrorBanner error={error} />

          <div className="bg-surface border border-line rounded-[var(--r-xl)] shadow-warm-2 p-6 sm:p-8 mt-6">
            {step === "Contact" && (
              <ContactStep contact={contact} setContact={setContact} familyCount={familyCount} setFamilyCount={setFamilyCount} mandals={mandals} />
            )}
            {step === "Travel" && (
              <TravelStep
                transport={transport}
                setTransport={setTransport}
                arrival={arrival}
                setArrival={setArrival}
                departure={departure}
                setDeparture={setDeparture}
                bagsCount={bagsCount}
                setBagsCount={setBagsCount}
                stroller={stroller}
                setStroller={setStroller}
                needArrival={needArrival}
                needDeparture={needDeparture}
              />
            )}
            {step === "Travelers" && (
              <TravelersStep
                travelers={travelers}
                familyCount={familyCount}
                addTraveler={addTraveler}
                removeTraveler={removeTraveler}
                updateTraveler={updateTraveler}
                mandals={mandals}
              />
            )}
            {step === "Review" && (
              <ReviewStep
                contact={contact}
                transport={transport}
                familyCount={familyCount}
                bagsCount={bagsCount}
                stroller={stroller}
                arrival={arrival}
                departure={departure}
                travelers={travelers}
                needArrival={needArrival}
                needDeparture={needDeparture}
              />
            )}

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)])}
                disabled={stepIndex === 0 || submitting}
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>

              {step !== "Review" ? (
                <button
                  type="button"
                  className="btn btn--accent"
                  onClick={() => setStep(STEPS[stepIndex + 1])}
                  disabled={!canNext}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button type="button" className="btn btn--accent" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <><Check className="w-4 h-4" /> Submit</>}
                </button>
              )}
            </div>
          </div>

          <p className="text-center text-muted-foreground mt-6" style={{ fontSize: 12 }}>
            Suhradam Parivar Shibir · Airport Transportation
          </p>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-col items-center text-center mb-6">
      <div
        className="flex items-center justify-center"
        style={{
          width: 64, height: 64, borderRadius: 20,
          background: "linear-gradient(160deg, var(--accent) 0%, var(--accent-strong) 100%)",
          boxShadow: "0 10px 28px color-mix(in srgb, var(--accent) 38%, transparent)",
        }}
      >
        <Plane className="text-white" style={{ width: 32, height: 32 }} strokeWidth={1.6} />
      </div>
      <h1 className="mt-4" style={{ fontSize: 24, fontWeight: 600, color: "var(--head)", letterSpacing: "-0.01em" }}>
        Transportation Request
      </h1>
      <p className="mt-1 text-muted-foreground" style={{ fontSize: 12.5, letterSpacing: "0.14em", textTransform: "uppercase" }}>
        Suhradam Parivar Shibir
      </p>
    </div>
  );
}

function Steps({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 px-1">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex-1 flex items-center gap-2 min-w-0">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 28, height: 28, borderRadius: 999,
                background: done ? "var(--ok)" : active ? "var(--accent)" : "var(--surface-3)",
                color: done || active ? "#fff" : "var(--muted-foreground)",
                fontSize: 13, fontWeight: 600,
                border: active ? "none" : "1px solid var(--line)",
              }}
            >
              {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className="truncate"
              style={{
                fontSize: 13, fontWeight: active ? 600 : 500,
                color: active ? "var(--head)" : "var(--muted-foreground)",
              }}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: "var(--line)" }} />}
          </div>
        );
      })}
    </div>
  );
}

function ErrorBanner({ error }: { error: string }) {
  if (!error) return null;
  return (
    <div
      className="mt-4 px-4 py-3 rounded-[var(--r-sm)]"
      style={{ background: "var(--danger-tint)", color: "var(--danger)", fontSize: 13, fontWeight: 600 }}
    >
      {error}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label>
        {label}
        {required && <span style={{ color: "var(--accent)" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function MandalSelect({
  value, onChange, mandals, required = false,
}: {
  value: string;
  onChange: (v: string) => void;
  mandals: string[];
  required?: boolean;
}) {
  if (mandals.length === 0) {
    return (
      <input
        className="input-warm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Edison"
        required={required}
      />
    );
  }
  return (
    <select
      className="input-warm"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">— Select —</option>
      {mandals.map((m) => (
        <option key={m} value={m}>{m}</option>
      ))}
    </select>
  );
}

function ContactStep({
  contact, setContact, familyCount, setFamilyCount, mandals,
}: {
  contact: Contact; setContact: (c: Contact) => void;
  familyCount: number; setFamilyCount: (n: number) => void;
  mandals: string[];
}) {
  return (
    <>
      <h2 className="mb-1">Primary contact</h2>
      <p className="text-muted-foreground mb-6" style={{ fontSize: 13 }}>
        The person we'll coordinate with for pickup or drop-off.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="First name" required>
          <input className="input-warm" value={contact.first_name} onChange={(e) => setContact({ ...contact, first_name: e.target.value })} />
        </Field>
        <Field label="Last name" required>
          <input className="input-warm" value={contact.last_name} onChange={(e) => setContact({ ...contact, last_name: e.target.value })} />
        </Field>
        <Field label="Email" required>
          <input className="input-warm" type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
        </Field>
        <Field label="Phone" required>
          <input className="input-warm" type="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="+1 555 555 5555" />
        </Field>
        <Field label="Mandal" required>
          <MandalSelect value={contact.mandal} onChange={(v) => setContact({ ...contact, mandal: v })} mandals={mandals} required />
        </Field>
        <Field label="Total people traveling" required>
          <input className="input-warm" type="number" min={1} max={30} value={familyCount} onChange={(e) => setFamilyCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} />
        </Field>
      </div>
    </>
  );
}

function TravelStep({
  transport, setTransport, arrival, setArrival, departure, setDeparture,
  bagsCount, setBagsCount, stroller, setStroller, needArrival, needDeparture,
}: {
  transport: TransportType; setTransport: (t: TransportType) => void;
  arrival: FlightInput; setArrival: (f: FlightInput) => void;
  departure: FlightInput; setDeparture: (f: FlightInput) => void;
  bagsCount: number; setBagsCount: (n: number) => void;
  stroller: boolean; setStroller: (b: boolean) => void;
  needArrival: boolean; needDeparture: boolean;
}) {
  return (
    <>
      <h2 className="mb-1">Travel details</h2>
      <p className="text-muted-foreground mb-6" style={{ fontSize: 13 }}>
        Which direction do you need transportation for?
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {(["Arrival", "Departure", "Both", "None"] as TransportType[]).map((t) => {
          const active = transport === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTransport(t)}
              className="transition-all"
              style={{
                fontSize: 13, fontWeight: 600, padding: "8px 16px", borderRadius: 999,
                background: active ? "var(--accent)" : "var(--surface)",
                color: active ? "#fff" : "var(--muted-foreground)",
                border: active ? "1px solid transparent" : "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              {t}
            </button>
          );
        })}
      </div>

      {needArrival && (
        <FlightFieldset title="Arrival flight" value={arrival} onChange={setArrival} />
      )}
      {needDeparture && (
        <FlightFieldset title="Departure flight" value={departure} onChange={setDeparture} />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <Field label="Number of bags">
          <input className="input-warm" type="number" min={0} max={50} value={bagsCount} onChange={(e) => setBagsCount(Math.max(0, Math.min(50, Number(e.target.value) || 0)))} />
        </Field>
        <Field label="Stroller required">
          <label className="inline-flex items-center gap-2 cursor-pointer" style={{ marginTop: 8 }}>
            <input type="checkbox" checked={stroller} onChange={(e) => setStroller(e.target.checked)} />
            <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>Yes, we need a stroller</span>
          </label>
        </Field>
      </div>
    </>
  );
}

function FlightFieldset({ title, value, onChange }: { title: string; value: FlightInput; onChange: (f: FlightInput) => void }) {
  return (
    <div className="mt-5 p-4 sm:p-5 rounded-[var(--r)] border" style={{ borderColor: "var(--accent-line)", background: "var(--accent-tint)" }}>
      <h3 className="mb-3" style={{ fontSize: 14, fontWeight: 600 }}>{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Airline">
          <input className="input-warm" value={value.flight_name} onChange={(e) => onChange({ ...value, flight_name: e.target.value })} placeholder="United, American, …" />
        </Field>
        <Field label="Flight number" required>
          <input className="input-warm" value={value.flight_number} onChange={(e) => onChange({ ...value, flight_number: e.target.value })} placeholder="UA123" />
        </Field>
        <Field label="Airport">
          <select className="input-warm" value={value.airport} onChange={(e) => onChange({ ...value, airport: e.target.value })}>
            <option value="">— Select —</option>
            {AIRPORTS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Date and time" required>
          <input className="input-warm" type="datetime-local" value={value.scheduled_at} onChange={(e) => onChange({ ...value, scheduled_at: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

function TravelersStep({
  travelers, familyCount, addTraveler, removeTraveler, updateTraveler, mandals,
}: {
  travelers: Traveler[]; familyCount: number;
  addTraveler: () => void;
  removeTraveler: (i: number) => void;
  updateTraveler: (i: number, patch: Partial<Traveler>) => void;
  mandals: string[];
}) {
  return (
    <>
      <h2 className="mb-1">Additional travelers</h2>
      <p className="text-muted-foreground mb-6" style={{ fontSize: 13 }}>
        Add up to {Math.min(10, familyCount - 1)} additional travelers. Skip if it's just you.
      </p>

      {travelers.length === 0 && (
        <div className="text-center text-muted-foreground py-8" style={{ fontSize: 13 }}>
          No additional travelers added yet.
        </div>
      )}

      <div className="flex flex-col gap-4">
        {travelers.map((t, i) => (
          <div key={i} className="p-4 rounded-[var(--r)] border" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>Traveler {i + 2}</h3>
              <button type="button" className="iconbtn" onClick={() => removeTraveler(i)} title="Remove" aria-label={`Remove traveler ${i + 2}`}>
                <Trash2 className="w-4 h-4" style={{ color: "var(--danger)" }} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="First name" required>
                <input className="input-warm" value={t.first_name} onChange={(e) => updateTraveler(i, { first_name: e.target.value })} />
              </Field>
              <Field label="Last name">
                <input className="input-warm" value={t.last_name} onChange={(e) => updateTraveler(i, { last_name: e.target.value })} />
              </Field>
              <Field label="Phone">
                <input className="input-warm" type="tel" value={t.phone} onChange={(e) => updateTraveler(i, { phone: e.target.value })} />
              </Field>
              <Field label="Mandal">
                <MandalSelect value={t.mandal} onChange={(v) => updateTraveler(i, { mandal: v })} mandals={mandals} />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="btn btn--secondary mt-4"
        onClick={addTraveler}
        disabled={travelers.length >= 10}
      >
        <Plus className="w-4 h-4" /> Add traveler
      </button>
    </>
  );
}

function ReviewStep({
  contact, transport, familyCount, bagsCount, stroller, arrival, departure, travelers, needArrival, needDeparture,
}: {
  contact: Contact; transport: TransportType;
  familyCount: number; bagsCount: number; stroller: boolean;
  arrival: FlightInput; departure: FlightInput; travelers: Traveler[];
  needArrival: boolean; needDeparture: boolean;
}) {
  const flightSummary = (f: FlightInput) =>
    [f.flight_name, f.flight_number, f.airport, f.scheduled_at && new Date(f.scheduled_at).toLocaleString()].filter(Boolean).join(" · ");

  return (
    <>
      <h2 className="mb-1">Review your request</h2>
      <p className="text-muted-foreground mb-6" style={{ fontSize: 13 }}>
        Confirm everything looks right, then submit.
      </p>

      <Section title="Contact">
        <KV k="Name" v={`${contact.first_name} ${contact.last_name}`} />
        <KV k="Email" v={contact.email} />
        <KV k="Phone" v={contact.phone} />
        <KV k="Mandal" v={contact.mandal} />
        <KV k="People traveling" v={String(familyCount)} />
      </Section>

      <Section title="Travel">
        <KV k="Transportation" v={transport} />
        {needArrival && <KV k="Arrival" v={flightSummary(arrival) || "—"} />}
        {needDeparture && <KV k="Departure" v={flightSummary(departure) || "—"} />}
        <KV k="Bags" v={String(bagsCount)} />
        <KV k="Stroller" v={stroller ? "Yes" : "No"} />
      </Section>

      <Section title={`Additional travelers (${travelers.length})`}>
        {travelers.length === 0 ? (
          <p className="text-muted-foreground" style={{ fontSize: 13 }}>None added.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {travelers.map((t, i) => (
              <li key={i} style={{ fontSize: 13 }}>
                {t.first_name} {t.last_name}
                {t.mandal && <span className="text-muted-foreground"> · {t.mandal}</span>}
              </li>
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>
        {title}
      </div>
      <div className="p-4 rounded-[var(--r)] border" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
        {children}
      </div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-2 py-1" style={{ fontSize: 13 }}>
      <span className="text-muted-foreground" style={{ minWidth: 130 }}>{k}</span>
      <span style={{ color: "var(--ink)", fontWeight: 500 }}>{v || "—"}</span>
    </div>
  );
}

function Confirmation({ bookingId, trackingToken }: { bookingId: string; trackingToken: string }) {
  const trackingUrl = trackingToken ? `${window.location.origin}/track/${trackingToken}` : "";
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trackingUrl || !qrCanvasRef.current) return;
    QRCode.toCanvas(qrCanvasRef.current, trackingUrl, { width: 168, margin: 1, color: { dark: "#173D61", light: "#FFFFFF" } }).catch(() => {});
  }, [trackingUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(trackingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = trackingUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={bgStyle()}>
      <div style={{ height: 4, background: "linear-gradient(90deg, var(--accent), var(--primary))", position: "fixed", top: 0, left: 0, right: 0 }} />
      <div className="w-full max-w-lg bg-surface border border-line rounded-[var(--r-xl)] shadow-warm-3" style={{ padding: "32px 28px" }}>
        <div className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--ok-tint)" }}>
            <CircleCheck className="w-8 h-8" style={{ color: "var(--ok)" }} strokeWidth={2} />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--head)" }}>Request received</h1>
          <p className="mt-2 text-muted-foreground" style={{ fontSize: 14, lineHeight: 1.6 }}>
            The Suhradam Parivar Shibir team will assign a Sarthi soon. Save your tracking link below.
          </p>
        </div>

        {trackingUrl && (
          <div className="mt-7 p-4 rounded-[var(--r)] border" style={{ borderColor: "var(--accent-line)", background: "var(--accent-tint)" }}>
            <div className="flex items-center gap-1.5 mb-2" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--accent-strong)" }}>
              <Link2 className="w-3.5 h-3.5" />
              Your tracking link
            </div>
            <div className="font-mono break-all" style={{ fontSize: 12.5, color: "var(--head)" }}>{trackingUrl}</div>
            <div className="mt-3 flex flex-col sm:flex-row gap-2">
              <button type="button" className="btn btn--accent justify-center" onClick={handleCopy}>
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy link</>}
              </button>
              <a className="btn btn--secondary justify-center" href={trackingUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" /> Open
              </a>
            </div>
          </div>
        )}

        {trackingUrl && (
          <div className="mt-6 flex flex-col items-center">
            <div className="p-3 bg-surface border border-line" style={{ borderRadius: "var(--r-sm)" }}>
              <canvas ref={qrCanvasRef} />
            </div>
            <p className="mt-2 text-muted-foreground text-center" style={{ fontSize: 12 }}>
              Or scan with your phone to bookmark.
            </p>
          </div>
        )}

        <p className="mt-7 text-center text-muted-foreground" style={{ fontSize: 11.5 }}>
          Reference: <code className="font-mono">{bookingId}</code>
        </p>
      </div>
    </div>
  );
}
