import { Router } from 'express';
import multer from 'multer';
import { Types } from 'mongoose';
import { Booking, FlightDetails } from '../models/index.js';
import { ah } from '../util/asyncHandler.js';
import { HttpError } from '../middleware/error.js';
import { validateFormId, validateToken } from '../services/validation_service.js';
import { logger } from '../logger.js';

const upload = multer();

const F_NAME = 'q83_name';
const F_EMAIL = 'q5_email';
const F_PHONE = 'q6_phoneNumber';
const F_MANDAL = 'q73_mandal';
const F_TRANSPORT = 'q86_pleaseSelect';
const F_FAMILY_COUNT = 'q95_familyCount';
const F_BAGS = 'q97_numberOf';
const F_STROLLER = 'q98_strollerRequirement';

const F_ARR_FLIGHT_NAME = 'q61_typeA61';
const F_ARR_FLIGHT_NUM = 'q99_arrivalFlight99';
const F_ARR_AIRPORT = 'q87_arrivalFlight87';
const F_ARR_OTHER = 'q77_otherArrival';
const F_ARR_DATETIME = 'q9_departingFlight9';
const F_DEP_FLIGHT_NAME = 'q62_departureFlight';
const F_DEP_FLIGHT_NUM = 'q100_departureFlight100';
const F_DEP_AIRPORT = 'q88_departureFlight88';
const F_DEP_OTHER = 'q78_otherDeparture';
const F_DEP_DATETIME = 'q55_arrivalFlight55';

const TRAVELER_GROUPS: [string, string, string, string][] = [
  ['q107_firstName', 'q108_lastName', 'q111_phoneNumber111', 'q110_mandal110'],
  ['q113_Traveler2FirstName', 'q114_lastName114', 'q115_phoneNumber115', 'q156_mandal156'],
  ['q119_firstName119', 'q120_lastName120', 'q121_phoneNumber121', 'q157_mandal157'],
  ['q124_firstName124', 'q125_lastName125', 'q126_phoneNumber126', 'q127_mandal127'],
  ['q129_firstName129', 'q130_lastName130', 'q131_phoneNumber131', 'q132_mandal132'],
  ['q134_firstName134', 'q135_lastName135', 'q136_phoneNumber136', 'q158_mandal158'],
  ['q138_firstName138', 'q139_lastName139', 'q140_phoneNumber140', 'q159_mandal159'],
  ['q142_firstName142', 'q143_lastName143', 'q144_phoneNumber144', 'q160_mandal160'],
  ['q147_firstName147', 'q148_lastName148', 'q149_phoneNumber149', 'q150_mandal150'],
  ['q152_firstName152', 'q153_lastName153', 'q154_phoneNumber154', 'q155_mandal155'],
];

function str(val: unknown): string {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    return Object.values(val as Record<string, unknown>)
      .filter((v) => v != null && v !== '')
      .map((v) => String(v))
      .join(' ')
      .trim();
  }
  if (val == null) return '';
  return String(val).trim();
}

function toInt(val: unknown, def = 0): number {
  if (val == null || val === '') return def;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? def : n;
}

function parseJotformDatetime(val: unknown): Date | null {
  if (!val || typeof val !== 'object' || Array.isArray(val)) return null;
  const v = val as Record<string, string>;
  try {
    if (v.datetime) {
      const m = v.datetime.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
      if (!m) return null;
      return new Date(
        Date.UTC(
          parseInt(m[1], 10),
          parseInt(m[2], 10) - 1,
          parseInt(m[3], 10),
          parseInt(m[4], 10),
          parseInt(m[5], 10),
          parseInt(m[6], 10)
        )
      );
    }
    const month = toInt(v.month, 1);
    const day = toInt(v.day, 1);
    const year = toInt(v.year, 2000);
    let hour = toInt(v.hour, 0);
    const minute = toInt(v.min, 0);
    const ampm = (v.ampm ?? 'AM').toUpperCase();
    if (ampm === 'PM' && hour !== 12) hour += 12;
    else if (ampm === 'AM' && hour === 12) hour = 0;
    return new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  } catch {
    return null;
  }
}

function buildPassengers(fields: Record<string, unknown>): Array<Record<string, string>> {
  const out: Array<Record<string, string>> = [];
  for (const [firstKey, lastKey, phoneKey, mandalKey] of TRAVELER_GROUPS) {
    const first = str(fields[firstKey]);
    const last = str(fields[lastKey]);
    if (!first && !last) continue;
    const p: Record<string, string> = { first_name: first, last_name: last };
    const phone = str(fields[phoneKey]);
    if (phone) p.phone = phone;
    const mandal = str(fields[mandalKey]);
    if (mandal) p.mandal = mandal;
    out.push(p);
  }
  return out;
}

