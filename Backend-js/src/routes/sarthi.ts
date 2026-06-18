import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Sarthi, Vehicle } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { ah } from '../util/asyncHandler.js';
import { toOid } from '../util/oid.js';
import { logger } from '../logger.js';
import { requireAuth, requireRole, requireSelfOrAdmin } from '../middleware/auth.js';
import { hashPassword } from '../services/auth_service.js';

async function validatePassword(plain: unknown): Promise<string> {
  const s = String(plain ?? '');
  if (s.length < 6) throw new HttpError(422, 'password must be at least 6 characters');
  if (s.length > 200) throw new HttpError(422, 'password too long');
  return hashPassword(s);
}

const adminOnly = requireRole('super_admin', 'transportation_admin');

function serialise(doc: Record<string, any>) {
  const out: Record<string, any> = {
    id: String(doc._id),
    name: doc.full_name ?? '',
    email: doc.email ?? '',
    phone: doc.phone ?? '',
    role: 'driver',
    hasOwnVehicle: !!doc.has_own_vehicle,
  };
  if (doc.last_location && typeof doc.last_location.lat === 'number') {
    out.last_location = {
      lat: doc.last_location.lat,
      lng: doc.last_location.lng,
      accuracy: doc.last_location.accuracy ?? null,
      heading: doc.last_location.heading ?? null,
      speed: doc.last_location.speed ?? null,
      recorded_at: doc.last_location.recorded_at,
    };
  }
  return out;
}

const LocationSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
  accuracy: z.number().nonnegative().nullable().optional(),
  heading: z.number().nullable().optional(),
  speed: z.number().nullable().optional(),
});

export const sarthiRouter = Router();

sarthiRouter.get(
  '/',
  requireAuth,
  ah(async (_req, res) => {
    const docs = await Sarthi.find({}).lean();
    res.json(docs.map(serialise));
  })
);

sarthiRouter.get(
  '/find-by-email',
  ah(async (req, res) => {
    const email = String(req.query.email ?? '').trim().toLowerCase();
    if (!email) throw new HttpError(422, 'email required');
    const doc = await Sarthi.findOne({ email }).lean();
    if (!doc) throw new HttpError(404, 'Sarthi not found');
    res.json(serialise(doc));
  })
);

sarthiRouter.get(
  '/locations',
  requireAuth,
  ah(async (_req, res) => {
    const docs = await Sarthi.find({ 'last_location.lat': { $type: 'number' } }).lean();
    res.json(docs.map(serialise));
  })
);

sarthiRouter.get(
  '/:sarthiId',
  requireAuth,
  ah(async (req, res) => {
    const oid = toOid(req.params.sarthiId, 'sarthi id');
    const doc = await Sarthi.findOne({ _id: oid }).lean();
    if (!doc) throw new HttpError(404, 'Sarthi not found');
    res.json(serialise(doc));
  })
);

sarthiRouter.post(
  '/:sarthiId/location',
  requireSelfOrAdmin('sarthiId'),
  ah(async (req, res) => {
    const oid = toOid(req.params.sarthiId, 'sarthi id');
    const parsed = LocationSchema.safeParse(req.body);
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      throw new HttpError(422, `${first.path.join('.')}: ${first.message}`);
    }
    const loc = parsed.data;
    const update = {
      last_location: {
        lat: loc.lat,
        lng: loc.lng,
        accuracy: loc.accuracy ?? null,
        heading: loc.heading ?? null,
        speed: loc.speed ?? null,
        recorded_at: new Date(),
      },
    };
    const updated = await Sarthi.findOneAndUpdate(
      { _id: oid },
      { $set: update },
      { new: true }
    ).lean();
    if (!updated) throw new HttpError(404, 'Sarthi not found');
    res.json({ ok: true, recorded_at: (update.last_location.recorded_at as Date).toISOString() });
  })
);

