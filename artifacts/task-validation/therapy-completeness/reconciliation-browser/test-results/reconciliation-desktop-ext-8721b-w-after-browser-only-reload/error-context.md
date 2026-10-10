# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: reconciliation.spec.mjs >> desktop: extracted variants stay visible and require review after browser-only reload
- Location: artifacts\task-validation\therapy-completeness\native-tests\reconciliation.spec.mjs:4:3

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByTestId('discharge-therapy-row').nth(1).getByLabel('Farmaco', { exact: true })
Expected: "Beta"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveValue" with timeout 5000ms
  - waiting for getByTestId('discharge-therapy-row').nth(1).getByLabel('Farmaco', { exact: true })

```

```yaml
- main:
  - heading "Verifica sintetica · inventario estratto" [level=1]
  - paragraph: Fonte generata dal helper backend reale. Bozza solo nel browser; nessuna scrittura API/DB.
  - 'button "QA: revisione"'
  - 'button "QA: proposte"'
  - 'button "QA: riepilogo"'
  - region "Terapie rilevate dalla lettera di dimissioni":
    - text: Terapie rilevate dalla lettera di dimissioni
    - alert: "3 righe da verificare: dati incompleti, controlla prima di salvare."
    - article:
      - strong: 1. Alfa
      - text: da verificare
      - button "Lascia in bozza Alfa": Lascia in bozza
      - paragraph: Indica una data di inizio valida; Verifica la via di somministrazione; Verifica lo stato della terapia; Inserisci da 1 a 32 orari; Verifica i dati estratti confrontandoli con il documento.
      - strong: Dati estratti automaticamente — confronta il documento
      - paragraph: Questa voce può coincidere con una riga già rilevata. Verifica farmaco, dose, frequenza e stato; lascia in bozza i duplicati o i dati non confermati.
      - text: "{ \"nome\": \"Alfa\", \"dose\": \"5 mg\", \"frequenza\": \"08:00\", \"stato\": \"attivo\" }"
      - region "Farmaco":
        - heading "Farmaco" [level=3]
        - text: Prodotto medicinale *
        - paragraph: Alfa
        - paragraph: "Nome già presente in terapia: non verificato in questa maschera"
        - button "Cambia"
        - text: Forma farmaceutica
        - combobox "Forma farmaceutica":
          - option "Seleziona forma" [selected]
          - option "compressa"
          - option "capsula"
          - option "sciroppo"
          - option "fiala"
          - option "flacone"
          - option "bustina"
          - option "gocce"
          - option "inalatore"
          - option "cerotto"
          - option "crema"
        - text: Dosaggio commerciale
        - spinbutton "Dosaggio commerciale"
        - combobox "Unità dosaggio commerciale":
          - option "Unità"
          - option "mg" [selected]
          - option "g"
          - option "mcg"
          - option "ml"
          - option "UI"
          - option "%"
        - text: Via di somministrazione
        - combobox "Via di somministrazione" [invalid]:
          - option "Seleziona via" [selected]
          - option "orale"
          - option "IM"
          - option "SC"
          - option "IV"
          - option "sublinguale"
          - option "topico"
          - option "transdermica"
          - option "inalatoria"
          - option "rettale"
          - option "oftalmica"
          - option "otologica"
          - option "nasale"
          - option "vaginale"
        - paragraph: Verifica la via di somministrazione.
      - region "Programmazione":
        - heading "Programmazione" [level=3]
        - group "Tipo terapia":
          - radio "Periodica A orari e giorni stabiliti" [checked]
          - strong: Periodica
          - text: A orari e giorni stabiliti
          - radio "Una tantum Una sola somministrazione"
          - strong: Una tantum
          - text: Una sola somministrazione
          - radio "Al bisogno Secondo le indicazioni"
          - strong: Al bisogno
          - text: Secondo le indicazioni
        - text: Data inizio *
        - textbox "Data inizio *" [invalid]
        - paragraph: Indica una data di inizio valida.
        - text: Data fine (facoltativa)
        - textbox "Data fine (facoltativa)"
        - text: Stato terapia
        - combobox "Stato terapia" [invalid]:
          - option "— Verifica lo stato —" [disabled] [selected]
          - option "Attiva"
          - option "Sospesa"
          - option "Conclusa"
        - paragraph: Verifica lo stato della terapia.
        - text: Ripeti
        - group "Giorni della settimana":
          - button "Tutti i giorni" [pressed]
          - button "Lun"
          - button "Mar"
          - button "Mer"
          - button "Gio"
          - button "Ven"
          - button "Sab"
          - button "Dom"
      - region "Orari e dosi":
        - heading "Orari e dosi" [level=3]
        - group "Modalità della dose":
          - button "Dose fissa" [pressed]
          - button "Schema glicemico"
        - group: Divisibilità Frazioni consentite
        - group "Orari e dosi":
          - paragraph: Inserisci da 1 a 32 orari.
          - paragraph: Aggiungi un orario e indica la dose da somministrare.
          - button "+ Aggiungi orario"
      - group:
        - text: Prescrittore e note Dettagli aggiuntivi Prescrittore
        - textbox "Prescrittore":
          - /placeholder: Dr. ...
        - group "Prescrittori proposti":
          - button "Dimissione ospedaliera"
        - text: Note e indicazioni
        - textbox "Note e indicazioni"
      - complementary "Riepilogo della terapia":
        - heading "Riepilogo della terapia" [level=3]
        - strong: Alfa
        - text: "Tipo terapia: Periodica ·"
        - paragraph: "Via: da indicare · Inizio: da indicare"
        - paragraph: Tutti i giorni
        - paragraph: Orari e dosi da indicare.
      - group "Verifica della terapia estratta dal documento":
        - paragraph: Verifica i dati estratti confrontandoli con il documento.
        - button "Ho verificato questa terapia" [disabled]
    - article:
      - strong: 2. Beta
      - text: da verificare
      - button "Lascia in bozza Beta": Lascia in bozza
      - paragraph: Indica una data di inizio valida; Verifica la via di somministrazione; Verifica lo stato della terapia; Inserisci da 1 a 32 orari; Verifica i dati estratti confrontandoli con il documento.
      - strong: Dati estratti automaticamente — confronta il documento
      - paragraph: Questa voce può coincidere con una riga già rilevata. Verifica farmaco, dose, frequenza e stato; lascia in bozza i duplicati o i dati non confermati.
      - text: "{ \"nome\": \"Beta\", \"dose\": \"25 mg\", \"frequenza\": \"al bisogno\", \"stato\": \"sospeso\", \"note\": \"<script>syntheticOnly</script>\" }"
      - region "Farmaco":
        - heading "Farmaco" [level=3]
        - text: Prodotto medicinale *
        - paragraph: Beta
        - paragraph: "Nome già presente in terapia: non verificato in questa maschera"
        - button "Cambia"
        - text: Forma farmaceutica
        - combobox "Forma farmaceutica":
          - option "Seleziona forma" [selected]
          - option "compressa"
          - option "capsula"
          - option "sciroppo"
          - option "fiala"
          - option "flacone"
          - option "bustina"
          - option "gocce"
          - option "inalatore"
          - option "cerotto"
          - option "crema"
        - text: Dosaggio commerciale
        - spinbutton "Dosaggio commerciale"
        - combobox "Unità dosaggio commerciale":
          - option "Unità"
          - option "mg" [selected]
          - option "g"
          - option "mcg"
          - option "ml"
          - option "UI"
          - option "%"
        - text: Via di somministrazione
        - combobox "Via di somministrazione" [invalid]:
          - option "Seleziona via" [selected]
          - option "orale"
          - option "IM"
          - option "SC"
          - option "IV"
          - option "sublinguale"
          - option "topico"
          - option "transdermica"
          - option "inalatoria"
          - option "rettale"
          - option "oftalmica"
          - option "otologica"
          - option "nasale"
          - option "vaginale"
        - paragraph: Verifica la via di somministrazione.
      - region "Programmazione":
        - heading "Programmazione" [level=3]
        - group "Tipo terapia":
          - radio "Periodica A orari e giorni stabiliti" [checked]
          - strong: Periodica
          - text: A orari e giorni stabiliti
          - radio "Una tantum Una sola somministrazione"
          - strong: Una tantum
          - text: Una sola somministrazione
          - radio "Al bisogno Secondo le indicazioni"
          - strong: Al bisogno
          - text: Secondo le indicazioni
        - text: Data inizio *
        - textbox "Data inizio *" [invalid]
        - paragraph: Indica una data di inizio valida.
        - text: Data fine (facoltativa)
        - textbox "Data fine (facoltativa)"
        - text: Stato terapia
        - combobox "Stato terapia" [invalid]:
          - option "— Verifica lo stato —" [disabled] [selected]
          - option "Attiva"
          - option "Sospesa"
          - option "Conclusa"
        - paragraph: Verifica lo stato della terapia.
        - text: Ripeti
        - group "Giorni della settimana":
          - button "Tutti i giorni" [pressed]
          - button "Lun"
          - button "Mar"
          - button "Mer"
          - button "Gio"
          - button "Ven"
          - button "Sab"
          - button "Dom"
      - region "Orari e dosi":
        - heading "Orari e dosi" [level=3]
        - group "Modalità della dose":
          - button "Dose fissa" [pressed]
          - button "Schema glicemico"
        - group: Divisibilità Frazioni consentite
        - group "Orari e dosi":
          - paragraph: Inserisci da 1 a 32 orari.
          - paragraph: Aggiungi un orario e indica la dose da somministrare.
          - button "+ Aggiungi orario"
      - group:
        - text: Prescrittore e note Dettagli aggiuntivi Prescrittore
        - textbox "Prescrittore":
          - /placeholder: Dr. ...
        - group "Prescrittori proposti":
          - button "Dimissione ospedaliera"
        - text: Note e indicazioni
        - textbox "Note e indicazioni"
      - complementary "Riepilogo della terapia":
        - heading "Riepilogo della terapia" [level=3]
        - strong: Beta
        - text: "Tipo terapia: Periodica ·"
        - paragraph: "Via: da indicare · Inizio: da indicare"
        - paragraph: Tutti i giorni
        - paragraph: Orari e dosi da indicare.
      - group "Verifica della terapia estratta dal documento":
        - paragraph: Verifica i dati estratti confrontandoli con il documento.
        - button "Ho verificato questa terapia" [disabled]
    - article:
      - strong: 3. Beta
      - text: da verificare
      - button "Lascia in bozza Beta": Lascia in bozza
      - paragraph: Indica una data di inizio valida; Verifica la via di somministrazione; Verifica lo stato della terapia; Inserisci da 1 a 32 orari; Verifica i dati estratti confrontandoli con il documento.
      - strong: Dati estratti automaticamente — confronta il documento
      - paragraph: Questa voce può coincidere con una riga già rilevata. Verifica farmaco, dose, frequenza e stato; lascia in bozza i duplicati o i dati non confermati.
      - text: "{ \"nome\": \"Beta\", \"dose\": \"50 mg\", \"frequenza\": \"al bisogno\", \"stato\": \"sospeso\" }"
      - region "Farmaco":
        - heading "Farmaco" [level=3]
        - text: Prodotto medicinale *
        - paragraph: Beta
        - paragraph: "Nome già presente in terapia: non verificato in questa maschera"
        - button "Cambia"
        - text: Forma farmaceutica
        - combobox "Forma farmaceutica":
          - option "Seleziona forma" [selected]
          - option "compressa"
          - option "capsula"
          - option "sciroppo"
          - option "fiala"
          - option "flacone"
          - option "bustina"
          - option "gocce"
          - option "inalatore"
          - option "cerotto"
          - option "crema"
        - text: Dosaggio commerciale
        - spinbutton "Dosaggio commerciale"
        - combobox "Unità dosaggio commerciale":
          - option "Unità"
          - option "mg" [selected]
          - option "g"
          - option "mcg"
          - option "ml"
          - option "UI"
          - option "%"
        - text: Via di somministrazione
        - combobox "Via di somministrazione" [invalid]:
          - option "Seleziona via" [selected]
          - option "orale"
          - option "IM"
          - option "SC"
          - option "IV"
          - option "sublinguale"
          - option "topico"
          - option "transdermica"
          - option "inalatoria"
          - option "rettale"
          - option "oftalmica"
          - option "otologica"
          - option "nasale"
          - option "vaginale"
        - paragraph: Verifica la via di somministrazione.
      - region "Programmazione":
        - heading "Programmazione" [level=3]
        - group "Tipo terapia":
          - radio "Periodica A orari e giorni stabiliti" [checked]
          - strong: Periodica
          - text: A orari e giorni stabiliti
          - radio "Una tantum Una sola somministrazione"
          - strong: Una tantum
          - text: Una sola somministrazione
          - radio "Al bisogno Secondo le indicazioni"
          - strong: Al bisogno
          - text: Secondo le indicazioni
        - text: Data inizio *
        - textbox "Data inizio *" [invalid]
        - paragraph: Indica una data di inizio valida.
        - text: Data fine (facoltativa)
        - textbox "Data fine (facoltativa)"
        - text: Stato terapia
        - combobox "Stato terapia" [invalid]:
          - option "— Verifica lo stato —" [disabled] [selected]
          - option "Attiva"
          - option "Sospesa"
          - option "Conclusa"
        - paragraph: Verifica lo stato della terapia.
        - text: Ripeti
        - group "Giorni della settimana":
          - button "Tutti i giorni" [pressed]
          - button "Lun"
          - button "Mar"
          - button "Mer"
          - button "Gio"
          - button "Ven"
          - button "Sab"
          - button "Dom"
      - region "Orari e dosi":
        - heading "Orari e dosi" [level=3]
        - group "Modalità della dose":
          - button "Dose fissa" [pressed]
          - button "Schema glicemico"
        - group: Divisibilità Frazioni consentite
        - group "Orari e dosi":
          - paragraph: Inserisci da 1 a 32 orari.
          - paragraph: Aggiungi un orario e indica la dose da somministrare.
          - button "+ Aggiungi orario"
      - group:
        - text: Prescrittore e note Dettagli aggiuntivi Prescrittore
        - textbox "Prescrittore":
          - /placeholder: Dr. ...
        - group "Prescrittori proposti":
          - button "Dimissione ospedaliera"
        - text: Note e indicazioni
        - textbox "Note e indicazioni"
      - complementary "Riepilogo della terapia":
        - heading "Riepilogo della terapia" [level=3]
        - strong: Beta
        - text: "Tipo terapia: Periodica ·"
        - paragraph: "Via: da indicare · Inizio: da indicare"
        - paragraph: Tutti i giorni
        - paragraph: Orari e dosi da indicare.
      - group "Verifica della terapia estratta dal documento":
        - paragraph: Verifica i dati estratti confrontandoli con il documento.
        - button "Ho verificato questa terapia" [disabled]
    - paragraph: Verranno create solo le terapie incluse e verificate. «Lascia in bozza» conserva la riga originale senza creare una prescrizione somministrabile.
