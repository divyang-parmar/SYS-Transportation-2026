import { Types } from 'mongoose';
import { HttpError } from '../middleware/error.js';

export function toOid(s: string, label = 'id'): Types.ObjectId {
  if (!Types.ObjectId.isValid(s)) {
    throw new HttpError(400, `Invalid ${label}`);
  }
  return new Types.ObjectId(s);
}

export function tryOid(s: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(s) ? new Types.ObjectId(s) : null;
}
