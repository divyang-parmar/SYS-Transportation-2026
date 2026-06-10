import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  PlaneLanding,
  PlaneTakeoff,
  ArrowLeftRight,
  RefreshCw,
  Loader2,
  AlertCircle,
  Search,
  Luggage,
  Baby,
  ChevronDown,
  ChevronRight,
  Phone,
  MapPin,
} from "lucide-react";

const API_BASE = "http://localhost:8000";

interface Traveler {
  first_name: string;
  last_name: string;
  phone?: string;
  mandal?: string;
}

interface BhaktosRecord {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  mandal: string;
  passengers_count: number;
  passengers: Traveler[];
  bags_count: number;
  stroller_required: boolean;
  transportation_requirement: string;
  arrival_flight_name: string;
  arrival_flight_number: string;
  arrival_airport: string;
  arrival_datetime: string;
  departure_flight_name: string;
  departure_flight_number: string;
  departure_airport: string;
  departure_datetime: string;
}

interface Stats {
  total_bhaktos: number;
  arrivals_only: number;
  departures_only: number;
  arrival_and_departure_both: number;
}

const COL_COUNT = 13;

function TransportBadge({ value }: { value: string }) {
  if (value === "Arrival Only")
    return (
      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full" style={{ fontSize: "0.72rem", fontWeight: 500, whiteSpace: "nowrap" }}>
        <PlaneLanding className="w-3 h-3" /> Arrival Only
      </span>
    );
  if (value === "Departure Only")
    return (
      <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full" style={{ fontSize: "0.72rem", fontWeight: 500, whiteSpace: "nowrap" }}>
        <PlaneTakeoff className="w-3 h-3" /> Departure Only
      </span>
    );
  if (value === "Arrival and Departure Both")
    return (
      <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full" style={{ fontSize: "0.72rem", fontWeight: 500, whiteSpace: "nowrap" }}>
        <ArrowLeftRight className="w-3 h-3" /> Arr &amp; Dep Both
      </span>
    );
  return <span className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>—</span>;
}

function StatCard({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: number; sub: string; accent: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + "20" }}>
          <span style={{ color: accent }}>{icon}</span>
        </div>
        <span className="text-muted-foreground leading-tight" style={{ fontSize: "0.75rem" }}>{label}</span>
      </div>
      <p style={{ fontSize: "2rem", fontWeight: 700, lineHeight: 1, color: accent }}>{value}</p>
      <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>{sub}</p>
    </div>
  );
}

const TH = ({ children, sticky = false }: { children: React.ReactNode; sticky?: boolean }) => (
  <th
    className="text-left text-muted-foreground border-b border-border"
    style={{
      fontSize: "0.72rem",
      fontWeight: 600,
      padding: "8px 12px",
      whiteSpace: "nowrap",
      background: sticky ? "var(--muted)" : "var(--muted)",
      position: sticky ? "sticky" : undefined,
      left: sticky ? 0 : undefined,
      zIndex: sticky ? 2 : undefined,
      letterSpacing: "0.03em",
      textTransform: "uppercase",
    }}
  >
    {children}
  </th>
);

const TD = ({ children, sticky = false, center = false }: { children: React.ReactNode; sticky?: boolean; center?: boolean }) => (
  <td
    className="border-b border-border/50"
    style={{
      fontSize: "0.82rem",
      padding: "10px 12px",
      whiteSpace: "nowrap",
      position: sticky ? "sticky" : undefined,
      left: sticky ? 0 : undefined,
      background: sticky ? "var(--card)" : undefined,
      textAlign: center ? "center" : "left",
    }}
  >
    {children}
  </td>
);

