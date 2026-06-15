/* global React, IOSDevice, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakColor, TweakToggle */
const { useState, useEffect, useRef } = React;

/* ============================================================
   DATA  (shapes mirror DriverScreen.tsx Pickup / SarthiInfo)
   ============================================================ */
const SARTHI = {
  name: "Hari Patel",
  phone: "+1 (732) 555-0190",
  vehicle: "Toyota Sienna · NJ ABC-1234 · 7 seats",
};

const DATE_LABEL = "Sun · 14 Jun 2026";

const PICKUPS = [
  { id: "b1", type: "arrival",   name: "Ramesh Shah",    phone: "+1 (732) 555-0142", mandal: "Edison",       pax: 2, special: null,         flight: "AA 1423", airline: "American",        terminal: "T4", time: "09:15", status: "landed" },
  { id: "b2", type: "arrival",   name: "Anjali Patel",   phone: "+1 (732) 555-0188", mandal: "Parsippany",   pax: 3, special: "stroller",    flight: "UA 0892", airline: "United",          terminal: "C",  time: "11:40", status: "ontime" },
  { id: "b3", type: "arrival",   name: "Mahesh Desai",   phone: "+1 (908) 555-0119", mandal: "Iselin",       pax: 1, special: "wheelchair",  flight: "DL 2207", airline: "Delta",           terminal: "B",  time: "13:05", status: "delayed", delay: "+45m" },
  { id: "b4", type: "departure", name: "Kiran Joshi",    phone: "+1 (201) 555-0173", mandal: "Jersey City",  pax: 4, special: null,         flight: "EK 0204", airline: "Emirates",        terminal: "B",  time: "14:25", status: "ontime" },
  { id: "b5", type: "arrival",   name: "Priya Mehta",    phone: "+1 (732) 555-0150", mandal: "Edison",       pax: 2, special: null,         flight: "BA 0185", airline: "British Airways", terminal: "A",  time: "16:50", status: "ontime" },
  { id: "b6", type: "departure", name: "Sanjay Trivedi", phone: "+1 (609) 555-0166", mandal: "Robbinsville", pax: 2, special: "stroller",    flight: "AI 0144", airline: "Air India",       terminal: "4",  time: "18:30", status: "ontime" },
  { id: "b7", type: "departure", name: "Hetal Bhatt",    phone: "+1 (848) 555-0102", mandal: "Piscataway",   pax: 3, special: null,         flight: "QR 0708", airline: "Qatar Airways",   terminal: "1",  time: "21:10", status: "ontime" },
];

/* ============================================================
   ICONS  (minimal lucide-style strokes)
   ============================================================ */
