import React, { useState, useEffect, useMemo, type ReactNode } from "react";
import {
  PlaneLanding,
  PlaneTakeoff,
  Users,
  Car,
  Phone,
  CheckCircle2,
  LogOut,
  CalendarDays,
  AlertTriangle,
  Truck,
  MapPinned,
  LayoutGrid,
  Mail,
  Loader2,
  Moon,
  Sun,
  Sparkles,
  X,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { BhaktosDashboard } from "./BhaktosDashboard";
import { LiveMapTab } from "./LiveMapTab";
import { ShareLink } from "./ShareLink";
import { type FlightGroup, type Passenger, type Role } from "../data/mockData";
import { RoleSwitcher } from "./RoleSwitcher";
import type { AvailableRole } from "../App";
import { type Sarthi as SarthiOption } from "./FlightGroupView";

import { API_BASE } from "../lib/api";
const VEHICLES_API      = `${API_BASE}/vehicles`;
const SARTHI_API        = `${API_BASE}/sarthi`;
const FLIGHT_GROUPS_API = `${API_BASE}/flight-groups`;
const ASSIGNMENTS_API   = `${API_BASE}/assignments`;

interface Vehicle {
  id: string;
  make: string;
  name: string;
  vehicleNumber: string;
  type: string;
  capacity: number;
  assignedDriverId?: string;
}

import { FlightGroupCard } from "./FlightGroupView";

type Sarthi = SarthiOption;

type Tab = "bhaktos" | "arrival" | "departure" | "sarthi_roster" | "vehicles" | "live_map";

interface Props {
  onBack: () => void;
  adminName: string;
  currentRole?: Role;
  availableRoles?: AvailableRole[];
  onSwitchRole?: (role: Role) => void;
}

export function TransportScreen({ onBack, adminName, currentRole, availableRoles, onSwitchRole }: Props) {
  const { isDark, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("bhaktos");
  const [arrivalAssignments, setArrivalAssignments] = useState<Record<string, string>>({});
  const [departureAssignments, setDepartureAssignments] = useState<Record<string, string>>({});
  const [shareToast, setShareToast] = useState<{ passenger: Passenger; sarthiName: string; kind: "assigned" | "unassigned" } | null>(null);
  const [arrivalGroups, setArrivalGroups]   = useState<FlightGroup[]>([]);
  const [arrivalPax, setArrivalPax]         = useState<Passenger[]>([]);
  const [departureGroups, setDepartureGroups] = useState<FlightGroup[]>([]);
  const [departurePax, setDeparturePax]     = useState<Passenger[]>([]);
  const [flightGroupsLoading, setFlightGroupsLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [sarthis, setSarthis] = useState<Sarthi[]>([]);
  const [sarthisLoading, setSarthisLoading] = useState(false);

  const currentPassengers = activeTab === "arrival" ? arrivalPax : departurePax;
  const currentGroups = activeTab === "arrival" ? arrivalGroups : departureGroups;
  const currentAssignments = activeTab === "arrival" ? arrivalAssignments : departureAssignments;

  const totalPassengers = currentPassengers.reduce((s, p) => s + p.passengerCount, 0);
  const totalBookings = currentPassengers.length;
  const assignedCount = Object.keys(currentAssignments).length;

  const allDates = useMemo(() => {
    const dates = [...new Set(currentGroups.map((g) => g.date))].sort();
    return dates;
  }, [currentGroups]);

  const [selectedDate, setSelectedDate] = useState<string>("all");

  const filteredGroups = useMemo(() => {
    if (selectedDate === "all") return currentGroups;
    return currentGroups.filter((g) => g.date === selectedDate);
  }, [currentGroups, selectedDate]);

  const groupedByDate = useMemo(() => {
    return filteredGroups.reduce<Record<string, typeof filteredGroups>>((acc, g) => {
      if (!acc[g.date]) acc[g.date] = [];
      acc[g.date].push(g);
      return acc;
    }, {});
  }, [filteredGroups]);

  useEffect(() => {
    setVehiclesLoading(true);
    fetch(`${VEHICLES_API}/`)
      .then((r) => r.json())
      .then((data: Vehicle[]) => setVehicles(data))
      .catch(() => {})
      .finally(() => setVehiclesLoading(false));
  }, []);

  useEffect(() => {
    setSarthisLoading(true);
    fetch(`${SARTHI_API}/`)
      .then((r) => r.json())
      .then((data: Sarthi[]) => setSarthis(data))
      .catch(() => {})
      .finally(() => setSarthisLoading(false));
  }, []);

  useEffect(() => {
    setFlightGroupsLoading(true);
    Promise.allSettled([
      fetch(`${FLIGHT_GROUPS_API}/arrivals`).then((r) => r.json()),
      fetch(`${FLIGHT_GROUPS_API}/departures`).then((r) => r.json()),
    ]).then(([arrResult, depResult]) => {
      if (arrResult.status === "fulfilled") {
        setArrivalGroups(arrResult.value.groups ?? []);
        setArrivalPax(arrResult.value.passengers ?? []);
      }
      if (depResult.status === "fulfilled") {
        setDepartureGroups(depResult.value.groups ?? []);
        setDeparturePax(depResult.value.passengers ?? []);
      }
    }).finally(() => setFlightGroupsLoading(false));
  }, []);

  useEffect(() => {
    fetch(`${ASSIGNMENTS_API}/`)
      .then((r) => r.json())
      .then((docs: { bookingId: string; sarthiId: string; flightType: string }[]) => {
        const arr: Record<string, string> = {};
        const dep: Record<string, string> = {};
        for (const d of docs) {
          if (d.flightType === "arrival")   arr[d.bookingId] = d.sarthiId;
          if (d.flightType === "departure") dep[d.bookingId] = d.sarthiId;
        }
        setArrivalAssignments(arr);
        setDepartureAssignments(dep);
      })
      .catch(() => {});
  }, []);

  const handleAssignDriver = async (vehicleId: string, driverId: string) => {
    const res = await fetch(`${VEHICLES_API}/${vehicleId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedDriverId: driverId || null }),
    });
    if (res.ok) {
      const updated: Vehicle = await res.json();
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === vehicleId) return updated;
          if (driverId && v.assignedDriverId === driverId) return { ...v, assignedDriverId: undefined };
          return v;
        })
      );
    }
  };

  const getPassengersForGroup = (groupId: string, passengers: Passenger[]) =>
    passengers.filter((p) => p.flightGroup === groupId);

  const handleAssignSarthi = (bookingId: string, sarthiId: string, flightType: "arrival" | "departure", flightGroupId: string) => {
    const pax = (flightType === "arrival" ? arrivalPax : departurePax).find((p) => p.id === bookingId);
    const sarthi = sarthis.find((s) => s.id === sarthiId);
    if (pax && pax.trackingToken) {
      setShareToast({ passenger: pax, sarthiName: sarthi?.name ?? "Sarthi", kind: "assigned" });
    }
    if (flightType === "arrival") setArrivalAssignments((prev) => ({ ...prev, [bookingId]: sarthiId }));
    else setDepartureAssignments((prev) => ({ ...prev, [bookingId]: sarthiId }));
    fetch(`${ASSIGNMENTS_API}/${bookingId}/${flightType}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sarthi_id: sarthiId, flight_group_id: flightGroupId }),
    }).catch(() => {});
  };

  const handleUnassignSarthi = (bookingId: string, flightType: "arrival" | "departure") => {
    const pax = (flightType === "arrival" ? arrivalPax : departurePax).find((p) => p.id === bookingId);
    const prevSarthiId = (flightType === "arrival" ? arrivalAssignments : departureAssignments)[bookingId];
    const prevSarthi = sarthis.find((s) => s.id === prevSarthiId);
    if (pax && pax.trackingToken) {
      setShareToast({ passenger: pax, sarthiName: prevSarthi?.name ?? "Sarthi", kind: "unassigned" });
    }
    if (flightType === "arrival") setArrivalAssignments((prev) => { const n = { ...prev }; delete n[bookingId]; return n; });
    else setDepartureAssignments((prev) => { const n = { ...prev }; delete n[bookingId]; return n; });
    fetch(`${ASSIGNMENTS_API}/${bookingId}/${flightType}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="topbar">
        <div className="max-w-[1240px] w-full mx-auto px-7 flex items-center gap-3.5">
          <div className="brand-mark">
            <Sparkles className="w-[22px] h-[22px]" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-semibold text-[var(--head)] leading-tight">Transportation Admin</h1>
            <p className="text-xs text-muted-foreground uppercase tracking-[0.08em] truncate">{adminName}</p>
          </div>
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
      </div>

      {/* Tab bar */}
      <div className="tabbar">
        <div className="max-w-[1240px] w-full mx-auto px-7 flex gap-0.5 overflow-x-auto scrollbar-hide">
          {([
            { id: "bhaktos",       label: "Bhaktos Dashboard", icon: <LayoutGrid className="w-4 h-4" /> },
            { id: "arrival",       label: "Arrival",           icon: <PlaneLanding className="w-4 h-4" /> },
            { id: "departure",     label: "Departure",         icon: <PlaneTakeoff className="w-4 h-4" /> },
            { id: "sarthi_roster", label: "Sarthi Roster",     icon: <Users className="w-4 h-4" /> },
            { id: "vehicles",      label: "Vehicles",          icon: <Truck className="w-4 h-4" /> },
            { id: "live_map",      label: "Live Map",          icon: <MapPinned className="w-4 h-4" /> },
          ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); if (id !== "sarthi_roster") setSelectedDate("all"); }}
              className={`tab ${activeTab === id ? "active" : ""}`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-[1240px] mx-auto px-7 py-7 space-y-6">

          {activeTab === "bhaktos" && <BhaktosDashboard />}

          {(activeTab === "arrival" || activeTab === "departure") && (
            <>
              {/* Summary cards */}
              <div className="stats grid">
                <StatCard
                  tone="info"
                  icon={<Users className="w-[18px] h-[18px]" />}
                  label={`Total ${activeTab === "arrival" ? "Arrival" : "Departure"} Bookings`}
                  value={String(totalBookings)}
                  sub={`${totalPassengers} passengers`}
                />
                <StatCard
                  tone="accent"
                  icon={<Car className="w-[18px] h-[18px]" />}
                  label="Sarthis"
                  value={String(sarthis.length)}
                  sub="registered"
                />
                <StatCard
                  tone="ok"
                  icon={<CheckCircle2 className="w-[18px] h-[18px]" />}
                  label="Assignments Done"
                  value={`${assignedCount}/${totalBookings}`}
                  sub={assignedCount === totalBookings ? "All assigned" : `${totalBookings - assignedCount} pending`}
                />
              </div>

              <section>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                  <h2 className="text-[18px] font-semibold text-[var(--head)]">
                    {activeTab === "arrival" ? "Incoming Flights" : "Departing Flights"}
                  </h2>
                  {/* Date filter pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    <DatePill active={selectedDate === "all"} onClick={() => setSelectedDate("all")}>All Dates</DatePill>
                    {allDates.map((d) => (
                      <DatePill key={d} active={selectedDate === d} onClick={() => setSelectedDate(d)}>
                        {formatDate(d)}
                      </DatePill>
                    ))}
                  </div>
                </div>

                {flightGroupsLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading flights…</span>
                  </div>
                ) : currentGroups.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground text-sm">
                    No {activeTab === "arrival" ? "arrival" : "departure"} flights found.
                  </div>
                ) : null}

                <div className="space-y-6">
                  {!flightGroupsLoading && Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, groups]) => {
                    const delayedCount = groups.filter((g) => g.status === "delayed").length;
                    const earlyCount = groups.filter((g) => g.status === "early").length;
                    const cancelledCount = groups.filter((g) => g.status === "cancelled").length;
                    return (
                      <div key={date}>
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-[var(--accent)]" />
                            <span className="text-sm font-semibold text-[var(--head)]">
                              {formatDateLong(date)}
                            </span>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {groups.length} flight{groups.length !== 1 ? "s" : ""}
                          </span>
                          {delayedCount > 0 && (
                            <span className="badge-pill badge--warn">
                              <AlertTriangle className="w-3 h-3" />{delayedCount} delayed
                            </span>
                          )}
                          {earlyCount > 0 && (
                            <span className="badge-pill badge--info">
                              {earlyCount} early
                            </span>
                          )}
                          {cancelledCount > 0 && (
                            <span className="badge-pill badge--danger">
                              {cancelledCount} cancelled
                            </span>
                          )}
                          <div className="flex-1 h-px bg-[var(--line)]" />
                        </div>
                        <div className="space-y-3">
                          {groups.map((group) => (
                            <FlightGroupCard
                              key={group.id}
                              group={group}
                              passengers={getPassengersForGroup(group.id, currentPassengers)}
                              sarthis={sarthis}
                              vehicles={vehicles}
                              assignments={currentAssignments}
                              onAssign={(bookingId, sarthiId) =>
                                handleAssignSarthi(bookingId, sarthiId, activeTab as "arrival" | "departure", group.id)
                              }
                              onUnassign={(bookingId) =>
                                handleUnassignSarthi(bookingId, activeTab as "arrival" | "departure")
                              }
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {activeTab === "sarthi_roster" && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[18px] font-semibold text-[var(--head)]">Sarthi Roster</h2>
                <span className="text-xs text-muted-foreground">
                  {sarthisLoading ? "" : `${sarthis.length} sarthi${sarthis.length !== 1 ? "s" : ""}`}
                </span>
              </div>

              <div className="card-warm overflow-hidden">
                {sarthisLoading ? (
                  <div className="px-4 py-10 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : sarthis.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No Sarthis added yet. Add them from the Super Admin Panel.
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--line-soft)]">
                    {sarthis.map((sarthi) => {
                      const assignedVehicle = vehicles.find((v) => v.assignedDriverId === sarthi.id);
                      return (
                        <li key={sarthi.id} className="px-5 py-3.5 flex items-center gap-3">
                          <div className="avatar-warm">{sarthi.name.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--head)] truncate text-sm font-semibold">{sarthi.name}</p>
                            <div className="flex items-center gap-3 flex-wrap mt-0.5">
                              {sarthi.phone && (
                                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                  <Phone className="w-3 h-3" />{sarthi.phone}
                                </span>
                              )}
                              {sarthi.email && (
                                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                                  <Mail className="w-3 h-3" />{sarthi.email}
                                </span>
                              )}
                            </div>
                            {assignedVehicle ? (
                              <span className="text-muted-foreground flex items-center gap-1 mt-0.5 text-xs">
                                <Car className="w-3 h-3" />{assignedVehicle.make} {assignedVehicle.name} · {assignedVehicle.vehicleNumber} · {assignedVehicle.capacity} seats
                              </span>
                            ) : (
                              <span className="text-muted-foreground mt-0.5 block text-xs italic">No vehicle assigned</span>
                            )}
                          </div>
                          <span className="badge-pill badge--ok flex-shrink-0">Sarthi</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}

          {activeTab === "vehicles" && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] font-semibold text-[var(--head)]">Fleet Vehicles</h2>
                <span className="text-xs text-muted-foreground">
                  {vehiclesLoading ? "" : `${vehicles.length} vehicle${vehicles.length !== 1 ? "s" : ""}`}
                </span>
              </div>

              <div className="card-warm overflow-hidden">
                {vehiclesLoading ? (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading vehicles…</div>
                ) : vehicles.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                    No vehicles added yet. Add them from the Super Admin Panel.
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--line-soft)]">
                    {vehicles.map((vehicle) => {
                      const assignedDriver = vehicle.assignedDriverId ? sarthis.find((s) => s.id === vehicle.assignedDriverId) : null;
                      return (
                        <li key={vehicle.id} className="px-5 py-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="avatar-warm avatar-warm--blue">
                              <Truck className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-[var(--head)] text-sm font-semibold">{vehicle.make} {vehicle.name}</p>
                                <span className="tag-chip">{vehicle.type}</span>
                                <span className="text-muted-foreground text-xs">{vehicle.capacity} seats</span>
                              </div>
                              <p className="text-muted-foreground text-xs">{vehicle.vehicleNumber}</p>
                            </div>
                            <select
                              value={vehicle.assignedDriverId ?? ""}
                              onChange={(e) => handleAssignDriver(vehicle.id, e.target.value)}
                              className="input-warm text-xs max-w-[170px]"
                              style={{ padding: "7px 10px" }}
                            >
                              <option value="">Unassigned</option>
                              {sarthis.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            {assignedDriver && (
                              <span className="badge-pill badge--ok">
                                {assignedDriver.name.split(" ")[0]}
                              </span>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}

          {activeTab === "live_map" && <LiveMapTab />}

        </div>
      </div>

      {shareToast && (
        <AssignmentShareToast
          passenger={shareToast.passenger}
          sarthiName={shareToast.sarthiName}
          kind={shareToast.kind}
          onDismiss={() => setShareToast(null)}
        />
      )}
    </div>
  );
}

function AssignmentShareToast({
  passenger, sarthiName, kind, onDismiss,
}: {
  passenger: Passenger;
  sarthiName: string;
  kind: "assigned" | "unassigned";
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = window.setTimeout(onDismiss, 15_000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAssign = kind === "assigned";
  const eyebrowColor = isAssign ? "var(--ok)" : "var(--warn)";
  const borderColor = isAssign ? "var(--accent-line)" : "color-mix(in srgb, var(--warn) 40%, var(--surface))";
  const eyebrowLabel = isAssign ? "✓ Assigned" : "↺ Removed";
  const headline = isAssign
    ? (<><span style={{ fontWeight: 600 }}>{sarthiName}</span> → <span style={{ fontWeight: 600 }}>{passenger.name}</span></>)
    : (<><span style={{ fontWeight: 600 }}>{sarthiName}</span> removed from <span style={{ fontWeight: 600 }}>{passenger.name}</span></>);
  const subline = isAssign
    ? "Share the tracking link with the passenger:"
    : "Let the passenger know — share their link:";

  return (
    <div
      className="fixed flex items-center gap-3"
      style={{
        bottom: 24,
        right: 24,
        zIndex: 60,
        background: "var(--surface)",
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--r)",
        padding: "12px 14px 12px 16px",
        boxShadow: "var(--sh-3)",
        maxWidth: 360,
      }}
    >
      <div className="flex flex-col min-w-0">
        <div className="flex items-center gap-2" style={{ fontSize: 12, fontWeight: 600, color: eyebrowColor, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {eyebrowLabel}
        </div>
        <div className="mt-1" style={{ fontSize: 13.5, color: "var(--head)" }}>
          {headline}
        </div>
        <div className="text-muted-foreground" style={{ fontSize: 12 }}>
          {subline}
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <ShareLink
          trackingToken={passenger.trackingToken}
          passengerName={passenger.name}
          phone={passenger.phone}
          email={passenger.email}
        />
        <button
          type="button"
          className="iconbtn"
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{ width: 28, height: 28, borderRadius: 8 }}
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatDateLong(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

type Tone = "info" | "accent" | "ok" | "violet" | "warn";

const toneStyles: Record<Tone, { bg: string; color: string }> = {
  info:   { bg: "var(--info-tint)",   color: "var(--info)" },
  accent: { bg: "var(--accent-tint)", color: "var(--accent)" },
  ok:     { bg: "var(--ok-tint)",     color: "var(--ok)" },
  violet: { bg: "var(--violet-tint)", color: "var(--violet)" },
  warn:   { bg: "var(--warn-tint)",   color: "var(--warn)" },
};

function StatCard({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: string; sub: string; tone: Tone }) {
  const t = toneStyles[tone];
  return (
    <div className="stat">
      <div className="stat-ic" style={{ background: t.bg, color: t.color }}>{icon}</div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function DatePill({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="transition-all"
      style={{
        fontSize: "12.5px",
        fontWeight: 600,
        padding: "5px 11px",
        borderRadius: 999,
        border: `1px solid ${active ? "transparent" : "var(--line)"}`,
        background: active ? "var(--accent)" : "var(--surface)",
        color: active ? "#fff" : "var(--muted-foreground)",
      }}
    >
      {children}
    </button>
  );
}
