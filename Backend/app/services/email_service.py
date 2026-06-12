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
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPS Access Invitation</title>
  <style>
    body {{ margin: 0; padding: 0; background: linear-gradient(135deg, #0c71c3 0%, #0856a8 100%); min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }}
    table {{ border-spacing: 0; width: 100%; }}
    td {{ padding: 0; }}
    .wrapper {{ width: 100%; table-layout: fixed; padding: 40px 20px; }}
    .main-table {{ width: 100%; max-width: 500px; margin: 0 auto; }}
    .header-section {{ text-align: center; padding: 40px 32px; color: #ffffff; }}
    .icon-box {{ display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; background-color: rgba(255, 255, 255, 0.2); border-radius: 20px; margin-bottom: 24px; font-size: 40px; }}
    .header-title {{ font-size: 28px; font-weight: 700; margin: 0 0 8px 0; line-height: 1.2; }}
    .header-subtitle {{ font-size: 20px; font-weight: 600; margin: 0 0 20px 0; opacity: 0.95; }}
    .header-badge {{ display: inline-block; background-color: rgba(255, 255, 255, 0.25); color: #ffffff; padding: 10px 20px; border-radius: 20px; font-size: 13px; font-weight: 600; }}
    .card {{ background-color: #ffffff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1); margin-top: -20px; position: relative; z-index: 1; }}
    .greeting {{ font-size: 16px; line-height: 24px; color: #1f2937; margin: 0 0 16px 0; }}
    .greeting-name {{ font-weight: 700; color: #0f172a; }}
    .greeting-intro {{ font-size: 16px; line-height: 24px; color: #1f2937; margin: 0 0 28px 0; }}
    .intro-app {{ font-weight: 700; color: #0f172a; }}
    .info-row {{ display: table; width: 100%; margin-bottom: 20px; }}
    .info-icon-cell {{ display: table-cell; vertical-align: top; padding-right: 16px; width: 50px; }}
    .info-icon {{ width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }}
    .icon-person {{ background-color: #dbeafe; }}
    .icon-envelope {{ background-color: #f3f4f6; }}
    .info-content {{ display: table-cell; vertical-align: top; }}
    .info-label {{ font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-bottom: 6px; }}
    .info-value {{ font-size: 16px; font-weight: 700; color: #0c71c3; }}
    .info-desc {{ font-size: 13px; color: #6b7280; line-height: 1.5; margin-top: 6px; }}
    .btn-container {{ text-align: center; margin: 32px 0 0 0; }}
    .btn {{ background: linear-gradient(135deg, #0c71c3 0%, #0856a8 100%); color: #ffffff !important; display: inline-block; padding: 14px 40px; font-size: 16px; font-weight: 700; text-decoration: none; border-radius: 12px; width: 100%; box-sizing: border-box; text-align: center; }}
    .footer-section {{ background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-top: 24px; text-align: center; }}
    .footer-text {{ font-size: 12px; line-height: 18px; color: #9ca3af; margin: 0; }}
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main-table" role="presentation">
      <tr>
        <td>
          <div class="header-section">
            <div class="icon-box">✈</div>
            <div class="header-title">Suharadam Parivar Shibir</div>
            <div class="header-subtitle">Transportation Management</div>
            <div class="header-badge">🛡 Secure Access Invitation</div>
          </div>

          <div class="card">
            <p class="greeting">Hi <span class="greeting-name">{name}</span>,</p>
            <p class="greeting-intro">You've been invited to the <span class="intro-app">SPS Transportation Management App</span></p>

            <div class="info-row">
              <div class="info-icon-cell">
                <div class="info-icon icon-person">👤</div>
              </div>
              <div class="info-content">
                <div class="info-label">Assigned Role</div>
                <div class="info-value">{role_label}</div>
                {f'<div class="info-desc">{role_desc}</div>' if role_desc else ''}
              </div>
            </div>

            <div class="info-row">
              <div class="info-icon-cell">
                <div class="info-icon icon-envelope">✉</div>
              </div>
              <div class="info-content">
                <div class="info-label">Authorized Login Email</div>
                <div class="info-value">{email}</div>
              </div>
            </div>

            <div class="btn-container">
              <a href="{app_url}" class="btn" target="_blank">Go to Application →</a>
            </div>

            <div class="footer-section">
              <p class="footer-text">This invitation was generated by an Admin.<br>If you were not expecting this access request, you can safely ignore this email.</p>
            </div>
          </div>
        </td>
      </tr>
    </table>
  </div>
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
