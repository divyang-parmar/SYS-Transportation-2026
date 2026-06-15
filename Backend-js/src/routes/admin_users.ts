import { Router } from 'express';
import { Types } from 'mongoose';
import { AdminUser } from '../models/index.js';
import { HttpError } from '../middleware/error.js';
import { ah } from '../util/asyncHandler.js';
import { logger } from '../logger.js';

const ROLE_TO_DB: Record<string, string> = {
  transportation_admin: 'transport-admin',
  super_admin: 'transport-super',
};
const ROLE_FROM_DB: Record<string, string> = {
  'transport-admin': 'transportation_admin',
  'transport-super': 'super_admin',
};

function serialise(doc: Record<string, any>) {
  const dbRole = doc.role ?? 'transport-admin';
  return {
    id: String(doc._id),
    name: doc.full_name ?? '',
    email: doc.email ?? '',
    phone: doc.phone ?? '',
    role: ROLE_FROM_DB[dbRole] ?? dbRole,
  };
}

export const adminUsersRouter = Router();

adminUsersRouter.get(
  '/',
  ah(async (_req, res) => {
    const docs = await AdminUser.find({}).lean();
    res.json(docs.map(serialise));
  })
);

adminUsersRouter.get(
  '/find-by-email',
  ah(async (req, res) => {
    const email = String(req.query.email ?? '').trim().toLowerCase();
    if (!email) throw new HttpError(422, 'email required');
    const doc = await AdminUser.findOne({ email }).lean();
    if (!doc) throw new HttpError(404, 'Admin user not found');
    res.json(serialise(doc));
  })
);

adminUsersRouter.post(
  '/',
  ah(async (req, res) => {
    const body = req.body ?? {};
    const role: string = body.role ?? 'transportation_admin';
    if (!(role in ROLE_TO_DB)) {
      throw new HttpError(422, `role must be one of ${JSON.stringify(Object.keys(ROLE_TO_DB).sort())}`);
    }
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!email || !body.name) throw new HttpError(422, 'name and email are required');

    const existing = await AdminUser.findOne({ email }).lean();
    if (existing) {
      res.status(409).json({ detail: `${email} is already registered.`, existing_id: String(existing._id) });
      return;
    }
    const phone = String(body.phone ?? '').trim();
    if (phone) {
      const existingPhone = await AdminUser.findOne({ phone }).lean();
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
      role: ROLE_TO_DB[role],
      google_id: email,
      created_at: new Date(),
    };
    const created = await AdminUser.create(doc);
    logger.info(`Admin user created: ${created._id} (${email})`);
    res.status(201).json(serialise(created.toObject()));
  })
);

adminUsersRouter.patch(
  '/:userId',
  ah(async (req, res) => {
    const { userId } = req.params;
    if (!Types.ObjectId.isValid(userId)) throw new HttpError(400, 'Invalid user id');
    const oid = new Types.ObjectId(userId);
    const body = req.body ?? {};
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) throw new HttpError(422, 'name cannot be empty');
      if (name.length > 160) throw new HttpError(422, 'name too long');
      update.full_name = name;
    }

    if (body.phone !== undefined) {
      const phone = String(body.phone).trim();
      if (phone.length > 32) throw new HttpError(422, 'phone too long');
      update.phone = phone;
    }

    if (Object.keys(update).length === 0) {
      throw new HttpError(422, 'No fields to update');
    }

    const updated = await AdminUser.findOneAndUpdate({ _id: oid }, { $set: update }, { new: true }).lean();
    if (!updated) throw new HttpError(404, 'User not found');
    logger.info(`AdminUser updated: ${oid}`);
    res.json(serialise(updated));
  })
);

adminUsersRouter.delete(
  '/:userId',
  ah(async (req, res) => {
    const { userId } = req.params;
    let query: any;
    if (Types.ObjectId.isValid(userId)) {
      query = { $or: [{ _id: new Types.ObjectId(userId) }, { _id: userId }] };
    } else {
      query = { _id: userId };
    }
    const result = await AdminUser.deleteOne(query);
    if (result.deletedCount === 0) throw new HttpError(404, 'User not found');
    res.status(204).end();
  })
);
