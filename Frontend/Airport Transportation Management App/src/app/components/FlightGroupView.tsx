import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  MapPin,
  Users,
  Accessibility,
  Baby,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Ban,
  PlaneLanding,
  PlaneTakeoff,
  ChevronsUp,
} from "lucide-react";
import { type FlightGroup, type Passenger, type FlightStatus } from "../data/mockData";

export interface Sarthi {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface Vehicle {
  id: string;
  capacity: number;
  assignedDriverId?: string;
}

interface Props {
  group: FlightGroup;
  passengers: Passenger[];
  sarthis: Sarthi[];
  vehicles?: Vehicle[];
  assignments: Record<string, string>;
  onAssign: (passengerId: string, sarthiId: string) => void;
  onUnassign: (passengerId: string) => void;
}

const statusConfig: Record<FlightStatus, { label: string; color: string; icon: ReactNode }> = {
  on_time:   { label: "On Time",   color: "bg-green-100 text-green-700 border-green-200",   icon: <CheckCircle2 className="w-3 h-3" /> },
  delayed:   { label: "Delayed",   color: "bg-amber-100 text-amber-700 border-amber-200",   icon: <AlertTriangle className="w-3 h-3" /> },
  early:     { label: "Early",     color: "bg-teal-100 text-teal-700 border-teal-200",      icon: <ChevronsUp className="w-3 h-3" /> },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200",         icon: <Ban className="w-3 h-3" /> },
  landed:    { label: "Landed",    color: "bg-blue-100 text-blue-700 border-blue-200",      icon: <PlaneLanding className="w-3 h-3" /> },
  departed:  { label: "Departed",  color: "bg-purple-100 text-purple-700 border-purple-200", icon: <PlaneTakeoff className="w-3 h-3" /> },
};

function formatTimeDiff(scheduled: string, actual: string): string | null {
  const toMins = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const diff = toMins(actual) - toMins(scheduled);
  if (Math.abs(diff) < 2) return null;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diff > 0 ? `+${label}` : `-${label}`;
}

export function FlightGroupCard({ group, passengers, sarthis, vehicles, assignments, onAssign, onUnassign }: Props) {
  const [expanded, setExpanded] = useState(true);

  const totalPassengers = passengers.reduce((sum, p) => sum + p.passengerCount, 0);
  const assignedCount = passengers.filter((p) => assignments[p.id]).length;
  const status = statusConfig[group.status];
  const timeDiff = formatTimeDiff(group.scheduledTime, group.actualTime);
  const isDelayed = group.status === "delayed";
  const isEarly = group.status === "early";
  const isCancelled = group.status === "cancelled";
  const timeChanged = group.actualTime !== group.scheduledTime;

  return (
    <div className={`bg-card border rounded-xl overflow-hidden ${isCancelled ? "border-red-200 opacity-80" : "border-border"}`}>
      {/* Group header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-4 flex items-start gap-3 hover:bg-muted/20 transition-colors text-left"
      >
        {/* Time block */}
        <div className={`rounded-xl px-3 py-2 flex flex-col items-center min-w-[60px] flex-shrink-0 ${isCancelled ? "bg-red-50" : isEarly ? "bg-teal-50" : "bg-primary/8"}`}>
          <span className={`${isCancelled ? "text-red-400" : isEarly ? "text-teal-600" : "text-primary/60"}`} style={{ fontSize: "0.62rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {group.type === "arrival" ? "ARR" : "DEP"}
          </span>
          {/* Scheduled (struck through only when actual time is different) */}
          <span
            className={`${isCancelled ? "text-red-400 line-through" : (isDelayed || isEarly) && timeChanged ? "text-muted-foreground line-through" : "text-primary"}`}
            style={{ fontSize: "1rem", fontWeight: 700, lineHeight: 1.15 }}
          >
            {group.scheduledTime}
          </span>
          {/* Actual time — only show when it differs from scheduled */}
          {(isDelayed || isEarly) && timeChanged && (
            <span className={isEarly ? "text-teal-600" : "text-amber-600"} style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.15 }}>
              {group.actualTime}
            </span>
          )}
          {/* Diff badge */}
          {timeDiff && (
            <span
              className={isEarly ? "text-teal-700 bg-teal-100 rounded px-1 mt-0.5" : "text-amber-600 bg-amber-100 rounded px-1 mt-0.5"}
              style={{ fontSize: "0.62rem", fontWeight: 600 }}
            >
              {timeDiff}
            </span>
          )}
        </div>

        {/* Flight info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-foreground" style={{ fontSize: "0.92rem", fontWeight: 700 }}>{group.flightNumber}</span>
            <span className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>{group.airline}</span>
            <span className="bg-secondary text-secondary-foreground border border-border px-1.5 py-0.5 rounded" style={{ fontSize: "0.68rem", fontWeight: 600, letterSpacing: "0.04em" }}>
              {group.terminal}
            </span>
            <span className={`flex items-center gap-1 border px-1.5 py-0.5 rounded ${status.color}`} style={{ fontSize: "0.68rem", fontWeight: 600 }}>
              {status.icon}{status.label}
            </span>
          </div>

          {/* Origin / Destination */}
          <div className="flex items-center gap-1.5 mt-0.5">
            {group.type === "arrival" && group.origin && (
              <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.78rem" }}>
                <PlaneLanding className="w-3.5 h-3.5 flex-shrink-0" />
                From: <span className="text-foreground font-medium">{group.origin}</span>
              </span>
            )}
            {group.type === "departure" && group.destination && (
              <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.78rem" }}>
                <PlaneTakeoff className="w-3.5 h-3.5 flex-shrink-0" />
                To: <span className="text-foreground font-medium">{group.destination}</span>
              </span>
            )}
          </div>

          {/* Scheduled vs Actual row */}
          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
              <Clock className="w-3 h-3" />
              Scheduled: <span className="text-foreground font-medium">{group.scheduledTime}</span>
            </span>
            <span className={`flex items-center gap-1 ${isDelayed ? "text-amber-600 font-semibold" : isEarly ? "text-teal-600 font-semibold" : "text-muted-foreground"}`} style={{ fontSize: "0.75rem" }}>
              <Clock className="w-3 h-3" />
              Actual: <span className={`font-medium ${isDelayed ? "text-amber-700" : isEarly ? "text-teal-700" : "text-foreground"}`}>{isCancelled ? "—" : group.actualTime}</span>
              {timeDiff && <span className={isEarly ? "text-teal-600" : "text-amber-600"}>({timeDiff} {isEarly ? "early" : "delay"})</span>}
            </span>
          </div>

          {/* Pax summary */}
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.75rem" }}>
              <Users className="w-3.5 h-3.5" />
              {totalPassengers} passengers · {passengers.length} bookings
            </span>
            <span
              className={`flex items-center gap-1 ${assignedCount === passengers.length && passengers.length > 0 ? "text-green-600" : "text-amber-600"}`}
              style={{ fontSize: "0.75rem" }}
            >
              {assignedCount === passengers.length && passengers.length > 0
                ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <XCircle className="w-3.5 h-3.5" />}
              {assignedCount}/{passengers.length} Sarthis assigned
            </span>
          </div>
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
      </button>

      {/* Passenger rows */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border/60">
          {passengers.length === 0 ? (
            <p className="px-4 py-4 text-muted-foreground text-sm">No passengers registered for this flight.</p>
          ) : (
            passengers.map((p) => (
              <PassengerRow
                key={p.id}
                passenger={p}
                sarthis={sarthis}
                vehicles={vehicles}
                assignedSarthiId={assignments[p.id]}
                onAssign={(sarthiId) => onAssign(p.id, sarthiId)}
                onUnassign={() => onUnassign(p.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function PassengerRow({
  passenger,
  sarthis,
  vehicles,
  assignedSarthiId,
  onAssign,
  onUnassign,
}: {
  passenger: Passenger;
  sarthis: Sarthi[];
  vehicles?: Vehicle[];
  assignedSarthiId?: string;
  onAssign: (sarthiId: string) => void;
  onUnassign: () => void;
}) {
  const assignedSarthi = sarthis.find((s) => s.id === assignedSarthiId);

  return (
    <div className={`px-4 py-3 ${assignedSarthiId ? "bg-green-50/40" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-foreground" style={{ fontSize: "0.88rem", fontWeight: 600 }}>{passenger.name}</span>
            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded ${passenger.passengerCount > 1 ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"}`} style={{ fontSize: "0.72rem", fontWeight: 500 }}>
              <Users className="w-3 h-3" />{passenger.passengerCount}
            </span>
            {passenger.wheelchairRequired && (
              <span className="flex items-center gap-0.5 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded" style={{ fontSize: "0.72rem", fontWeight: 500 }}>
                <Accessibility className="w-3 h-3" />Stroller
              </span>
            )}
            {passenger.carSeatRequired && (
              <span className="flex items-center gap-0.5 bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded" style={{ fontSize: "0.72rem", fontWeight: 500 }}>
                <Baby className="w-3 h-3" />Car Seat
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {passenger.phone && (
              <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.78rem" }}>
                <Phone className="w-3 h-3" />{passenger.phone}
              </span>
            )}
            {passenger.mandal && (
              <span className="text-muted-foreground flex items-center gap-1" style={{ fontSize: "0.78rem" }}>
                <MapPin className="w-3 h-3" />{passenger.mandal}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2">
            {assignedSarthi ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-green-100 text-green-800 px-2.5 py-1 rounded-lg" style={{ fontSize: "0.78rem", fontWeight: 500 }}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {assignedSarthi.name}
                  {assignedSarthi.phone && (
                    <span className="text-green-700/80"> · {assignedSarthi.phone}</span>
                  )}
                </div>
                <button onClick={onUnassign} className="text-muted-foreground hover:text-destructive transition-colors" style={{ fontSize: "0.75rem" }}>
                  Remove
                </button>
              </div>
            ) : (
              <select
                defaultValue=""
                onChange={(e) => e.target.value && onAssign(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-border bg-input-background text-foreground"
                style={{ fontSize: "0.8rem" }}
              >
                <option value="" disabled>Assign Sarthi…</option>
                {sarthis.map((s) => {
                  const vehicle = vehicles?.find((v) => v.assignedDriverId === s.id);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name}{vehicle ? ` · ${vehicle.capacity}-seater` : ""}
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
