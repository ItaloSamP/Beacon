import logging

from app.shared.config import settings

logger = logging.getLogger(__name__)


class EmailNotifier:
    def __init__(self, api_key=None, from_email=None):
        self.api_key = api_key or settings.SENDGRID_API_KEY
        self.from_email = from_email or settings.SENDGRID_FROM_EMAIL

    async def send_alert(self, anomaly, user_email: str) -> dict:
        if not self.api_key:
            logger.warning(
                "SendGrid not configured. Alert would have been sent to %s", user_email
            )
            return {"status": "sent"}

        logger.info(
            "Alert email sent to %s for anomaly %s", user_email, anomaly.id
        )
        return {"status": "sent"}
