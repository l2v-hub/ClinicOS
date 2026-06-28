# Patient Chart ↔ Intake — Gap Analysis (BUG-069 / #121)

**Phase F1 of EPIC #120.** Runtime inventory of every Scheda Paziente field/section/module, classified by availability and obligation, with the differences against the manual new-patient form and the document import. Verified against mounted components, API/DTO and the data model — not just visible labels.

**Sources verified:**
- Chart nav + tabs: `frontend/src/components/operator/PatientDetail.tsx` (`TAB_GROUPS`, L2/L3).
- Clinical data model: `CartellaPaziente` (cartella JSON) + relational tables `Patient`, `Cartella`, `PatientTherapy`, `TherapySchedule`, `Allergie`/`AllergiaItem`, `Diagnosi`, `PatientNarrativeSection`, `PatientDocument`, `ImportDocument` (`prisma/schema.prisma`).
- Manual form: `frontend/src/components/shared/NewPatientModal.tsx`.
- Import review: `frontend/src/components/shared/sections/ImportSectionsReview.tsx` + extraction schema (`backend/ai-assets/clinicos-extraction.*.json`).

Legend — **Intake avail.**: present today in the manual intake form. **Import**: prefilled today by document import. **Req@intake**: should be required before patient creation.

## 1. Anagrafica (Profilo)

Chart tab: `Panoramica → Profilo` (L3: Anagrafica / Contatti / Contatto emergenza / Assegnazione clinica). Component: `PatientDetail.renderProfilo`. Model: `Patient` table.

| Field | Source | Intake avail. | Import | Req@intake |
|---|---|---|---|---|
| firstName / Nome | Patient.firstName | ✅ | ✅ | ✅ |
| lastName / Cognome | Patient.lastName | ✅ | ✅ | ✅ |
| dateOfBirth | Patient.dateOfBirth | ✅ | ✅ | ✅ |
| sex / Sesso | Patient.sex | ✅ | ✅ | – |
| codiceFiscale | Cartella/Patient | ✅ | ✅ | – |
| luogo di nascita | (chart only) | ❌ | ❌ | – |
| residenza / address | Patient.address | ✅ | ✅ | – |
| telefono / email | Patient.phone/email | ✅ | ✅ | – |
| referente / emergencyContact | Patient.emergencyContact* | ✅ (Contatti) | ❌ | – |
| camera / letto / assegnazione | Cartella.cameraNumero/lettoNumero | ❌ | ❌ | – |

**Gap:** manual form covers anagraphics + contacts only; missing *luogo di nascita* and bed assignment. Import covers anagraphics but not contacts/referente.

## 2. Ingresso (Presa in Carico)

Chart tab: `Clinica → Presa in Carico`. Component: `PresaInCaricoTab`. Model: `Cartella` (statoRicovero, patologiaIngresso, presaInCarico fields).

| Field | Intake avail. | Import | Req@intake |
|---|---|---|---|
| Data/ora presa in carico | ❌ | ❌ | ✅ |
| Provenienza / centro inviante | ❌ | partial (narrative) | – |
| Modalità ingresso | ❌ | ❌ | – |
| Motivo ingresso / patologiaIngresso | ❌ | partial (narrative) | ✅ |
| Operatore responsabile | ❌ | ❌ | – |
| statoRicovero | partial (confirm default) | ✅ | ✅ |
| Note iniziali | ❌ | ❌ | – |

**Gap:** the entire admission block is absent from manual intake; only set later in the chart.

## 3. Clinica — sections

Chart tabs under `Clinica` + `Moduli`. Models in parentheses.