const I = {
  bell:   (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  phone:  (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  wa:     (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>,
  nav:    (p) => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>,
  users:  (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  pin:    (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  land:   (p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 22h20"/><path d="M3.77 10.77 2 9l2-4.5 1.1.55c.55.28.9.84.9 1.45v2.5l4.5 1.5 3-7 1.5.5-1.5 8 7 2.33c.7.23 1.2.88 1.2 1.62 0 .55-.45 1-1 1H7.5"/></svg>,
  takeoff:(p) => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 22h20"/><path d="M6.5 18 2 13l1.5-1 3 1 4-2-5-7 2-.5 7 5 4.5-1.2c.9-.24 1.8.3 2 1.2.24.9-.3 1.8-1.2 2L6.5 18z"/></svg>,
  stroll: (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 3h2l1 11h12"/><path d="M5 7h15a8 8 0 0 1-8 7"/><circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/></svg>,
  wheel:  (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="4" r="2"/><path d="M19 13a6 6 0 1 1-7-5.7V13h6"/><path d="m13 13 3 6"/></svg>,
  check:  (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="20 6 9 17 4 12"/></svg>,
  chev:   (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="9 18 15 12 9 6"/></svg>,
  x:      (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  clock:  (p) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>,
};

/* ============================================================
   HELPERS
   ============================================================ */
function fmtTime(t) {
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { hm: `${h12}:${String(m).padStart(2, "0")}`, ap };
}
function statusSpill(p) {
  if (p.status === "delayed") return { label: `Delayed ${p.delay || ""}`.trim(), cls: "delayed" };
  if (p.status === "landed")  return { label: "Landed", cls: "landed" };
  if (p.status === "early")   return { label: "Early",  cls: "ontime" };
  return { label: "On time", cls: "ontime" };
}
const specialMeta = {
  stroller:   { label: "Stroller",   Icon: I.stroll },
  wheelchair: { label: "Wheelchair", Icon: I.wheel },
};

/* ============================================================
   TOKENS  (Warm Refinement themes)
   ============================================================ */
function surfaceTokens(name, dark) {
  if (dark) {
    return {
      "--bg": "#16110D", "--card": "#221A14", "--line": "#392F28",
      "--muted": "#A2917F", "--head": "#F4EADF", "--ink": "#DCD1C6",
      "--chip": "#2B221B", "--countbg": "#332921", "--banner": "#271E17", "--foot": "#1E1812",
      "--toast": "#F4EADF", "--toast-ink": "#221A14", "--primary": "#56A8EC",
    };
  }
  const map = {
    warm: { "--bg": "#FBEFE2", "--card": "#FFFFFF", "--line": "#ECDCCB", "--muted": "#9B8B7B", "--head": "#173D61", "--ink": "#4A4540", "--chip": "#F7EEE3", "--countbg": "#EFE3D5", "--banner": "#FBF4EB", "--foot": "#FCF7F0" },
    cool: { "--bg": "#F2F5F8", "--card": "#FFFFFF", "--line": "#E2E7EC", "--muted": "#8A9099", "--head": "#173D61", "--ink": "#494D52", "--chip": "#F0F4F7", "--countbg": "#E7ECF1", "--banner": "#F3F8FC", "--foot": "#F8FAFC" },
    calm: { "--bg": "#F0EDE5", "--card": "#FFFFFF", "--line": "#E2DDD1", "--muted": "#938C7E", "--head": "#2C3A33", "--ink": "#474842", "--chip": "#F2EFE7", "--countbg": "#E8E2D7", "--banner": "#F1EFE7", "--foot": "#F6F4EC" },
  };
  return { ...(map[name] || map.warm), "--toast": "#173D61", "--toast-ink": "#FFFFFF", "--primary": "#0C71C3" };
}
const DENSITY = {
  compact: { "--fs": "13.5px", "--cardpad": "13px", "--gap": "10px", "--radius": "14px" },
  regular: { "--fs": "15px",   "--cardpad": "16px", "--gap": "13px", "--radius": "17px" },
  comfy:   { "--fs": "16.5px", "--cardpad": "20px", "--gap": "17px", "--radius": "20px" },
};
function accentStrong(hex) {
  // darken ~18% for text-on-tint use
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(r * 0.82); g = Math.round(g * 0.82); b = Math.round(b * 0.82);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/* ============================================================
   SMALL UI PIECES
   ============================================================ */
function Ring({ pct, accent }) {
  const r = 30, c = 2 * Math.PI * r;
  return (
    <div className="sf-ring">
      <svg width="74" height="74" viewBox="0 0 74 74">
        <circle cx="37" cy="37" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
        <circle cx="37" cy="37" r={r} fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 37 37)"
          style={{ transition: "stroke-dashoffset .5s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div className="pct">{Math.round(pct * 100)}%</div>
    </div>
  );
}

function PickupCard({ p, done, isNext, onOpen, onToggle, onAction }) {
  const t = fmtTime(p.time);
  const spill = statusSpill(p);
  const TypeIcon = p.type === "arrival" ? I.land : I.takeoff;
  const sp = p.special ? specialMeta[p.special] : null;
  const last = p.id === PICKUPS[PICKUPS.length - 1].id;
  const dotCls = done ? "done" : isNext ? "next" : p.status === "delayed" ? "delayed" : "";
  return (
    <div className={"sf-event" + (last ? " last" : "")}>
      <div className="sf-rail">
        <div className="t">{t.hm}</div>
        <div className="ap">{t.ap}</div>
      </div>
      <div className="sf-node"><div className={"sf-dot " + dotCls} /></div>
      <div className={"sf-card" + (done ? " done" : isNext ? " next" : "")} onClick={() => onOpen(p.id)}>
        {isNext && !done && <div className="sf-nextribbon">Next pickup</div>}
        <div className={"sf-banner" + (p.status === "delayed" ? " delayed" : "")}>
          <TypeIcon />
          <span className="flt">{p.flight}</span>
          <span className="dot-sep">·</span>
          <span>{p.type === "arrival" ? "Arrival" : "Departure"}</span>
          <span className="dot-sep">·</span>
          <span>{p.terminal}</span>
          <span className={"spill " + spill.cls}>{spill.label}</span>
        </div>
        <div className="sf-body">
          <div className="sf-name">{p.name}</div>
          <div className="sf-meta">
            <span className="sf-chip"><I.users />{p.pax} pax</span>
            <span className="sf-chip"><I.pin />{p.mandal}</span>
            {sp && <span className="sf-chip special"><sp.Icon />{sp.label}</span>}
          </div>
        </div>
        <div className="sf-foot" onClick={(e) => e.stopPropagation()}>
          <button className="sf-act" title="Call" onClick={() => onAction("call", p)}><I.phone /></button>
          <button className="sf-act" title="Navigate" onClick={() => onAction("nav", p)}><I.nav /></button>
          <button className={"sf-complete" + (done ? " done" : "")} onClick={() => onToggle(p.id)}>
            {done ? <><I.check />Done</> : "Mark done"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Sheet({ p, done, open, onClose, onToggle, onAction }) {
  const t = p ? fmtTime(p.time) : null;
  const sp = p && p.special ? specialMeta[p.special] : null;
  const spill = p ? statusSpill(p) : null;
  const TypeIcon = p && p.type === "arrival" ? I.land : I.takeoff;
  return (
    <>
      <div className={"sf-scrim" + (open ? " open" : "")} onClick={onClose} />
      <div className={"sf-sheet" + (open ? " open" : "")}>
        {p && (
          <>
            <div className="sf-handle" />
            <div className="sf-sheet-head">
              <div className="nm">
                <div className="big">{p.name}</div>
                <div className="sub">{p.mandal} Mandal · {p.pax} passenger{p.pax > 1 ? "s" : ""}</div>
              </div>
              <button className="sf-close" onClick={onClose}><I.x /></button>
            </div>

            <div className="sf-flightcard">
              <div className={"top" + (p.status === "delayed" ? " delayed" : "")}>
                <TypeIcon />
                <span>{p.airline} {p.flight}</span>
                <span style={{ marginLeft: "auto", fontWeight: 700 }}>{spill.label}</span>
              </div>
              <div className="sf-infogrid">
                <div className="sf-info"><div className="k"><I.clock />{p.type === "arrival" ? "Arrives" : "Departs"}</div><div className="v">{t.hm} {t.ap}</div></div>
                <div className="sf-info"><div className="k">Terminal</div><div className="v">{p.terminal}</div></div>
                <div className="sf-info"><div className="k"><I.users />Passengers</div><div className="v">{p.pax}</div></div>
                <div className="sf-info"><div className="k"><I.pin />Mandal</div><div className="v">{p.mandal}</div></div>
                <div className="sf-info"><div className="k"><I.phone />Phone</div><div className="v">{p.phone}</div></div>
                <div className="sf-info"><div className="k">Special needs</div><div className={"v" + (sp ? " special" : "")}>{sp ? sp.label : "None"}</div></div>
              </div>
            </div>

            <div className="sf-bigactions">
              <button className="sf-bigact call" onClick={() => onAction("call", p)}><I.phone />Call</button>
              <button className="sf-bigact wa" onClick={() => onAction("wa", p)}><I.wa />WhatsApp</button>
              <button className="sf-bigact nav" onClick={() => onAction("nav", p)}><I.nav />Navigate</button>
            </div>

            <button className={"sf-sheet-complete" + (done ? " done" : "")} onClick={() => onToggle(p.id)}>
              {done ? <><I.check />Picked up</> : <>Mark as picked up</>}
            </button>
          </>
        )}
      </div>
    </>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "surface": "warm",
  "accent": "#C0552F",
  "density": "regular",
  "dark": false
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [doneIds, setDoneIds] = useState(() => new Set(["b1"]));
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sorted = [...PICKUPS].sort((a, b) => a.time.localeCompare(b.time));
  const nextId = sorted.find((p) => !doneIds.has(p.id))?.id || null;

  const counts = {
    all: sorted.length,
    pending: sorted.filter((p) => !doneIds.has(p.id)).length,
    done: sorted.filter((p) => doneIds.has(p.id)).length,
  };
  const visible = sorted.filter((p) =>
    filter === "pending" ? !doneIds.has(p.id) : filter === "done" ? doneIds.has(p.id) : true
  );

  const totalPax = sorted.reduce((s, p) => s + p.pax, 0);
  const donePax = sorted.filter((p) => doneIds.has(p.id)).reduce((s, p) => s + p.pax, 0);
  const pct = sorted.length ? counts.done / sorted.length : 0;

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1900);
  };
  const toggle = (id) => {
    setDoneIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else { n.add(id); const p = PICKUPS.find((x) => x.id === id); showToast(`✓ ${p.name} marked picked up`); }
      return n;
    });
  };
  const onAction = (kind, p) => {
    if (kind === "call") showToast(`Calling ${p.name}…`);
    else if (kind === "wa") showToast(`Messaging ${p.name} on WhatsApp…`);
    else if (kind === "nav") showToast(`Opening directions to ${p.terminal}…`);
  };
  const openSheet = (id) => { setOpenId(id); setTimeout(() => setSheetOpen(true), 20); };
  const closeSheet = () => { setSheetOpen(false); setTimeout(() => setOpenId(null), 320); };

  const openPickup = openId ? PICKUPS.find((p) => p.id === openId) : null;
  const next = nextId ? PICKUPS.find((p) => p.id === nextId) : null;
  const accent = t.accent;

  const tokenStyle = {
    ...surfaceTokens(t.surface, t.dark),
    ...DENSITY[t.density],
    "--accent": accent,
    "--accent-ink": "#FFFFFF",
    "--accent-strong": t.dark ? accent : accentStrong(accent),
    "--accent-tint": `color-mix(in srgb, ${accent} 13%, var(--card))`,
    "--accent-line": `color-mix(in srgb, ${accent} 34%, var(--card))`,
    "--accent-glow": `color-mix(in srgb, ${accent} 18%, transparent)`,
    "--accent-shadow": `color-mix(in srgb, ${accent} 28%, transparent)`,
    "--ok": "#1F8A4C", "--ok-bg": "color-mix(in srgb, #1F8A4C 13%, var(--card))",
    "--info": "#1E78C8", "--info-bg": "color-mix(in srgb, #1E78C8 13%, var(--card))",
    "--warn": "#E0A100", "--warn-ink": t.dark ? "#E7B53C" : "#9A6A00", "--warn-bg": "color-mix(in srgb, #E0A100 16%, var(--card))",
    "--special-ink": t.dark ? "#E0975A" : "#B5571C", "--special-bg": "color-mix(in srgb, #C2671F 15%, var(--card))", "--special-line": "color-mix(in srgb, #C2671F 32%, var(--card))",
    "--danger": "#E02B20",
  };

  const isMobile = vp.w <= 520;

  /* ---- the phone viewport content (app + overlays) ---- */
  const viewport = (
    <div className="sf-viewport" style={tokenStyle}>
      <div className={"sf-app " + (isMobile ? "full" : "framed")}>
        <div className="sf-inner">
          {/* Header */}
          <div className="sf-header">
            <div className="sf-toprow">
              <div className="sf-avatar">{SARTHI.name.charAt(0)}</div>
              <div className="sf-greet">
                <div className="g">Jai Swaminarayan</div>
                <div className="n">{SARTHI.name}</div>
              </div>
              <button className="sf-iconbtn"><I.bell /><span className="badge" /></button>
            </div>

            <div className="sf-progress">
              <div className="ptext">
                <div className="plabel">Today · {DATE_LABEL}</div>
                <div className="pbig">{counts.done}<span> / {counts.all} pickups</span></div>
                <div className="psub"><I.users />{donePax} of {totalPax} passengers picked up</div>
              </div>
              <Ring pct={pct} accent={accent} />
            </div>

            {next && (
              <div className="sf-next" onClick={() => openSheet(next.id)}>
                <div className="nx-ic">{next.type === "arrival" ? <I.land /> : <I.takeoff />}</div>
                <div className="nx-body">
                  <div className="nx-k">Next pickup</div>
                  <div className="nx-t">{next.name} · {next.terminal} · {next.flight}</div>
                </div>
                <div className="nx-time">{fmtTime(next.time).hm}</div>
                <I.chev style={{ color: "var(--accent-strong)", flexShrink: 0 }} />
              </div>
            )}
          </div>

          {/* Filters */}
          <div className="sf-filters">
            {["all", "pending", "done"].map((f) => (
              <button key={f} className={"sf-tab" + (filter === f ? " on" : "")} onClick={() => setFilter(f)}>
                <span style={{ textTransform: "capitalize" }}>{f}</span>
                <span className="cnt">{counts[f]}</span>
              </button>
            ))}
          </div>

          {/* Timeline */}
          <div className="sf-timeline">
            {visible.length === 0 ? (
              <div className="sf-empty">
                <div className="ic"><I.check /></div>
                No pickups in this list.
              </div>
            ) : (
              <>
                <div className="sf-daterow">
                  <span className="dlabel">{DATE_LABEL}</span>
                  <span className="dcount">{visible.length} pickup{visible.length !== 1 ? "s" : ""}</span>
                  <span className="dline" />
                </div>
                {visible.map((p) => (
                  <PickupCard key={p.id} p={p} done={doneIds.has(p.id)} isNext={p.id === nextId}
                    onOpen={openSheet} onToggle={toggle} onAction={onAction} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <Sheet p={openPickup} done={openPickup ? doneIds.has(openPickup.id) : false}
        open={sheetOpen} onClose={closeSheet} onToggle={toggle} onAction={onAction} />

      <div className={"sf-toast" + (toast ? " show" : "")}>{toast}</div>
    </div>
  );

  /* ---- responsive shell ---- */
  let shell;
  if (isMobile) {
    shell = <div style={{ position: "fixed", inset: 0 }}>{viewport}</div>;
  } else {
    const scale = Math.min(1, (vp.h - 32) / 874, (vp.w - 32) / 402);
    shell = (
      <div style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}>
        <IOSDevice dark={t.dark}>{viewport}</IOSDevice>
      </div>
    );
  }

  return (
    <>
      {shell}
      <TweaksPanel>
        <TweakSection label="Surface" />
        <TweakRadio label="Theme" value={t.surface} options={["warm", "cool", "calm"]} onChange={(v) => setTweak("surface", v)} />
        <TweakToggle label="Dark mode" value={t.dark} onChange={(v) => setTweak("dark", v)} />
        <TweakSection label="Accent" />
        <TweakColor label="Accent color" value={t.accent}
          options={["#C0552F", "#0C71C3", "#C77A10", "#0F8A7E"]}
          onChange={(v) => setTweak("accent", v)} />
        <TweakSection label="Layout" />
        <TweakRadio label="Density" value={t.density} options={["compact", "regular", "comfy"]} onChange={(v) => setTweak("density", v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
