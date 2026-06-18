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
import { ShareLink } from "./ShareLink";

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
  vehicleAssignments?: Record<string, string | null>;
  onAssign: (passengerId: string, sarthiId: string) => void;
  onUnassign: (passengerId: string) => void;
  onAssignVehicle?: (passengerId: string, vehicleId: string | null) => void;
}

const statusConfig: Record<FlightStatus, { label: string; badge: string; icon: ReactNode }> = {
  on_time:   { label: "On Time",   badge: "badge--ok",     icon: <CheckCircle2 className="w-3 h-3" /> },
  delayed:   { label: "Delayed",   badge: "badge--warn",   icon: <AlertTriangle className="w-3 h-3" /> },
  early:     { label: "Early",     badge: "badge--info",   icon: <ChevronsUp className="w-3 h-3" /> },
  cancelled: { label: "Cancelled", badge: "badge--danger", icon: <Ban className="w-3 h-3" /> },
  landed:    { label: "Landed",    badge: "badge--info",   icon: <PlaneLanding className="w-3 h-3" /> },
  departed:  { label: "Departed",  badge: "badge--violet", icon: <PlaneTakeoff className="w-3 h-3" /> },
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

export function FlightGroupCard({ group, passengers, sarthis, vehicles, assignments, vehicleAssignments, onAssign, onUnassign, onAssignVehicle }: Props) {
  const [expanded, setExpanded] = useState(true);

  const totalPassengers = passengers.reduce((sum, p) => sum + p.passengerCount, 0);
  const assignedCount = passengers.filter((p) => assignments[p.id]).length;
  const status = statusConfig[group.status];
  const timeDiff = formatTimeDiff(group.scheduledTime, group.actualTime);
  const isDelayed = group.status === "delayed";
  const isEarly = group.status === "early";
  const isCancelled = group.status === "cancelled";
  const timeChanged = group.actualTime !== group.scheduledTime;

  // Time block tint by status
  const timeBlockBg = isCancelled ? "var(--danger-tint)"
    : isDelayed ? "var(--warn-tint)"
    : isEarly ? "var(--info-tint)"
    : "var(--accent-tint)";

  return (
    <div
      className="card-warm overflow-hidden"
      style={isCancelled ? { borderColor: "var(--danger)", opacity: 0.85 } : undefined}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-4 flex items-start gap-3 hover:bg-[var(--surface-2)] transition-colors text-left"
      >
        {/* Time block */}
        <div
          className="flex flex-col items-center flex-shrink-0"
          style={{ width: 66, background: timeBlockBg, borderRadius: 9, padding: "8px 6px" }}
        >
          <span
            className="text-muted-foreground"
            style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.07em" }}
          >
            {group.type === "arrival" ? "ARR" : "DEP"}
          </span>
          <span
            style={{
              fontSize: 17,
              fontWeight: 700,
              lineHeight: 1.15,
              color: timeChanged && (isDelayed || isEarly) ? "var(--muted-foreground)" : "var(--head)",
              textDecoration: (isCancelled || (timeChanged && (isDelayed || isEarly))) ? "line-through" : "none",
            }}
          >
            {group.scheduledTime}
          </span>
          {(isDelayed || isEarly) && timeChanged && (
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                lineHeight: 1.15,
                color: isEarly ? "var(--info)" : "var(--warn)",
              }}
            >
              {group.actualTime}
            </span>
          )}
          {timeDiff && (
            <span
              className={`badge-pill ${isEarly ? "badge--info" : "badge--warn"} mt-0.5`}
              style={{ fontSize: 10, padding: "1px 6px" }}
            >
              {timeDiff}
            </span>
          )}
        </div>

        {/* Flight info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[var(--head)] text-[15px] font-bold">{group.flightNumber}</span>
            <span className="text-muted-foreground text-[13px]">{group.airline}</span>
            <span className="tag-chip">{group.terminal}</span>
            <span className={`badge-pill ${status.badge}`}>
              {status.icon}{status.label}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-1">
            {group.type === "arrival" && group.origin && (
              <span className="text-muted-foreground flex items-center gap-1 text-[12.5px]">
                <PlaneLanding className="w-3.5 h-3.5 flex-shrink-0" />
                From: <span className="text-[var(--head)] font-medium">{group.origin}</span>
              </span>
            )}
            {group.type === "departure" && group.destination && (
              <span className="text-muted-foreground flex items-center gap-1 text-[12.5px]">
                <PlaneTakeoff className="w-3.5 h-3.5 flex-shrink-0" />
                To: <span className="text-[var(--head)] font-medium">{group.destination}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 mt-1.5 flex-wrap">
            <span className="text-muted-foreground flex items-center gap-1 text-[12px]">
              <Clock className="w-3 h-3" />
              Scheduled: <span className="text-[var(--head)] font-medium">{group.scheduledTime}</span>
            </span>
            <span
              className="flex items-center gap-1 text-[12px]"
              style={{ color: isDelayed ? "var(--warn)" : isEarly ? "var(--info)" : "var(--muted-foreground)" }}
            >
              <Clock className="w-3 h-3" />
              Actual: <span className="font-medium">{isCancelled ? "—" : group.actualTime}</span>
              {timeDiff && <span>({timeDiff} {isEarly ? "early" : "delay"})</span>}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-muted-foreground flex items-center gap-1 text-[12px]">
              <Users className="w-3.5 h-3.5" />
              {totalPassengers} passengers · {passengers.length} bookings
            </span>
            <span
              className="flex items-center gap-1 text-[12px] font-semibold"
              style={{
                color: assignedCount === passengers.length && passengers.length > 0
                  ? "var(--ok)"
                  : "var(--warn)",
              }}
            >
              {assignedCount === passengers.length && passengers.length > 0
                ? <CheckCircle2 className="w-3.5 h-3.5" />
                : <XCircle className="w-3.5 h-3.5" />}
              {assignedCount}/{passengers.length} Sarthis assigned
            </span>
          </div>
        </div>

        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
      </button>

      {expanded && (
        <div className="border-t border-[var(--line)] divide-y divide-[var(--line-soft)]">
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
                assignedVehicleId={vehicleAssignments?.[p.id] ?? null}
                onAssign={(sarthiId) => onAssign(p.id, sarthiId)}
                onUnassign={() => onUnassign(p.id)}
                onAssignVehicle={onAssignVehicle ? (vid) => onAssignVehicle(p.id, vid) : undefined}
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
  assignedVehicleId,
  onAssign,
  onUnassign,
  onAssignVehicle,
}: {
  passenger: Passenger;
  sarthis: Sarthi[];
  vehicles?: Vehicle[];
  assignedSarthiId?: string;
  assignedVehicleId?: string | null;
  onAssign: (sarthiId: string) => void;
  onUnassign: () => void;
  onAssignVehicle?: (vehicleId: string | null) => void;
}) {
  const assignedSarthi = sarthis.find((s) => s.id === assignedSarthiId);
  const sarthiOwnedVehicle = vehicles?.find((v) => v.assignedDriverId === assignedSarthiId);
  const effectiveVehicleId = assignedVehicleId ?? sarthiOwnedVehicle?.id ?? "";
  const assignedVehicle = vehicles?.find((v) => v.id === effectiveVehicleId);

  return (
    <div
      className="px-4 py-3"
      style={assignedSarthiId ? { background: "var(--ok-tint)" } : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="avatar-warm avatar-warm--blue" style={{ width: 32, height: 32 }}>
          <User className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[var(--head)] text-[14px] font-semibold">{passenger.name}</span>
            <span className={`badge-pill ${passenger.passengerCount > 1 ? "badge--info" : "badge--neutral"}`}>
              <Users className="w-3 h-3" />{passenger.passengerCount}
            </span>
            {passenger.wheelchairRequired && (
              <span className="badge-pill badge--accent">
                <Accessibility className="w-3 h-3" />Stroller
              </span>
            )}
            {passenger.carSeatRequired && (
              <span className="badge-pill badge--violet">
                <Baby className="w-3 h-3" />Car Seat
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {passenger.phone && (
              <span className="text-muted-foreground flex items-center gap-1 text-[12.5px]">
                <Phone className="w-3 h-3" />{passenger.phone}
              </span>
            )}
            {passenger.mandal && (
              <span className="text-muted-foreground flex items-center gap-1 text-[12.5px]">
                <MapPin className="w-3 h-3" />{passenger.mandal}
              </span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {assignedSarthi ? (
              <>
                <span className="badge-pill badge--ok">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {assignedSarthi.name}
                  {assignedSarthi.phone && (
                    <span style={{ opacity: 0.75 }}> · {assignedSarthi.phone}</span>
                  )}
                </span>
                {onAssignVehicle && vehicles && vehicles.length > 0 && (
                  <select
                    value={effectiveVehicleId}
                    onChange={(e) => onAssignVehicle(e.target.value || null)}
                    className="input-warm"
                    style={{ fontSize: 12, padding: "5px 8px", width: "auto" }}
                    title={assignedVehicle ? `Driving ${assignedVehicle.make} ${assignedVehicle.name}` : "Pick a vehicle for this trip"}
                  >
                    <option value="">No vehicle</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.make} {v.name} · {v.vehicleNumber} ({v.capacity})
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={onUnassign}
                  className="text-muted-foreground hover:text-[var(--danger)] transition-colors text-[12px]"
                >
                  Remove
                </button>
              </>
            ) : (
              <select
                defaultValue=""
                onChange={(e) => e.target.value && onAssign(e.target.value)}
                className="input-warm"
                style={{ fontSize: 13, padding: "7px 10px", width: "auto" }}
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
        <div className="flex-shrink-0">
          <ShareLink
            trackingToken={passenger.trackingToken}
            passengerName={passenger.name}
            phone={passenger.phone}
            email={passenger.email}
          />
        </div>
      </div>
    </div>
  );
}
