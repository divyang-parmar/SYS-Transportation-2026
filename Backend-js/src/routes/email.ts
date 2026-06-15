import { Router } from 'express';
import { Template } from '../models/index.js';
import { ROLE_LABELS, sendInviteEmail } from '../services/email_service.js';
import { ah } from '../util/asyncHandler.js';
import { HttpError } from '../middleware/error.js';

const DEFAULT_SUBJECT = "You're invited to SPS Transportation App";
const DEFAULT_BODY =
  'Hi {{name}},\n\n' +
  "You've been invited to the SPS Transportation App as {{role}}.\n\n" +
  'Login with your email: {{email}}\n\n' +
  'Open the app at: {{app_url}}\n\n' +
  "This invitation was sent by a Super Admin. If you weren't expecting this, you can safely ignore this email.";

function substitute(text: string, variables: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(variables)) {
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

export const emailRouter = Router();

emailRouter.post(
  '/send-invite',
  ah(async (req, res) => {
    const body = req.body ?? {};
    if (!body.name || !body.email || !body.role) {
      throw new HttpError(422, 'name, email, role required');
    }
    const doc: any = await Template.findOne({ _id: 'email-invite', deleted: { $ne: true } }).lean();
    const rawSubject = doc && doc.subject ? doc.subject : DEFAULT_SUBJECT;
    const rawBody = doc && doc.body ? doc.body : DEFAULT_BODY;

    const variables = {
      name: String(body.name),
      email: String(body.email),
      role: ROLE_LABELS[body.role] ?? String(body.role),
      app_url: 'https://sps-transportation-2026.vercel.app/',
    };

    const subject = substitute(rawSubject, variables);
    const bodyText = substitute(rawBody, variables);
    const sent = await sendInviteEmail(body.name, body.email, body.role, subject, bodyText, variables.app_url);
    res.json({ sent, email: body.email });
  })
);
