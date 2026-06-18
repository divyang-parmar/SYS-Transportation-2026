import { Router } from 'express';
import { Types } from 'mongoose';
import { Assignment, Booking, FlightDetails, Sarthi, Template, Vehicle } from '../models/index.js';
import { ah } from '../util/asyncHandler.js';
import { HttpError } from '../middleware/error.js';
import { toOid } from '../util/oid.js';
import {
  DEFAULT_SARTHI_ASSIGNED_BODY,
  DEFAULT_PICKUP_COMPLETE_BODY,
  renderTemplate,
  notify,
} from '../services/sms_service.js';
import {
  DEFAULT_SARTHI_ASSIGNED_EMAIL_BODY,
  DEFAULT_SARTHI_ASSIGNED_EMAIL_SUBJECT,
  DEFAULT_PICKUP_COMPLETE_EMAIL_BODY,
  DEFAULT_PICKUP_COMPLETE_EMAIL_SUBJECT,
  sendAssignmentEmail,
} from '../services/email_service.js';
import { logger } from '../logger.js';
import { requireRole } from '../middleware/auth.js';

const adminOnly = requireRole('super_admin', 'transportation_admin');
import { settings } from '../config.js';

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

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function pickupDate(dt: Date): string {
  return `${WEEKDAYS[dt.getUTCDay()]}, ${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}

export const assignmentsRouter = Router();

assignmentsRouter.get(
  '/',
  ah(async (_req, res) => {
    const docs = await Assignment.find({}).lean();
    res.json(
      docs.map((d: any) => ({
        bookingId: String(d.booking_id),
        sarthiId: String(d.sarthi_id),
        flightType: d.flight_type ?? '',
        flightGroupId: d.flight_group_id ?? '',
        vehicleId: d.vehicle_id ? String(d.vehicle_id) : null,
      }))
    );
  })
);

assignmentsRouter.get(
  '/sarthi/:sarthiId',
  ah(async (req, res) => {
    if (!Types.ObjectId.isValid(req.params.sarthiId)) {
      throw new HttpError(400, 'Invalid sarthi_id');
    }
    const sarthiOid = new Types.ObjectId(req.params.sarthiId);
    const assignments = await Assignment.find({ sarthi_id: sarthiOid }).lean();
    if (assignments.length === 0) {
      res.json([]);
      return;
    }
    const oidList: Types.ObjectId[] = [];
    for (const a of assignments) {
      const raw = (a as any).booking_id;
      if (raw instanceof Types.ObjectId) oidList.push(raw);
      else if (Types.ObjectId.isValid(String(raw))) oidList.push(new Types.ObjectId(String(raw)));
    }
    const bookings = await Booking.find({ _id: { $in: oidList } }).lean();
    const bookingMap = new Map<string, any>(bookings.map((b: any) => [String(b._id), b]));
    const flightDocs = await FlightDetails.find({ booking_id: { $in: oidList } }).lean();
    const flightMap = new Map<string, any>(flightDocs.map((fd: any) => [String(fd.booking_id), fd]));

    const vehicleOidSet = new Set<string>();
    for (const a of assignments as any[]) {
      if (a.vehicle_id) vehicleOidSet.add(String(a.vehicle_id));
    }
    const sarthiOwnedVehicle = await Vehicle.findOne({ assigned_driver_id: sarthiOid }).lean<any>();
    const tripVehicles = vehicleOidSet.size
      ? await Vehicle.find({ _id: { $in: [...vehicleOidSet].map((id) => new Types.ObjectId(id)) } }).lean<any[]>()
      : [];
    const vehicleMap = new Map<string, any>(tripVehicles.map((v: any) => [String(v._id), v]));

    const result = assignments.map((a: any) => {
      const bid = String(a.booking_id);
      const booking = bookingMap.get(bid) ?? {};
      const fd = flightMap.get(bid) ?? {};
      const flightType: string = a.flight_type ?? 'arrival';
      const section = fd[flightType] ?? {};
      const dtVal = section[`${flightType}_datetime`];
      const contact = booking.contact ?? {};
      const name = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Unknown';

      const tripVehicle = a.vehicle_id ? vehicleMap.get(String(a.vehicle_id)) : sarthiOwnedVehicle;
      const vehicle = tripVehicle
        ? {
            id: String(tripVehicle._id),
            make: tripVehicle.make ?? '',
            name: tripVehicle.vehicle_name ?? '',
            vehicleNumber: tripVehicle.number_plate ?? '',
            type: tripVehicle.vehicle_type ?? 'SUV',
            capacity: tripVehicle.capacity ?? 7,
            ownership: tripVehicle.ownership ?? 'rented',
          }
        : null;

      return {
        bookingId: bid,
        flightType,
        flightGroupId: a.flight_group_id ?? '',
        name,
        phone: contact.phone ?? '',
        mandal: contact.mandal ?? '',
        passengerCount: booking.passengers_count ?? 1,
        strollerRequired: Boolean(booking.stroller_required),
        flightNumber: String(section.flight_number ?? section.flight_name ?? '').trim(),
        airline: String(section.flight_name ?? '').trim(),
        scheduledTime: timeStr(dtVal),
        date: dateStr(dtVal),
        tripStatus: String(a.trip_status ?? 'pending'),
        vehicle,
      };
    });

    result.sort((a, b) => (a.date + a.scheduledTime).localeCompare(b.date + b.scheduledTime));
    res.json(result);
  })
);

async function sendAssignmentNotification(
  bookingOid: Types.ObjectId,
  sarthiOid: Types.ObjectId,
  flightType: string
): Promise<void> {
  try {
    const [booking, sarthiDoc, templateDoc, assignmentDoc, emailTemplateDoc] = await Promise.all([
      Booking.findOne({ _id: bookingOid }).lean<any>(),
      Sarthi.findOne({ _id: sarthiOid }).lean<any>(),
      Template.findOne({ _id: 'sms-sarthi-assigned' }).lean<any>(),
      Assignment.findOne({ booking_id: bookingOid, flight_type: flightType }).lean<any>(),
      Template.findOne({ _id: 'email-sarthi-assigned' }).lean<any>(),
    ]);
    const vehicleDoc = assignmentDoc?.vehicle_id
      ? await Vehicle.findOne({ _id: assignmentDoc.vehicle_id }).lean<any>()
      : await Vehicle.findOne({ assigned_driver_id: sarthiOid }).lean<any>();

    if (!booking) {
      logger.warn(`SMS skipped: booking ${bookingOid} not found`);
      return;
    }
    const flightDoc = await FlightDetails.findOne({ booking_id: bookingOid }).lean<any>();
    const contact = booking.contact ?? {};
    const passengerName =
      `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Passenger';
    const passengerPhone: string = contact.phone ?? '';
    const passengerEmail: string = contact.email ?? '';

    if (!passengerPhone && !passengerEmail) {
      logger.warn(`SMS/email skipped: no phone or email for booking ${bookingOid}`);
      return;
    }

    const sarthiName = sarthiDoc?.full_name ?? '';
    const sarthiPhone = sarthiDoc?.phone ?? '';
    const vehicleMake = vehicleDoc?.make ?? '';
    const vehicleName = vehicleDoc?.vehicle_name ?? '';
    const vehicleNumber = vehicleDoc?.number_plate ?? '';

    const section = flightDoc?.[flightType] ?? {};
    const dtVal = section[`${flightType}_datetime`];
    const flightNumber = String(section.flight_number ?? section.flight_name ?? '').trim();
    const pickupDateStr = dtVal instanceof Date ? pickupDate(dtVal) : '';
    const pickupTimeStr = dtVal instanceof Date ? timeStr(dtVal) : '';

    const templateBody = templateDoc?.body ?? DEFAULT_SARTHI_ASSIGNED_BODY;
    const trackingToken: string = booking.tracking_token ?? '';
    const trackingUrl = trackingToken && settings.app_url
      ? `${settings.app_url.replace(/\/+$/, '')}/track/${trackingToken}`
      : '';
    const reference = String(bookingOid).slice(-6).toUpperCase();
    const variables = {
      passenger_name: passengerName,
      sarthi_name: sarthiName,
      sarthi_phone: sarthiPhone,
      flight_number: flightNumber,
      pickup_date: pickupDateStr,
      pickup_time: pickupTimeStr,
      vehicle_make: vehicleMake,
      vehicle_name: vehicleName,
      vehicle_number: vehicleNumber,
      tracking_url: trackingUrl,
      reference,
    };

    const message = renderTemplate(templateBody, variables);

    let waOk = false;
    if (passengerPhone) {
      const result = await notify(passengerPhone, message);
      waOk = result.whatsapp;
    }

    if (!waOk && passengerEmail) {
      const emailSubjectTpl = emailTemplateDoc?.subject || DEFAULT_SARTHI_ASSIGNED_EMAIL_SUBJECT;
      let emailBodyTpl: string = emailTemplateDoc?.body || DEFAULT_SARTHI_ASSIGNED_EMAIL_BODY;
      const emailSubject = renderTemplate(emailSubjectTpl, variables);
      if (!vehicleMake && !vehicleName && !vehicleNumber) {
        emailBodyTpl = emailBodyTpl.replace(/\nVehicle:.*/g, '');
      }
      const emailBody = renderTemplate(emailBodyTpl, variables);
      await sendAssignmentEmail(passengerEmail, passengerName, emailSubject, emailBody);
    }
  } catch (exc) {
    logger.error({ exc }, `SMS send failed for booking ${bookingOid}`);
  }
}

