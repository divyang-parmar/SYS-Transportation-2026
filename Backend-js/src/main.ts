import express from 'express';
import { settings } from './config.js';
import { logger } from './logger.js';
import { connectDb, dbConnected } from './db.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { limiter } from './middleware/rateLimit.js';

import { adminUsersRouter } from './routes/admin_users.js';
import { assignmentsRouter } from './routes/assignments.js';
import { bhaktosRouter } from './routes/bhaktos.js';
import { emailRouter } from './routes/email.js';
import { flightGroupsRouter } from './routes/flight_groups.js';
import { sarthiRouter } from './routes/sarthi.js';
import { templatesRouter } from './routes/templates.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { jotformWebhookRouter } from './routes/jotform_webhook.js';
import { intakeRouter } from './routes/intake.js';
import { trackRouter } from './routes/track.js';
import { mandalsRouter } from './routes/mandals.js';

function corsMiddleware(): express.RequestHandler {
  const raw = settings.allowed_origins.trim();
  const origins = raw === '*' ? '*' : raw.split(',').map((o) => o.trim()).filter(Boolean);
  return (req, res, next) => {
    const origin = req.headers.origin;
    const wildcard = origins === '*';
    if (wildcard) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (origin && (origins as string[]).includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD');
    res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ?? '*');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  };
}
async function main(): Promise<void> {
  connectDb();
  logger.info(`Starting application in ${settings.environment} mode`);
  logger.info(`MongoDB collection: ${settings.mongodb_database}.${settings.mongodb_collection}`);

  const app = express();
  app.set('trust proxy', 1);
  app.use(corsMiddleware());
  app.use(limiter);
  app.use(express.json({ limit: `${settings.request_size_limit_mb}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${settings.request_size_limit_mb}mb` }));

  app.get('/health', async (_req, res) => {
    const connected = await dbConnected();
    res.json({
      status: 'healthy',
      environment: settings.environment,
      version: '0.1.0',
      db_connected: connected,
    });
  });

  app.all('/', (_req, res) => {
    res.json({
      name: 'JotForm MongoDB Integration API',
      version: '0.1.0',
      status: 'running',
      docs: settings.debug ? '/docs' : 'Not available',
    });
  });

  app.use('/jotform', jotformWebhookRouter);
  app.use('/intake', intakeRouter);
  app.use('/track', trackRouter);
  app.use('/mandals', mandalsRouter);
  app.use('/bhaktos', bhaktosRouter);
  app.use('/vehicles', vehiclesRouter);
  app.use('/admin-users', adminUsersRouter);
  app.use('/sarthi', sarthiRouter);
  app.use('/email', emailRouter);
  app.use('/templates', templatesRouter);
  app.use('/flight-groups', flightGroupsRouter);
  app.use('/assignments', assignmentsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.listen(settings.api_port, settings.api_host, () => {
    logger.info(`Listening on http://${settings.api_host}:${settings.api_port}`);
  });
}

main().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
