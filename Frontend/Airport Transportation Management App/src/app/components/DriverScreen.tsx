import { useState, useEffect, useMemo } from "react";
import {
  MapPin,
  Phone,
  Users,
  Plane,
  Accessibility,
  CheckCircle2,
  LogOut,
  Loader2,
  Moon,
  Sun,
  Bell,
  ChevronRight,
  X,
  Navigation,
  MessageCircle,
  PlaneLanding,
  PlaneTakeoff,
  MapPinned,
  MapPinOff,
  Truck,
  PlusCircle,
  Pencil,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { useLocationSharing, shouldAutoPromptShare } from "../hooks/useLocationSharing";
import { RoleSwitcher } from "./RoleSwitcher";
import type { Role } from "../data/mockData";
import type { AvailableRole } from "../App";

import { API_BASE, apiFetch } from "../lib/api";
const ASSIGNMENTS_API = `${API_BASE}/assignments`;
const SARTHI_API      = `${API_BASE}/sarthi`;
const VEHICLES_API    = `${API_BASE}/vehicles`;

interface Props {
  onBack: () => void;
  driverName: string;
  driverId?: string;
  currentRole?: Role;
  availableRoles?: AvailableRole[];
  onSwitchRole?: (role: Role) => void;
}

interface Pickup {
  bookingId: string;
  flightType: "arrival" | "departure";
  flightGroupId: string;
  name: string;
  phone: string;
  mandal: string;
  passengerCount: number;
  strollerRequired: boolean;
  flightNumber: string;
  airline: string;
  scheduledTime: string;
  date: string;
  tripStatus?: string;
  vehicle?: {
    id: string;
    make: string;
    name: string;
    vehicleNumber: string;
    type: string;
    capacity: number;
    ownership: "rented" | "volunteer_provided" | "sarthi_owned";
  } | null;
}

interface SarthiInfo {
  id: string;
  name: string;
  phone: string;
  email: string;
  hasOwnVehicle?: boolean;
}

interface DriverVehicle {
  id: string;
  make: string;
  name: string;
  vehicleNumber: string;
  type: string;
  capacity: number;
}

function formatDateToday(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function splitTime(time: string): { hhmm: string; ampm: string } {
  if (!time || !time.includes(":")) return { hhmm: time || "—", ampm: "" };
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return { hhmm: `${h12}:${String(m).padStart(2, "0")}`, ampm };
}

export function DriverScreen({ onBack, driverName, driverId, currentRole, availableRoles, onSwitchRole }: Props) {
  const { isDark, toggle } = useTheme();
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [sarthiInfo, setSarthiInfo] = useState<SarthiInfo | null>(null);
  const [myVehicle, setMyVehicle] = useState<DriverVehicle | null>(null);
  const [showVehicleSheet, setShowVehicleSheet] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ make: "", name: "", vehicleNumber: "", type: "SUV", capacity: "7" });
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "done">("all");
  const [selectedPickup, setSelectedPickup] = useState<Pickup | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const sharing = useLocationSharing({ sarthiId: driverId, enabled: true });

  useEffect(() => {
    if (driverId && shouldAutoPromptShare()) {
      setShowSharePrompt(true);
    }
  }, [driverId]);

  useEffect(() => {
    if (!driverId) return;
    setLoading(true);
    Promise.allSettled([
      apiFetch(`${SARTHI_API}/${driverId}`).then((r) => r.ok ? r.json() : null),
      apiFetch(`${ASSIGNMENTS_API}/sarthi/${driverId}`).then((r) => r.json()),
      apiFetch(`${SARTHI_API}/${driverId}/vehicle`).then((r) => r.ok ? r.json() : null),
    ]).then(([sarthiRes, pickupsRes, vehicleRes]) => {
      if (sarthiRes.status === "fulfilled" && sarthiRes.value?.id) {
        setSarthiInfo(sarthiRes.value);
      }
      if (pickupsRes.status === "fulfilled" && Array.isArray(pickupsRes.value)) {
        const items = pickupsRes.value as Pickup[];
        setPickups(items);
        setCompletedIds(new Set(items.filter((p) => p.tripStatus === "complete").map((p) => p.bookingId)));
      }
      if (vehicleRes.status === "fulfilled" && vehicleRes.value?.id) {
        setMyVehicle(vehicleRes.value);
      }
    }).finally(() => setLoading(false));
  }, [driverId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1900);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleComplete = (id: string) => {
    const pickup = pickups.find((p) => p.bookingId === id);
    if (!pickup) return;
    const wasCompleted = completedIds.has(id);
    const nextStatus = wasCompleted ? "pending" : "complete";

    // Optimistic UI
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (wasCompleted) next.delete(id);
      else next.add(id);
      return next;
    });
    setToast(wasCompleted ? "Marked pending" : "Pickup completed ✓");

    apiFetch(`${ASSIGNMENTS_API}/${id}/${pickup.flightType}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip_status: nextStatus }),
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      })
      .catch(() => {
        // Roll back on failure
        setCompletedIds((prev) => {
          const next = new Set(prev);
          if (wasCompleted) next.add(id);
          else next.delete(id);
          return next;
        });
        setToast("Couldn't save — try again");
      });
  };

  const toggleHasOwnVehicle = async () => {
    if (!driverId) return;
    const res = await apiFetch(`${SARTHI_API}/${driverId}/profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasOwnVehicle: true }),
    });
    if (res.ok) {
      const updated: SarthiInfo = await res.json();
      setSarthiInfo(updated);
      setToast("You can now register your vehicle ✓");
    }
  };

  const openVehicleSheet = () => {
    setVehicleForm(myVehicle
      ? { make: myVehicle.make, name: myVehicle.name, vehicleNumber: myVehicle.vehicleNumber, type: myVehicle.type, capacity: String(myVehicle.capacity) }
      : { make: "", name: "", vehicleNumber: "", type: "SUV", capacity: "7" }
    );
    setShowVehicleSheet(true);
  };

  const handleSaveVehicle = async () => {
    if (!driverId || !vehicleForm.make || !vehicleForm.name || !vehicleForm.vehicleNumber) return;
    setVehicleSaving(true);
    try {
      const payload = { make: vehicleForm.make, name: vehicleForm.name, vehicleNumber: vehicleForm.vehicleNumber, type: vehicleForm.type, capacity: parseInt(vehicleForm.capacity) || 7 };
      let res: Response;
      if (myVehicle) {
        res = await apiFetch(`${SARTHI_API}/${driverId}/vehicle/${myVehicle.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      } else {
        res = await apiFetch(`${SARTHI_API}/${driverId}/vehicle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      }
      if (res.ok) {
        const saved: DriverVehicle = await res.json();
        setMyVehicle(saved);
        setShowVehicleSheet(false);
        setToast(myVehicle ? "Vehicle updated" : "Vehicle registered ✓");
      }
    } finally {
      setVehicleSaving(false);
    }
  };

  const sortedPickups = useMemo(() => {
    return [...pickups].sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.scheduledTime || "").localeCompare(b.scheduledTime || "");
    });
  }, [pickups]);

  const nextPickup = sortedPickups.find((p) => !completedIds.has(p.bookingId)) || null;

  const filtered = sortedPickups.filter((p) => {
    if (activeFilter === "pending") return !completedIds.has(p.bookingId);
    if (activeFilter === "done")    return completedIds.has(p.bookingId);
    return true;
  });

  const totalPassengers     = pickups.reduce((s, p) => s + p.passengerCount, 0);
  const completedPassengers = pickups.filter((p) => completedIds.has(p.bookingId)).reduce((s, p) => s + p.passengerCount, 0);
  const displayName         = sarthiInfo?.name || driverName;
  const initial = (displayName || "S").charAt(0).toUpperCase();

  const pendingCount = pickups.length - completedIds.size;
  const doneCount = completedIds.size;
  const pct = pickups.length ? Math.round((doneCount / pickups.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky header with rounded bottom corners */}
      <div
        className="sticky top-0 z-30"
        style={{
          background: `radial-gradient(120% 80% at 80% -10%, color-mix(in srgb, var(--accent) 16%, transparent) 0%, transparent 60%), var(--surface)`,
          borderBottom: "1px solid var(--line)",
          borderRadius: "0 0 26px 26px",
        }}
      >
        <div className="max-w-[720px] mx-auto px-[18px] pt-4 pb-[18px]">
          {/* Top row */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center font-semibold text-white flex-shrink-0"
              style={{
                width: 46,
                height: 46,
                borderRadius: "50%",
                background: "var(--accent)",
                fontSize: "1.15em",
                boxShadow: "0 2px 8px color-mix(in srgb, var(--accent) 38%, transparent)",
              }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] text-muted-foreground font-medium">Jai Swaminarayan</div>
              <div className="text-[1.18em] font-semibold text-[var(--head)] leading-tight truncate">{displayName}</div>
            </div>
            <button className="iconbtn relative" title="Notifications">
              <Bell className="w-[18px] h-[18px]" />
              <span
                style={{
                  position: "absolute",
                  top: -3,
                  right: -3,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: "var(--accent)",
                  border: "2px solid var(--surface)",
                }}
              />
            </button>
            <ShareLocationButton state={sharing.state} onStart={sharing.start} onStop={sharing.stop} />
            {currentRole && availableRoles && onSwitchRole && (
              <RoleSwitcher current={currentRole} available={availableRoles} onSwitch={onSwitchRole} />
            )}
            <button onClick={toggle} className="iconbtn" title="Toggle theme">
              {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>
            <button onClick={onBack} className="iconbtn" title="Sign out">
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>

          {/* Progress block */}
          <div className="mt-[18px] flex items-center gap-4">
            <div className="flex-1">
              <div className="text-[12.5px] text-muted-foreground font-medium">Today · {formatDateToday()}</div>
              <div className="text-[1.7em] font-bold text-[var(--head)] leading-[1.05] mt-0.5">
                {doneCount} / {pickups.length} <span className="text-muted-foreground text-[0.55em] font-medium">pickups</span>
              </div>
              <div className="text-[12.5px] text-muted-foreground mt-1">
                {completedPassengers} of {totalPassengers} passengers picked up
              </div>
            </div>
            <ProgressRing pct={pct} />
          </div>

          {/* My Vehicle strip — only shown when sarthi opted in to driving their own car */}
          {sarthiInfo?.hasOwnVehicle ? (
            <button
              onClick={openVehicleSheet}
              className="mt-4 w-full flex items-center gap-3 transition-transform active:scale-[0.985]"
              style={{
                background: myVehicle ? "var(--surface-2)" : "transparent",
                border: myVehicle ? "1px solid var(--line)" : "1px dashed var(--line)",
                borderRadius: 12,
                padding: "9px 14px",
              }}
            >
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{ width: 30, height: 30, borderRadius: 8, background: myVehicle ? "var(--primary-tint)" : "var(--surface-3)", color: myVehicle ? "var(--primary)" : "var(--muted-foreground)" }}
              >
                <Truck className="w-4 h-4" />
              </div>
              {myVehicle ? (
                <div className="flex-1 text-left min-w-0">
                  <div className="text-xs font-semibold text-[var(--head)] truncate">{myVehicle.make} {myVehicle.name}</div>
                  <div className="text-[11px] text-muted-foreground">{myVehicle.vehicleNumber} · {myVehicle.type} · {myVehicle.capacity} seats</div>
                </div>
              ) : (
                <span className="flex-1 text-left text-xs text-muted-foreground">Register my vehicle</span>
              )}
              {myVehicle ? <Pencil className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" /> : <PlusCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
            </button>
          ) : (
            <button
              onClick={toggleHasOwnVehicle}
              className="mt-4 w-full flex items-center gap-3 transition-transform active:scale-[0.985]"
              style={{ background: "transparent", border: "1px dashed var(--line)", borderRadius: 12, padding: "9px 14px" }}
            >
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-3)", color: "var(--muted-foreground)" }}
              >
                <Truck className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-xs font-semibold text-[var(--head)]">No personal vehicle</div>
                <div className="text-[11px] text-muted-foreground">Tap if you'd like to drive your own car</div>
              </div>
              <PlusCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            </button>
          )}

          {/* Next-up strip */}
          {nextPickup && (
            <button
              onClick={() => setSelectedPickup(nextPickup)}
              className="mt-4 w-full flex items-center gap-3 transition-transform active:scale-[0.985]"
              style={{
                background: "var(--accent-tint)",
                border: "1px solid var(--accent-line)",
                borderRadius: 14,
                padding: "11px 14px",
              }}
            >
              <div
                className="flex-shrink-0 flex items-center justify-center text-white"
                style={{ width: 34, height: 34, borderRadius: 10, background: "var(--accent)" }}
              >
                <Plane className="w-[18px] h-[18px]" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div
                  className="font-bold uppercase"
                  style={{ fontSize: "0.68em", letterSpacing: "0.1em", color: "var(--accent-strong)" }}
                >
                  Next Pickup
                </div>
                <div className="text-[0.92em] font-semibold text-[var(--head)] truncate">
                  {nextPickup.flightNumber} · {nextPickup.name}
                </div>
              </div>
              <div className="text-[0.95em] font-bold flex-shrink-0" style={{ color: "var(--accent-strong)" }}>
                {splitTime(nextPickup.scheduledTime).hhmm}
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent-strong)" }} />
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="max-w-[720px] mx-auto w-full px-[18px] pt-4 pb-2.5">
        <div className="flex gap-1.5">
          {([
            { id: "all", label: "All", count: pickups.length },
            { id: "pending", label: "Pending", count: pendingCount },
            { id: "done", label: "Done", count: doneCount },
          ] as { id: typeof activeFilter; label: string; count: number }[]).map((f) => {
            const active = activeFilter === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className="flex-1 flex items-center justify-center gap-1.5 transition-all"
                style={{
                  fontSize: "0.82em",
                  fontWeight: 600,
                  padding: "8px 4px",
                  borderRadius: 11,
                  border: active ? "1px solid var(--line)" : "1px solid transparent",
                  background: active ? "var(--surface)" : "var(--surface-3)",
                  color: active ? "var(--head)" : "var(--muted-foreground)",
                  boxShadow: active ? "0 1px 4px rgba(0,0,0,0.05)" : "none",
                }}
              >
                {f.label}
                <span
                  style={{
                    fontSize: "0.85em",
                    fontWeight: 700,
                    background: active ? "var(--accent)" : "var(--surface-2)",
                    color: active ? "#fff" : "var(--muted-foreground)",
                    borderRadius: 8,
                    padding: "1px 7px",
                  }}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[720px] mx-auto w-full px-[18px] pb-10">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading pickups…</span>
            </div>
          )}

          {!loading && !driverId && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No pickup assignments yet.
            </div>
          )}

          {!loading && driverId && pickups.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No pickups assigned to you yet.
            </div>
          )}

          {!loading && filtered.length === 0 && pickups.length > 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No pickups in this category
            </div>
          )}

          {!loading && filtered.map((pickup, idx) => {
            const done = completedIds.has(pickup.bookingId);
            const isNext = nextPickup?.bookingId === pickup.bookingId;
            const isLast = idx === filtered.length - 1;
            const { hhmm, ampm } = splitTime(pickup.scheduledTime);

            const cardBorder = isNext
              ? "1.5px solid var(--accent)"
              : "1px solid var(--line)";
            const cardShadow = isNext
              ? "0 4px 16px color-mix(in srgb, var(--accent) 22%, transparent)"
              : "0 1px 3px rgba(0,0,0,0.04)";

            return (
              <div
                key={`${pickup.bookingId}_${pickup.flightType}`}
                className="grid items-start"
                style={{ gridTemplateColumns: "42px 20px 1fr" }}
              >
                {/* Time rail */}
                <div className="pt-2 text-right pr-2">
                  <div className="font-bold text-[var(--head)] leading-none" style={{ fontSize: "0.92em" }}>{hhmm}</div>
                  <div className="font-semibold text-muted-foreground" style={{ fontSize: "0.62em", letterSpacing: "0.04em" }}>{ampm}</div>
                </div>

                {/* Node */}
                <div className="relative self-stretch">
                  {!isLast && (
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: 6,
                        bottom: -2,
                        width: 2,
                        background: "var(--line)",
                        transform: "translateX(-50%)",
                      }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: 14,
                      transform: "translate(-50%, -50%)",
                      width: 13,
                      height: 13,
                      borderRadius: "50%",
                      zIndex: 1,
                      background: done ? "var(--ok)" : isNext ? "var(--accent)" : "var(--muted-foreground)",
                      border: "3px solid var(--background)",
                      boxShadow: isNext ? "0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent)" : "none",
                    }}
                  />
                </div>

                {/* Card */}
                <div
                  className="relative cursor-pointer transition-all overflow-hidden"
                  onClick={() => setSelectedPickup(pickup)}
                  style={{
                    background: "var(--surface)",
                    border: cardBorder,
                    borderRadius: 17,
                    margin: "6px 0 14px 8px",
                    boxShadow: cardShadow,
                    opacity: done ? 0.62 : 1,
                  }}
                >
                  {/* "NEXT PICKUP" top ribbon */}
                  {isNext && (
                    <div
                      className="flex items-center gap-1.5 uppercase font-bold text-white"
                      style={{
                        background: "var(--accent)",
                        fontSize: "0.62em",
                        letterSpacing: "0.14em",
                        padding: "4px 14px",
                      }}
                    >
                      <span
                        style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", opacity: 0.9 }}
                      />
                      Next Pickup
                    </div>
                  )}

                  {/* Done left border */}
                  {done && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 4,
                        background: "var(--ok)",
                      }}
                    />
                  )}

                  {/* Flight banner */}
                  <div
                    className="flex items-center gap-2"
                    style={{
                      padding: "8px 16px",
                      background: "var(--surface-2)",
                      borderBottom: "1px solid var(--line)",
                      fontSize: "0.78em",
                      fontWeight: 600,
                      color: "var(--head)",
                    }}
                  >
                    {pickup.flightType === "arrival"
                      ? <PlaneLanding className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
                      : <PlaneTakeoff className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />}
                    <span>{pickup.flightNumber}</span>
                    <span className="text-muted-foreground font-normal">·</span>
                    <span className="text-muted-foreground">{pickup.flightType === "arrival" ? "Arrival" : "Departure"}</span>
                    <span className={`badge-pill ${done ? "badge--ok" : "badge--info"} ml-auto`}>
                      {done ? "Done" : "On Time"}
                    </span>
                  </div>

                  {/* Body */}
                  <div style={{ padding: 16 }}>
                    <div
                      className="font-semibold text-[var(--head)]"
                      style={{
                        fontSize: "1.12em",
                        lineHeight: 1.2,
                        textDecoration: done ? "line-through" : "none",
                        color: done ? "var(--muted-foreground)" : "var(--head)",
                      }}
                    >
                      {pickup.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      <span className="tag-chip">
                        <Users className="w-3 h-3" />
                        {pickup.passengerCount} {pickup.passengerCount === 1 ? "passenger" : "passengers"}
                      </span>
                      {pickup.mandal && (
                        <span className="tag-chip">
                          <MapPin className="w-3 h-3" />
                          {pickup.mandal}
                        </span>
                      )}
                      {pickup.strollerRequired && (
                        <span className="badge-pill badge--accent">
                          <Accessibility className="w-3 h-3" />
                          Stroller
                        </span>
                      )}
                      {pickup.vehicle && (
                        <span className="tag-chip" style={{ color: "var(--primary)" }}>
                          <Truck className="w-3 h-3" />
                          {pickup.vehicle.make} {pickup.vehicle.name} &middot; {pickup.vehicle.vehicleNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div
                    className="flex items-center gap-2"
                    style={{
                      padding: "10px 16px",
                      borderTop: "1px solid var(--line)",
                      background: "var(--surface-2)",
                    }}
                  >
                    {pickup.phone && (
                      <a
                        href={`tel:${pickup.phone}`}
                        onClick={(e) => { e.stopPropagation(); setToast("Calling…"); }}
                        className="iconbtn"
                        style={{ width: 38, height: 38, color: "var(--primary)", background: "var(--surface)" }}
                        title="Call"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setToast("Opening navigation…"); }}
                      className="iconbtn"
                      style={{ width: 38, height: 38, color: "var(--primary)", background: "var(--surface)" }}
                      title="Navigate"
                    >
                      <Navigation className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleComplete(pickup.bookingId); }}
                      className="ml-auto inline-flex items-center gap-1.5 transition-transform active:scale-95"
                      style={{
                        fontSize: "0.82em",
                        fontWeight: 600,
                        padding: "8px 14px",
                        borderRadius: 11,
                        border: done ? "1.5px solid var(--ok)" : "1.5px solid var(--primary)",
                        background: done ? "var(--ok)" : "transparent",
                        color: done ? "#fff" : "var(--primary)",
                      }}
                    >
                      {done ? <><CheckCircle2 className="w-3.5 h-3.5" /> Done</> : "Mark done"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom sheet */}
      <BottomSheet
        pickup={selectedPickup}
        done={selectedPickup ? completedIds.has(selectedPickup.bookingId) : false}
        onClose={() => setSelectedPickup(null)}
        onToggleComplete={() => {
          if (selectedPickup) toggleComplete(selectedPickup.bookingId);
        }}
        onAction={(label) => setToast(label)}
      />

      {showSharePrompt && (
        <ShareLocationPrompt
          onAccept={() => { setShowSharePrompt(false); sharing.start(); }}
          onDecline={() => setShowSharePrompt(false)}
        />
      )}

      <VehicleSheet
        open={showVehicleSheet}
        form={vehicleForm}
        saving={vehicleSaving}
        isEdit={!!myVehicle}
        onChange={(patch) => setVehicleForm((f) => ({ ...f, ...patch }))}
        onSave={handleSaveVehicle}
        onClose={() => setShowVehicleSheet(false)}
      />

      {/* Toast */}
      {toast && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2.5 transition-all"
          style={{
            bottom: 32,
            background: "var(--head)",
            color: "var(--surface)",
            padding: "11px 18px",
            borderRadius: 13,
            fontSize: "0.84em",
            fontWeight: 500,
            boxShadow: "0 8px 28px rgba(0,0,0,0.28)",
            whiteSpace: "nowrap",
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
          {toast}
        </div>
      )}
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const size = 74;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="flex-shrink-0 relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--line)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 500ms cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-bold text-[var(--head)]"
        style={{ fontSize: "0.95em" }}
      >
        {pct}%
      </div>
    </div>
  );
}

function BottomSheet({
  pickup,
  done,
  onClose,
  onToggleComplete,
  onAction,
}: {
  pickup: Pickup | null;
  done: boolean;
  onClose: () => void;
  onToggleComplete: () => void;
  onAction: (label: string) => void;
}) {
  const open = pickup !== null;

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity"
        style={{
          background: "rgba(20,12,6,0.42)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transitionDuration: "280ms",
        }}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-50 mx-auto"
        style={{
          maxWidth: 720,
          background: "var(--surface)",
          borderRadius: "26px 26px 0 0",
          transform: open ? "translateY(0)" : "translateY(102%)",
          transition: "transform 320ms cubic-bezier(.32,.72,.3,1)",
          padding: "10px 20px 24px",
          maxHeight: "88%",
          overflowY: "auto",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        }}
      >
        {/* Handle */}
        <div
          className="mx-auto"
          style={{ width: 40, height: 5, borderRadius: 99, background: "var(--line)", margin: "4px auto 16px" }}
        />

        {pickup && (
          <>
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="text-[1.4em] font-bold text-[var(--head)] leading-[1.15]">{pickup.name}</div>
                <div className="text-[0.84em] text-muted-foreground mt-1">
                  {pickup.flightType === "arrival" ? "Arriving" : "Departing"} · {pickup.flightNumber}
                </div>
              </div>
              <button onClick={onClose} className="iconbtn" style={{ width: 34, height: 34, borderRadius: "50%" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Flight card with 3x2 info grid */}
            <div
              className="mt-4 overflow-hidden"
              style={{ border: "1px solid var(--line)", borderRadius: 14 }}
            >
              <div
                className="flex items-center gap-2 font-semibold"
                style={{
                  padding: "12px 14px",
                  background: "var(--surface-2)",
                  color: "var(--head)",
                  fontSize: "0.9em",
                }}
              >
                <Plane className="w-4 h-4" />
                {pickup.flightNumber} · {pickup.airline}
                <span className="badge-pill badge--ok ml-auto">On Time</span>
              </div>
              <div className="grid grid-cols-2">
                <InfoCell k={pickup.flightType === "arrival" ? "Arrives" : "Departs"} v={pickup.scheduledTime || "—"} />
                <InfoCell k="Date" v={pickup.date || "—"} />
                <InfoCell k="Passengers" v={String(pickup.passengerCount)} />
                <InfoCell k="Mandal" v={pickup.mandal || "—"} />
                <InfoCell k="Phone" v={pickup.phone || "—"} />
                <InfoCell k="Special" v={pickup.strollerRequired ? "Stroller" : "None"} special={pickup.strollerRequired} />
              </div>
            </div>

            {/* Big action buttons */}
            <div className="grid grid-cols-3 gap-2.5 mt-[18px]">
              <button
                onClick={() => onAction("Calling…")}
                className="flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  borderRadius: 14,
                  padding: "14px 6px",
                  fontSize: "0.8em",
                  fontWeight: 600,
                }}
              >
                <Phone className="w-5 h-5" />
                Call
              </button>
              <button
                onClick={() => onAction("Opening WhatsApp…")}
                className="flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                style={{
                  background: "var(--ok)",
                  color: "#fff",
                  borderRadius: 14,
                  padding: "14px 6px",
                  fontSize: "0.8em",
                  fontWeight: 600,
                }}
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </button>
              <button
                onClick={() => onAction("Opening navigation…")}
                className="flex flex-col items-center gap-1.5 transition-transform active:scale-95"
                style={{
                  background: "var(--surface-3)",
                  color: "var(--head)",
                  border: "1px solid var(--line)",
                  borderRadius: 14,
                  padding: "14px 6px",
                  fontSize: "0.8em",
                  fontWeight: 600,
                }}
              >
                <Navigation className="w-5 h-5" />
                Navigate
              </button>
            </div>

            {/* Mark as picked up */}
            <button
              onClick={onToggleComplete}
              className="w-full mt-3.5 flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              style={{
                borderRadius: 14,
                padding: 15,
                fontSize: "1em",
                fontWeight: 600,
                border: "1.5px solid var(--ok)",
                background: done ? "var(--ok)" : "transparent",
                color: done ? "#fff" : "var(--ok)",
              }}
            >
              <CheckCircle2 className="w-5 h-5" />
              {done ? "Marked as picked up" : "Mark as picked up"}
            </button>
          </>
        )}
      </div>
    </>
  );
}

