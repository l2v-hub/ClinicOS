"""DocumentProfileRegistry (REQ-025). Loads JSON profile files from profiles/ and
classifies a document by counting its identifiers. No hospital name is hardcoded — adding
a hospital means dropping a new <id>.json in profiles/. Falls back to the generic profile
(never rejects the document) when nothing matches with enough confidence.
"""
from __future__ import annotations

import json
import os

from .models import DocumentProfile, ClassificationResult, GENERIC_PROFILE_ID

_PROFILES_DIR = os.path.join(os.path.dirname(__file__), "profiles")


class DocumentProfileRegistry:
    def __init__(self, profiles: dict[str, DocumentProfile]):
        self._profiles = profiles
        if GENERIC_PROFILE_ID not in profiles:
            # A minimal generic fallback must always exist.
            self._profiles[GENERIC_PROFILE_ID] = DocumentProfile(
                profile_id=GENERIC_PROFILE_ID, label="Lettera di dimissione generica",
            )

    @classmethod
    def load(cls, profiles_dir: str | None = None) -> "DocumentProfileRegistry":
        directory = profiles_dir or _PROFILES_DIR
        profiles: dict[str, DocumentProfile] = {}
        if os.path.isdir(directory):
            for name in sorted(os.listdir(directory)):
                if not name.endswith(".json"):
                    continue
                with open(os.path.join(directory, name), "r", encoding="utf-8") as fh:
                    prof = DocumentProfile.from_dict(json.load(fh))
                profiles[prof.profile_id] = prof
        return cls(profiles)

    def get(self, profile_id: str) -> DocumentProfile:
        return self._profiles.get(profile_id) or self._profiles[GENERIC_PROFILE_ID]

    def ids(self) -> list[str]:
        return sorted(self._profiles.keys())

    def classify(self, full_text: str) -> ClassificationResult:
        """Pick the best profile by fraction of identifiers found (case-insensitive).
        Below the profile's min_confidence -> GENERIC (document never rejected)."""
        text = (full_text or "").lower()
        best: ClassificationResult | None = None
        for prof in self._profiles.values():
            if not prof.identifiers:
                continue
            matched = [ind for ind in prof.identifiers if ind.lower() in text]
            confidence = len(matched) / len(prof.identifiers)
            if confidence >= prof.min_confidence and (best is None or confidence > best.confidence):
                best = ClassificationResult(prof.profile_id, confidence, matched)
        return best or ClassificationResult(GENERIC_PROFILE_ID, 0.0, [])
