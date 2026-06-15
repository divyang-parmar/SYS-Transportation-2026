import { Router } from 'express';
import { Mandal } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { ah } from '../util/asyncHandler.js';
import { toOid } from '../util/oid.js';
import { logger } from '../logger.js';

const DEFAULT_SEEDS = ['Edison', 'Iselin', 'Parsippany', 'Robbinsville', 'New York City', 'Philadelphia'];

function serialise(doc: any) {
  return { id: String(doc._id), name: String(doc.name ?? '') };
}

export const mandalsRouter = Router();

mandalsRouter.get(
  '/',
  ah(async (_req, res) => {
    let docs = (await Mandal.find({}).sort({ name: 1 }).lean()) as any[];
    if (docs.length === 0) {
      const now = new Date();
      const seedDocs = DEFAULT_SEEDS.map((name) => ({ name, name_lower: name.toLowerCase(), created_at: now }));
      try {
        await Mandal.insertMany(seedDocs, { ordered: false });
      } catch (err) {
        logger.warn({ err }, 'Mandal seed insertMany partial failure (likely unique index)');
      }
      docs = (await Mandal.find({}).sort({ name: 1 }).lean()) as any[];
    }
    res.json(docs.map(serialise));
  })
);

mandalsRouter.post(
  '/',
  ah(async (req, res) => {
    const raw = String((req.body ?? {}).name ?? '').trim();
    if (!raw) throw new HttpError(422, 'name is required');
    if (raw.length > 120) throw new HttpError(422, 'name too long');
    const lower = raw.toLowerCase();

    const existing = (await Mandal.findOne({ name_lower: lower }).lean()) as any;
    if (existing) {
      res.status(409).json({ detail: `${raw} is already registered.`, existing_id: String(existing._id) });
      return;
    }
    const created = await Mandal.create({ name: raw, name_lower: lower, created_at: new Date() });
    logger.info(`Mandal created: ${created._id} (${raw})`);
    res.status(201).json(serialise(created.toObject()));
  })
);

mandalsRouter.patch(
  '/:mandalId',
  ah(async (req, res) => {
    const oid = toOid(req.params.mandalId, 'mandal id');
    const raw = String((req.body ?? {}).name ?? '').trim();
    if (!raw) throw new HttpError(422, 'name is required');
    if (raw.length > 120) throw new HttpError(422, 'name too long');
    const lower = raw.toLowerCase();

    const conflict = (await Mandal.findOne({ name_lower: lower, _id: { $ne: oid } }).lean()) as any;
    if (conflict) {
      res.status(409).json({ detail: `${raw} is already registered.`, existing_id: String(conflict._id) });
      return;
    }
    const updated = await Mandal.findOneAndUpdate(
      { _id: oid },
      { $set: { name: raw, name_lower: lower, updated_at: new Date() } },
      { new: true }
    ).lean();
    if (!updated) throw new HttpError(404, 'Mandal not found');
    logger.info(`Mandal renamed: ${oid} -> ${raw}`);
    res.json(serialise(updated));
  })
);

mandalsRouter.delete(
  '/:mandalId',
  ah(async (req, res) => {
    const oid = toOid(req.params.mandalId, 'mandal id');
    const result = await Mandal.deleteOne({ _id: oid });
    if (result.deletedCount === 0) throw new HttpError(404, 'Mandal not found');
    res.status(204).end();
  })
);
