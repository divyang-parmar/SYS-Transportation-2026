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


def _body_to_html(body_text: str) -> str:
    """Convert plain-text template body (with \\n paragraph breaks) to HTML paragraphs."""
    paragraphs = body_text.split("\n\n")
    parts = []
    for para in paragraphs:
        inner = para.replace("\n", "<br>")
        parts.append(
            f'<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.7;">{inner}</p>'
        )
    return "\n".join(parts)


def _build_html(name: str, email: str, role: str, body_text: str) -> str:
    role_label = ROLE_LABELS.get(role, role)
    html_body  = _body_to_html(body_text)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're Invited</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#0C71C3;padding:28px 32px;text-align:center;">
              <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                &#9992; Suharadam Parivar Shibir Transportation Management
              </div>
              <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">
                Secure Access Invitation
              </div>
            </td>
          </tr>
          <!-- Role badge -->
          <tr>
            <td style="padding:24px 32px 0;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 16px;">
                    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;margin-bottom:3px;">Your Role</div>
                    <div style="font-size:15px;font-weight:600;color:#1d4ed8;">{role_label}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Template body -->
          <tr>
            <td style="padding:24px 32px 8px;">
              {html_body}
            </td>
          </tr>
          <!-- Login email box -->
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;padding:14px 16px;">
                <tr>
                  <td style="font-size:11px;text-transform:uppercase;letter-spacing:0.8px;color:#9ca3af;padding-bottom:6px;">Login Email</td>
                </tr>
                <tr>
                  <td style="font-size:14px;font-weight:600;color:#111827;">{email}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 32px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0C71C3;border-radius:8px;">
                    <a href="https://sps-transportation.app" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Open App &#8594;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent by Suharadam Parivar Shibir Transportation Management &nbsp;·&nbsp; noreply@sps-transportation.app
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def _send_via_resend(name: str, to_email: str, role: str, subject: str, body_text: str) -> bool:
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            json={
                "from": settings.resend_from,
                "to": [to_email],
                "subject": subject,
                "html": _build_html(name, to_email, role, body_text),
            },
        )
    if resp.status_code in (200, 201):
        logger.info("Invite email sent via Resend to %s (%s)", to_email, role)
        return True
    logger.error("Resend error %s for %s: %s", resp.status_code, to_email, resp.text)
    return False


def _send_via_smtp(name: str, to_email: str, role: str, subject: str, body_text: str) -> None:
    from_addr = formataddr((settings.smtp_from_name, settings.smtp_user))
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = from_addr
    msg["To"]      = to_email

    msg.attach(MIMEText(body_text, "plain"))
    msg.attach(MIMEText(_build_html(name, to_email, role, body_text), "html"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_user, to_email, msg.as_string())


async def send_invite_email(name: str, email: str, role: str, subject: str, body_text: str) -> bool:
    # Prefer Resend (HTTP-based, works on Render free tier)
    if settings.resend_api_key:
        try:
            return await _send_via_resend(name, email, role, subject, body_text)
        except Exception as exc:
            logger.error("Failed to send invite email via Resend to %s: %s", email, exc)
            return False

    # Fall back to SMTP (works locally, blocked on Render free tier)
    if settings.smtp_user and settings.smtp_password:
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(None, _send_via_smtp, name, email, role, subject, body_text)
            logger.info("Invite email sent via SMTP to %s (%s)", email, role)
            return True
        except Exception as exc:
            logger.error("Failed to send invite email via SMTP to %s: %s", email, exc)
            return False

    logger.warning("No email provider configured — skipping invite email for %s", email)
    return False