async function sendPickupCompleteNotification(
  bookingOid: Types.ObjectId,
  sarthiOid: Types.ObjectId
): Promise<void> {
  try {
    const [booking, sarthiDoc, smsTpl, emailTpl] = await Promise.all([
      Booking.findOne({ _id: bookingOid }).lean<any>(),
      Sarthi.findOne({ _id: sarthiOid }).lean<any>(),
      Template.findOne({ _id: 'sms-pickup-complete' }).lean<any>(),
      Template.findOne({ _id: 'email-pickup-complete' }).lean<any>(),
    ]);
    if (!booking) return;
    const contact = booking.contact ?? {};
    const passengerName = `${contact.first_name ?? ''} ${contact.last_name ?? ''}`.trim() || 'Passenger';
    const passengerPhone: string = contact.phone ?? '';
    const passengerEmail: string = contact.email ?? '';
    if (!passengerPhone && !passengerEmail) return;

    const variables = {
      passenger_name: passengerName,
      sarthi_name: sarthiDoc?.full_name ?? 'your Sarthi',
    };

    const smsBody = renderTemplate(smsTpl?.body || DEFAULT_PICKUP_COMPLETE_BODY, variables);
    let waOk = false;
    if (passengerPhone) {
      const result = await notify(passengerPhone, smsBody);
      waOk = result.whatsapp;
    }
    if (!waOk && passengerEmail) {
      const subject = renderTemplate(emailTpl?.subject || DEFAULT_PICKUP_COMPLETE_EMAIL_SUBJECT, variables);
      const body = renderTemplate(emailTpl?.body || DEFAULT_PICKUP_COMPLETE_EMAIL_BODY, variables);
      await sendAssignmentEmail(passengerEmail, passengerName, subject, body);
    }
  } catch (exc) {
    logger.error({ exc }, `Pickup-complete notification failed for booking ${bookingOid}`);
  }
}

