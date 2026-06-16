"""Configurable document profiles for discharge letters (REQ-025).

Public API:
    registry = DocumentProfileRegistry.load()
    cls = registry.classify(full_text)              # -> ClassificationResult
    profile = registry.get(cls.profile_id)          # fallback-safe
    result = process_document(pages, profile)        # ordered page contracts + warnings

No hospital name is hardcoded and no provider SDK is imported here — recognition and page
handling are entirely profile-driven, so a new hospital is a new JSON profile, not code.
"""
from .models import (
    DocumentProfile, ClassificationResult, PageContract, GENERIC_PROFILE_ID,
)
from .registry import DocumentProfileRegistry
from .processing import (
    extract_page_number, split_header_footer, build_page, order_pages, process_document,
)

__all__ = [
    "DocumentProfile", "ClassificationResult", "PageContract", "GENERIC_PROFILE_ID",
    "DocumentProfileRegistry",
    "extract_page_number", "split_header_footer", "build_page", "order_pages", "process_document",
]
