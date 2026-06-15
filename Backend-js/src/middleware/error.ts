import type { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { logger } from '../logger.js';
import { settings } from '../config.js';

export class HttpError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(detail);
    this.status = status;
    this.detail = detail;
  }
}

export const notFoundHandler = (req: Request, res: Response, _next: NextFunction) => {
  logger.info(`HTTP 404: Not Found - ${req.url}`);
  res.status(404).json({ error: 'Not Found', status: 404 });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    if (err.status === 404) {
      logger.info(`HTTP ${err.status}: ${err.detail} - ${req.url}`);
    } else {
      logger.warn(`HTTP ${err.status}: ${err.detail} - ${req.url}`);
    }
    res.status(err.status).json({ error: err.detail, status: err.status });
    return;
  }
  logger.error({ err }, 'Unhandled exception');
  res.status(500).json({
    error: 'Internal server error',
    status: 500,
    detail: settings.debug ? String(err?.message || err) : 'An unexpected error occurred',
  });
};
