import { Router } from 'express';
import { z } from 'zod';
import { Booking, FlightDetails, Assignment, Sarthi, Vehicle } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { ah } from '../util/asyncHandler.js';
import { logger } from '../logger.js';

type Direction = 'arrival' | 'departure';

function publicFlight(direction: Direction, fd: any): Record<string, unknown> | null {
  if (!fd) return null;
  const block = direction === 'arrival' ? fd.arrival : fd.departure;
  if (!block || Object.keys(block).length === 0) return null;
  return {
    direction,
    flight_name: block.flight_name ?? null,
    flight_number: block.flight_number ?? null,
    airport: block.airport ?? null,
    scheduled_at: block[`${direction}_datetime`] ?? null,
  };
}

function publicSarthi(s: any, v: any | null): Record<string, unknown> {
  return {
    name: s.full_name ?? '',
    phone: s.phone ?? null,
    vehicle:
      v
        ? {
            make: v.make ?? null,
            name: v.vehicle_name ?? null,
            type: v.vehicle_type ?? null,
            number_plate: v.number_plate ?? null,
            capacity: v.capacity ?? null,
          }
        : null,
    last_location:
      s.last_location && typeof s.last_location.lat === 'number'
        ? {
            lat: s.last_location.lat,
            lng: s.last_location.lng,
            recorded_at: s.last_location.recorded_at,
          }
        : null,
  };
}

export const trackRouter = Router();

trackRouter.get(
  '/:token',
  ah(async (req, res) => {
    const token = String(req.params.token ?? '').trim();
    if (!token || token.length < 16) throw new HttpError(404, 'Tracking link not found');

    const booking = (await Booking.findOne({ tracking_token: token }).lean()) as any;
    if (!booking) throw new HttpError(404, 'Tracking link not found');

    const flightDetails = (await FlightDetails.findOne({ booking_id: booking._id }).lean()) as any;
    const assignments = (await Assignment.find({ booking_id: booking._id }).lean()) as any[];

    const sarthiIds = Array.from(new Set(assignments.map((a) => String(a.sarthi_id)).filter(Boolean)));
    const sarthis = sarthiIds.length
      ? ((await Sarthi.find({ _id: { $in: sarthiIds } }).lean()) as any[])
      : [];
    const sarthiMap = new Map<string, any>(sarthis.map((s) => [String(s._id), s]));

    const vehicleIds = Array.from(
      new Set(sarthis.map((s) => s.assigned_vehicle_id).filter(Boolean).map(String))
    );
    const vehicles = vehicleIds.length
      ? ((await Vehicle.find({ _id: { $in: vehicleIds } }).lean()) as any[])
      : [];
    const vehicleMap = new Map<string, any>(vehicles.map((v) => [String(v._id), v]));

    const arrival = publicFlight('arrival', flightDetails);
    const departure = publicFlight('departure', flightDetails);

    const directions: Record<Direction, Record<string, unknown> | null> = {
      arrival: arrival ? { ...arrival, status: 'pending', sarthi: null } : null,
      departure: departure ? { ...departure, status: 'pending', sarthi: null } : null,
    };

    for (const a of assignments) {
      const dir = a.flight_type as Direction;
      if (!directions[dir]) continue;
      const s = a.sarthi_id ? sarthiMap.get(String(a.sarthi_id)) : null;
      if (s) {
        const v = s.assigned_vehicle_id ? vehicleMap.get(String(s.assigned_vehicle_id)) : null;
        const tripStatus = String(a.trip_status ?? 'pending');
        directions[dir]!.status = tripStatus === 'complete' ? 'completed' : 'assigned';
        directions[dir]!.sarthi = publicSarthi(s, v ?? null);
        directions[dir]!.assigned_at = a.assignment_datetime ?? a.assigned_at ?? a.created_at ?? null;
        directions[dir]!.completed_at = a.completed_at ?? null;
      }
    }

    res.json({
      reference: String(booking._id).slice(-6).toUpperCase(),
      contact: {
        first_name: booking.contact?.first_name ?? '',
        last_name: booking.contact?.last_name ?? '',
      },
      transportation_requirement: booking.transportation_requirement ?? null,
      passengers_count: booking.passengers_count ?? null,
      bags_count: booking.bags_count ?? 0,
      stroller_required: booking.stroller_required ?? false,
      mandal: booking.contact?.mandal ?? null,
      arrival: directions.arrival,
      departure: directions.departure,
      created_at: booking.created_at ?? null,
    });
  })
);

