import axios from 'axios';
import { settings } from '../config.js';
import { logger } from '../logger.js';

const TWILIO_URL = (sid: string) =>
  `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;

export const DEFAULT_SARTHI_ASSIGNED_BODY =
  'Dear {{passenger_name}}, your Sarthi {{sarthi_name}} will pick you up for flight ' +
  '{{flight_number}} on {{pickup_date}} at {{pickup_time}}.\n\n' +
  'Vehicle: {{vehicle_make}} {{vehicle_name}} ({{vehicle_number}})\n' +
  'Contact: {{sarthi_phone}}\n\n' +
  'Track live: {{tracking_url}}\n\n' +
  '- SPS Airport Transportation Team';

export const DEFAULT_INTAKE_CONFIRMATION_SMS_BODY =
  'Hi {{passenger_name}}, we got your transportation request for Suhradam Parivar Shibir. ' +
  'Track your Sarthi assignment here: {{tracking_url}}\n' +
  'Ref: {{reference}}';

export function renderTemplate(body: string, variables: Record<string, unknown>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const v = variables[key.trim()];
    return v === undefined || v === null ? '' : String(v);
  });
}

function normalisePhone(to: string): string {
  let cleaned = to.replace(/[\s\-()]/g, '');
  if (cleaned && !cleaned.startsWith('+')) {
    cleaned = '+1' + cleaned.replace(/^1+/, '');
  }
  return cleaned;
}

async function twilioSend(from: string, to: string, body: string, channel: 'sms' | 'whatsapp'): Promise<boolean> {
  const sid = settings.twilio_account_sid;
  const token = settings.twilio_auth_token;
  if (!(sid && token && from)) {
    logger.warn(`Twilio not configured — ${channel} skipped (to=${to})`);
    return false;
  }
  try {
    const form = new URLSearchParams();
    form.set('From', from);
    form.set('To', to);
    form.set('Body', body);
    const resp = await axios.post(TWILIO_URL(sid), form.toString(), {
      auth: { username: sid, password: token },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10_000,
      validateStatus: () => true,
    });
    if (resp.status < 200 || resp.status >= 300) {
      logger.error(`${channel} failed to ${to}: HTTP ${resp.status} — ${JSON.stringify(resp.data)}`);
      return false;
    }
    logger.info(`${channel} sent to ${to}`);
    return true;
  } catch (exc) {
    logger.error({ exc }, `${channel} failed to ${to}`);
    return false;
  }
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const from = settings.twilio_from_number;
  if (!from) {
    logger.warn(`No TWILIO_FROM_NUMBER configured — SMS skipped (to=${to})`);
    return false;
  }
  const cleaned = normalisePhone(to);
  return twilioSend(from, cleaned, body, 'sms');
}

export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const from = settings.twilio_whatsapp_from;
  if (!from) {
    logger.info(`No TWILIO_WHATSAPP_FROM configured — WhatsApp skipped (to=${to})`);
    return false;
  }
  const cleaned = normalisePhone(to);
  const waFrom = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
  const waTo = `whatsapp:${cleaned}`;
  return twilioSend(waFrom, waTo, body, 'whatsapp');
}

export type NotifyResult = { whatsapp: boolean };

// Passenger-facing notify: WhatsApp only. SMS is NOT attempted here by design — passengers
// communicate via WhatsApp (cheap) or email fallback (handled by caller). For admin/internal
// SMS use cases, call sendSms() directly.
export async function notify(to: string, body: string): Promise<NotifyResult> {
  const whatsapp = await sendWhatsApp(to, body);
  if (whatsapp) {
    logger.info(`notify via WhatsApp succeeded for ${to}`);
  } else {
    logger.info(`notify via WhatsApp failed for ${to} — caller should fall back to email`);
  }
  return { whatsapp };
}