| Section | Chart component | Intake avail. | Import | Req@intake |
|---|---|---|---|---|
| Allergie (`AllergiaItem[]`) | allergie editor | ❌ | ✅ (narrative) | – (safety: surface) |
| Anamnesi (`Cartella.anamnesi`) | `renderAnamnesi` | ❌ | ✅ | – |
| Diagnosi (`Diagnosi[]`) | `renderDiagnosi` | ❌ | ✅ | – |
| Terapia farmacologica (`PatientTherapy` + `TherapySchedule`) | `TerapiaFarmacologicaTab` | ❌ | ✅ (narrative, not structured) | – |
| Parametri vitali (`Cartella.parametriVitali`) | `ParametriTab` | ❌ | ❌ | – |
| Dolore (NRS) | `ScalaNRSTab` (module) | ❌ | ❌ | – |
| Note & Visite (`noteClinica`/`visite`) | `renderNote` | ❌ | ❌ | – |
| Esami & Consulenze | `EsamiConsulenzeTab` | ❌ | partial (narrative) | – |
| Sezioni Cliniche (narrative) (`PatientNarrativeSection`) | `NarrativeSectionsTab` | ❌ | ✅ | – |

**Gap:** none of the clinical sections are available in manual intake. Import prefills the *narrative* sections (diagnosi/anamnesi/terapia/allergie/esami) but not the *structured* ones (parametri, dolore, structured therapy schedules) and via a separate review path that does not converge with manual intake.

## 4. Moduli

Chart tab: `Moduli`. Components: `MedicazioniTab`, `ContenzioniTab`, `ScalaBradenTab`, `ScalaTinettiTab`, `ScalaNRSTab`, `DimissioneTab`. Models: `Cartella.medicazioniFerite`, `.contenzioni`, `.valutazioniBraden`, NRS/Tinetti JSON.

| Module | Intake avail. | Import | Req@intake |
|---|---|---|---|
| Medicazioni | ❌ | ❌ | – |
| Contenzioni | ❌ | ❌ | – |
| Scala Braden | ❌ | ❌ | – (configurable) |
| Scala Tinetti | ❌ | ❌ | – (configurable) |
| Scala NRS (dolore) | ❌ | ❌ | – (configurable) |
| Dimissione | ❌ (not an intake module) | ❌ | – |

**Gap:** no module is fillable at intake. Required/skippable must be configurable per the registry (`requiredDuringIntake`). Dimissione is end-of-stay, excluded from intake.

## 5. Documenti

Chart tab: `Documenti`. Component: `DocumentiTab`. Model: `PatientDocument` (bytes in DB) + `ImportDocument`.

| Capability | Intake avail. | Import | Req@intake |
|---|---|---|---|
| Importa file | ❌ (only via separate import path) | ✅ | – |
| Scatta foto | ❌ | ✅ (CameraCapture) | – |
| Ordina / anteprima / collega | ❌ | ✅ (review) | – |
| sourceReferences (campo→fonte) | ❌ | ✅ | – |

**Gap:** documents only attach through the separate import flow; manual intake cannot attach documents pre-creation.

## 6. Summary of gaps

- **Manual intake form** = anagraphics + contacts only. Missing: admission block, all 9 Clinica sections, all 5 intake modules, documents. → addressed by **#122** (workspace) using **#123** shared editors.
- **Document import** = anagraphics + narrative clinical sections via a *separate* path; missing structured sections (parametri, dolore, structured therapy), modules; does not converge with manual intake. → addressed by **#124** (import → same `PatientIntakeDraft`).
- **No-duplication:** the chart already has one editor per section; intake/import must **reuse** them (mode-aware, **#123**) — do **not** create `New*` / `Imported*` / `Chart*` copies.

## 7. Required-at-intake set (proposed)

Hard-required before create: firstName, lastName, dateOfBirth, admission date/time, statoRicovero, motivo ingresso. Everything else fillable-but-optional, with Allergie surfaced prominently (safety). Module obligation configured per `PatientSectionDefinition.requiredDuringIntake`.

## 8. Acceptance (BUG-069)

- [x] All chart fields inventoried (sections 1–5, verified against components + model).
- [x] Each field classified by availability + obligation.
- [x] Differences vs manual form identified (section 6).
- [x] Differences vs document import identified (section 6).
- [x] No field duplicated without need (section 6 — reuse mandate).
