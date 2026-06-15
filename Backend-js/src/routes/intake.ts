import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { Booking, FlightDetails } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { ah } from '../util/asyncHandler.js';
import { logger } from '../logger.js';
import { sendTrackingLinkEmail } from '../services/email_service.js';
import { notify, DEFAULT_INTAKE_CONFIRMATION_SMS_BODY, renderTemplate } from '../services/sms_service.js';
import { settings } from '../config.js';

const ContactSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().email().max(160),
  phone: z.string().trim().min(7).max(32),
  mandal: z.string().trim().min(1).max(120),
});

const TravelerSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().max(80).default(''),
  phone: z.string().trim().max(32).default(''),
  mandal: z.string().trim().max(120).default(''),
});

const FlightSchema = z.object({
  flight_name: z.string().trim().max(120).default(''),
  other_flight_name: z.string().trim().max(120).default(''),
  flight_number: z.string().trim().max(40).default(''),
  airport: z.string().trim().max(40).default(''),
  scheduled_at: z.string().datetime().nullable().optional(),
});

const IntakeSchema = z.object({
  submission_id: z.string().max(120).optional(),
  contact: ContactSchema,
  transportation_requirement: z.string().trim().min(1).max(80),
  family_count: z.number().int().min(1).max(30),
  bags_count: z.number().int().min(0).max(50).default(0),
  stroller_required: z.boolean().default(false),
  travelers: z.array(TravelerSchema).max(10).default([]),
  arrival: FlightSchema.nullable().optional(),
  departure: FlightSchema.nullable().optional(),
});

type FlightInput = z.infer<typeof FlightSchema>;

function flightDoc(f: FlightInput | null | undefined, direction: 'arrival' | 'departure'): Record<string, unknown> {
  if (!f) return {};
  const out: Record<string, unknown> = {};
  if (f.flight_name) out.flight_name = f.flight_name;
  if (f.other_flight_name) out.other_flight_name = f.other_flight_name;
  if (f.flight_number) out.flight_number = f.flight_number;
  if (f.airport) out.airport = f.airport;
  if (f.scheduled_at) out[`${direction}_datetime`] = new Date(f.scheduled_at);
  return out;
}

export const intakeRouter = Router();

intakeRouter.post(
  '/submit',
  ah(async (req, res) => {
    const parsed = IntakeSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      throw new HttpError(422, `${first.path.join('.')}: ${first.message}`);
    }
    const payload = parsed.data;
    const createdAt = new Date();

    if (payload.submission_id) {
      const existing = await Booking.findOne({ submission_id: payload.submission_id }).lean();
      if (existing) {
        logger.info(`Idempotent intake replay for submission_id=${payload.submission_id}`);
        res.json({
          booking_id: String((existing as any)._id),
          tracking_token: (existing as any).tracking_token ?? null,
          duplicate: true,
        });
        return;
      }
    }

    const contactMandal = payload.contact.mandal;
    const passengers =
      payload.travelers.length > 0
        ? payload.travelers.map((t) => ({
            first_name: t.first_name,
            last_name: t.last_name,
            mandal: t.mandal || contactMandal,
            ...(t.phone ? { phone: t.phone } : {}),
          }))
        : [
            {
              first_name: payload.contact.first_name,
              last_name: payload.contact.last_name,
              mandal: contactMandal,
            },
          ];

    const trackingToken = randomUUID();
    const bookingDoc: Record<string, unknown> = {
      contact: payload.contact,
      passengers_count: payload.family_count,
      passengers,
      stroller_required: payload.stroller_required,
      bags_count: payload.bags_count,
      transportation_requirement: payload.transportation_requirement,
      source: 'intake_form',
      tracking_token: trackingToken,
      created_at: createdAt,
    };
    if (payload.submission_id) bookingDoc.submission_id = payload.submission_id;

    let booking;
    try {
      booking = await Booking.create(bookingDoc);
    } catch (err) {
      logger.error({ err }, 'Failed to insert booking');
      throw new HttpError(500, `Booking insert failed: ${(err as Error).message}`);
    }

    const flightDocBody = {
      booking_id: booking._id,
      arrival: flightDoc(payload.arrival, 'arrival'),
      departure: flightDoc(payload.departure, 'departure'),
      created_at: createdAt,
    };

    try {
      await FlightDetails.create(flightDocBody);
    } catch (err) {
      logger.error({ err }, 'Failed to insert flight_details, rolling back booking');
      await Booking.deleteOne({ _id: booking._id });
      throw new HttpError(500, `Flight details insert failed: ${(err as Error).message}`);
    }

    logger.info(`Intake submitted: booking_id=${booking._id} email=${payload.contact.email}`);

    void (async () => {
      try {
        const base = settings.app_url || '';
        if (!base) return;
        const trackingUrl = `${base.replace(/\/+$/, '')}/track/${trackingToken}`;
        const reference = String(booking._id).slice(-6).toUpperCase();
        const fullName = `${payload.contact.first_name} ${payload.contact.last_name}`.trim();
        const waBody = renderTemplate(DEFAULT_INTAKE_CONFIRMATION_SMS_BODY, {
          passenger_name: payload.contact.first_name,
          tracking_url: trackingUrl,
          reference,
        });
        let delivered = false;
        if (payload.contact.phone) {
          const result = await notify(payload.contact.phone, waBody);
          delivered = result.whatsapp;
        }
        if (!delivered && payload.contact.email) {
          await sendTrackingLinkEmail(payload.contact.email, fullName, trackingUrl, reference);
        }
      } catch (err) {
        logger.warn({ err }, 'Failed to fire-and-forget tracking confirmation');
      }
    })();

    res.json({
      booking_id: String(booking._id),
      tracking_token: trackingToken,
      duplicate: false,
    });
  })
);