function InfoCell({ k, v, special }: { k: string; v: string; special?: boolean }) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderTop: "1px solid var(--line)",
      }}
      className="[&:nth-child(even)]:border-l [&:nth-child(even)]:border-[var(--line)]"
    >
      <div
        className="uppercase flex items-center gap-1 font-semibold text-muted-foreground"
        style={{ fontSize: "0.7em", letterSpacing: "0.05em" }}
      >
        {k}
      </div>
      <div
        className="font-semibold mt-1"
        style={{ fontSize: "0.98em", color: special ? "var(--accent)" : "var(--head)" }}
      >
        {v}
      </div>
    </div>
  );
}

function ShareLocationButton({ state, onStart, onStop }: {
  state: "off" | "starting" | "on" | "denied" | "error";
  onStart: () => void;
  onStop: () => void;
}) {
  const active = state === "on" || state === "starting";
  const label =
    state === "on"        ? "Sharing"   :
    state === "starting"  ? "Starting…" :
    state === "denied"    ? "Denied"    :
    state === "error"     ? "Error"     :
                            "Share";
  const bg = active
    ? "var(--ok-tint)"
    : state === "denied" || state === "error"
      ? "var(--danger-tint)"
      : "var(--surface-3)";
  const color = active
    ? "var(--ok)"
    : state === "denied" || state === "error"
      ? "var(--danger)"
      : "var(--head)";
  const borderColor = active
    ? "color-mix(in srgb, var(--ok) 40%, transparent)"
    : "var(--line)";

  return (
    <button
      type="button"
      onClick={active ? onStop : onStart}
      className="iconbtn"
      style={{ width: "auto", padding: "0 10px", gap: 6, background: bg, color, borderColor }}
      title={active ? "Stop sharing location" : "Share your location with the transport team"}
      aria-label={active ? "Stop sharing location" : "Share location"}
      aria-pressed={active}
    >
      {active ? <MapPinned className="w-4 h-4" /> : <MapPinOff className="w-4 h-4" />}
      <span className="hidden sm:inline" style={{ fontSize: 12.5, fontWeight: 600 }}>
        {label}
      </span>
    </button>
  );
}

