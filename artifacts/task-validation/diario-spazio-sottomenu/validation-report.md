# Diario: spazio coerente con Clinica

Il gruppo dei filtri autore ora ha un margine superiore di 8 px, pari al sottomenu Clinica. Cambia una sola dichiarazione in PatientRecordData.css; aspetto e semantica dei chip restano invariati.

## Verifica

- Anteprima locale con TopNav e CSS reali, markup dei chip equivalente alla scheda paziente e dati sintetici.
- Browser a 1294, 768 e 390 px: distanza misurata dalla barra principale di 8 px per Diario e Clinica, nessun overflow della pagina o dei chip.
- Selezione Medico visibile e correttamente esposta come premuta nell'anteprima mobile.
- Screenshot desktop, tablet e mobile; console senza avvisi o errori.
- Build frontend completata; scansione segreti frontend/src e frontend/dist: zero risultati.
- Diff applicativo limitato al margine. Avvisi whitespace preesistenti nei file utente esclusi dalla consegna e conservati.

Le verifiche responsive sono simulazioni browser. La verifica produzione sarà in sola lettura, senza registrare dati paziente.

## Pubblicazione

Autorizzazione: richiesta specifica dell'utente e autorizzazione persistente a commit, push e deploy. Rilascio solo frontend da commit immutabile; backend invariato. Vedere release-gate.json e deployment-receipt.json per identità degli input ed esito.