assignmentsRouter.put(
  '/:bookingId/:flightType',
  adminOnly,
  ah(async (req, res) => {
    const { bookingId, flightType } = req.params;
    if (flightType !== 'arrival' && flightType !== 'departure') {
      throw new HttpError(400, "flight_type must be 'arrival' or 'departure'");
    }
    const body = req.body ?? {};
    if (!body.sarthi_id) throw new HttpError(422, 'sarthi_id required');

    const bookingOid = toOid(bookingId, 'ObjectId');
    const sarthiOid = toOid(body.sarthi_id, 'ObjectId');

    const now = new Date();
    const $set: Record<string, unknown> = {
      sarthi_id: sarthiOid,
      flight_group_id: body.flight_group_id ?? '',
      updated_at: now,
    };
    const $unset: Record<string, unknown> = {};
    if ('vehicle_id' in body) {
      if (body.vehicle_id) $set.vehicle_id = toOid(body.vehicle_id, 'vehicle_id');
      else $unset.vehicle_id = '';
    }
    await Assignment.updateOne(
      { booking_id: bookingOid, flight_type: flightType },
      {
        $set,
        ...(Object.keys($unset).length ? { $unset } : {}),
        $setOnInsert: { assigned_at: now, trip_status: 'pending' },
      },
      { upsert: true }
    );
    logger.info(`Assignment: booking=${bookingId} sarthi=${body.sarthi_id} type=${flightType} vehicle=${body.vehicle_id ?? '(none)'}`);

    // Fire-and-forget: do not await; do not block response.
    void sendAssignmentNotification(bookingOid, sarthiOid, flightType);

    res.json({ bookingId, sarthiId: body.sarthi_id, flightType, vehicleId: body.vehicle_id ?? null });
  })
);

