# Independent diff and security review

Application 07c3f7d13e8ac99a1af1238ec3661502950f45e3 versus b7ae14d120c1e70ccf72784206a505f8c48f975e; all eight changed files fully reviewed. Dedicated artifact-only writer; native launcher overlays preserved. No source edits by QA.

Scope/pattern/hygiene PASS: new presentation modules/model preserve previous API interfaces, room helpers, request/auth headers, abortable loading, parent save/delete handlers. File budget verified. Room identity is captured independently of editable values. Bed identity includes both quoted original components. React renders resource text; no user HTML, SQL, debug logs, endpoints, backend/schema/config/env/dependency changes. CSS modifies only scoped room action spacing/wrapping, not canonical control skins. Trash differs from edit and existing destructive ConfirmDialog remains mandatory. No real deletion performed.

Finding F1: frontend/src/components/admin/BedEditDialog.tsx:19 renders newly long resource identity in existing unbounded .modal-title. At valid backend room number length32 and bed label length16 on390x844, heading extends to x612.5625 beyond dialog/viewport390, cutting the target resource visually. Relevant criterion AC2/AC4 FAIL. Independent negative geometry assertion retained. Parent must add scoped wrapping; no shared design-system rewrite requested.

Security checklist PASS within eight-file scope:

- Secrets: independent frontend/src + compiled dist scanner exit0; native scoped baseline/candidate scanner zero findings/new findings. No provider credential file accessed by QA.
- PHI: no patients in synthetic facility/auth fixture; result images manually inspected. Real issue contains generic audit text, no patient records. No live room/patient mutation.
- Logging: no application logs added. Synthetic request receipts only; no clinical payloads or real tokens.
- Validation: room32/floor64/ward64/note2000 bounds preserved; bed does not persist derived occupied state. Existing server label16 and room32 used in negative mobile fixture.
- Authorization: App route gate unchanged; extracted fetch helper still uses operatorHeaders; actual auth calls fully mocked only in artifact-only harness.
- Injection/XSS: exact literal hostile resource label asserted, no img element, no page errors. React text/aria escaping and JSON quoting preserved.
- Dependencies: no packages, manifests, lockfiles changed; dependency junction readonly.
- Config: no env/config/production guard/CORS changes; QA URL override exists only in owned artifact server launcher with all facility/auth/clinical routes mocked beforewire.

Native scanner is scoped to changed files, not a global CVE certification. Full regression contains exactly12 accepted baseline failures, not a globally green test suite.
