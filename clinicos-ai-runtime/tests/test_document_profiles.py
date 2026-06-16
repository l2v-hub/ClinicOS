"""Document profile + page processing tests (REQ-025). Stdlib only.

Covers every mandatory scenario: single/multi-page Imola, out-of-order photos, the two
footer formats, missing page, duplicate page number, header with anagraphic data, ambiguous
line, unrecognised document -> generic fallback, plus the safety invariants (original text
immutable, clinical text never lost, page number recovered before footer removal)."""
import unittest

from clinicos_ai.document_profiles import (
    DocumentProfileRegistry, process_document, extract_page_number,
    split_header_footer, GENERIC_PROFILE_ID,
)

REG = DocumentProfileRegistry.load()
IMOLA = "AUSL_IMOLA_DISCHARGE_LETTER_V1"


def imola_page(page, total, body, header="Azienda USL di Imola\nU.O. Cardiologia\nLettera di dimissione", footer_fmt="Pagina {p} di {t}"):
    footer = footer_fmt.format(p=page, t=total)
    return f"{header}\n{body}\n{footer}"


class ClassificationTests(unittest.TestCase):
    def test_imola_recognised(self):
        text = imola_page(1, 1, "Diagnosi di dimissione: BPCO.")
        res = REG.classify(text)
        self.assertEqual(res.profile_id, IMOLA)
        self.assertGreaterEqual(res.confidence, 0.5)
        self.assertIn("Imola", res.matched_indicators)

    def test_unrecognised_falls_back_to_generic(self):
        res = REG.classify("Ospedale San Raffaele\nRelazione clinica\nDiagnosi: ipertensione.")
        self.assertEqual(res.profile_id, GENERIC_PROFILE_ID)
        # document is never rejected — generic profile is usable
        self.assertIsNotNone(REG.get(res.profile_id))

    def test_profile_is_configurable_and_swappable(self):
        self.assertIn(IMOLA, REG.ids())
        self.assertIn(GENERIC_PROFILE_ID, REG.ids())
        self.assertEqual(REG.get("UNKNOWN_X").profile_id, GENERIC_PROFILE_ID)


class PageNumberTests(unittest.TestCase):
    def setUp(self):
        self.p = REG.get(IMOLA)

    def test_footer_pagina_x_di_y(self):
        page, total, src = extract_page_number("contenuto\nPagina 2 di 5", self.p)
        self.assertEqual((page, total, src), (2, 5, "footer"))

    def test_footer_pag_x_slash_y(self):
        page, total, src = extract_page_number("contenuto\nPag. 3/4", self.p)
        self.assertEqual((page, total, src), (3, 4, "footer"))

    def test_footer_bare_x_slash_y(self):
        page, total, src = extract_page_number("testo\n1 / 5", self.p)
        self.assertEqual((page, total, src), (1, 5, "footer"))

    def test_pagina_x_only(self):
        page, total, src = extract_page_number("testo\nPagina 1", self.p)
        self.assertEqual((page, total), (1, None))

    def test_recovered_before_footer_removed(self):
        text = imola_page(2, 3, "Decorso ospedaliero regolare.")
        page, _, src = extract_page_number(text, self.p)
        _, footer, cleaned, _ = split_header_footer(text, self.p)
        self.assertEqual(page, 2)            # number recovered...
        self.assertIn("Pagina 2 di 3", footer)
        self.assertNotIn("Pagina 2 di 3", cleaned)  # ...then footer removed from content


class HeaderFooterTests(unittest.TestCase):
    def setUp(self):
        self.p = REG.get(IMOLA)

    def test_repetitive_header_footer_removed(self):
        text = imola_page(1, 2, "Diagnosi di dimissione: scompenso cardiaco.")
        header, footer, cleaned, warns = split_header_footer(text, self.p)
        self.assertIn("Azienda USL di Imola", header)
        self.assertIn("Pagina 1 di 2", footer)
        self.assertEqual(cleaned.strip(), "Diagnosi di dimissione: scompenso cardiaco.")

    def test_header_with_anagraphic_data_is_kept(self):
        # A header-looking line that also carries anagraphic data must NOT be stripped.
        header_line = "Azienda USL di Imola - Paziente Mario Rossi nato 01/01/1950"
        text = f"{header_line}\nDiagnosi: BPCO.\nPagina 1 di 1"
        header, _, cleaned, warns = split_header_footer(text, self.p)
        self.assertIn(header_line, cleaned)            # kept, not lost
        self.assertNotIn(header_line, header)
        self.assertIn("AMBIGUOUS_HEADER_LINE_KEPT", warns)

    def test_original_text_immutable(self):
        text = imola_page(1, 1, "Terapia domiciliare: Ramipril 5 mg.")
        pc = process_document([{"fileId": "f1", "originalRawText": text}], self.p)
        self.assertEqual(pc["pages"][0]["originalRawText"], text)
        self.assertNotEqual(pc["pages"][0]["cleanedRawText"], text)
        self.assertIn("Ramipril 5 mg", pc["pages"][0]["cleanedRawText"])  # clinical kept


class OrderingTests(unittest.TestCase):
    def setUp(self):
        self.p = REG.get(IMOLA)

    def test_single_page(self):
        out = process_document([{"fileId": "f", "originalRawText": imola_page(1, 1, "x")}], self.p)
        self.assertEqual(out["totalPages"], 1)
        self.assertEqual(len(out["pages"]), 1)

    def test_multipage_in_order(self):
        ins = [{"fileId": f"f{i}", "originalRawText": imola_page(i, 3, f"contenuto {i}")} for i in (1, 2, 3)]
        out = process_document(ins, self.p)
        self.assertEqual([p["detectedPageNumber"] for p in out["pages"]], [1, 2, 3])

    def test_photos_out_of_order_get_sorted(self):
        order = [2, 3, 1]
        ins = [{"fileId": f"f{i}", "originalRawText": imola_page(i, 3, f"foto {i}")} for i in order]
        out = process_document(ins, self.p)
        self.assertEqual([p["detectedPageNumber"] for p in out["pages"]], [1, 2, 3])
        self.assertEqual(out["pages"][0]["pageNumberSource"], "footer")

    def test_missing_page_flagged(self):
        ins = [{"fileId": f"f{i}", "originalRawText": imola_page(i, 4, f"c{i}")} for i in (1, 2, 4)]
        out = process_document(ins, self.p)
        self.assertIn("MISSING_PAGE_NUMBER: 3", out["warnings"])
        self.assertEqual(len(out["pages"]), 3)  # nothing dropped

    def test_duplicate_page_number_flagged_both_kept(self):
        ins = [
            {"fileId": "a", "originalRawText": imola_page(1, 2, "primo 1")},
            {"fileId": "b", "originalRawText": imola_page(1, 2, "secondo 1")},
            {"fileId": "c", "originalRawText": imola_page(2, 2, "secondo")},
        ]
        out = process_document(ins, self.p)
        self.assertIn("DUPLICATE_PAGE_NUMBER: 1", out["warnings"])
        self.assertEqual(len(out["pages"]), 3)  # both duplicates kept, none auto-chosen

    def test_no_page_number_uses_upload_order(self):
        ins = [
            {"fileId": "a", "originalRawText": "Azienda USL di Imola\nContenuto senza numero."},
            {"fileId": "b", "originalRawText": "Azienda USL di Imola\nAltro contenuto."},
        ]
        out = process_document(ins, self.p)
        self.assertEqual([p["originalPosition"] for p in out["pages"]], [0, 1])
        self.assertTrue(all(p["pageNumberSource"] == "upload_order" for p in out["pages"]))


if __name__ == "__main__":
    unittest.main()
