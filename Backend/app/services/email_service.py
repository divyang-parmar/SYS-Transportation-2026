import logging
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

ROLE_LABELS = {
    "transportation_admin": "Transportation Admin",
    "driver": "Sarthi",
    "super_admin": "Super Admin",
}

ROLE_DESCRIPTIONS = {
    "super_admin":          "Manage users, roles, vehicles, notification templates, and all transportation operations.",
    "transportation_admin": "Manage flight groups, assign Sarthis to passengers, and oversee transportation logistics.",
    "driver":               "View your assigned passengers and pickup schedule. Pick up and drop off passengers as assigned.",
}

DEFAULT_SARTHI_ASSIGNED_EMAIL_SUBJECT = "Your Sarthi is on the way — {{flight_number}}"
DEFAULT_SARTHI_ASSIGNED_EMAIL_BODY = """Dear {{passenger_name}},

Your Sarthi {{sarthi_name}} has been assigned to pick you up for flight {{flight_number}} on {{pickup_date}} at {{pickup_time}}.

Vehicle: {{vehicle_make}} {{vehicle_name}} ({{vehicle_number}})
Contact: {{sarthi_phone}}

See you soon!
— SPS Airport Transportation Team"""


def _build_assignment_html(body_text: str) -> str:
    body_html = body_text.replace("\n", "<br>")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pickup Confirmation</title>
  <style>
    body {{ margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }}
    table {{ border-spacing: 0; width: 100%; }}
    td {{ padding: 0; }}
    img {{ border: 0; }}
    .wrapper {{ width: 100%; table-layout: fixed; background-color: #f4f6f9; padding-bottom: 40px; }}
    .main-table {{ width: 100%; max-width: 500px; margin: 0 auto; background-color: #f4f6f9; }}
    .card {{ background-color: #ffffff; border-radius: 12px; padding: 32px 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); margin-top: 28px; }}
    .title {{ margin: 0 0 24px 0; font-size: 20px; font-weight: 700; color: #0f172a; }}
    .body-text {{ font-size: 15px; line-height: 24px; color: #334155; }}
    .footer {{ text-align: center; padding: 24px 20px 0 20px; font-size: 12px; line-height: 18px; color: #94a3b8; }}
  </style>
</head>
<body>
  <center class="wrapper">
    <table class="main-table" role="presentation">
      <tr>
          <td style="background:#0c71c3;padding:28px 32px;text-align:center">
            <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">
              ✈ Suharadam Parivar Shibir Transportation Management
            </div>
          </td>
      </tr>
      <tr>
        <td style="padding:28px 32px">
          <table class="card" role="presentation" width="100%">
            <tr>
              <td>
                <h1 class="title">Pickup Confirmation</h1>
                <p class="body-text">{body_html}</p>
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
</html>"""


def _build_html(name: str, email: str, role: str, body_text: str, app_url: str = "") -> str:
    role_label = ROLE_LABELS.get(role, role)
    role_desc = ROLE_DESCRIPTIONS.get(role, "")
    role_desc_html = (
        f'<p style="margin:0;font-size:14px;line-height:20px;color:#6b7280;">{role_desc}</p>'
        if role_desc
        else ""
    )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPS Access Invitation</title>
  <style>
    body {{ margin: 0; padding: 0; background-color: #f4f5f7; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; }}
    table {{ border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    a {{ text-decoration: none; }}
    .mobile-padding td {{ padding: 20px !important; }}
    .mobile-heading {{ font-size: 24px !important; line-height: 32px !important; }}
    .mobile-body {{ font-size: 15px !important; line-height: 24px !important; }}
    .button-link {{ width: auto !important; }}
    @media screen and (max-width: 600px) {{
      .wrapper-table {{ width: 100% !important; min-width: 100% !important; }}
      .stacked-pad {{ padding: 20px !important; }}
      .mobile-heading {{ font-size: 24px !important; line-height: 32px !important; }}
      .mobile-body {{ font-size: 15px !important; line-height: 24px !important; }}
      .button-link {{ display: block !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;">
  <center style="width:100%;background-color:#f4f5f7;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#f4f5f7;">
      <tr>
        <td align="center" style="padding:20px 0;">
          <table class="wrapper-table" width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:600px;max-width:600px;">
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#2563eb;background-image:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%);border-radius:16px 16px 0 0;">
                  <tr>
                    <td align="center" style="padding:28px 24px;">
                      <div style="display:inline-flex;align-items:center;justify-content:center;width:64px;height:64px;border-radius:50%;background-color:rgba(255,255,255,0.15);font-size:34px;line-height:34px;color:#ffffff;margin:0 auto 16px auto;">✈</div>
                      <table align="center" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 auto 12px auto;background-color:#ffffff;border-radius:999px;">
                        <tr>
                          <td style="padding:6px 14px;font-size:12px;line-height:16px;color:#2563eb;font-weight:700;">🛡 Secure Invitation</td>
                        </tr>
                      </table>
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
                    <td class="stacked-pad" style="padding:32px;">
                      <p style="margin:0 0 16px 0;font-size:16px;line-height:24px;color:#0f172a;">Hi <strong style="font-weight:700;color:#0f172a;">{name}</strong>,</p>
                      <p style="margin:0 0 20px 0;font-size:16px;line-height:24px;color:#334155;">You've been invited to the <strong style="color:#0f172a;">SPS Transportation Management App</strong>.</p>

                      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 18px 0;">
                        <tr>
                          <td width="64" valign="top" style="padding-right:16px;">
                            <table width="48" height="48" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#dbeafe;border-radius:12px;">
                              <tr>
                                <td align="center" valign="middle" style="padding:12px;font-size:20px;line-height:20px;">👤</td>
                              </tr>
                            </table>
                          </td>
                          <td valign="top" style="padding:0;">
                            <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;font-weight:700;">Assigned Role</p>
                            <p style="margin:0 0 6px 0;font-size:16px;font-weight:600;color:#1d4ed8;">{role_label}</p>
                            {role_desc_html}
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 0 28px 0;">
                        <tr>
                          <td width="64" valign="top" style="padding-right:16px;">
                            <table width="48" height="48" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#ede9fe;border-radius:12px;">
                              <tr>
                                <td align="center" valign="middle" style="padding:12px;font-size:20px;line-height:20px;">✉</td>
                              </tr>
                            </table>
                          </td>
                          <td valign="top" style="padding:0;">
                            <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#6b7280;font-weight:700;">Authorized Login Email</p>
                            <p style="margin:0;font-size:16px;font-weight:600;color:#7c3aed;">{email}</p>
                          </td>
                        </tr>
                      </table>

                      <div style="text-align:center;">
                        <!--[if mso]>
                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{app_url}" style="height:46px;v-text-anchor:middle;width:240px;" arcsize="16%" strokecolor="#2563eb" fillcolor="#2563eb">
                          <w:anchorlock/>
                          <center style="color:#ffffff;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:16px;font-weight:700;">Go to Application →</center>
                        </v:roundrect>
                        <![endif]-->
                        <a href="{app_url}" class="button-link" style="background-color:#2563eb;color:#ffffff;display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;border-radius:8px;border:1px solid #2563eb;">Go to Application →</a>
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
</html>"""


async def _send_assignment_via_sendgrid(to_email: str, to_name: str, subject: str, body_text: str) -> bool:
    payload = {
        "personalizations": [{"to": [{"email": to_email, "name": to_name}]}],
        "from": {"email": settings.sendgrid_from_email, "name": settings.sendgrid_from_name},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": body_text},
            {"type": "text/html",  "value": _build_assignment_html(body_text)},
        ],
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={"Authorization": f"Bearer {settings.sendgrid_api_key}"},
            json=payload,
        )
    if resp.status_code == 202:
        logger.info("Assignment email sent via SendGrid to %s", to_email)
        return True
    logger.error("SendGrid error %s for %s: %s", resp.status_code, to_email, resp.text)
    return False


def _send_assignment_via_smtp(to_email: str, to_name: str, subject: str, body_text: str) -> None:
    from_addr = formataddr((settings.smtp_from_name, settings.smtp_user))
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = from_addr
    msg["To"]      = to_email

    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(_build_assignment_html(body_text), "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, to_email, msg.as_string())


async def _send_via_sendgrid(name: str, to_email: str, role: str, subject: str, body_text: str, app_url: str = "") -> bool:
    payload = {
        "personalizations": [{"to": [{"email": to_email, "name": name}]}],
        "from": {"email": settings.sendgrid_from_email, "name": settings.sendgrid_from_name},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": body_text},
            {"type": "text/html",  "value": _build_html(name, to_email, role, body_text, app_url)},
        ],
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={"Authorization": f"Bearer {settings.sendgrid_api_key}"},
            json=payload,
        )
    if resp.status_code == 202:
        logger.info("Invite email sent via SendGrid to %s (%s)", to_email, role)
        return True
    logger.error("SendGrid error %s for %s: %s", resp.status_code, to_email, resp.text)
    return False


def _send_via_smtp(name: str, to_email: str, role: str, subject: str, body_text: str, app_url: str = "") -> None:
    from_addr = formataddr((settings.smtp_from_name, settings.smtp_user))
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = from_addr
    msg["To"]      = to_email

    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(_build_html(name, to_email, role, body_text, app_url), "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, to_email, msg.as_string())


async def send_invite_email(name: str, email: str, role: str, subject: str, body_text: str, app_url: str = "") -> bool:
    # Prefer SendGrid (HTTPS/443, works on Render free tier)
    if settings.sendgrid_api_key and settings.sendgrid_from_email:
        try:
            return await _send_via_sendgrid(name, email, role, subject, body_text, app_url)
        except Exception as exc:
            logger.error("Failed to send invite email via SendGrid to %s: %s", email, exc)
            return False

    # Fall back to SMTP (works locally, blocked on Render free tier)
    if settings.smtp_user and settings.smtp_password:
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, _send_via_smtp, name, email, role, subject, body_text, app_url)
            logger.info("Invite email sent via SMTP to %s (%s)", email, role)
            return True
        except Exception as exc:
            logger.error("Failed to send invite email via SMTP to %s: %s", email, exc)
            return False

    logger.warning("No email provider configured — skipping invite email for %s", email)
    return False


async def send_assignment_email(to_email: str, to_name: str, subject: str, body_text: str) -> bool:
    # Prefer SendGrid (HTTPS/443, works on Render free tier)
    if settings.sendgrid_api_key and settings.sendgrid_from_email:
        try:
            return await _send_assignment_via_sendgrid(to_email, to_name, subject, body_text)
        except Exception as exc:
            logger.error("Failed to send assignment email via SendGrid to %s: %s", to_email, exc)
            return False

    # Fall back to SMTP (works locally, blocked on Render free tier)
    if settings.smtp_user and settings.smtp_password:
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, _send_assignment_via_smtp, to_email, to_name, subject, body_text)
            logger.info("Assignment email sent via SMTP to %s", to_email)
            return True
        except Exception as exc:
            logger.error("Failed to send assignment email via SMTP to %s: %s", to_email, exc)
            return False

    logger.warning("No email provider configured — skipping assignment email for %s", to_email)
    return False
