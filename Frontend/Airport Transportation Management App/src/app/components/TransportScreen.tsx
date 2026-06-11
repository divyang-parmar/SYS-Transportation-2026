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
  LayoutGrid,
  Mail,
  Loader2,
  Moon,
  Sun,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";
import { BhaktosDashboard } from "./BhaktosDashboard";
import { type FlightGroup, type Passenger } from "../data/mockData";
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

type Tab = "bhaktos" | "arrival" | "departure" | "sarthi_roster" | "vehicles";

interface Props {
  onBack: () => void;
  adminName: string;
}

export function TransportScreen({ onBack, adminName }: Props) {
  const { isDark, toggle } = useTheme();
  const [activeTab, setActiveTab] = useState<Tab>("bhaktos");
  const [arrivalAssignments, setArrivalAssignments] = useState<Record<string, string>>({});
  const [departureAssignments, setDepartureAssignments] = useState<Record<string, string>>({});
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
  const setCurrentAssignments = activeTab === "arrival" ? setArrivalAssignments : setDepartureAssignments;

  const totalPassengers = currentPassengers.reduce((s, p) => s + p.passengerCount, 0);
  const totalBookings = currentPassengers.length;
  const assignedCount = Object.keys(currentAssignments).length;

  // Unique sorted dates from current groups
  const allDates = useMemo(() => {
    const dates = [...new Set(currentGroups.map((g) => g.date))].sort();
    return dates;
  }, [currentGroups]);

  const [selectedDate, setSelectedDate] = useState<string>("all");

  const filteredGroups = useMemo(() => {
    if (selectedDate === "all") return currentGroups;
    return currentGroups.filter((g) => g.date === selectedDate);
  }, [currentGroups, selectedDate]);

  // Group filtered flights by date
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

  // Load existing assignments from MongoDB on mount
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
    if (flightType === "arrival") setArrivalAssignments((prev) => ({ ...prev, [bookingId]: sarthiId }));
    else setDepartureAssignments((prev) => ({ ...prev, [bookingId]: sarthiId }));
    fetch(`${ASSIGNMENTS_API}/${bookingId}/${flightType}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sarthi_id: sarthiId, flight_group_id: flightGroupId }),
    }).catch(() => {});
  };

  const handleUnassignSarthi = (bookingId: string, flightType: "arrival" | "departure") => {
    if (flightType === "arrival") setArrivalAssignments((prev) => { const n = { ...prev }; delete n[bookingId]; return n; });
    else setDepartureAssignments((prev) => { const n = { ...prev }; delete n[bookingId]; return n; });
    fetch(`${ASSIGNMENTS_API}/${bookingId}/${flightType}`, { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <div className="bg-card sticky top-0 z-10 flex items-center gap-3 px-8" style={{ height: "76px", borderBottom: "1px solid var(--border)", boxShadow: "rgba(0,0,0,0.1) 0px 1px 0px 0px" }}>
        <div className="flex-1">
          <h1 style={{ fontSize: "16px", fontWeight: 600, color: "#173D61", lineHeight: 1.2 }}>Transportation Admin</h1>
          <p style={{ fontSize: "13px", color: "#999999" }}>{adminName}</p>
        </div>
        <button onClick={toggle} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Toggle theme">
          {isDark ? <Sun className="w-5 h-5 text-muted-foreground" /> : <Moon className="w-5 h-5 text-muted-foreground" />}
        </button>
        <button onClick={onBack} className="p-2 rounded transition-colors hover:bg-secondary" style={{ color: "#494D52" }} title="Sign out">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="bg-card flex gap-0 overflow-x-auto scrollbar-hide px-4" style={{ borderBottom: "1px solid var(--border)" }}>
        {([
          { id: "bhaktos",       label: "Bhaktos Dashboard", icon: <LayoutGrid className="w-4 h-4" /> },
          { id: "arrival",       label: "Arrival",           icon: <PlaneLanding className="w-4 h-4" /> },
          { id: "departure",     label: "Departure",         icon: <PlaneTakeoff className="w-4 h-4" /> },
          { id: "sarthi_roster", label: "Sarthi Roster",     icon: <Users className="w-4 h-4" /> },
          { id: "vehicles",      label: "Vehicles",          icon: <Truck className="w-4 h-4" /> },
        ] as { id: Tab; label: string; icon: React.ReactNode }[]).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => { setActiveTab(id); if (id !== "sarthi_roster") setSelectedDate("all"); }}
            className="flex items-center gap-2 transition-colors flex-shrink-0 whitespace-nowrap"
            style={{
              padding: "0 20px",
              height: "48px",
              fontSize: "14px",
              fontWeight: 600,
              color: activeTab === id ? "#067BC2" : "#494D52",
              borderBottom: activeTab === id ? "3px solid #067BC2" : "3px solid transparent",
            }}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-4 py-5 space-y-5">

          {/* Bhaktos Dashboard tab */}
          {activeTab === "bhaktos" && <BhaktosDashboard />}

          {/* Flight tabs content */}
          {(activeTab === "arrival" || activeTab === "departure") && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                <SummaryCard
                  icon={<Users className="w-4 h-4 text-primary" />}
                  label={`Total ${activeTab === "arrival" ? "Arrival" : "Departure"} Bookings`}
                  value={String(totalBookings)}
                  sub={`${totalPassengers} passengers`}
                />
                <SummaryCard
                  icon={<Car className="w-4 h-4 text-blue-600" />}
                  label="Sarthis"
                  value={String(sarthis.length)}
                  sub="registered"
                />
                <SummaryCard
                  icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
                  label="Assignments Done"
                  value={`${assignedCount}/${totalBookings}`}
                  sub={assignedCount === totalBookings ? "All assigned ✓" : `${totalBookings - assignedCount} pending`}
                />
              </div>

              {/* Flight groups */}
              <section>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h2 style={{ fontSize: "0.95rem", fontWeight: 600 }} className="text-foreground">
                    {activeTab === "arrival" ? "Incoming Flights" : "Departing Flights"} — Passenger Groups
                  </h2>
                  {/* Date filter pills */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                    <button
                      onClick={() => setSelectedDate("all")}
                      className={`px-2.5 py-1 rounded-lg transition-all ${selectedDate === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                      style={{ fontSize: "0.75rem", fontWeight: 500 }}
                    >
                      All Dates
                    </button>
                    {allDates.map((d) => (
                      <button
                        key={d}
                        onClick={() => setSelectedDate(d)}
                        className={`px-2.5 py-1 rounded-lg transition-all ${selectedDate === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                        style={{ fontSize: "0.75rem", fontWeight: 500 }}
                      >
                        {formatDate(d)}
                      </button>
                    ))}
                  </div>
                </div>

                {flightGroupsLoading ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span style={{ fontSize: "0.875rem" }}>Loading flights…</span>
                  </div>
                ) : currentGroups.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                    No {activeTab === "arrival" ? "arrival" : "departure"} flights found.
                  </div>
                ) : null}

                <div className="space-y-5">
                  {!flightGroupsLoading && Object.entries(groupedByDate).sort(([a], [b]) => a.localeCompare(b)).map(([date, groups]) => {
                    const delayedCount = groups.filter((g) => g.status === "delayed").length;
                    const earlyCount = groups.filter((g) => g.status === "early").length;
                    const cancelledCount = groups.filter((g) => g.status === "cancelled").length;
                    return (
                      <div key={date}>
                        <div className="flex items-center gap-3 mb-2.5">
                          <div className="flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-primary" />
                            <span className="text-foreground" style={{ fontSize: "0.88rem", fontWeight: 700 }}>
                              {formatDateLong(date)}
                            </span>
                          </div>
                          <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>
                            {groups.length} flight{groups.length !== 1 ? "s" : ""}
                          </span>
                          {delayedCount > 0 && (
                            <span className="flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded" style={{ fontSize: "0.72rem", fontWeight: 500 }}>
                              <AlertTriangle className="w-3 h-3" />{delayedCount} delayed
                            </span>
                          )}
                          {earlyCount > 0 && (
                            <span className="flex items-center gap-1 bg-teal-100 text-teal-700 px-2 py-0.5 rounded" style={{ fontSize: "0.72rem", fontWeight: 500 }}>
                              {earlyCount} early
                            </span>
                          )}
                          {cancelledCount > 0 && (
                            <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded" style={{ fontSize: "0.72rem", fontWeight: 500 }}>
                              {cancelledCount} cancelled
                            </span>
                          )}
                          <div className="flex-1 h-px bg-border" />
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

          {/* Sarthi Roster tab content */}
          {activeTab === "sarthi_roster" && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 style={{ fontSize: "0.95rem", fontWeight: 600 }} className="text-foreground">Sarthi Roster</h2>
                <span style={{ fontSize: "0.78rem", color: "#999999" }}>
                  {sarthisLoading ? "" : `${sarthis.length} sarthi${sarthis.length !== 1 ? "s" : ""}`}
                </span>
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {sarthisLoading ? (
                  <div className="px-4 py-10 flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span style={{ fontSize: "0.875rem" }}>Loading…</span>
                  </div>
                ) : sarthis.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                    No Sarthis added yet. Add them from the Super Admin Panel.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {sarthis.map((sarthi) => {
                      const assignedVehicle = vehicles.find((v) => v.assignedDriverId === sarthi.id);
                      return (
                        <li key={sarthi.id} className="px-4 py-3 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary" style={{ fontSize: "0.85rem", fontWeight: 600 }}>{sarthi.name.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-foreground truncate" style={{ fontSize: "0.88rem", fontWeight: 500 }}>{sarthi.name}</p>
                            <div className="flex items-center gap-3 flex-wrap mt-0.5">
                              {sarthi.phone && (
                                <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                                  <Phone className="w-3 h-3" />{sarthi.phone}
                                </span>
                              )}
                              {sarthi.email && (
                                <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
                                  <Mail className="w-3 h-3" />{sarthi.email}
                                </span>
                              )}
                            </div>
                            {assignedVehicle ? (
                              <span className="text-muted-foreground flex items-center gap-1 mt-0.5" style={{ fontSize: "0.75rem" }}>
                                <Car className="w-3 h-3" />{assignedVehicle.make} {assignedVehicle.name} · {assignedVehicle.vehicleNumber} · {assignedVehicle.capacity} seats
                              </span>
                            ) : (
                              <span className="text-muted-foreground mt-0.5 block" style={{ fontSize: "0.75rem", fontStyle: "italic" }}>No vehicle assigned</span>
                            )}
                          </div>
                          <span className="px-2 py-1 rounded-md bg-green-100 text-green-700 flex-shrink-0" style={{ fontSize: "0.72rem", fontWeight: 500 }}>
                            Sarthi
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}

          {/* Vehicles tab content — read-only; add/edit/delete is managed from Super Admin Panel */}
          {activeTab === "vehicles" && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontSize: "0.95rem", fontWeight: 600 }} className="text-foreground">Fleet Vehicles</h2>
                <span style={{ fontSize: "0.78rem", color: "#999999" }}>
                  {vehiclesLoading ? "" : `${vehicles.length} vehicle${vehicles.length !== 1 ? "s" : ""}`}
                </span>
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                {vehiclesLoading ? (
                  <div className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: "0.875rem" }}>Loading vehicles…</div>
                ) : vehicles.length === 0 ? (
                  <div className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                    No vehicles added yet. Add them from the Super Admin Panel.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {vehicles.map((vehicle) => {
                      const assignedDriver = vehicle.assignedDriverId ? sarthis.find((s) => s.id === vehicle.assignedDriverId) : null;
                      return (
                        <li key={vehicle.id} className="px-4 py-4">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Truck className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-foreground" style={{ fontSize: "0.9rem", fontWeight: 600 }}>{vehicle.make} {vehicle.name}</p>
                                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded" style={{ fontSize: "0.72rem", fontWeight: 500 }}>{vehicle.type}</span>
                                <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{vehicle.capacity} seats</span>
                              </div>
                              <p className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>{vehicle.vehicleNumber}</p>
                            </div>
                            {/* Assign Sarthi */}
                            <select
                              value={vehicle.assignedDriverId ?? ""}
                              onChange={(e) => handleAssignDriver(vehicle.id, e.target.value)}
                              className="px-2 py-1 rounded-lg border border-border bg-input-background text-foreground"
                              style={{ fontSize: "0.78rem", maxWidth: "160px" }}
                            >
                              <option value="">Unassigned</option>
                              {sarthis.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                            {assignedDriver && (
                              <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded" style={{ fontSize: "0.72rem", fontWeight: 500 }}>
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

        </div>
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

function SummaryCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-muted-foreground leading-tight" style={{ fontSize: "0.72rem" }}>{label}</span></div>
      <p style={{ fontSize: "1.4rem", fontWeight: 700, lineHeight: 1 }} className="text-foreground">{value}</p>
      <p className="text-muted-foreground mt-0.5" style={{ fontSize: "0.72rem" }}>{sub}</p>
    </div>
  );
}
