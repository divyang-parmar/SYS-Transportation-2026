import 'dotenv/config';
import { z } from 'zod';

const boolish = z
  .string()
  .optional()
  .transform((v) => {
    if (v === undefined) return false;
    return ['1', 'true', 'True', 'TRUE', 'yes', 'YES'].includes(v.trim());
  });

const intWithDefault = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .pipe(z.number().int());

const schema = z.object({
  MONGODB_URI: z.string().refine((v) => v.startsWith('mongodb'), {
    message: "Invalid MongoDB URI: must start with 'mongodb' or 'mongodb+srv'",
  }),
  MONGODB_DATABASE: z.string().default('SPS-Transportation-Admin'),
  MONGODB_COLLECTION: z.string().default('jotform_submissions'),
  FLIGHT_DETAILS_COLLECTION: z.string().default('flight_details'),
  BOOKINGS_COLLECTION: z.string().default('bookings'),
  VEHICLES_COLLECTION: z.string().default('vehicles'),
  ADMIN_USERS_COLLECTION: z.string().default('admin_users'),
  SARTHI_COLLECTION: z.string().default('sarthi'),
  TEMPLATES_COLLECTION: z.string().default('notification_templates'),
  MANDALS_COLLECTION: z.string().default('mandals'),
  ASSIGNMENTS_COLLECTION: z.string().default('assignments'),

  AERO_API_KEY: z.string().default(''),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),

  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_FROM_NUMBER: z.string().default(''),
  TWILIO_WHATSAPP_FROM: z.string().default(''),

  SENDGRID_API_KEY: z.string().default(''),
  SENDGRID_FROM_EMAIL: z.string().default(''),
  SENDGRID_FROM_NAME: z.string().default('SPS Transportation Team'),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: intWithDefault(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  SMTP_FROM_NAME: z.string().default('SPS Transportation Team'),

  JOTFORM_API_KEY: z.string().min(1),
  JOTFORM_FORM_ID: z.string().default('231615575331049'),
  JOTFORM_WEBHOOK_SECRET: z.string().min(1),

  ENVIRONMENT: z.enum(['development', 'production']).default('development'),
  DEBUG: boolish,
  LOG_LEVEL: z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']).default('INFO'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: intWithDefault(8000).pipe(z.number().int().min(1).max(65535)),
  ALLOWED_ORIGINS: z.string().default('*'),
  APP_URL: z.string().default('http://localhost:5173'),

  WEBHOOK_TIMEOUT_SECONDS: intWithDefault(30).pipe(z.number().int().positive()),
  MAX_REQUESTS_PER_MINUTE: intWithDefault(100).pipe(z.number().int().positive()),
  REQUEST_SIZE_LIMIT_MB: intWithDefault(10).pipe(z.number().int().positive()),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Environment validation failed:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const env = parsed.data;

export const settings = {
  mongodb_uri: env.MONGODB_URI,
  mongodb_database: env.MONGODB_DATABASE,
  mongodb_collection: env.MONGODB_COLLECTION,
  flight_details_collection: env.FLIGHT_DETAILS_COLLECTION,
  bookings_collection: env.BOOKINGS_COLLECTION,
  vehicles_collection: env.VEHICLES_COLLECTION,
  admin_users_collection: env.ADMIN_USERS_COLLECTION,
  sarthi_collection: env.SARTHI_COLLECTION,
  templates_collection: env.TEMPLATES_COLLECTION,
  mandals_collection: env.MANDALS_COLLECTION,
  assignments_collection: env.ASSIGNMENTS_COLLECTION,

  aero_api_key: env.AERO_API_KEY,

  google_client_id: env.GOOGLE_CLIENT_ID,
  google_client_secret: env.GOOGLE_CLIENT_SECRET,

  twilio_account_sid: env.TWILIO_ACCOUNT_SID,
  twilio_auth_token: env.TWILIO_AUTH_TOKEN,
  twilio_from_number: env.TWILIO_FROM_NUMBER,
  twilio_whatsapp_from: env.TWILIO_WHATSAPP_FROM,

  sendgrid_api_key: env.SENDGRID_API_KEY,
  sendgrid_from_email: env.SENDGRID_FROM_EMAIL,
  sendgrid_from_name: env.SENDGRID_FROM_NAME,

  smtp_host: env.SMTP_HOST,
  smtp_port: env.SMTP_PORT,
  smtp_user: env.SMTP_USER,
  smtp_password: env.SMTP_PASSWORD,
  smtp_from_name: env.SMTP_FROM_NAME,

  jotform_api_key: env.JOTFORM_API_KEY,
  jotform_form_id: env.JOTFORM_FORM_ID,
  jotform_webhook_secret: env.JOTFORM_WEBHOOK_SECRET,

  environment: env.ENVIRONMENT,
  debug: env.DEBUG,
  log_level: env.LOG_LEVEL,
  api_host: env.API_HOST,
  api_port: env.API_PORT,
  allowed_origins: env.ALLOWED_ORIGINS,
  app_url: env.APP_URL,

  webhook_timeout_seconds: env.WEBHOOK_TIMEOUT_SECONDS,
  max_requests_per_minute: env.MAX_REQUESTS_PER_MINUTE,
  request_size_limit_mb: env.REQUEST_SIZE_LIMIT_MB,

  get is_production() {
    return env.ENVIRONMENT === 'production';
  },
};

export const PINO_LEVEL = (() => {
  const map: Record<string, string> = {
    DEBUG: 'debug',
    INFO: 'info',
    WARNING: 'warn',
    ERROR: 'error',
    CRITICAL: 'fatal',
  };
  return map[env.LOG_LEVEL] || 'info';
})();