assignmentsRouter.patch(
  '/:bookingId/:flightType/status',
  ah(async (req, res) => {
    const { bookingId, flightType } = req.params;
    if (flightType !== 'arrival' && flightType !== 'departure') {
      throw new HttpError(400, "flight_type must be 'arrival' or 'departure'");
    }
    const status = String((req.body ?? {}).trip_status ?? '').trim();
    if (status !== 'pending' && status !== 'complete') {
      throw new HttpError(422, "trip_status must be 'pending' or 'complete'");
    }
    const bookingOid = toOid(bookingId, 'ObjectId');

    // Drivers may only flip their own assignment; admins may flip any.
    if (req.user!.role === 'driver') {
      const own = await Assignment.findOne({
        booking_id: bookingOid,
        flight_type: flightType,
        sarthi_id: new Types.ObjectId(req.user!.sub),
      }).lean();
      if (!own) throw new HttpError(403, 'You can only update your own assignments');
    } else if (req.user!.role !== 'super_admin' && req.user!.role !== 'transportation_admin') {
      throw new HttpError(403, 'Insufficient permission');
    }

    const now = new Date();
    const update: Record<string, unknown> = { trip_status: status, updated_at: now };
    const unset: Record<string, unknown> = {};
    if (status === 'complete') update.completed_at = now;
    else unset.completed_at = '';

    const result = await Assignment.updateOne(
      { booking_id: bookingOid, flight_type: flightType },
      Object.keys(unset).length > 0 ? { $set: update, $unset: unset } : { $set: update }
    );
    if (result.matchedCount === 0) throw new HttpError(404, 'Assignment not found');
    logger.info(`Assignment status: booking=${bookingId} type=${flightType} status=${status}`);

    if (status === 'complete') {
      const assignment = await Assignment.findOne({
        booking_id: bookingOid,
        flight_type: flightType,
      }).lean<any>();
      if (assignment?.sarthi_id) {
        void sendPickupCompleteNotification(bookingOid, new Types.ObjectId(String(assignment.sarthi_id)));
      }
    }

    res.json({ ok: true, trip_status: status, completed_at: status === 'complete' ? now.toISOString() : null });
  })
);

assignmentsRouter.delete(
  '/:bookingId/:flightType',
  adminOnly,
  ah(async (req, res) => {
    const { bookingId, flightType } = req.params;
    const bookingOid = toOid(bookingId, 'ObjectId');
    await Assignment.deleteOne({ booking_id: bookingOid, flight_type: flightType });
    res.status(204).end();
  })
);
