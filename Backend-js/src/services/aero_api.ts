import axios from 'axios';
import { settings } from '../config.js';
import { logger } from '../logger.js';

const BASE = 'https://aeroapi.flightaware.com/aeroapi';

function parseDt(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function addMinutes(timeStr: string, minutes: number): string {
  try {
    const [hStr, mStr] = timeStr.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    let total = (h * 60 + m + minutes) % (24 * 60);
    if (total < 0) total += 24 * 60;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  } catch {
    return timeStr;
  }
}

function mapStatus(statusRaw: string, delayMinutes: number): string {
  const s = (statusRaw || '').toLowerCase();
  if (s.includes('cancel') || s.includes('diverted')) return 'cancelled';
  if (s.includes('arrived') || s.includes('landed')) return 'landed';
  if (s.includes('departed')) return 'departed';
  if (s.includes('late') || s.includes('delay') || delayMinutes > 10) return 'delayed';
  if (delayMinutes <= -5) return 'early';
  return 'on_time';
}

function enrichFromFlight(
  flight: Record<string, unknown>,
  flightType: string,
  scheduledTime: string
) {
  let schedDt: Date | null;
  let actualDt: Date | null;
  let terminal: string;
  if (flightType === 'arrival') {
    schedDt = parseDt(flight.scheduled_in as string);
    actualDt = parseDt(flight.actual_in as string) || parseDt(flight.estimated_in as string);
    terminal = (flight.gate_destination as string) || (flight.terminal_destination as string) || '';
  } else {
    schedDt = parseDt(flight.scheduled_out as string);
    actualDt = parseDt(flight.actual_out as string) || parseDt(flight.estimated_out as string);
    terminal = (flight.gate_origin as string) || (flight.terminal_origin as string) || '';
  }

  let delayMinutes = 0;
  if (schedDt && actualDt) {
    delayMinutes = Math.floor((actualDt.getTime() - schedDt.getTime()) / 60000);
  }

  const statusRaw = (flight.status as string) || '';
  const status = mapStatus(statusRaw, delayMinutes);
  const actualTime = scheduledTime ? addMinutes(scheduledTime, delayMinutes) : '';

  return { status, actualTime, terminal: String(terminal), delayMinutes };
}

export interface FlightEnrichment {
  status: string;
  actualTime: string;
  terminal: string;
  delayMinutes: number;
}

export async function getFlightRealtime(
  flightNumber: string,
  dateStr: string,
  flightType: string,
  scheduledTime: string
): Promise<FlightEnrichment | null> {
  if (!settings.aero_api_key) return null;

  const ident = (flightNumber || '').replace(/\s+/g, '').toUpperCase();
  if (!ident) return null;

  const parts = dateStr.split('-').map((x) => parseInt(x, 10));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (isNaN(date.getTime())) return null;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.abs((date.getTime() - today.getTime()) / 86_400_000);
  if (diffDays > 7) return null;

  const endDate = new Date(date.getTime() + 86_400_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date, end: boolean) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${end ? '23:59:59' : '00:00:00'}Z`;

  const url = `${BASE}/flights/${ident}`;
  let data: { flights?: Record<string, unknown>[] };
  try {
    const resp = await axios.get(url, {
      params: { start: fmt(date, false), end: fmt(endDate, true), max_pages: 1 },
      headers: { 'x-apikey': settings.aero_api_key },
      timeout: 8_000,
      validateStatus: () => true,
    });
    if ([400, 404, 422].includes(resp.status)) {
      logger.info(`AeroAPI: no data for ${ident} on ${dateStr} (HTTP ${resp.status})`);
      return null;
    }
    if (resp.status < 200 || resp.status >= 300) {
      logger.warn(`AeroAPI error for ${ident}: HTTP ${resp.status}`);
      return null;
    }
    data = resp.data;
  } catch (exc) {
    logger.warn({ exc }, `AeroAPI error for ${ident}`);
    return null;
  }

  const flights = data.flights || [];
  if (flights.length === 0) return null;

  const target = date.getTime();
  let best = flights[0];
  let bestDiff = Infinity;
  for (const f of flights) {
    const dt =
      parseDt(f.scheduled_in as string) || parseDt(f.scheduled_out as string) || date;
    const diff = Math.abs(dt.getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = f;
    }
  }

  const result = enrichFromFlight(best, flightType, scheduledTime);
  logger.info(
    `AeroAPI ${ident} ${dateStr} → status=${result.status} delay=${result.delayMinutes} min`
  );
  return result;
}
