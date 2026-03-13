"""Config loader — reads .env and exposes named constants."""

import os
import sys
from dotenv import load_dotenv

load_dotenv()


def _require(var_name: str) -> str:
    """Return the value of an environment variable or exit with a clear error."""
    value = os.getenv(var_name)
    if not value:
        print(f"ERROR: Required environment variable '{var_name}' is missing or empty.")
        print(f"       Please set it in your .env file. See .env.example for reference.")
        sys.exit(1)
    return value


# Required variables — service will not start without these
ANTHROPIC_API_KEY: str = _require("ANTHROPIC_API_KEY")
GOOGLE_CREDENTIALS_PATH: str = _require("GOOGLE_CREDENTIALS_PATH")
INBOX_1_EMAIL: str = _require("INBOX_1_EMAIL")
INBOX_2_EMAIL: str = _require("INBOX_2_EMAIL")

# Optional variables — may be empty on first run (sheets get created)
SHEET_ID_INVOICE: str = os.getenv("SHEET_ID_INVOICE", "")
SHEET_ID_KEVIN: str = os.getenv("SHEET_ID_KEVIN", "")

# Monitoring interval with sensible default
POLL_INTERVAL_MINUTES: int = int(os.getenv("POLL_INTERVAL_MINUTES", "5"))
