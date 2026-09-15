# Mistral OCR su Azure Foundry

L'importazione usa due ruoli distinti: OCR trascrive immagini/PDF; extraction interpreta il testo e produce i dati da revisionare. La selezione di un modello in Azure non aggiorna automaticamente la configurazione ClinicOS.

## Configurazione candidata

Sul servizio Railway `clinicos-ai-runtime`, dopo approvazione del delivery:

```dotenv
AI_OCR_PROVIDER=mistral
AI_OCR_MODEL=mistral-ocr-4-0
MISTRAL_OCR_URL=https://dpsaifoundry.services.ai.azure.com/providers/mistral/azure/ocr
AI_EXTRACTION_PROVIDER=azure-openai
AI_EXTRACTION_MODEL=gpt-5.5
```

Inserire `MISTRAL_API_KEY` attraverso la gestione sicura dei segreti del servizio. Deve essere una chiave valida per la risorsa Azure dell'endpoint. Non inserirla in repository, log o chat. Se assente, l'adapter può usare `AZURE_OPENAI_API_KEY` solo per host Azure Foundry riconosciuti. Una chiave Azure non viene usata come fallback per host Mistral esterni. I redirect non vengono seguiti.

L'URL deve corrispondere all'API OCR esposta dal deployment. Il percorso sopra è quello previsto dall'adapter; la diagnostica attuale si ferma all'autenticazione, quindi non ne certifica la disponibilità per OCR 4. Se Azure risponde 404 con una chiave valida, verificare il **Consume URI** del deployment e usare l'URL completo in `MISTRAL_OCR_URL`. Non provare percorsi casuali e non disabilitare l'autenticazione.

È accettata anche la radice Azure in `MISTRAL_OCR_URL`, oppure `AZURE_OPENAI_ENDPOINT` quando la prima variabile manca: l'adapter aggiunge il percorso OCR. Un URL completo esplicito viene mantenuto. Il nome `AI_OCR_MODEL` deve essere quello accettato dal deployment.

Non modificare le variabili `AGNOS_LLM_*`: controllano il chatbot. Conservare un modello LLM per extraction, perché dopo una trascrizione sufficientemente lunga il backend gli invia solo testo. Mistral OCR richiede invece documenti allegati.

## Diagnosi osservata il 15 settembre 2026

- Produzione: `AI_OCR_PROVIDER=azure-document-intelligence`, `AI_OCR_MODEL=prebuilt-layout`; extraction `azure-openai/gpt-5.5`.
- Le variabili dedicate Mistral sono assenti. La presenza della chiave Azure non ne prova la validità.
- Una chiamata OCR con PNG sintetico e modello `mistral-ocr-4-0` ha ricevuto HTTP 401. Anche la verifica con solo header `api-key` e chiave senza spazi ha ricevuto 401.
- La lettura dell'elenco modelli Document Intelligence con la stessa chiave ha ricevuto 401.
- Sono rifiutati la credenziale e/o l'abbinamento chiave-risorsa; il codice da solo non può ripristinare il servizio. Non è stato possibile verificare il modello oltre il controllo di autenticazione.
- Nessuna variabile di produzione, documento clinico, release o deployment è stata modificata durante la diagnosi.

Evidenze sanitizzate: `artifacts/task-validation/ripristino-importazione-mistral-ocr-azure/logs/`. L'orario UTC delle chiamate può cadere nel giorno precedente alla data locale italiana.

## Verifica dopo configurazione e rilascio autorizzati

1. Verificare su `/v1/runtime/health` che il ruolo OCR sia `mistral:mistral-ocr-4-0` e extraction sia ancora un LLM. Health verifica configurazione/presenza credenziali, non il successo del provider.
2. Eseguire una lettura con un solo documento sintetico e verificare testo effettivo, non solo HTTP 200. Non usare dati di pazienti per lo smoke test.
3. Importare lo stesso documento nella UI, verificare avanzamento, testo integrale e apertura della revisione. Confermare dati clinici resta un'azione dell'operatore.
4. In caso di errore, usare codice e riferimento del job: `AI_AUTH` chiave/risorsa; `AI_MODEL` endpoint/deployment; `AI_INPUT` richiesta/documento; `AI_EMPTY` testo mancante; `AI_RATE_LIMIT` limite/quota; `AI_TIMEOUT` timeout; `AI_PROVIDER` servizio non disponibile.

Gli errori OCR interrompono la pipeline. Stato terminale e risultato/diagnostica vengono salvati insieme; i corpi di errore del provider non vengono mostrati all'operatore. I documenti restano nel job entro la normale retention e disponibilità dello storage: non sono un archivio permanente.
