"""REQ-025 demonstration: prints the document-profile behaviour on synthetic Imola pages.
Headless runtime (no UI) — this deterministic dump is the evidence artifact.
    python tools/req025_demo.py
"""
import json
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from clinicos_ai.document_profiles import DocumentProfileRegistry, process_document  # noqa: E402

REG = DocumentProfileRegistry.load()
HEADER = "Azienda USL di Imola\nU.O. Cardiologia\nLettera di dimissione"


def page(p, t, body):
    return f"{HEADER}\n{body}\nPagina {p} di {t}"


def show(title):
    print("\n" + "=" * 72 + f"\n{title}\n" + "=" * 72)


# 1. Classification
show("1. PROFILE DETECTION (imola-profile-detected)")
cls = REG.classify(page(1, 3, "Diagnosi di dimissione: BPCO."))
print(json.dumps(cls.to_dict(), indent=2, ensure_ascii=False))
prof = REG.get(cls.profile_id)

# 2/3. Ordering — photos uploaded out of order
show("2. PAGES BEFORE ORDERING (upload order 2,3,1)")
ins = [{"fileId": f"f{n}", "originalRawText": page(n, 3, f"contenuto pagina {n}")} for n in (2, 3, 1)]
print("upload order detectedPageNumber:", [None for _ in ins], "(numbers read during processing)")
out = process_document(ins, prof)
show("3. PAGES AFTER ORDERING (imola page number)")
print("ordered detectedPageNumber:", [p["detectedPageNumber"] for p in out["pages"]])
print("sources:", [p["pageNumberSource"] for p in out["pages"]])

# 4. Header/footer filtered (original immutable, clinical kept)
show("4. HEADER/FOOTER FILTERED (header-footer-filtered)")
pg = out["pages"][0]
print("ORIGINAL (immutable):\n", json.dumps(pg["originalRawText"], ensure_ascii=False))
print("HEADER  :", json.dumps(pg["headerText"], ensure_ascii=False))
print("FOOTER  :", json.dumps(pg["footerText"], ensure_ascii=False))
print("CLEANED :", json.dumps(pg["cleanedRawText"], ensure_ascii=False))

# 5. Missing page warning
show("5. MISSING PAGE WARNING (missing-page-warning)")
ins2 = [{"fileId": f"f{n}", "originalRawText": page(n, 4, f"c{n}")} for n in (1, 2, 4)]
out2 = process_document(ins2, prof)
print("warnings:", out2["warnings"])

# 6. Unrecognised -> generic fallback
show("6. UNRECOGNISED DOCUMENT -> GENERIC FALLBACK")
print(json.dumps(REG.classify("Ospedale San Raffaele - relazione clinica").to_dict(), indent=2, ensure_ascii=False))