function extractPhone(val: unknown): string {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const v = val as Record<string, unknown>;
    return str(v.full ?? v.phone ?? v);
  }
  return str(val);
}

function buildBookingDoc(fields: Record<string, unknown>, createdAt: Date) {
  const nameVal = fields[F_NAME];
  let firstName = '';
  let lastName = '';
  if (nameVal && typeof nameVal === 'object' && !Array.isArray(nameVal)) {
    const v = nameVal as Record<string, unknown>;
    firstName = str(v.first ?? '');
    lastName = str(v.last ?? '');
  } else {
    const parts = str(nameVal).split(/ (.+)/);
    firstName = parts[0] ?? '';
    lastName = parts[1] ?? '';
  }

  const strollerRaw = fields[F_STROLLER];
  let strollerRequired: boolean;
  if (Array.isArray(strollerRaw)) {
    strollerRequired =
      strollerRaw.length > 0 && !['', 'No', 'false'].includes(String(strollerRaw[0]));
  } else {
    strollerRequired = !['', 'no', 'false', '0', 'none'].includes(str(strollerRaw).toLowerCase());
  }

  let passengers = buildPassengers(fields);
  if (passengers.length === 0) {
    passengers = [{ first_name: firstName, last_name: lastName }];
  }

  const doc: Record<string, unknown> = {
    contact: {
      first_name: firstName,
      last_name: lastName,
      phone: extractPhone(fields[F_PHONE]),
      email: str(fields[F_EMAIL]),
      mandal: str(fields[F_MANDAL]),
    },
    passengers_count: toInt(fields[F_FAMILY_COUNT], passengers.length),
    passengers,
    stroller_required: strollerRequired,
    created_at: createdAt,
  };

  const bags = fields[F_BAGS];
  if (bags != null) doc.bags_count = toInt(bags);
  const transport = str(fields[F_TRANSPORT]);
  if (transport) doc.transportation_requirement = transport;
  return doc;
}

function buildFlightDoc(
  fields: Record<string, unknown>,
  bookingId: Types.ObjectId,
  createdAt: Date
) {
  const arrival: Record<string, unknown> = {};
  let v: string;
  if ((v = str(fields[F_ARR_FLIGHT_NAME]))) arrival.flight_name = v;
  if ((v = str(fields[F_ARR_OTHER]))) arrival.other_flight_name = v;
  if ((v = str(fields[F_ARR_FLIGHT_NUM]))) arrival.flight_number = v;
  if ((v = str(fields[F_ARR_AIRPORT]))) arrival.airport = v;
  const arrDt = parseJotformDatetime(fields[F_ARR_DATETIME]);
  if (arrDt) arrival.arrival_datetime = arrDt;

  const departure: Record<string, unknown> = {};
  if ((v = str(fields[F_DEP_FLIGHT_NAME]))) departure.flight_name = v;
  if ((v = str(fields[F_DEP_OTHER]))) departure.other_flight_name = v;
  if ((v = str(fields[F_DEP_FLIGHT_NUM]))) departure.flight_number = v;
  if ((v = str(fields[F_DEP_AIRPORT]))) departure.airport = v;
  const depDt = parseJotformDatetime(fields[F_DEP_DATETIME]);
  if (depDt) departure.departure_datetime = depDt;

  return { booking_id: bookingId, arrival, departure, created_at: createdAt };
}

export const jotformWebhookRouter = Router();

jotformWebhookRouter.post(
  '/webhook',
  upload.any(),
  ah(async (req, res) => {
    const token = (req.query.token as string | undefined) ?? undefined;
    if (!validateToken(token)) {
      throw new HttpError(403, 'Invalid or missing token');
    }

    const formData: Record<string, string> = req.body ?? {};
    const formId = formData.formID ?? '';
    if (!validateFormId(formId)) {
      logger.warn(`Rejected webhook for unexpected formID: ${formId}`);
      throw new HttpError(400, 'Unexpected form ID');
    }
    const submissionId = formData.submissionID ?? '';
    const rawRequestJson = formData.rawRequest ?? '{}';

    let fields: Record<string, unknown>;
    try {
      fields = JSON.parse(rawRequestJson);
    } catch {
      logger.warn(`Could not parse rawRequest JSON for submission ${submissionId}`);
      fields = {};
    }
    logger.info(`RAW FIELDS for ${submissionId}: ${JSON.stringify(fields)}`);

    const createdAt = new Date();
    const bookingDoc = buildBookingDoc(fields, createdAt);
    const booking = await Booking.create(bookingDoc);
    const flightDoc = buildFlightDoc(fields, booking._id as Types.ObjectId, createdAt);
    const flight = await FlightDetails.create(flightDoc);

    logger.info(
      `Submission ${submissionId} → bookings._id=${booking._id}  flight_details._id=${flight._id}`
    );

    res.json({ status: 'ok', submissionID: submissionId });
  })
);