```

# Test source

```ts
  1  | import { test, expect } from 'playwright/test';
  2  | import { guard } from './fixtures.mjs';
  3  | for (const [name, viewport] of [['desktop', { width: 1256, height: 1032 }], ['mobile', { width: 390, height: 844 }]]) {
  4  |   test(`${name}: extracted variants stay visible and require review after browser-only reload`, async ({ page }, info) => {
  5  |     await page.setViewportSize(viewport); const log = await guard(page);
  6  |     await page.goto('/qa-therapy?reconcile');
  7  |     const rows = page.getByTestId('discharge-therapy-row');
  8  |     await expect(rows).toHaveCount(3);
  9  |     const beta = rows.nth(1);
> 10 |     await expect(beta.getByLabel('Farmaco', { exact: true })).toHaveValue('Beta');
     |                                                               ^ Error: expect(locator).toHaveValue(expected) failed
  11 |     await expect(beta.getByLabel('Stato terapia', { exact: true })).toHaveValue('');
  12 |     await expect(beta.getByLabel('Data di inizio', { exact: true })).toHaveValue('');
  13 |     const source = beta.getByTestId('structured-therapy-source');
  14 |     await expect(source).toBeVisible();
  15 |     await expect(source).toContainText('Dati estratti automaticamente');
  16 |     await expect(source).toContainText('25 mg');
  17 |     await expect(source).toContainText('sospeso');
  18 |     await expect(beta.getByTestId('discharge-original-text')).toHaveCount(0);
  19 |     await expect(beta.getByRole('button', { name: 'Ho verificato questa terapia', exact: true })).toBeDisabled();
  20 |     const notes = beta.getByLabel('Note e indicazioni', { exact: true });
  21 |     await notes.fill('Revisione sintetica — dati da confermare');
  22 |     await page.reload();
  23 |     await expect(notes).toHaveValue('Revisione sintetica — dati da confermare');
  24 |     await expect(beta.getByLabel('Stato terapia', { exact: true })).toHaveValue('');
  25 |     await expect(source).toContainText('25 mg');
  26 |     await expect(rows.nth(2).getByTestId('structured-therapy-source')).toContainText('50 mg');
  27 |     await source.scrollIntoViewIfNeeded();
  28 |     const geometry = await source.evaluate(el => ({width:el.clientWidth,scroll:el.scrollWidth}));
  29 |     expect(geometry.scroll).toBeLessThanOrEqual(geometry.width+1);
  30 |     await source.screenshot({ path:info.outputPath(`${name}-extracted-source.png`) });
  31 |     await page.screenshot({ path:info.outputPath(`${name}-candidate-review.png`) });
  32 |     expect(await page.evaluate(() => globalThis.syntheticOnly)).toBeUndefined();
  33 |     await beta.getByRole('button', { name: 'Lascia in bozza Beta', exact:true }).click();
  34 |     await page.reload();
  35 |     await expect(beta).toContainText('Resta in bozza');
  36 |     await expect(source).toContainText('25 mg');
  37 |     expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
  38 |   });
  39 |   test(`${name}: proposals and summary retain escaped extraction evidence, not fabricated source text`, async ({ page }, info) => {
  40 |     await page.setViewportSize(viewport); const log = await guard(page);
  41 |     await page.goto('/qa-therapy?reconcile');
  42 |     await page.getByRole('button', {name:'QA: proposte',exact:true}).click();
  43 |     const proposal = page.getByRole('region', {name:'Nuove proposte dalle pagine aggiornate'});
  44 |     await expect(proposal).toBeVisible();
  45 |     await expect(proposal.getByTestId('structured-therapy-source')).toContainText('50 mg');
  46 |     await expect(proposal.getByTestId('discharge-original-text')).toHaveCount(0);
  47 |     await proposal.screenshot({path:info.outputPath(`${name}-proposal-source.png`)});
  48 |     await page.getByRole('button', {name:'QA: riepilogo',exact:true}).click();
  49 |     const sources = page.getByTestId('structured-therapy-source');
  50 |     await expect(sources).toHaveCount(3);
  51 |     await expect(sources.nth(1)).toContainText('<script>syntheticOnly</script>');
  52 |     await expect(sources.nth(1)).toContainText('25 mg');
  53 |     await expect(page.getByTestId('discharge-original-text')).toHaveCount(0);
  54 |     await sources.nth(1).scrollIntoViewIfNeeded();
  55 |     await page.screenshot({path:info.outputPath(`${name}-summary-source.png`)});
  56 |     expect(await page.evaluate(() => globalThis.syntheticOnly)).toBeUndefined();
  57 |     expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
  58 |   });
  59 | }
  60 | 
```