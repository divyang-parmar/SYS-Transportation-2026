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
— Airport Transportation"""


def _build_assignment_html(variables: dict) -> str:
    passenger_name = variables.get("passenger_name", "")
    sarthi_name = variables.get("sarthi_name", "")
    sarthi_phone = variables.get("sarthi_phone", "")
    flight_number = variables.get("flight_number", "")
    pickup_date = variables.get("pickup_date", "")
    pickup_time = variables.get("pickup_time", "")
    vehicle_make = variables.get("vehicle_make", "")
    vehicle_name = variables.get("vehicle_name", "")
    vehicle_number = variables.get("vehicle_number", "")

    # Vehicle section only if at least one vehicle field is non-empty
    vehicle_section = ""
    if any([vehicle_make, vehicle_name, vehicle_number]):
        vehicle_display = f"{vehicle_make} {vehicle_name} ({vehicle_number})".strip()
        vehicle_section = f"""
                <div class="info-box">
                  <div class="info-label">Vehicle</div>
                  <div class="info-value">{vehicle_display}</div>
                </div>"""

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
    .greeting {{ font-size: 15px; line-height: 24px; color: #334155; margin: 0 0 24px 0; }}
    .info-box {{ background-color: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; border: 1px solid #f1f5f9; }}
    .info-label {{ font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }}
    .info-value {{ font-size: 15px; font-weight: 600; color: #1e293b; }}
    .info-row {{ margin-bottom: 12px; }}
    .info-row:last-child {{ margin-bottom: 0; }}
    .footer {{ text-align: center; padding: 24px 20px 0 20px; font-size: 12px; line-height: 18px; color: #94a3b8; }}
  </style>
</head>
<body>
  <center class="wrapper">
    <table class="main-table" role="presentation">
      <tr>
          <td style="background:#0c71c3;padding:28px 32px;text-align:center">
            <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">
              <img data-emoji="✈" class="an1 CToWUd" alt="✈" aria-label="✈" draggable="false" src="https://fonts.gstatic.com/s/e/notoemoji/17.0/2708/72.png" loading="lazy" data-bit="iit"> Suharadam Parivar Shibir Transportation Management
            </div>
          </td>
      </tr>
      <tr>
        <td style="padding:28px 32px">
          <table class="card" role="presentation" width="100%">
            <tr>
              <td>
                <h1 class="title">Pickup Confirmation</h1>
                <p class="greeting">Hi {passenger_name},</p>
                <p style="font-size: 15px; line-height: 24px; color: #334155; margin: 0 0 24px 0;">Your Sarthi has been assigned to pick you up for your flight.</p>

                <div class="info-box">
                  <div class="info-label">Your Sarthi</div>
                  <div class="info-row">
                    <div class="info-value">{sarthi_name}</div>
                  </div>
                  <div class="info-row">
                    <div class="info-value">{sarthi_phone}</div>
                  </div>
                </div>

                <div class="info-box">
                  <div class="info-label">Flight Details</div>
                  <div class="info-row">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px;">Flight Number</div>
                    <div class="info-value">{flight_number}</div>
                  </div>
                  <div class="info-row">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px;">Date</div>
                    <div class="info-value">{pickup_date}</div>
                  </div>
                  <div class="info-row">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px;">Time</div>
                    <div class="info-value">{pickup_time}</div>
                  </div>
                </div>
{vehicle_section}
                <p style="font-size: 15px; line-height: 24px; color: #334155; margin: 24px 0 0 0;">See you soon!<br>— Airport Transportation</p>
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
    body_html = body_text.replace("\n", "<br>")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPS Access Invitation</title>
  <style>
    body {{ margin: 0; padding: 0; background-color: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; }}
    table {{ border-spacing: 0; width: 100%; }}
    td {{ padding: 0; }}
    img {{ border: 0; }}
    .wrapper {{ width: 100%; table-layout: fixed; background-color: #f4f6f9; padding-bottom: 40px; }}
    .main-table {{ width: 100%; max-width: 500px; margin: 0 auto; background-color: #f4f6f9; }}
    .header {{ padding: 32px 20px 24px 20px; text-align: center; }}
    .header h2 {{ margin: 0; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1e3a8a; }}
    .header p {{ margin: 4px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500; }}
    .card {{ background-color: #ffffff; border-radius: 12px; padding: 32px 24px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
    .title {{ margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #0f172a; text-align: center; }}
    .greeting {{ font-size: 15px; line-height: 24px; color: #334155; margin: 0 0 24px 0; }}
    .info-box {{ background-color: #f8fafc; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; border: 1px solid #f1f5f9; }}
    .info-label {{ font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 4px; }}
    .info-value {{ font-size: 15px; font-weight: 600; color: #1e293b; }}
    .role-badge {{ display: inline-block; background-color: #eff6ff; color: #2563eb; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-weight: 700; margin-top: 2px; }}
    .btn-container {{ text-align: center; margin: 28px 0 12px 0; }}
    .btn {{ background-color: #2563eb; color: #ffffff !important; display: inline-block; padding: 12px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2); }}
    .footer {{ text-align: center; padding: 24px 20px 0 20px; font-size: 12px; line-height: 18px; color: #94a3b8; }}
  </style>
</head>
<body>
  <center class="wrapper">
    <table class="main-table" role="presentation">

      <tr>
          <td style="background:#0c71c3;padding:28px 32px;text-align:center">
            <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">
              <img data-emoji="✈" class="an1 CToWUd" alt="✈" aria-label="✈" draggable="false" src="https://fonts.gstatic.com/s/e/notoemoji/17.0/2708/72.png" loading="lazy" data-bit="iit"> Suharadam Parivar Shibir Transportation Management
            </div>
            <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px">
              Secure Access Invitation
            </div>
          </td>
      </tr>
      
      <tr>
        <td style="padding:28px 32px;text-align:center">
          <table class="card" role="presentation" width="100%">
            <tr>
              <td>
                <h1 class="title">Secure Access Invitation</h1>

                <p class="greeting">
                  Hi {name},
                </p>

                <p class="greeting">
                  You've been invited to the SPS Transportation Management App 
                </p>

                <div class="info-box">
                  <div class="info-label">Assigned Role</div>
                  <div class="role-badge">{role_label}</div>
                  {f'<div style="font-size:12px;color:#64748b;margin-top:8px;">{role_desc}</div>' if role_desc else ''}
                </div>

                <div class="info-box">
                  <div class="info-label">Authorized Login Email</div>
                  <div class="info-value">{email}</div>
                </div>

                <div class="btn-container">
                  <a href="{app_url}" class="btn" target="_blank">Go to Application &rarr;</a>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <tr>
        <td class="footer">
          This invitation was generated by an Admin.<br>
          If you were not expecting this access request, you can safely ignore this email.
        </td>
      </tr>

    </table>
  </center>
</body>
</html>"""


