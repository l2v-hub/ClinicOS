# Acceptance Matrix — Issue #275 (Import: Header e Footer)

REQ: nell'import del documento, identificare header/footer che si ripetono su OGNI pagina e pulirli
dal testo (la ripetizione è il criterio di rilevamento), MA mantenere il "numero pagina di un totale"
perché permette di leggere documenti multipagina in modo sequenziale e ordinato.

| # | Criterio | Metodo | Dove | Stato iniziale | Stato finale | Evidenza |
|---|---|---|---|---|---|---|
| AC1 | Header ripetuto su ogni pagina rilevato per **ripetizione** e rimosso (prima occorrenza tenuta) | Unit test | `filterRepeatedHeaders` | PASS (già, REQ-037) | PASS | `header-filter.test.ts` (anagrafica prima pagina tenuta, dup rimossi) |
| AC2 | Il marcatore **"pagina N di totale" viene MANTENUTO** (normalizzato `--- Pagina N/Tot ---`), non cancellato | Unit test | delta `keepPageMarkers` | **FAIL** (footer pagina cancellato) | **PASS** | test `#275: page-number footer normalized and KEPT` |
| AC3 | Ordine sequenziale dei marcatori preservato (pag.1 prima di pag.2) | Unit test | — | n/a | PASS | stesso test (indexOf 1/3 < 2/3) |
| AC4 | Header/footer con testo clinico extra NON rimosso (falso positivo evitato) | Unit test | `footerWithExtra` | PASS (già) | PASS | test `footer line that ALSO carries text is kept` |
| AC5 | Idempotenza (ri-eseguire non altera oltre) | Unit test | marker con residuo `/tot` non ri-matchato | PASS (già) | PASS | test `idempotent` |
| AC6 | Nessuna regressione | Full backend suite | — | — | PASS (333/333) | — |

## Note

- Il motore di rilevamento/stripping header ripetuti esisteva già (REQ-037, `header-filter.ts`).
- Il **delta di questo REQ**: prima il footer "Pagina N di Tot" veniva **cancellato** (solo il numero
  finiva nei metadati `detectedPageNumbers`); ora viene **normalizzato e mantenuto** come
  `--- Pagina N/Tot ---` nel testo pulito (aiuto alla lettura sequenziale), con opt-out
  `DOCUMENT_KEEP_PAGE_MARKERS=false`.
- Verifica **deterministica via unit test** (no AI service): `header-filter.test.ts` 17/17.
- L'esempio della issue (header FONDAZIONE/ASL/Geriatria/anagrafica ripetuto per pagina) è coperto dai
  test esistenti di rilevamento header tabellare.
