"""Safe OCR diagnostics: never include provider bodies, URLs or document contents."""
from ..errors import ErrorKind, RuntimeError_


def ocr_http_error(status: int) -> RuntimeError_:
    if status in (401, 403):
        return RuntimeError_(ErrorKind.CREDENTIALS, f"[AI_AUTH] Credenziale OCR rifiutata (HTTP {status}).")
    if status == 404:
        return RuntimeError_(ErrorKind.CONFIG, "[AI_MODEL] Endpoint o deployment OCR non trovato (HTTP 404).")
    if status in (400, 413, 415, 422):
        return RuntimeError_(ErrorKind.CAPABILITY, f"[AI_INPUT] Richiesta o documento OCR non supportato (HTTP {status}).")
    if status == 429:
        return RuntimeError_(ErrorKind.RATE_LIMIT, "[AI_RATE_LIMIT] Limite del servizio OCR raggiunto (HTTP 429).")
    if status in (408, 504):
        return RuntimeError_(ErrorKind.TIMEOUT, f"[AI_TIMEOUT] Tempo limite del servizio OCR (HTTP {status}).")
    return RuntimeError_(ErrorKind.PROVIDER_ERROR, f"[AI_PROVIDER] Servizio OCR non disponibile (HTTP {status}).")
