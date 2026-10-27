# Versioned correction of generated acceptance and current evidence

## User requirement and two distinct fields

Original issue507 says “in Terapia->Programmazione le date d'inizio devo essere impostate  di default la data d'ingresso che è la data in cui inizia la terapia”. It asks dataInizio in Programmazione. It does not request moving a newly scheduled single administration into the past. Prior generated criterion “New manual therapy start/once default dates use the actual resolved admission day, including delayed cartella hydration.” conflated separate fields and is superseded only in this new version; old packet, plan and review remain preserved.

Current actual source f4e68a022bbe24359a37c6e5e27e9dd4c35261c5: emptyTherapyForm at lines83/95 uses therapyAdmissionDate for dataInizio; line108 separately uses therapyAdministrationDate for dataSomministrazione. Changing type at line287 updates only tipo. hydrateTherapyAdmissionDates lines47/48 also treats start and administration separately. Existing unit test therapyAdmissionDefaults.test.ts checks all three types and payload: with admission2026-09-15 and fixed facility day2026-10-25, start stays09-15 and a new once administration is10-25. The actual frontend suite and browser run40429879923 passed; no new execution is claimed in this packet-only correction.

Immutable baseline715a defaulted administration to facility today. Main655f backend due-therapy-query.ts and therapy-slots.ts match una_tantum only on exact administration day. A past administration default could silently omit the dose from today’s round. Exact Git/raw file hashes and relevant source lines are in contract-clarification-proof.json. This is a correction of our overbroad generated criterion to the actual user requirement, not a clinical policy change or an approval obtained by changing code to hide a problem.

## Preserved genuine review sequence

Claude1 requested max(admission,today) for once and repeated intake lineage. Both were implemented; genuine Claude2 approved0 report6436037135. NEW independent final Codex in40468144880 requested changes because old AC1 still required once=admission and old evidence/test-results/results.json contained an earlier original-cold-probe once09-15. Both the approved peer and negative final remain byte-exact history. This revision addresses the criterion inconsistency and explicitly separates old evidence from current matching-source proof. It does not relabel the old final as verified.

## Actual evidence and limits

Real zero-provider native qualification40429879923, CODE db2a891fe982dac8c42f8fb5a3e91a49404f30fa, full three commands PASS; native validateEvidence accepted the regenerated screenshot/trace/video. Reader40431285828 retrieved exactly those bytes. All ten source files map from tested CODE to existing head and this packet-only candidate. Existing historical results.json is copied byte-exact to evidence/test-results/historical/results-before-contract-clarification.json; current results.json contains the real finite native command/evidence proof with explicit origin, not invented browser assertion rows. Old reports, qualification, Git history and all7implementation attempts remain preserved. This is synthetic actual-component browser evidence, not authenticated deployment acceptance.

| File | Git blob SHA1 | Raw SHA256 |
|---|---|---|
| e2e/issue507-smoke.mjs | 39eabb7359ac86be54e6350d50ae4094c416ab14 | dc8b202cf958eefa1c678211418beff3c3681cc3cde76de300fdad7204105544 |
| e2e/issue507/entry.tsx | 4636699ea5a9f0e9e0a347481380c1d50c875bd1 | 696b0e60fa0d4283cb8ff6a298af8e31861c967532bed6a22248e8f3595dfeb2 |
| frontend/src/components/operator/PatientDetail.tsx | c6570832a771cc6c78261df14b2c1299507051e7 | fb73b4e253f767d6344e57d61c38b8b64222a47a5f2215d4c8a9f1251c8e0dbb |
| frontend/src/components/operator/cartella/TerapiaFarmacologicaTab.tsx | 6d770b3d95828d6427de687415a576c34b86660f | 2b271ce8b317449ebec4990599800a1dd24c3f1b6fc9cea4a7155f29efa5a8da |
| frontend/src/components/operator/cartella/TherapyFormFields.tsx | 943bcf42ad6c3d367c126ff507ab1b20e067033c | 9a0fd94088795f18a87da49720130fbf348a57625c8a667c6b604cb24732cd34 |
| frontend/src/components/operator/cartella/__tests__/therapyAdmissionDefaults.test.ts | 93f992e6dad4eaced5956563b098b18098778537 | 640574fb2a46e04d8414984d0a48810a9571c3d26c927bd8431128075b4c3ef1 |
| frontend/src/components/operator/sections/TherapyEditor.tsx | 2fdaedf82124af522427b7425a32b1c0ca329d0b | 541279cfc05dace84f7a74c1671b9287689ee6cdbeb94dfc1830d06f0f025ed8 |
| frontend/src/components/operator/sections/TherapyIntakeEditor.tsx | 7e3d142d412cd80f0380bca5564a08d3ccb28e90 | 0b34a7ec2fde96368daab9dc519102117d980274bbae1f349acd012061fa56b4 |
| frontend/src/components/shared/intake/StepClinica.tsx | ef20d725dc244ed67e560df4f39162e8c6cc0676 | ef2ec3c049afbc40bd257f387394ebcff423ffd18a0afab9588e2f1369dc6caa |
| frontend/src/lib/therapyAdmissionDate.ts | 1a7c9f594838870e0ea40f497eac98434ae9f297 | d24e633ff1d8760e5554f56d54180e5212c9f0b5855e4929dafe078dc8154c5f |

## Sequential pending gates

Genuine host allowance7→8 and private packet author reservation precede this revision. No additional clinical/provider execution is consumed by drafting. New independent exact-source/contract/custody QA, all six actual checks on the new head and plain exact-source proof must precede new genuine Claude peer3. Then a NEW independent final Codex review is required before ordinary protected merge and deployment verification/issue closure. No old claim or final approval is reused. Clinical506 and516 remain separate unfinished work.
