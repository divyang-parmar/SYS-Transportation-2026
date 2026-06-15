import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { Sarthi } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { ah } from '../util/asyncHandler.js';
import { toOid } from '../util/oid.js';
import { logger } from '../logger.js';

function serialise(doc: Record<string, any>) {
  const out: Record<string, any> = {
    id: String(doc._id),
    name: doc.full_name ?? '',
    email: doc.email ?? '',
    phone: doc.phone ?? '',
    role: 'driver',
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
  ah(async (_req, res) => {
    const docs = await Sarthi.find({ 'last_location.lat': { $type: 'number' } }).lean();
    res.json(docs.map(serialise));
  })
);

sarthiRouter.get(
  '/:sarthiId',
  ah(async (req, res) => {
    const oid = toOid(req.params.sarthiId, 'sarthi id');
    const doc = await Sarthi.findOne({ _id: oid }).lean();
    if (!doc) throw new HttpError(404, 'Sarthi not found');
    res.json(serialise(doc));
  })
);

sarthiRouter.post(
  '/:sarthiId/location',
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
  ah(async (req, res) => {
    const oid = toOid(req.params.sarthiId, 'sarthi id');
    const result = await Sarthi.updateOne({ _id: oid }, { $unset: { last_location: '' } });
    if (result.matchedCount === 0) throw new HttpError(404, 'Sarthi not found');
    res.status(204).end();
  })
);

sarthiRouter.patch(
  '/:sarthiId',
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

    if (Object.keys(update).length === 1) {
      throw new HttpError(422, 'No fields to update');
    }

    const updated = await Sarthi.findOneAndUpdate({ _id: oid }, { $set: update }, { new: true }).lean();
    if (!updated) throw new HttpError(404, 'Sarthi not found');
    logger.info(`Sarthi updated: ${oid}`);
    res.json(serialise(updated));
  })
);

sarthiRouter.post(
  '/',
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
    const doc = {
      full_name: String(body.name).trim(),
      email,
      phone,
      role: 'sarthi',
      created_at: new Date(),
    };
    const created = await Sarthi.create(doc);
    logger.info(`Sarthi created: ${created._id} (${email})`);
    res.status(201).json(serialise(created.toObject()));
  })
);

sarthiRouter.delete(
  '/:sarthiId',
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
