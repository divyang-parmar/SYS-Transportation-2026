import { timingSafeEqual } from 'node:crypto';
import { settings } from '../config.js';

export function validateToken(token: string | undefined | null): boolean {
  if (!token) return false;
  // Constant-time compare to match the Python hmac.compare_digest semantics.
  const a = Buffer.from(token);
  const b = Buffer.from(settings.jotform_webhook_secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function validateFormId(formId: string): boolean {
  return formId === settings.jotform_form_id;
}
