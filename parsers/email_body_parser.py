"""Email body parser — extracts clean text from Gmail message payloads."""

import base64
import logging
from bs4 import BeautifulSoup

logger = logging.getLogger("invoice_monitor")


def extract_email_body(payload: dict) -> str:
    """Extract clean plain text from a Gmail message payload.

    Handles plain text, HTML, and multipart messages. Returns clean readable text.

    Args:
        payload: The 'payload' object from a Gmail API message response.

    Returns:
        Clean text string of the email body, or empty string if nothing found.
    """
    try:
        parts = _get_all_parts(payload)

        # Prefer plain text
        for part in parts:
            if part.get("mimeType") == "text/plain":
                text = _decode_body(part)
                if text.strip():
                    return text.strip()

        # Fall back to HTML
        for part in parts:
            if part.get("mimeType") == "text/html":
                html = _decode_body(part)
                if html.strip():
                    return _html_to_text(html)

        # If payload itself has a body (non-multipart messages)
        if payload.get("body", {}).get("data"):
            mime = payload.get("mimeType", "")
            text = _decode_body(payload)
            if "html" in mime:
                return _html_to_text(text)
            return text.strip()

        return ""

    except Exception as e:
        logger.error(f"Error parsing email body: {e}")
        return ""


def _get_all_parts(payload: dict) -> list[dict]:
    """Recursively extract all parts from a multipart message."""
    parts = []
    if "parts" in payload:
        for part in payload["parts"]:
            parts.append(part)
            parts.extend(_get_all_parts(part))
    return parts


def _decode_body(part: dict) -> str:
    """Decode a base64url-encoded body from a message part."""
    data = part.get("body", {}).get("data", "")
    if not data:
        return ""
    try:
        decoded = base64.urlsafe_b64decode(data)
        return decoded.decode("utf-8", errors="replace")
    except Exception as e:
        logger.error(f"Error decoding email body part: {e}")
        return ""


def _html_to_text(html: str) -> str:
    """Convert HTML to plain text using BeautifulSoup."""
    try:
        soup = BeautifulSoup(html, "html.parser")
        return soup.get_text(separator="\n", strip=True)
    except Exception as e:
        logger.error(f"Error converting HTML to text: {e}")
        return html
