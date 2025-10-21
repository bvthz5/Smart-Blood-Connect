import os
from flask import current_app

try:
    from twilio.rest import Client
except Exception:  # Twilio not installed yet
    Client = None

class SMSService:
    def __init__(self):
        self.account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        self.auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        self.from_number = os.environ.get("TWILIO_FROM")
        self.default_country_code = os.environ.get("DEFAULT_COUNTRY_CODE", "+91")
        self.client = None
        if Client and self.account_sid and self.auth_token:
            try:
                self.client = Client(self.account_sid, self.auth_token)
            except Exception as e:
                try:
                    current_app.logger.error(f"Failed to init Twilio client: {e}")
                except Exception:
                    pass

    def _normalize_e164(self, number: str) -> str:
        """Normalize a phone number to E.164. If it already starts with '+', assume valid.
        If it's 10 digits and DEFAULT_COUNTRY_CODE is set, prefix it. Otherwise return as-is.
        """
        if not number:
            return number
        n = number.strip().replace(" ", "")
        if n.startswith('+'):
            return n
        # keep only digits for check
        digits = ''.join(ch for ch in n if ch.isdigit())
        if len(digits) == 10 and self.default_country_code:
            return f"{self.default_country_code}{digits}"
        # fallback: if it looks like 11-15 digits, try prefixing + if missing
        if digits and 11 <= len(digits) <= 15:
            return f"+{digits}"
        return n

    def send_sms(self, to_number: str, body: str) -> bool:
        """Send SMS using Twilio; returns True if queued/sent, False otherwise."""
        # Dev fallback: if Twilio not configured, log and return True in DEBUG to unblock flows
        if not self.client or not self.from_number:
            try:
                if current_app and current_app.config.get('DEBUG', False):
                    current_app.logger.info(f"[DEV SMS] Would send to {to_number}: {body}")
                    return True
                if current_app:
                    current_app.logger.error("Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM")
            finally:
                pass
            return False
        try:
            to_e164 = self._normalize_e164(to_number)
            from_e164 = self._normalize_e164(self.from_number)
            msg = self.client.messages.create(
                body=body,
                from_=from_e164,
                to=to_e164
            )
            try:
                current_app.logger.info(f"Twilio SMS sent id={msg.sid} to={to_e164}")
            finally:
                pass
            return True
        except Exception as e:
            try:
                if current_app:
                    current_app.logger.error(f"Twilio SMS error to {to_number}: {e}")
            finally:
                pass
            return False

sms_service = SMSService()

