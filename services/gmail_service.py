"""Gmail service — handles authentication, message fetching, and attachment downloading."""

import os
import base64
import logging
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

import config

logger = logging.getLogger("invoice_monitor")

# Gmail API scopes — read and modify (to mark as read) plus send (for notifications)
SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.send",
]

# Supported attachment types
SUPPORTED_ATTACHMENT_TYPES = {".docx", ".doc", ".xlsx", ".xls"}

# Account mapping
ACCOUNTS = {
    "invoice": {
        "email": config.INBOX_1_EMAIL,
        "token_path": "token/token-invoice.json",
    },
    "kevin": {
        "email": config.INBOX_2_EMAIL,
        "token_path": "token/token-kevin.json",
    },
}


class GmailService:
    """Manages Gmail API connections for both monitored inboxes."""

    def __init__(self):
        self._services: dict = {}

    def _get_service(self, account: str):
        """Get or create an authenticated Gmail API service for the given account."""
        if account in self._services:
            return self._services[account]

        account_info = ACCOUNTS[account]
        token_path = account_info["token_path"]
        creds = None

        # Load existing token
        if os.path.exists(token_path):
            creds = Credentials.from_authorized_user_file(token_path, SCOPES)

        # Refresh or create new credentials
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                logger.info(f"Refreshing token for {account_info['email']}")
                creds.refresh(Request())
            else:
                logger.info(f"Starting OAuth flow for {account_info['email']}")
                print(f"\n>>> Please authenticate {account_info['email']} in the browser window <<<\n")
                flow = InstalledAppFlow.from_client_secrets_file(
                    config.GOOGLE_CREDENTIALS_PATH, SCOPES
                )
                creds = flow.run_local_server(port=0)

            # Save token for future use
            os.makedirs(os.path.dirname(token_path), exist_ok=True)
            with open(token_path, "w") as token_file:
                token_file.write(creds.to_json())
            logger.info(f"Token saved for {account_info['email']}")

        service = build("gmail", "v1", credentials=creds)
        self._services[account] = service
        return service

    def get_unread_messages(self, account: str) -> list[dict]:
        """Fetch all unread messages from the given account's inbox.

        Args:
            account: 'invoice' or 'kevin'

        Returns:
            List of full message objects, or empty list if none found.
        """
        try:
            service = self._get_service(account)
            results = service.users().messages().list(
                userId="me",
                labelIds=["INBOX", "UNREAD"],
            ).execute()

            messages = results.get("messages", [])
            if not messages:
                logger.info(f"No unread messages in {ACCOUNTS[account]['email']}")
                return []

            # Fetch full message details for each
            full_messages = []
            for msg_stub in messages:
                msg = service.users().messages().get(
                    userId="me",
                    id=msg_stub["id"],
                    format="full",
                ).execute()
                full_messages.append(msg)

            logger.info(f"Found {len(full_messages)} unread message(s) in {ACCOUNTS[account]['email']}")
            return full_messages

        except Exception as e:
            logger.error(f"Error fetching messages from {account}: {e}")
            return []

    def mark_as_read(self, account: str, message_id: str) -> None:
        """Mark a message as read by removing the UNREAD label."""
        try:
            service = self._get_service(account)
            service.users().messages().modify(
                userId="me",
                id=message_id,
                body={"removeLabelIds": ["UNREAD"]},
            ).execute()
            logger.info(f"Marked message {message_id} as read in {account}")
        except Exception as e:
            logger.error(f"Error marking message {message_id} as read: {e}")

    def get_attachments(self, account: str, message: dict) -> list[dict]:
        """Download supported attachments from a message.

        Args:
            account: 'invoice' or 'kevin'
            message: Full Gmail message object

        Returns:
            List of dicts with 'filename' and 'data' (bytes) for each supported attachment.
        """
        attachments = []
        try:
            service = self._get_service(account)
            parts = message.get("payload", {}).get("parts", [])

            for part in parts:
                filename = part.get("filename", "")
                if not filename:
                    continue

                # Check if the file type is supported
                ext = os.path.splitext(filename)[1].lower()
                if ext not in SUPPORTED_ATTACHMENT_TYPES:
                    logger.warning(f"Skipping unsupported attachment type: {filename}")
                    continue

                # Get attachment data
                attachment_id = part.get("body", {}).get("attachmentId")
                if attachment_id:
                    att = service.users().messages().attachments().get(
                        userId="me",
                        messageId=message["id"],
                        id=attachment_id,
                    ).execute()
                    data = base64.urlsafe_b64decode(att["data"])
                    attachments.append({"filename": filename, "data": data})
                    logger.info(f"Downloaded attachment: {filename}")

        except Exception as e:
            logger.error(f"Error downloading attachments: {e}")

        return attachments

    def get_message_subject(self, message: dict) -> str:
        """Extract the subject line from a message."""
        headers = message.get("payload", {}).get("headers", [])
        for header in headers:
            if header["name"].lower() == "subject":
                return header["value"]
        return "(No Subject)"

    def get_sender_email(self, message: dict) -> str:
        """Extract the sender's email address from a message."""
        headers = message.get("payload", {}).get("headers", [])
        for header in headers:
            if header["name"].lower() == "from":
                value = header["value"]
                # Extract email from "Name <email>" format
                if "<" in value and ">" in value:
                    return value.split("<")[1].split(">")[0]
                return value
        return ""

    def send_email(self, account: str, to: str, subject: str, body: str,
                   thread_id: str = None) -> None:
        """Send an email using the Gmail API.

        Args:
            account: 'invoice' or 'kevin' — determines the FROM address
            to: Recipient email address
            subject: Email subject
            body: Email body (plain text)
            thread_id: Optional thread ID to reply in the same thread
        """
        try:
            import email.mime.text
            service = self._get_service(account)

            message = email.mime.text.MIMEText(body)
            message["to"] = to
            message["subject"] = subject

            raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
            send_body = {"raw": raw}

            if thread_id:
                send_body["threadId"] = thread_id

            service.users().messages().send(
                userId="me",
                body=send_body,
            ).execute()

            logger.info(f"Email sent from {account} to {to}: {subject}")

        except Exception as e:
            logger.error(f"Error sending email from {account}: {e}")