function VehicleSheet({
  open, form, saving, isEdit, onChange, onSave, onClose,
}: {
  open: boolean;
  form: { make: string; name: string; vehicleNumber: string; type: string; capacity: string };
  saving: boolean;
  isEdit: boolean;
  onChange: (patch: Partial<typeof form>) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const canSave = form.make.trim() && form.name.trim() && form.vehicleNumber.trim() && !saving;
  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity"
        style={{ background: "rgba(20,12,6,0.42)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transitionDuration: "280ms" }}
      />
      <div
        className="fixed left-0 right-0 bottom-0 z-50 mx-auto"
        style={{
          maxWidth: 720,
          background: "var(--surface)",
          borderRadius: "26px 26px 0 0",
          transform: open ? "translateY(0)" : "translateY(102%)",
          transition: "transform 320ms cubic-bezier(.32,.72,.3,1)",
          padding: "10px 20px 32px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div className="mx-auto" style={{ width: 40, height: 5, borderRadius: 99, background: "var(--line)", margin: "4px auto 18px" }} />
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[1.1em] font-bold text-[var(--head)]">{isEdit ? "Edit My Vehicle" : "Register My Vehicle"}</h2>
          <button onClick={onClose} className="iconbtn" style={{ width: 32, height: 32 }}><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Make</label>
              <input className="input-warm" placeholder="Toyota" value={form.make} onChange={(e) => onChange({ make: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Model</label>
              <input className="input-warm" placeholder="Sienna" value={form.name} onChange={(e) => onChange({ name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">License Plate</label>
              <input className="input-warm" placeholder="ABC 1234" value={form.vehicleNumber} onChange={(e) => onChange({ vehicleNumber: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Type</label>
              <select className="input-warm" value={form.type} onChange={(e) => onChange({ type: e.target.value })}>
                {["SUV", "Minivan", "Van", "Bus", "Sedan", "Truck"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Seating Capacity</label>
            <select className="input-warm" value={form.capacity} onChange={(e) => onChange({ capacity: e.target.value })}>
              {[4, 5, 6, 7, 8, 10, 12, 14, 20, 30].map((n) => <option key={n} value={n}>{n} seats</option>)}
            </select>
          </div>
          <button
            onClick={onSave}
            disabled={!canSave}
            className="w-full btn btn--accent mt-1"
            style={{ padding: "13px", fontSize: "0.95em" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Save Changes" : "Register Vehicle"}
          </button>
        </div>
      </div>
    </>
  );
}

function ShareLocationPrompt({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(20,12,6,0.42)" }}
      onClick={onDecline}
    >
      <div
        className="w-full max-w-md bg-surface border border-line shadow-warm-3"
        style={{ borderRadius: "var(--r-xl)", padding: "24px 22px 20px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, borderRadius: 14, background: "var(--accent-tint)", color: "var(--accent)" }}
          >
            <MapPinned className="w-5 h-5" />
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--head)" }}>Share your location?</h3>
            <p className="text-muted-foreground" style={{ fontSize: 12.5 }}>While you're on shift today</p>
          </div>
        </div>
        <p className="mb-5" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
          The transport team will see your live position on the map to coordinate pickups. You can stop sharing any time from the topbar.
        </p>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button type="button" className="btn btn--ghost" onClick={onDecline}>Not now</button>
          <button type="button" className="btn btn--accent" onClick={onAccept}>Share location</button>
        </div>
      </div>
    </div>
  );
}
