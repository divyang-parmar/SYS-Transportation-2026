import pino from 'pino';
import { PINO_LEVEL, settings } from './config.js';

export const logger = pino({
  level: PINO_LEVEL,
  transport: settings.debug
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});
