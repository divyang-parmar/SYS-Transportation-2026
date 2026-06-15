import { Router } from 'express';
import { Template } from '../models/index.js';
import { ah } from '../util/asyncHandler.js';
import { logger } from '../logger.js';

function serialise(doc: Record<string, any>) {
  return {
    id: doc._id,
    channel: doc.channel ?? 'email',
    name: doc.name ?? '',
    subject: doc.subject ?? null,
    body: doc.body ?? '',
    variables: doc.variables ?? [],
    deleted: doc.deleted ?? false,
  };
}

export const templatesRouter = Router();

templatesRouter.get(
  '/',
  ah(async (_req, res) => {
    const docs = await Template.find({}).lean();
    res.json(docs.map(serialise));
  })
);

templatesRouter.put(
  '/:templateId',
  ah(async (req, res) => {
    const { templateId } = req.params;
    const body = req.body ?? {};
    const doc = {
      _id: templateId,
      channel: body.channel,
      name: body.name,
      subject: body.subject ?? null,
      body: body.body,
      variables: body.variables ?? [],
      deleted: body.deleted ?? false,
      updated_at: new Date(),
    };
    await Template.replaceOne({ _id: templateId }, doc, { upsert: true });
    logger.info(`Template upserted: ${templateId}`);
    res.json(serialise(doc));
  })
);

templatesRouter.delete(
  '/:templateId',
  ah(async (req, res) => {
    await Template.deleteOne({ _id: req.params.templateId });
    res.status(204).end();
  })
);
