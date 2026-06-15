import axios from 'axios';
import { settings } from '../config.js';
import { logger } from '../logger.js';

export const ROLE_LABELS: Record<string, string> = {
  transportation_admin: 'Transportation Admin',
  driver: 'Sarthi',
  super_admin: 'Super Admin',
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  super_admin:
    'Manage users, roles, vehicles, notification templates, and all transportation operations.',
  transportation_admin:
    'Manage flight groups, assign Sarthis to passengers, and oversee transportation logistics.',
  driver:
    'View your assigned passengers and pickup schedule. Pick up and drop off passengers as assigned.',
};

export const DEFAULT_SARTHI_ASSIGNED_EMAIL_SUBJECT =
  'Your Sarthi is on the way — {{flight_number}}';
export const DEFAULT_SARTHI_ASSIGNED_EMAIL_BODY = `Dear {{passenger_name}},

Your Sarthi {{sarthi_name}} has been assigned to pick you up for flight {{flight_number}} on {{pickup_date}} at {{pickup_time}}.

Vehicle: {{vehicle_make}} {{vehicle_name}} ({{vehicle_number}})
Contact: {{sarthi_phone}}

Track their live position: {{tracking_url}}

See you soon!
— SPS Airport Transportation Team`;

function buildAssignmentHtml(bodyText: string): string {
  const bodyHtml = bodyText.replace(/\n/g, '<br>');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pickup Confirmation</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }
    table { border-spacing: 0; width: 100%; }
    td { padding: 0; }
    img { border: 0; }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f4f6f9; padding-bottom: 40px; }
    .main-table { width: 100%; max-width: 500px; margin: 0 auto; background-color: #f4f6f9; }
    .card { background-color: #ffffff; border-radius: 12px; padding: 32px 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin-top: 28px; }
    .title { margin: 0 0 24px 0; font-size: 20px; font-weight: 700; color: #0f172a; }
    .body-text { font-size: 15px; line-height: 24px; color: #334155; }
    .footer { text-align: center; padding: 24px 20px 0 20px; font-size: 12px; line-height: 18px; color: #94a3b8; }
  </style>
</head>
<body>
  <center class="wrapper">
    <table class="main-table" role="presentation">
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#2563eb;background-image:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);border-radius:16px 16px 0 0;">
            <tr>
              <td align="center" style="padding:28px 24px;">
                <table align="center" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 auto 16px auto;">
                  <tr>
                    <td align="center" valign="middle" style="width:64px;height:64px;border-radius:50%;background-color:rgba(255,255,255,0.15);padding:12px;font-size:34px;line-height:34px;color:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;text-align:center;vertical-align:middle;">&#9992;</td>
                  </tr>
                </table>
                <table align="center" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 auto 12px auto;background-color:#ffffff;border-radius:999px;">
                  <tr>
                    <td style="padding:6px 14px;font-size:12px;line-height:16px;color:#ffffff;font-weight:700;">Pickup Notification</td>
                  </tr>
                </table>
                <h1 style="margin:0;font-size:20px;line-height:24px;font-weight:700;color:#ffffff;">Pickup Confirmation</h1>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:28px 32px">
          <table class="card" role="presentation" width="100%">
            <tr>
              <td>
                <h1 class="title">Pickup Confirmation</h1>
                <p class="body-text">${bodyHtml}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="footer">
          You have received this email because a Sarthi has been assigned to your transportation.
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

function buildInviteHtml(name: string, email: string, role: string, _bodyText: string, appUrl = ''): string {
  const roleLabel = ROLE_LABELS[role] ?? role;
  const roleDesc = ROLE_DESCRIPTIONS[role] ?? '';
  const roleDescHtml = roleDesc
    ? `<p style="margin:0;font-size:14px;line-height:20px;color:#6b7280;">${roleDesc}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPS Access Invitation</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
  <center style="width:100%;background-color:#f4f5f7;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#f4f5f7;">
      <tr>
        <td align="center" style="padding:20px 0;">
          <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:600px;max-width:600px;">
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#2563eb;background-image:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);border-radius:16px 16px 0 0;">
                  <tr>
                    <td align="center" style="padding:28px 24px;">
                      <h1 style="margin:0;font-size:32px;line-height:38px;font-weight:700;color:#ffffff;">You're Invited</h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 0 24px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#ffffff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="padding:32px;">
                      <p style="margin:0 0 16px 0;font-size:16px;line-height:24px;color:#0f172a;">Hi <strong style="font-weight:700;color:#0f172a;">${name}</strong>,</p>
                      <p style="margin:0 0 20px 0;font-size:16px;line-height:24px;color:#334155;">Welcome to SPS 2026! Access Your <strong style="color:#0f172a;">SPS Transportation Management App</strong>.</p>
                      <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;font-weight:700;">Assigned Role</p>
                      <p style="margin:0 0 6px 0;font-size:16px;font-weight:600;color:#1d4ed8;">${roleLabel}</p>
                      ${roleDescHtml}
                      <p style="margin:18px 0 4px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;font-weight:700;">Authorized Login Email</p>
                      <p style="margin:0 0 24px 0;font-size:16px;font-weight:600;color:#7c3aed;">${email}</p>
                      <div style="text-align:center;">
                        <a href="${appUrl}" style="background-color:#2563eb;color:#ffffff;display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;border-radius:8px;border:1px solid #2563eb;text-decoration:none;">Go to Application &rarr;</a>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;">
                  <tr>
                    <td style="padding:16px;text-align:center;font-size:13px;line-height:20px;color:#6b7280;">
                      This invitation was generated by an Admin.<br>If you were not expecting this access request, you can safely ignore this email.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
}

async function sendgridSend(payload: Record<string, unknown>, to: string, label: string): Promise<boolean> {
  try {
    const resp = await axios.post('https://api.sendgrid.com/v3/mail/send', payload, {
      headers: { Authorization: `Bearer ${settings.sendgrid_api_key}` },
      timeout: 15_000,
      validateStatus: () => true,
    });
    if (resp.status === 202) {
      logger.info(`${label} email sent via SendGrid to ${to}`);
      return true;
    }
    logger.error(`SendGrid error ${resp.status} for ${to}: ${JSON.stringify(resp.data)}`);
    return false;
  } catch (exc) {
    logger.error({ exc }, `Failed to send ${label} email via SendGrid to ${to}`);
    return false;
  }
}

export async function sendInviteEmail(
  name: string,
  email: string,
  role: string,
  subject: string,
  bodyText: string,
  appUrl = ''
): Promise<boolean> {
  if (settings.sendgrid_api_key && settings.sendgrid_from_email) {
    const payload = {
      personalizations: [{ to: [{ email, name }] }],
      from: { email: settings.sendgrid_from_email, name: settings.sendgrid_from_name },
      subject,
      content: [
        { type: 'text/plain', value: bodyText },
        { type: 'text/html', value: buildInviteHtml(name, email, role, bodyText, appUrl) },
      ],
    };
    return sendgridSend(payload, email, 'Invite');
  }
  logger.warn(`No email provider configured — skipping invite email for ${email}`);
  return false;
}

export async function sendTrackingLinkEmail(
  toEmail: string,
  toName: string,
  trackingUrl: string,
  reference: string
): Promise<boolean> {
  if (!settings.sendgrid_api_key || !settings.sendgrid_from_email) {
    logger.warn(`No email provider configured — skipping tracking link email for ${toEmail}`);
    return false;
  }
  const subject = `Your SPS Transportation request — track #${reference}`;
  const bodyText = `Hi ${toName},

We've received your transportation request for Suhradam Parivar Shibir.

Track your Sarthi assignment and live location here:
${trackingUrl}

Reference: ${reference}

We'll be in touch soon.
— SPS Airport Transportation Team`;
  const html = `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#173D61;background:#F7F0E6;margin:0;padding:24px">
    <table cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:520px;background:#FFFFFF;border-radius:14px;border:1px solid #EADBC9;padding:28px">
      <tr><td>
        <h1 style="margin:0 0 8px;font-size:22px;color:#173D61">Hi ${toName.split(' ')[0] || toName},</h1>
        <p style="font-size:14.5px;line-height:1.6;color:#494D52">We've received your transportation request. Use the link below to track your Sarthi assignment and their live location.</p>
        <p style="text-align:center;margin:24px 0"><a href="${trackingUrl}" style="display:inline-block;background:#C0552F;color:#fff;padding:11px 22px;border-radius:9px;text-decoration:none;font-weight:600;font-size:14px">Track my pickup</a></p>
        <p style="font-size:13px;color:#9A8B7B;word-break:break-all">${trackingUrl}</p>
        <p style="font-size:12px;color:#9A8B7B;margin-top:18px">Reference: <code style="font-family:monospace">${reference}</code></p>
      </td></tr>
    </table>
  </body></html>`;
  const payload = {
    personalizations: [{ to: [{ email: toEmail, name: toName }] }],
    from: { email: settings.sendgrid_from_email, name: settings.sendgrid_from_name },
    subject,
    content: [
      { type: 'text/plain', value: bodyText },
      { type: 'text/html', value: html },
    ],
  };
  return sendgridSend(payload, toEmail, 'TrackingLink');
}

export async function sendAssignmentEmail(
  toEmail: string,
  toName: string,
  subject: string,
  bodyText: string
): Promise<boolean> {
  if (settings.sendgrid_api_key && settings.sendgrid_from_email) {
    const payload = {
      personalizations: [{ to: [{ email: toEmail, name: toName }] }],
      from: { email: settings.sendgrid_from_email, name: settings.sendgrid_from_name },
      subject,
      content: [
        { type: 'text/plain', value: bodyText },
        { type: 'text/html', value: buildAssignmentHtml(bodyText) },
      ],
    };
    return sendgridSend(payload, toEmail, 'Assignment');
  }
  logger.warn(`No email provider configured — skipping assignment email for ${toEmail}`);
  return false;
}
