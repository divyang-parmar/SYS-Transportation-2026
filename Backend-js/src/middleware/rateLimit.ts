import rateLimit from 'express-rate-limit';
import { settings } from '../config.js';

export const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: settings.max_requests_per_minute,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});