sarthiRouter.delete(
  '/:sarthiId/location',
  requireSelfOrAdmin('sarthiId'),
  ah(async (req, res) => {
    const oid = toOid(req.params.sarthiId, 'sarthi id');
    const result = await Sarthi.updateOne({ _id: oid }, { $unset: { last_location: '' } });
    if (result.matchedCount === 0) throw new HttpError(404, 'Sarthi not found');
    res.status(204).end();
  })
);

sarthiRouter.patch(
  '/:sarthiId',
  adminOnly,
  ah(async (req, res) => {
    const oid = toOid(req.params.sarthiId, 'sarthi id');
    const body = req.body ?? {};
    const update: Record<string, unknown> = { updated_at: new Date() };

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) throw new HttpError(422, 'name cannot be empty');
      if (name.length > 160) throw new HttpError(422, 'name too long');
      update.full_name = name;
    }

    if (body.phone !== undefined) {
      const phone = String(body.phone).trim();
      if (phone.length > 32) throw new HttpError(422, 'phone too long');
      if (phone) {
        const conflict = await Sarthi.findOne({ phone, _id: { $ne: oid } }).lean();
        if (conflict) {
          res.status(409).json({ detail: `Phone number ${phone} is already registered.`, existing_id: String((conflict as any)._id) });
          return;
        }
      }
      update.phone = phone;
    }

    if (body.password !== undefined && body.password !== '') {
      update.password_hash = await validatePassword(body.password);
      update.must_change_password = true;
    }

    if (Object.keys(update).length === 1) {
      throw new HttpError(422, 'No fields to update');
    }

    const updated = await Sarthi.findOneAndUpdate({ _id: oid }, { $set: update }, { new: true }).lean();
    if (!updated) throw new HttpError(404, 'Sarthi not found');
    logger.info(`Sarthi updated: ${oid}`);
    res.json(serialise(updated));
  })
);

const VEHICLE_TYPES = new Set(['SUV', 'Minivan', 'Van', 'Bus', 'Sedan', 'Truck']);

function serialiseVehicle(doc: Record<string, any>) {
  return {
    id: String(doc._id),
    make: doc.make ?? '',
    name: doc.vehicle_name ?? '',
    vehicleNumber: doc.number_plate ?? '',
    type: doc.vehicle_type ?? 'SUV',
    capacity: doc.capacity ?? 7,
    assignedDriverId: doc.assigned_driver_id ?? null,
    ownership: doc.ownership ?? 'sarthi_owned',
    ownerName: doc.owner_name ?? '',
    ownerPhone: doc.owner_phone ?? '',
    ownerSarthiId: doc.owner_sarthi_id ?? null,
  };
}

sarthiRouter.patch(
  '/:sarthiId/profile',
  requireSelfOrAdmin('sarthiId'),
  ah(async (req, res) => {
    const body = req.body ?? {};
    const updates: Record<string, any> = {};
    if ('hasOwnVehicle' in body) updates.has_own_vehicle = !!body.hasOwnVehicle;
    if (Object.keys(updates).length === 0) throw new HttpError(422, 'no fields to update');
    const doc = await Sarthi.findOneAndUpdate(
      { _id: toOid(req.params.sarthiId, 'sarthi id') },
      { $set: updates },
      { new: true }
    ).lean();
    if (!doc) throw new HttpError(404, 'Sarthi not found');
    res.json(serialise(doc));
  })
);

sarthiRouter.get(
  '/:sarthiId/vehicle',
  requireSelfOrAdmin('sarthiId'),
  ah(async (req, res) => {
    const doc = await Vehicle.findOne({ assigned_driver_id: req.params.sarthiId }).lean();
    if (!doc) throw new HttpError(404, 'No vehicle assigned');
    res.json(serialiseVehicle(doc));
  })
);

