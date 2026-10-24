# Analysis

Issue #507 requests admission defaults under Terapia → Programmazione. emptyTherapyForm sets both dates to today and runs at chart initialization/open/reset and intake add. Chart has resolved cartella.presaInCarico.dataIngresso (legacy dataPresa supported); StepClinica has data.ingresso.dataPresa but does not pass it to TherapyEditor/TherapyIntakeEditor. Same defaulting cause. Imported therapies use dischargeTherapy rowToForm; saved therapies use therapyToForm; calendar creation applies therapyFormAtCalendarSlot after defaults. Preserve all explicit sources.

UI → controlled factory state → operator changes → existing validation/mapping → existing API remains unchanged. No fetch, persistence, permission, session or background change. Context refreshes must not reactively reset drafts. New forms use current props. Existing isCalendarDate validates round trips; fallback uses facilityLocalDate (Europe/Rome).

Rejected reactive useEffect because it overwrites edits; rejected changing import defaults because explicit source review must remain intact. Screenshot not examined; native backend persistence not claimed verified.

Initial build failed because the starting hypothesis attached dataIngresso to Paziente; its type proved admission belongs to CartellaPaziente/PresaInCarico instead. The patch now passes the existing resolvePresaInCarico result from PatientDetail through TherapyEditor. Initial browser smoke expectation also proved draft retention across tab navigation; explicit cancel/reopen is the correct fresh-form scenario. Both initial failure logs are retained.
