"""Document profile data model (REQ-025). Stdlib only — no provider SDK, no hardcoded
hospital logic. A DocumentProfile is pure configuration that drives classification, page
ordering and header/footer separation, so a new hospital = a new profile file, not code.
"""
from __future__ import annotations

from dataclasses import dataclass, field

GENERIC_PROFILE_ID = "GENERIC_DISCHARGE_LETTER"


@dataclass(frozen=True)
class DocumentProfile:
    profile_id: str
    label: str
    # Recurring strings that identify the document (header denomination, "Lettera di
    # dimissione", AUSL references, ...). Classification counts how many appear.
    identifiers: tuple[str, ...] = ()
    min_confidence: float = 0.5
    header_patterns: tuple[str, ...] = ()
    footer_patterns: tuple[str, ...] = ()
    # Ordered regexes for the page number; the FIRST capture group is the page, the
    # optional SECOND is the total ("Pagina 1 di 5", "Pag. 1/5", "1 / 5", "Pagina 1").
    page_number_patterns: tuple[str, ...] = ()
    # Signals that a header/footer-looking line actually carries content and must be kept.
    clinical_signal_patterns: tuple[str, ...] = ()
    # Section aliases / expected order / tags — used downstream (REQ-026/027); kept here so
    # the whole document contract lives in one configurable place.
    section_aliases: dict = field(default_factory=dict)
    expected_section_order: tuple[str, ...] = ()
    tags: tuple[str, ...] = ()

    @staticmethod
    def from_dict(d: dict) -> "DocumentProfile":
        def tup(key: str) -> tuple[str, ...]:
            v = d.get(key) or []
            return tuple(str(x) for x in v)
        return DocumentProfile(
            profile_id=str(d["profileId"]),
            label=str(d.get("label", d["profileId"])),
            identifiers=tup("identifiers"),
            min_confidence=float(d.get("minConfidence", 0.5)),
            header_patterns=tup("headerPatterns"),
            footer_patterns=tup("footerPatterns"),
            page_number_patterns=tup("pageNumberPatterns"),
            clinical_signal_patterns=tup("clinicalSignalPatterns"),
            section_aliases=dict(d.get("sectionAliases") or {}),
            expected_section_order=tup("expectedSectionOrder"),
            tags=tup("tags"),
        )


@dataclass
class ClassificationResult:
    profile_id: str
    confidence: float
    matched_indicators: list[str]

    def to_dict(self) -> dict:
        return {
            "profileId": self.profile_id,
            "confidence": round(self.confidence, 2),
            "matchedIndicators": self.matched_indicators,
        }


@dataclass
class PageContract:
    file_id: str
    page_id: str
    original_position: int
    detected_page_number: int | None
    total_pages: int | None
    page_number_source: str  # 'footer' | 'body' | 'pdf_meta' | 'upload_order' | 'manual' | 'none'
    header_text: str
    footer_text: str
    original_raw_text: str  # IMMUTABLE — never edited after OCR
    cleaned_raw_text: str   # header/footer removed; used for clinical extraction
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "fileId": self.file_id,
            "pageId": self.page_id,
            "originalPosition": self.original_position,
            "detectedPageNumber": self.detected_page_number,
            "totalPages": self.total_pages,
            "pageNumberSource": self.page_number_source,
            "headerText": self.header_text,
            "footerText": self.footer_text,
            "originalRawText": self.original_raw_text,
            "cleanedRawText": self.cleaned_raw_text,
            "warnings": list(self.warnings),
        }