sarthiRouter.post(
  '/:sarthiId/vehicle',
  requireSelfOrAdmin('sarthiId'),
  ah(async (req, res) => {
    const body = req.body ?? {};
    const type: string = body.type ?? 'SUV';
    if (!VEHICLE_TYPES.has(type)) throw new HttpError(422, `type must be one of ${[...VEHICLE_TYPES].sort().join(', ')}`);
    const now = new Date();
    const created = await Vehicle.create({
      make: String(body.make ?? '').trim(),
      vehicle_name: String(body.name ?? '').trim(),
      number_plate: String(body.vehicleNumber ?? '').trim(),
      vehicle_type: type,
      capacity: body.capacity ?? 7,
      assigned_driver_id: req.params.sarthiId,
      ownership: 'sarthi_owned',
      owner_sarthi_id: req.params.sarthiId,
      created_at: now,
      updated_at: now,
    });
    await Sarthi.findByIdAndUpdate(req.params.sarthiId, { $set: { has_own_vehicle: true } });
    logger.info(`Vehicle registered by sarthi ${req.params.sarthiId}: ${created._id}`);
    res.status(201).json(serialiseVehicle(created.toObject()));
  })
);

sarthiRouter.put(
  '/:sarthiId/vehicle/:vehicleId',
  requireSelfOrAdmin('sarthiId'),
  ah(async (req, res) => {
    const body = req.body ?? {};
    const updates: Record<string, any> = { updated_at: new Date() };
    if (body.make !== undefined) updates.make = String(body.make).trim();
    if (body.name !== undefined) updates.vehicle_name = String(body.name).trim();
    if (body.vehicleNumber !== undefined) updates.number_plate = String(body.vehicleNumber).trim();
    if (body.type !== undefined) {
      if (!VEHICLE_TYPES.has(body.type)) throw new HttpError(422, `type must be one of ${[...VEHICLE_TYPES].sort().join(', ')}`);
      updates.vehicle_type = body.type;
    }
    if (body.capacity !== undefined) updates.capacity = body.capacity;
    const result = await Vehicle.findOneAndUpdate(
      { _id: toOid(req.params.vehicleId, 'vehicle id'), assigned_driver_id: req.params.sarthiId },
      { $set: updates },
      { new: true }
    ).lean();
    if (!result) throw new HttpError(404, 'Vehicle not found or not assigned to you');
    res.json(serialiseVehicle(result));
  })
);

sarthiRouter.post(
  '/',
  adminOnly,
  ah(async (req, res) => {
    const body = req.body ?? {};
    const email = String(body.email ?? '').trim().toLowerCase();
    const phone = String(body.phone ?? '').trim();
    if (!body.name || !email) throw new HttpError(422, 'name and email are required');

    const existingEmail = await Sarthi.findOne({ email }).lean();
    if (existingEmail) {
      res.status(409).json({ detail: `${email} is already registered.`, existing_id: String(existingEmail._id) });
      return;
    }
    if (phone) {
      const existingPhone = await Sarthi.findOne({ phone }).lean();
      if (existingPhone) {
        res.status(409).json({
          detail: `Phone number ${phone} is already registered.`,
          existing_id: String(existingPhone._id),
        });
        return;
      }
    }
    const doc: Record<string, unknown> = {
      full_name: String(body.name).trim(),
      email,
      phone,
      role: 'sarthi',
      must_upload_photo: !!body.must_upload_photo,
      created_at: new Date(),
    };
    if (body.password) {
      doc.password_hash = await validatePassword(body.password);
      doc.must_change_password = true;
    }
    const created = await Sarthi.create(doc);
    logger.info(`Sarthi created: ${created._id} (${email})`);
    res.status(201).json(serialise(created.toObject()));
  })
);

sarthiRouter.delete(
  '/:sarthiId',
  adminOnly,
  ah(async (req, res) => {
    const { sarthiId } = req.params;
    let query: any;
    if (Types.ObjectId.isValid(sarthiId)) {
      query = { $or: [{ _id: new Types.ObjectId(sarthiId) }, { _id: sarthiId }] };
    } else {
      query = { _id: sarthiId };
    }
    const result = await Sarthi.deleteOne(query);
    if (result.deletedCount === 0) throw new HttpError(404, 'Sarthi not found');
    res.status(204).end();
  })
);
