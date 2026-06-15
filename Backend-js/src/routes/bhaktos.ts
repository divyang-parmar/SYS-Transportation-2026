import { Router } from 'express';
import { Booking, FlightDetails } from '../models/index.js';
import { ah } from '../util/asyncHandler.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDt(val: unknown): string {
  if (!val) return '';
  if (val instanceof Date) {
    const d = val;
    const month = MONTHS[d.getUTCMonth()];
    const day = String(d.getUTCDate()).padStart(2, '0');
    const year = d.getUTCFullYear();
    let h = d.getUTCHours();
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${month} ${day}, ${year} ${String(h).padStart(2, '0')}:${m} ${ampm}`;
  }
  return String(val);
}

export const bhaktosRouter = Router();

bhaktosRouter.get(
  '/overview',
  ah(async (_req, res) => {
    const bookings = await Booking.find({}).lean();
    if (bookings.length === 0) {
      res.json({
        stats: { total_bhaktos: 0, arrivals_only: 0, departures_only: 0, arrival_and_departure_both: 0 },
        records: [],
      });
      return;
    }
    const bookingIds = bookings.map((b: any) => b._id);
    const flightDocs = await FlightDetails.find({ booking_id: { $in: bookingIds } }).lean();
    const flightMap = new Map<string, any>(flightDocs.map((fd: any) => [String(fd.booking_id), fd]));

    const records = bookings.map((b: any) => {
      const bid = String(b._id);
      const fd = flightMap.get(bid) ?? {};
      const arrival = fd.arrival ?? {};
      const departure = fd.departure ?? {};
      const contact = b.contact ?? {};
      return {
        id: bid,
        tracking_token: b.tracking_token ?? null,
        first_name: contact.first_name ?? '',
        last_name: contact.last_name ?? '',
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        mandal: contact.mandal ?? '',
        passengers_count: b.passengers_count ?? 0,
        passengers: b.passengers ?? [],
        bags_count: b.bags_count ?? 0,
        stroller_required: b.stroller_required ?? false,
        transportation_requirement: b.transportation_requirement ?? '',
        arrival_flight_name: arrival.flight_name ?? '',
        arrival_flight_number: arrival.flight_number ?? '',
        arrival_airport: arrival.airport ?? '',
        arrival_datetime: fmtDt(arrival.arrival_datetime),
        departure_flight_name: departure.flight_name ?? '',
        departure_flight_number: departure.flight_number ?? '',
        departure_airport: departure.airport ?? '',
        departure_datetime: fmtDt(departure.departure_datetime),
      };
    });

    const total = records.length;
    const arrivals_only = records.filter((r) => r.transportation_requirement === 'Arrival Only').length;
    const departures_only = records.filter((r) => r.transportation_requirement === 'Departure Only').length;
    const both = records.filter((r) => r.transportation_requirement === 'Arrival and Departure Both').length;

    res.json({
      stats: {
        total_bhaktos: total,
        arrivals_only,
        departures_only,
        arrival_and_departure_both: both,
      },
      records,
    });
  })
);
