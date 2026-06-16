"""Pure page-processing for the document profile (REQ-025). Stdlib only, deterministic.

Given the OCR raw text of each uploaded page, this:
  - recovers the page number (footer first, then body) BEFORE any footer removal;
  - separates repetitive header/footer from the clinical content, keeping ambiguous lines
    (lines that also carry clinical/anagraphic signals are NOT stripped — they are kept and
    flagged) so no clinical/anagraphic/allergy/diagnosis/therapy text is ever lost;
  - orders pages by the detected number (ties/gaps/duplicates flagged, never auto-resolved);
  - keeps originalRawText immutable and exposes cleanedRawText for extraction.
"""
from __future__ import annotations

import re
import uuid

from .models import DocumentProfile, PageContract


def _compile(patterns: tuple[str, ...]) -> list[re.Pattern]:
    out: list[re.Pattern] = []
    for p in patterns:
        try:
            out.append(re.compile(p))
        except re.error:
            continue
    return out


def _matches_any(line: str, regexes: list[re.Pattern]) -> bool:
    return any(r.search(line) for r in regexes)


def extract_page_number(text: str, profile: DocumentProfile, footer_lines: int = 3):
    """Return (page, total, source). source in {'footer','body','none'}. Footer searched
    first so the number survives footer removal."""
    pats = _compile(profile.page_number_patterns)
    if not pats:
        return None, None, "none"
    lines = [ln for ln in (text or "").splitlines() if ln.strip()]
    footer_area = "\n".join(lines[-footer_lines:]) if lines else ""

    def scan(area: str):
        for r in pats:
            m = r.search(area)
            if m:
                page = int(m.group(1))
                total = int(m.group(2)) if m.lastindex and m.lastindex >= 2 and m.group(2) else None
                return page, total
        return None

    hit = scan(footer_area)
    if hit:
        return hit[0], hit[1], "footer"
    hit = scan(text or "")
    if hit:
        return hit[0], hit[1], "body"
    return None, None, "none"


def split_header_footer(text: str, profile: DocumentProfile):
    """Return (header_text, footer_text, cleaned_text, warnings). Repetitive header/footer
    lines are removed from cleaned_text; an ambiguous line (matches header/footer pattern but
    also a clinical signal) is KEPT in cleaned_text and flagged."""
    header_re = _compile(profile.header_patterns)
    footer_re = _compile(profile.footer_patterns)
    signal_re = _compile(profile.clinical_signal_patterns)
    lines = (text or "").splitlines()
    warnings: list[str] = []

    n = len(lines)
    start = 0
    header: list[str] = []
    while start < n and header_re and _matches_any(lines[start], header_re):
        if signal_re and _matches_any(lines[start], signal_re):
            warnings.append("AMBIGUOUS_HEADER_LINE_KEPT")
            break  # content started — keep this line in cleaned
        header.append(lines[start])
        start += 1

    end = n
    footer: list[str] = []
    while end > start and footer_re and _matches_any(lines[end - 1], footer_re):
        if signal_re and _matches_any(lines[end - 1], signal_re):
            warnings.append("AMBIGUOUS_FOOTER_LINE_KEPT")
            break
        footer.insert(0, lines[end - 1])
        end -= 1

    cleaned = "\n".join(lines[start:end])
    return "\n".join(header), "\n".join(footer), cleaned, warnings


def build_page(file_id: str, original_position: int, original_raw_text: str,
               profile: DocumentProfile) -> PageContract:
    page, total, source = extract_page_number(original_raw_text, profile)
    header_text, footer_text, cleaned, warnings = split_header_footer(original_raw_text, profile)
    if page is None:
        source = "upload_order"
    return PageContract(
        file_id=file_id,
        page_id=str(uuid.uuid4()),
        original_position=original_position,
        detected_page_number=page,
        total_pages=total,
        page_number_source=source,
        header_text=header_text,
        footer_text=footer_text,
        original_raw_text=original_raw_text,   # immutable
        cleaned_raw_text=cleaned,
        warnings=warnings,
    )


def order_pages(pages: list[PageContract]) -> tuple[list[PageContract], list[str]]:
    """Order by detected page number (then upload order); flag duplicates and gaps. Never
    auto-resolves a conflict — both pages are kept."""
    warnings: list[str] = []
    BIG = 10 ** 9
    ordered = sorted(pages, key=lambda p: (p.detected_page_number if p.detected_page_number is not None else BIG, p.original_position))

    nums = [p.detected_page_number for p in pages if p.detected_page_number is not None]
    seen: dict[int, int] = {}
    for k in nums:
        seen[k] = seen.get(k, 0) + 1
    for k in sorted(seen):
        if seen[k] > 1:
            warnings.append(f"DUPLICATE_PAGE_NUMBER: {k}")

    if nums:
        totals = [p.total_pages for p in pages if p.total_pages]
        upper = max(totals) if totals else max(nums)
        present = set(nums)
        for k in range(1, upper + 1):
            if k not in present:
                warnings.append(f"MISSING_PAGE_NUMBER: {k}")
    return ordered, warnings


def process_document(inputs: list[dict], profile: DocumentProfile) -> dict:
    """inputs: [{'fileId': str, 'originalRawText': str}, ...] in upload order.
    Returns the ordered page contracts + document-level warnings."""
    pages = [
        build_page(str(item.get("fileId", f"file-{i}")), i, str(item.get("originalRawText", "")), profile)
        for i, item in enumerate(inputs)
    ]
    ordered, warnings = order_pages(pages)
    totals = [p.total_pages for p in ordered if p.total_pages]
    total_pages = max(totals) if totals else len(ordered)
    for p in ordered:
        if p.total_pages is None:
            p.total_pages = total_pages
    return {
        "profileId": profile.profile_id,
        "totalPages": total_pages,
        "pages": [p.to_dict() for p in ordered],
        "warnings": warnings,
    }
