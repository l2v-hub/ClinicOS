"""Phase 9: request correlation for the AI runtime.

The backend forwards its ``X-Request-Id`` on every service call; the runtime keeps it in a context
variable so provider/STT/skill-route log lines carry the same id as the backend access log and the
audit correlation line. Ids only — never prompts, transcripts or clinical data.
"""

from __future__ import annotations

import re
import uuid
from contextvars import ContextVar

_REQUEST_ID: ContextVar[str | None] = ContextVar("clinicos_request_id", default=None)
_VALID = re.compile(r"[A-Za-z0-9._-]{8,64}")


def accept_request_id(value: str | None) -> str:
    """Use the caller's id when well formed, otherwise mint one; store it for this request."""
    rid = value if value and _VALID.fullmatch(value) else uuid.uuid4().hex
    _REQUEST_ID.set(rid)
    return rid


def current_request_id() -> str | None:
    return _REQUEST_ID.get()