function TravelersPanel({ travelers }: { travelers: Traveler[] }) {
  if (travelers.length === 0) {
    return <p className="text-muted-foreground italic" style={{ fontSize: "0.78rem" }}>No traveler details recorded.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {travelers.map((t, idx) => (
        <div
          key={idx}
          className="flex items-start gap-2.5 bg-white border border-border rounded-lg px-3 py-2.5"
          style={{ minWidth: "200px" }}
        >
          {/* Avatar */}
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-primary" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
              {(t.first_name?.[0] ?? "?").toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-foreground" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
              T{idx + 1} · {t.first_name} {t.last_name}
            </p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              {t.phone && (
                <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "0.72rem" }}>
                  <Phone className="w-3 h-3 flex-shrink-0" /> {t.phone}
                </span>
              )}
              {t.mandal && (
                <span className="flex items-center gap-1 text-muted-foreground" style={{ fontSize: "0.72rem" }}>
                  <MapPin className="w-3 h-3 flex-shrink-0" /> {t.mandal}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BhaktosDashboard() {
  const [records, setRecords] = useState<BhaktosRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/bhaktos/overview`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      setStats(data.stats);
      setRecords(data.records);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) =>
      [r.first_name, r.last_name, r.email, r.phone, r.mandal, r.transportation_requirement]
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [records, search]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#0C71C3" }} />
        <p style={{ fontSize: "0.88rem" }}>Loading Bhaktos data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-foreground" style={{ fontSize: "0.95rem", fontWeight: 600 }}>Could not load data</p>
        <p className="text-muted-foreground" style={{ fontSize: "0.82rem" }}>{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
          style={{ fontSize: "0.82rem", fontWeight: 500 }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Section title */}
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "#173D61" }}>Travelling Bhaktos Overview</h2>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-accent hover:opacity-80 transition-opacity"
          style={{ fontSize: "0.82rem", fontWeight: 500 }}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-4 h-4" />}         label="Total Bhaktos"        value={stats?.total_bhaktos ?? 0}             sub="all registered"      accent="#0C71C3" />
        <StatCard icon={<PlaneLanding className="w-4 h-4" />}  label="Total Arrivals Only"  value={stats?.arrivals_only ?? 0}             sub="arrival transport"   accent="#10B981" />
        <StatCard icon={<PlaneTakeoff className="w-4 h-4" />}  label="Total Departures Only" value={stats?.departures_only ?? 0}          sub="departure transport" accent="#F59E0B" />
        <StatCard icon={<ArrowLeftRight className="w-4 h-4" />} label="Total Arr &amp; Dep Both" value={stats?.arrival_and_departure_both ?? 0} sub="arrival + departure"  accent="#8B5CF6" />
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name, mandal, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground"
          style={{ fontSize: "0.85rem" }}
        />
      </div>

      {/* Grid table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground" style={{ fontSize: "0.875rem" }}>
            {records.length === 0 ? "No registrations yet." : "No results match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ minWidth: "1100px" }}>
              <thead>
                <tr>
                  <TH sticky>#</TH>
                  <TH sticky>Name</TH>
                  <TH>Mandal</TH>
                  <TH>Phone</TH>
                  <TH>Email</TH>
                  <TH>Travelers</TH>
                  <TH>Transport</TH>
                  <TH>Arrival Flight</TH>
                  <TH>Arrival Date/Time</TH>
                  <TH>Departure Flight</TH>
                  <TH>Departure Date/Time</TH>
                  <TH>Bags</TH>
                  <TH>Stroller</TH>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const isExpanded = expandedRows.has(r.id);
                  const hasTravelers = r.passengers && r.passengers.length > 0;
                  return (
                    <React.Fragment key={r.id}>
                      {/* Main row */}
                      <tr
                        className="hover:bg-muted/30 transition-colors"
                        style={{ cursor: hasTravelers ? "pointer" : undefined }}
                        onClick={() => hasTravelers && toggleRow(r.id)}
                      >
                        <TD sticky>
                          <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>{i + 1}</span>
                        </TD>
                        <TD sticky>
                          <p className="text-foreground" style={{ fontWeight: 600 }}>
                            {r.first_name} {r.last_name}
                          </p>
                        </TD>
                        <TD><span className="text-foreground">{r.mandal || "—"}</span></TD>
                        <TD><span className="text-foreground">{r.phone || "—"}</span></TD>
                        <TD><span className="text-muted-foreground" style={{ fontSize: "0.78rem" }}>{r.email || "—"}</span></TD>
                        <TD center>
                          {hasTravelers ? (
                            <button
                              className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2 py-0.5 hover:bg-primary/20 transition-colors"
                              style={{ fontSize: "0.75rem", fontWeight: 700 }}
                              onClick={(e) => { e.stopPropagation(); toggleRow(r.id); }}
                            >
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                              {r.passengers_count}
                            </button>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                              {r.passengers_count}
                            </span>
                          )}
                        </TD>
                        <TD><TransportBadge value={r.transportation_requirement} /></TD>
                        <TD>
                          {r.arrival_flight_name ? (
                            <div>
                              <p className="text-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>{r.arrival_flight_name}</p>
                              {r.arrival_flight_number && <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>{r.arrival_flight_number} · {r.arrival_airport}</p>}
                            </div>
                          ) : <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>—</span>}
                        </TD>
                        <TD>
                          {r.arrival_datetime
                            ? <span className="text-foreground" style={{ fontSize: "0.78rem" }}>{r.arrival_datetime}</span>
                            : <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>—</span>}
                        </TD>
                        <TD>
                          {r.departure_flight_name ? (
                            <div>
                              <p className="text-foreground" style={{ fontSize: "0.8rem", fontWeight: 500 }}>{r.departure_flight_name}</p>
                              {r.departure_flight_number && <p className="text-muted-foreground" style={{ fontSize: "0.72rem" }}>{r.departure_flight_number} · {r.departure_airport}</p>}
                            </div>
                          ) : <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>—</span>}
                        </TD>
                        <TD>
                          {r.departure_datetime
                            ? <span className="text-foreground" style={{ fontSize: "0.78rem" }}>{r.departure_datetime}</span>
                            : <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>—</span>}
                        </TD>
                        <TD center>
                          {r.bags_count > 0
                            ? <span className="inline-flex items-center gap-1 text-muted-foreground" style={{ fontSize: "0.78rem" }}><Luggage className="w-3 h-3" />{r.bags_count}</span>
                            : <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>—</span>}
                        </TD>
                        <TD center>
                          {r.stroller_required
                            ? <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded" style={{ fontSize: "0.7rem", fontWeight: 500 }}><Baby className="w-3 h-3" /> Yes</span>
                            : <span className="text-muted-foreground" style={{ fontSize: "0.75rem" }}>No</span>}
                        </TD>
                      </tr>

                      {/* Expanded traveler panel */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={COL_COUNT} style={{ padding: 0, background: "var(--secondary)" }}>
                            <div className="px-6 py-4 border-b border-border">
                              <p className="text-muted-foreground mb-3" style={{ fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                                Travelers — {r.first_name} {r.last_name}
                              </p>
                              <TravelersPanel travelers={r.passengers} />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-muted-foreground text-right" style={{ fontSize: "0.75rem" }}>
          Showing {filtered.length} of {records.length} record{records.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
