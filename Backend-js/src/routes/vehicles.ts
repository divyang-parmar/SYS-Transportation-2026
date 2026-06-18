import { Router } from 'express';
import { Vehicle } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { requireRole } from '../middleware/auth.js';
const adminOnly = requireRole('super_admin', 'transportation_admin');
import { ah } from '../util/asyncHandler.js';
import { toOid } from '../util/oid.js';
import { logger } from '../logger.js';

const VEHICLE_TYPES = new Set(['SUV', 'Minivan', 'Van', 'Bus', 'Sedan', 'Truck']);
const OWNERSHIP_TYPES = new Set(['rented', 'volunteer_provided', 'sarthi_owned']);

function serialise(doc: Record<string, any>) {
  return {
    id: String(doc._id),
    make: doc.make ?? '',
    name: doc.vehicle_name ?? '',
    vehicleNumber: doc.number_plate ?? '',
    type: doc.vehicle_type ?? 'SUV',
    capacity: doc.capacity ?? 7,
    assignedDriverId: doc.assigned_driver_id ?? null,
    ownership: doc.ownership ?? 'rented',
    ownerName: doc.owner_name ?? '',
    ownerPhone: doc.owner_phone ?? '',
    ownerSarthiId: doc.owner_sarthi_id ?? null,
  };
}

export const vehiclesRouter = Router();

vehiclesRouter.get(
  '/',
  ah(async (_req, res) => {
    const docs = await Vehicle.find({}).lean();
    res.json(docs.map(serialise));
  })
);

vehiclesRouter.post(
  '/',
  adminOnly,
  ah(async (req, res) => {
    const body = req.body ?? {};
    const type: string = body.type ?? 'SUV';
    if (!VEHICLE_TYPES.has(type)) {
      throw new HttpError(422, `type must be one of ${JSON.stringify([...VEHICLE_TYPES].sort())}`);
    }
    const ownership: string = body.ownership ?? 'rented';
    if (!OWNERSHIP_TYPES.has(ownership)) {
      throw new HttpError(422, `ownership must be one of ${JSON.stringify([...OWNERSHIP_TYPES].sort())}`);
    }
    const now = new Date();
    const doc = {
      make: String(body.make ?? '').trim(),
      vehicle_name: String(body.name ?? '').trim(),
      number_plate: String(body.vehicleNumber ?? '').trim(),
      vehicle_type: type,
      capacity: body.capacity ?? 7,
      assigned_driver_id: null,
      ownership,
      owner_name: String(body.ownerName ?? '').trim(),
      owner_phone: String(body.ownerPhone ?? '').trim(),
      owner_sarthi_id: body.ownerSarthiId ?? null,
      created_at: now,
      updated_at: now,
    };
    const created = await Vehicle.create(doc);
    logger.info(`Vehicle created: ${created._id}`);
    res.status(201).json(serialise(created.toObject()));
  })
);

vehiclesRouter.put(
  '/:vehicleId',
  adminOnly,
  ah(async (req, res) => {
    const body = req.body ?? {};
    const updates: Record<string, any> = { updated_at: new Date() };
    if (body.make !== undefined && body.make !== null) updates.make = String(body.make).trim();
    if (body.name !== undefined && body.name !== null) updates.vehicle_name = String(body.name).trim();
    if (body.vehicleNumber !== undefined && body.vehicleNumber !== null)
      updates.number_plate = String(body.vehicleNumber).trim();
    if (body.type !== undefined && body.type !== null) {
      if (!VEHICLE_TYPES.has(body.type)) {
        throw new HttpError(422, `type must be one of ${JSON.stringify([...VEHICLE_TYPES].sort())}`);
      }
      updates.vehicle_type = body.type;
    }
    if (body.capacity !== undefined && body.capacity !== null) updates.capacity = body.capacity;
    if ('assignedDriverId' in body) updates.assigned_driver_id = body.assignedDriverId || null;
    if (body.ownership !== undefined && body.ownership !== null) {
      if (!OWNERSHIP_TYPES.has(body.ownership)) {
        throw new HttpError(422, `ownership must be one of ${JSON.stringify([...OWNERSHIP_TYPES].sort())}`);
      }
      updates.ownership = body.ownership;
    }
    if (body.ownerName !== undefined && body.ownerName !== null) updates.owner_name = String(body.ownerName).trim();
    if (body.ownerPhone !== undefined && body.ownerPhone !== null) updates.owner_phone = String(body.ownerPhone).trim();
    if ('ownerSarthiId' in body) updates.owner_sarthi_id = body.ownerSarthiId || null;

    const result = await Vehicle.findOneAndUpdate({ _id: toOid(req.params.vehicleId, 'vehicle id') }, { $set: updates }, { new: true }).lean();
    if (!result) throw new HttpError(404, 'Vehicle not found');
    res.json(serialise(result));
  })
);

vehiclesRouter.delete(
  '/:vehicleId',
  adminOnly,
  ah(async (req, res) => {
    const result = await Vehicle.deleteOne({ _id: toOid(req.params.vehicleId, 'vehicle id') });
    if (result.deletedCount === 0) throw new HttpError(404, 'Vehicle not found');
    res.status(204).end();
  })
);
