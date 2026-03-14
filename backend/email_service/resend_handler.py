import base64
import asyncio
import logging
import resend
from typing import List, Optional
from shared.config import settings

logger = logging.getLogger(__name__)


class ResendHandler:
    def __init__(self):
        resend.api_key = settings.RESEND_API_KEY

    async def send_email(
        self,
        from_email: str,
        to_emails: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc_emails: List[str] = None,
        bcc_emails: List[str] = None,
        attachments: List[dict] = None,
    ) -> bool:
        try:
            params = {
                "from": from_email,
                "to": to_emails,
                "subject": subject,
                "text": body,
            }
            if html_body:
                params["html"] = html_body
            if cc_emails:
                params["cc"] = cc_emails
            if bcc_emails:
                params["bcc"] = bcc_emails
            if attachments:
                params["attachments"] = [
                    {
                        "filename": att["filename"],
                        "content": base64.b64encode(att["content"]).decode("utf-8"),
                    }
                    for att in attachments
                ]

            loop = asyncio.get_running_loop()
            response = await loop.run_in_executor(
                None, lambda: resend.Emails.send(params)
            )

            if response and response.get("id"):
                logger.info(f"Email sent via Resend. id={response['id']}")
                return True
            else:
                logger.error(f"Resend returned unexpected response: {response}")
                return False

        except Exception as e:
            logger.error(f"Resend send_email failed: {e}")
            return False
