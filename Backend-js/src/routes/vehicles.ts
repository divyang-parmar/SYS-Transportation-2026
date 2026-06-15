import { Router } from 'express';
import { Vehicle } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { ah } from '../util/asyncHandler.js';
import { toOid } from '../util/oid.js';
import { logger } from '../logger.js';

const VEHICLE_TYPES = new Set(['SUV', 'MUV', 'Van', 'Tempo Traveller', 'Bus', 'Sedan']);

function serialise(doc: Record<string, any>) {
  return {
    id: String(doc._id),
    make: doc.make ?? '',
    name: doc.vehicle_name ?? '',
    vehicleNumber: doc.number_plate ?? '',
    type: doc.vehicle_type ?? 'MUV',
    capacity: doc.capacity ?? 7,
    assignedDriverId: doc.assigned_driver_id ?? null,
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
  ah(async (req, res) => {
    const body = req.body ?? {};
    const type: string = body.type ?? 'MUV';
    if (!VEHICLE_TYPES.has(type)) {
      throw new HttpError(422, `type must be one of ${JSON.stringify([...VEHICLE_TYPES].sort())}`);
    }
    const now = new Date();
    const doc = {
      make: String(body.make ?? '').trim(),
      vehicle_name: String(body.name ?? '').trim(),
      number_plate: String(body.vehicleNumber ?? '').trim(),
      vehicle_type: type,
      capacity: body.capacity ?? 7,
      assigned_driver_id: null,
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

    const result = await Vehicle.findOneAndUpdate({ _id: toOid(req.params.vehicleId, 'vehicle id') }, { $set: updates }, { new: true }).lean();
    if (!result) throw new HttpError(404, 'Vehicle not found');
    res.json(serialise(result));
  })
);

vehiclesRouter.delete(
  '/:vehicleId',
  ah(async (req, res) => {
    const result = await Vehicle.deleteOne({ _id: toOid(req.params.vehicleId, 'vehicle id') });
    if (result.deletedCount === 0) throw new HttpError(404, 'Vehicle not found');
    res.status(204).end();
  })
);
