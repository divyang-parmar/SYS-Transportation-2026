import { useState, useEffect, type ReactNode } from "react";
import { MapPin, Phone, Users, Clock, Plane, Accessibility, CheckCircle2, Circle, LogOut, Loader2, Mail } from "lucide-react";

import { API_BASE } from "../lib/api";
const ASSIGNMENTS_API = `${API_BASE}/assignments`;
const SARTHI_API      = `${API_BASE}/sarthi`;

interface Props {
  onBack: () => void;
  driverName: string;
  driverId?: string;
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
}

interface SarthiInfo {
  id: string;
  name: string;
  phone: string;
  email: string;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

export function DriverScreen({ onBack, driverName, driverId }: Props) {
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [sarthiInfo, setSarthiInfo] = useState<SarthiInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "done">("all");

  useEffect(() => {
    if (!driverId) return;
    setLoading(true);
    Promise.allSettled([
      fetch(`${SARTHI_API}/${driverId}`).then((r) => r.ok ? r.json() : null),
      fetch(`${ASSIGNMENTS_API}/sarthi/${driverId}`).then((r) => r.json()),
    ]).then(([sarthiRes, pickupsRes]) => {
      if (sarthiRes.status === "fulfilled" && sarthiRes.value?.id) {
        setSarthiInfo(sarthiRes.value);
      }
      if (pickupsRes.status === "fulfilled" && Array.isArray(pickupsRes.value)) {
        setPickups(pickupsRes.value);
      }
    }).finally(() => setLoading(false));
  }, [driverId]);

  const toggleComplete = (id: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = pickups.filter((p) => {
    if (activeFilter === "pending") return !completedIds.has(p.bookingId);
    if (activeFilter === "done")    return completedIds.has(p.bookingId);
    return true;
  });

  const totalPassengers     = pickups.reduce((s, p) => s + p.passengerCount, 0);
  const completedPassengers = pickups.filter((p) => completedIds.has(p.bookingId)).reduce((s, p) => s + p.passengerCount, 0);
  const displayName         = sarthiInfo?.name || driverName;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <div className="bg-white sticky top-0 z-10 flex items-center gap-3 px-8" style={{ height: "76px", borderBottom: "1px solid #CCCCCC", boxShadow: "rgba(0,0,0,0.1) 0px 1px 0px 0px" }}>
        <div className="flex-1">
          <h1 style={{ fontSize: "16px", fontWeight: 600, color: "#173D61", lineHeight: 1.2 }}>My Pickup List</h1>
          <p style={{ fontSize: "13px", color: "#999999" }}>{displayName}</p>
        </div>
        <button onClick={onBack} className="p-2 rounded transition-colors hover:bg-secondary" style={{ color: "#494D52" }}>
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 py-5 space-y-4">
        {/* Sarthi info card */}
        <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-primary-foreground" style={{ fontSize: "1.1rem", fontWeight: 700 }}>
              {displayName.charAt(0)}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-foreground" style={{ fontSize: "0.95rem", fontWeight: 600 }}>{displayName}</p>
            {sarthiInfo?.phone && (
              <p className="text-muted-foreground flex items-center gap-1 mt-0.5" style={{ fontSize: "0.78rem" }}>
                <Phone className="w-3 h-3" />{sarthiInfo.phone}
              </p>
            )}
            {sarthiInfo?.email && (
              <p className="text-muted-foreground flex items-center gap-1 mt-0.5" style={{ fontSize: "0.78rem" }}>
                <Mail className="w-3 h-3" />{sarthiInfo.email}
              </p>
            )}
          </div>
          <div className="text-right">
            <p style={{ fontSize: "1.6rem", fontWeight: 700, lineHeight: 1 }} className="text-primary">
              {completedIds.size}/{pickups.length}
            </p>
            <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>pickups done</p>
            <div className="mt-1 h-1.5 w-20 bg-border rounded-full overflow-hidden ml-auto">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${pickups.length ? (completedIds.size / pickups.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <Users className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, lineHeight: 1 }} className="text-foreground">{totalPassengers}</p>
              <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>total passengers</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p style={{ fontSize: "1.3rem", fontWeight: 700, lineHeight: 1 }} className="text-foreground">{completedPassengers}</p>
              <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>passengers picked up</p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
          {(["all", "pending", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`flex-1 py-1.5 rounded-md transition-all capitalize ${activeFilter === f ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              style={{ fontSize: "0.82rem", fontWeight: activeFilter === f ? 600 : 400 }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Loading / empty states */}
        {loading && (
          <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span style={{ fontSize: "0.875rem" }}>Loading pickups…</span>
          </div>
        )}

        {!loading && !driverId && (
          <div className="text-center py-12 text-muted-foreground" style={{ fontSize: "0.875rem" }}>
            No pickup assignments yet.
          </div>
        )}

        {!loading && driverId && pickups.length === 0 && (
          <div className="text-center py-12 text-muted-foreground" style={{ fontSize: "0.875rem" }}>
            No pickups assigned to you yet.
          </div>
        )}

        {/* Pickup cards */}
        {!loading && (
          <div className="space-y-3">
            {filtered.length === 0 && pickups.length > 0 && (
              <div className="text-center py-10 text-muted-foreground" style={{ fontSize: "0.875rem" }}>
                No pickups in this category
              </div>
            )}
            {filtered.map((pickup) => {
              const done = completedIds.has(pickup.bookingId);
              const flightInfo = [
                pickup.flightNumber,
                pickup.flightType === "arrival" ? "Arr" : "Dep",
                pickup.scheduledTime,
                pickup.date ? formatDate(pickup.date) : "",
              ].filter(Boolean).join(" · ");

              return (
                <div
                  key={`${pickup.bookingId}_${pickup.flightType}`}
                  className={`bg-card border rounded-xl overflow-hidden transition-all ${done ? "border-green-200 opacity-70" : "border-border"}`}
                >
                  {/* Flight info banner */}
                  {flightInfo && (
                    <div className={`px-4 py-2 flex items-center gap-2 ${done ? "bg-green-50" : "bg-primary/5"}`}>
                      <Plane className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <span className="text-primary" style={{ fontSize: "0.78rem", fontWeight: 500 }}>{flightInfo}</span>
                      <Clock className="w-3 h-3 text-muted-foreground ml-auto flex-shrink-0" />
                    </div>
                  )}

                  <div className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        {/* Name */}
                        <div className="mb-3">
                          <p className="text-muted-foreground" style={{ fontSize: "0.7rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Name</p>
                          <p className={`${done ? "line-through text-muted-foreground" : "text-foreground"}`} style={{ fontSize: "1.05rem", fontWeight: 600 }}>{pickup.name}</p>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                          {pickup.phone && <DetailItem label="Number"     value={pickup.phone}                    icon={<Phone className="w-3.5 h-3.5" />} />}
                          {pickup.mandal && <DetailItem label="Mandal"    value={pickup.mandal}                   icon={<MapPin className="w-3.5 h-3.5" />} />}
                          <DetailItem label="Passengers" value={String(pickup.passengerCount)} icon={<Users className="w-3.5 h-3.5" />} />
                          <DetailItem label="Type"       value={pickup.flightType === "arrival" ? "Arrival" : "Departure"} icon={<Plane className="w-3.5 h-3.5" />} />
                        </div>

                        {/* Special requirements */}
                        {pickup.strollerRequired && (
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className="text-muted-foreground" style={{ fontSize: "0.73rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Special Needs:</span>
                            <span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded" style={{ fontSize: "0.75rem", fontWeight: 500 }}>
                              <Accessibility className="w-3 h-3" />Stroller
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Mark complete button */}
                      <button
                        onClick={() => toggleComplete(pickup.bookingId)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-shrink-0 ${done ? "text-green-600" : "text-muted-foreground hover:text-primary"}`}
                      >
                        {done ? <CheckCircle2 className="w-7 h-7" /> : <Circle className="w-7 h-7" />}
                        <span style={{ fontSize: "0.62rem", fontWeight: 500 }}>{done ? "Done" : "Mark"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.7rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {icon}{label}
      </p>
      <p className="text-foreground mt-0.5" style={{ fontSize: "0.85rem", fontWeight: 500 }}>{value}</p>
    </div>
  );
}
