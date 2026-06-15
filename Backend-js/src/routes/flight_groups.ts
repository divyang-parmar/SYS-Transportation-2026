import { Router } from 'express';
import { Booking, FlightDetails } from '../models/index.js';
import { ah } from '../util/asyncHandler.js';
import { getFlightRealtime } from '../services/aero_api.js';

function dateStr(dt: unknown): string {
  if (dt instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }
  return '';
}

function timeStr(dt: unknown): string {
  if (dt instanceof Date) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
  }
  return '';
}

function groupId(flightType: string, flightKey: string, date: string): string {
  const safe = flightKey.replace(/[^a-zA-Z0-9]/g, '');
  const safeDate = date.replace(/-/g, '') || 'nodate';
  return `${flightType}_${safe}_${safeDate}`;
}

interface Group {
  id: string;
  flightNumber: string;
  airline: string;
  scheduledTime: string;
  actualTime: string;
  date: string;
  terminal: string;
  type: string;
  status: string;
  origin: string | null;
  destination: string | null;
  passengerIds: string[];
}

function buildGroups(bookings: any[], flightMap: Map<string, any>, flightType: 'arrival' | 'departure') {
  const groups = new Map<string, Group>();
  const passengers: any[] = [];

  for (const booking of bookings) {
    const bid = String(booking._id);
    const fd = flightMap.get(bid) ?? {};
    const section = fd[flightType] ?? {};

    const flightNum = String(section.flight_number ?? '').trim();
    const flightName = String(section.flight_name ?? '').trim();
    if (!flightNum && !flightName) continue;

    const dtKey = `${flightType}_datetime`;
    const dtVal = section[dtKey];
    const date = dateStr(dtVal);
    const time = timeStr(dtVal);
    const flightKey = flightNum || flightName;
    const gid = groupId(flightType, flightKey, date);

    if (!groups.has(gid)) {
      const airport = String(section.airport ?? '').trim();
      groups.set(gid, {
        id: gid,
        flightNumber: flightNum || flightName,
        airline: flightName || flightNum,
        scheduledTime: time,
        actualTime: time,
        date,
        terminal: '',
        type: flightType,
        status: 'on_time',
        origin: flightType === 'arrival' ? airport : null,
        destination: flightType === 'departure' ? airport : null,
        passengerIds: [],
      });
    }
    groups.get(gid)!.passengerIds.push(bid);

    const contact = booking.contact ?? {};
    const fullName =
      `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Unknown';
    passengers.push({
      id: bid,
      name: fullName,
      phone: contact.phone ?? '',
      email: contact.email ?? '',
      mandal: contact.mandal ?? '',
      passengerCount: booking.passengers_count ?? 1,
      destination: '',
      wheelchairRequired: Boolean(booking.stroller_required),
      carSeatRequired: false,
      flightGroup: gid,
      trackingToken: booking.tracking_token ?? null,
    });
  }

  return { groups: [...groups.values()], passengers };
}

async function loadData() {
  const bookings = await Booking.find({}).lean();
  if (bookings.length === 0) return { bookings: [], flightMap: new Map<string, any>() };
  const bookingIds = bookings.map((b: any) => b._id);
  const flightDocs = await FlightDetails.find({ booking_id: { $in: bookingIds } }).lean();
  const flightMap = new Map<string, any>(flightDocs.map((fd: any) => [String(fd.booking_id), fd]));
  return { bookings, flightMap };
}

async function enrichWithRealtime(groups: Group[], flightType: string): Promise<void> {
  if (groups.length === 0) return;
  const results = await Promise.all(
    groups.map((g) =>
      getFlightRealtime(g.flightNumber, g.date, flightType, g.scheduledTime).catch(() => null)
    )
  );
  for (let i = 0; i < groups.length; i++) {
    const result = results[i];
    if (!result) continue;
    groups[i].status = result.status;
    if (result.actualTime) groups[i].actualTime = result.actualTime;
    if (result.terminal) groups[i].terminal = result.terminal;
  }
}

export const flightGroupsRouter = Router();

flightGroupsRouter.get(
  '/arrivals',
  ah(async (_req, res) => {
    const { bookings, flightMap } = await loadData();
    if (bookings.length === 0) {
      res.json({ groups: [], passengers: [] });
      return;
    }
    const { groups, passengers } = buildGroups(bookings, flightMap, 'arrival');
    groups.sort((a, b) => (a.date + a.scheduledTime).localeCompare(b.date + b.scheduledTime));
    await enrichWithRealtime(groups, 'arrival');
    res.json({ groups, passengers });
  })
);

flightGroupsRouter.get(
  '/departures',
  ah(async (_req, res) => {
    const { bookings, flightMap } = await loadData();
    if (bookings.length === 0) {
      res.json({ groups: [], passengers: [] });
      return;
    }
    const { groups, passengers } = buildGroups(bookings, flightMap, 'departure');
    groups.sort((a, b) => (a.date + a.scheduledTime).localeCompare(b.date + b.scheduledTime));
    await enrichWithRealtime(groups, 'departure');
    res.json({ groups, passengers });
  })
);