async def _send_assignment_via_sendgrid(to_email: str, to_name: str, subject: str, body_text: str, variables: dict) -> bool:
    payload = {
        "personalizations": [{"to": [{"email": to_email, "name": to_name}]}],
        "from": {"email": settings.sendgrid_from_email, "name": settings.sendgrid_from_name},
        "subject": subject,
        "content": [
            {"type": "text/plain", "value": body_text},
            {"type": "text/html",  "value": _build_assignment_html(variables)},
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


def _send_assignment_via_smtp(to_email: str, to_name: str, subject: str, body_text: str, variables: dict) -> None:
    from_addr = formataddr((settings.smtp_from_name, settings.smtp_user))
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = from_addr
    msg["To"]      = to_email

    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(_build_assignment_html(variables), "html"))

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


async def send_assignment_email(to_email: str, to_name: str, subject: str, body_text: str, variables: dict) -> bool:
    # Prefer SendGrid (HTTPS/443, works on Render free tier)
    if settings.sendgrid_api_key and settings.sendgrid_from_email:
        try:
            return await _send_assignment_via_sendgrid(to_email, to_name, subject, body_text, variables)
        except Exception as exc:
            logger.error("Failed to send assignment email via SendGrid to %s: %s", to_email, exc)
            return False

    # Fall back to SMTP (works locally, blocked on Render free tier)
    if settings.smtp_user and settings.smtp_password:
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, _send_assignment_via_smtp, to_email, to_name, subject, body_text, variables)
            logger.info("Assignment email sent via SMTP to %s", to_email)
            return True
        except Exception as exc:
            logger.error("Failed to send assignment email via SMTP to %s: %s", to_email, exc)
            return False

    logger.warning("No email provider configured — skipping assignment email for %s", to_email)
    return False