const FlightEditSchema = z.object({
  flight_name: z.string().trim().max(120).optional(),
  flight_number: z.string().trim().max(40).optional(),
  airport: z.string().trim().max(40).optional(),
  scheduled_at: z.string().datetime().nullable().optional(),
});

const EditSchema = z.object({
  family_count: z.number().int().min(1).max(30).optional(),
  bags_count: z.number().int().min(0).max(50).optional(),
  stroller_required: z.boolean().optional(),
  arrival: FlightEditSchema.nullable().optional(),
  departure: FlightEditSchema.nullable().optional(),
});

function applyFlightPatch(existing: any, patch: z.infer<typeof FlightEditSchema>, direction: 'arrival' | 'departure'): any {
  const out: Record<string, unknown> = { ...(existing ?? {}) };
  if (patch.flight_name !== undefined) {
    if (patch.flight_name) out.flight_name = patch.flight_name;
    else delete out.flight_name;
  }
  if (patch.flight_number !== undefined) {
    if (patch.flight_number) out.flight_number = patch.flight_number;
    else delete out.flight_number;
  }
  if (patch.airport !== undefined) {
    if (patch.airport) out.airport = patch.airport;
    else delete out.airport;
  }
  if (patch.scheduled_at !== undefined) {
    const key = `${direction}_datetime`;
    if (patch.scheduled_at) out[key] = new Date(patch.scheduled_at);
    else delete out[key];
  }
  return out;
}

trackRouter.patch(
  '/:token',
  ah(async (req, res) => {
    const token = String(req.params.token ?? '').trim();
    if (!token || token.length < 16) throw new HttpError(404, 'Tracking link not found');

    const booking = (await Booking.findOne({ tracking_token: token }).lean()) as any;
    if (!booking) throw new HttpError(404, 'Tracking link not found');

    const parsed = EditSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      throw new HttpError(422, `${first.path.join('.')}: ${first.message}`);
    }
    const edits = parsed.data;

    const bookingPatch: Record<string, unknown> = { updated_at: new Date() };
    if (edits.family_count !== undefined) bookingPatch.passengers_count = edits.family_count;
    if (edits.bags_count !== undefined) bookingPatch.bags_count = edits.bags_count;
    if (edits.stroller_required !== undefined) bookingPatch.stroller_required = edits.stroller_required;

    if (Object.keys(bookingPatch).length > 1) {
      await Booking.updateOne({ _id: booking._id }, { $set: bookingPatch });
    }

    if (edits.arrival !== undefined || edits.departure !== undefined) {
      const existing = (await FlightDetails.findOne({ booking_id: booking._id }).lean()) as any;
      const flightPatch: Record<string, unknown> = { updated_at: new Date() };
      if (edits.arrival !== undefined) {
        flightPatch.arrival = applyFlightPatch(existing?.arrival, edits.arrival ?? {}, 'arrival');
      }
      if (edits.departure !== undefined) {
        flightPatch.departure = applyFlightPatch(existing?.departure, edits.departure ?? {}, 'departure');
      }
      if (existing) {
        await FlightDetails.updateOne({ _id: existing._id }, { $set: flightPatch });
      } else {
        await FlightDetails.create({
          booking_id: booking._id,
          arrival: flightPatch.arrival ?? {},
          departure: flightPatch.departure ?? {},
          created_at: new Date(),
        });
      }
    }

    logger.info(`Tracking edit for booking ${booking._id}: ${Object.keys(edits).join(',')}`);
    res.json({ ok: true });
  })
);
