# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: geometry.spec.mjs >> canonical mobile PRN button fits the available region without clipping
- Location: artifacts\task-validation\therapy-completeness-qa\styled\native-tests\geometry.spec.mjs:4:1

# Error details

```
Error: Canonical PRN control extends outside available mobile region

expect(received).toBeLessThanOrEqual(expected)

Expected: <= 329
Received:    349.359375
```

# Page snapshot

```yaml
- main [ref=e3]:
  - heading "Verifica sintetica · completezza prescrizioni" [level=1] [ref=e4]
  - paragraph [ref=e5]: Nessun paziente reale. Trasporto intercettato; nessuna scrittura consentita.
  - 'button "QA: cambia paziente sintetico" [ref=e6]'
  - generic [ref=e8]:
    - generic [ref=e10] [cursor=pointer]:
      - button "Comprimi Terapia Farmacologica" [expanded] [ref=e11]:
        - generic [ref=e12]: ▾
      - generic [ref=e13]: Terapia Farmacologica
      - generic [ref=e14]: 106 farmaci attivi
    - generic [ref=e15]:
      - tablist "Sezioni della terapia farmacologica" [ref=e17]:
        - generic [ref=e18]:
          - tab "Calendario" [selected] [ref=e19] [cursor=pointer]
          - tab "Storico" [ref=e20] [cursor=pointer]
          - tab "Piano terapeutico" [ref=e21] [cursor=pointer]
      - generic [ref=e22]:
        - paragraph [ref=e23]:
          - text: Il calendario mostra le dosi del periodo, non l’elenco completo delle prescrizioni.
          - button "Vedi tutti i farmaci nel piano terapeutico" [ref=e24] [cursor=pointer]
        - region "Calendario terapie del paziente" [ref=e25]:
          - generic [ref=e26]:
            - status [ref=e27]: 708 dosi programmate · 1 orario esatto
            - region "Programmazione da completare" [ref=e28]:
              - status [ref=e29]:
                - strong [ref=e30]: 1 terapia con programmazione da completare
              - paragraph [ref=e31]: Gli orari mancanti o non validi non generano dosi nel calendario.
              - paragraph [ref=e32]: Per completare o verificare la programmazione, contatta il medico prescrittore.
              - group [ref=e33]:
                - generic "Vedi terapie da programmare (1)" [ref=e34] [cursor=pointer]
          - generic [ref=e35]:
            - group "Navigazione calendario terapie" [ref=e36]:
              - button "Giorno precedente" [ref=e37] [cursor=pointer]:
                - img [ref=e38]
              - button "Oggi" [ref=e40] [cursor=pointer]:
                - img [ref=e41]
                - text: Oggi
              - button "Giorno successivo" [ref=e43] [cursor=pointer]:
                - img [ref=e44]
            - group "Vista del calendario" [ref=e46]:
              - button "Giorno" [ref=e47] [cursor=pointer]
              - button "Settimana" [active] [pressed] [ref=e48] [cursor=pointer]
            - generic [ref=e49]:
              - generic [ref=e50]: Data
              - textbox "Data" [ref=e51]: 2026-10-08
            - button "Aggiorna" [ref=e52] [cursor=pointer]
          - generic [ref=e53]:
            - heading "Settimana 2026-10-05 – 2026-10-11" [level=3] [ref=e54]
            - paragraph [ref=e55]: Apri uno slot per le terapie di quel giorno.
          - table "Calendario terapie per orario" [ref=e57]:
            - rowgroup [ref=e58]:
              - row "Ora lun 5 ott mar 6 ott mer 7 ott gio 8 ott ven 9 ott sab 10 ott dom 11 ott" [ref=e59]:
                - columnheader "Ora" [ref=e60]
                - columnheader "lun 5 ott" [ref=e61]
                - columnheader "mar 6 ott" [ref=e62]
                - columnheader "mer 7 ott" [ref=e63]
                - columnheader "gio 8 ott" [ref=e64]
                - columnheader "ven 9 ott" [ref=e65]
                - columnheader "sab 10 ott" [ref=e66]
                - columnheader "dom 11 ott" [ref=e67]
            - rowgroup [ref=e68]:
              - row [ref=e69]:
                - rowheader "08:00" [ref=e70]
                - cell [ref=e71]:
                  - button [ref=e72] [cursor=pointer]:
                    - img [ref=e73]
                    - generic [ref=e81]:
                      - strong [ref=e82]: Farmaco sintetico 000 · Farmaco sintetico 001 · Farmaco sintetico 002 · Farmaco sintetico 003 · Farmaco sintetico 004 · Farmaco sintetico 005 · Farmaco sintetico 006 · Farmaco sintetico 007 · Farmaco sintetico 008 · Farmaco sintetico 009 · Farmaco sintetico 010 · Farmaco sintetico 011 · Farmaco sintetico 012 · Farmaco sintetico 013 · Farmaco sintetico 014 · Farmaco sintetico 015 · Farmaco sintetico 016 · Farmaco sintetico 017 · Farmaco sintetico 018 · Farmaco sintetico 019 · Farmaco sintetico 020 · Farmaco sintetico 021 · Farmaco sintetico 022 · Farmaco sintetico 023 · Farmaco sintetico 024 · Farmaco sintetico 025 · Farmaco sintetico 026 · Farmaco sintetico 027 · Farmaco sintetico 028 · Farmaco sintetico 029 · Farmaco sintetico 030 · Farmaco sintetico 031 · Farmaco sintetico 032 · Farmaco sintetico 033 · Farmaco sintetico 034 · Farmaco sintetico 035 · Farmaco sintetico 036 · Farmaco sintetico 037 · Farmaco sintetico 038 · Farmaco sintetico 039 · Farmaco sintetico 040 · Farmaco sintetico 041 · Farmaco sintetico 042 · Farmaco sintetico 043 · Farmaco sintetico 044 · Farmaco sintetico 045 · Farmaco sintetico 046 · Farmaco sintetico 047 · Farmaco sintetico 048 · Farmaco sintetico 049 · Farmaco sintetico 050 · Farmaco sintetico 051 · Farmaco sintetico 052 · Farmaco sintetico 053 · Farmaco sintetico 054 · Farmaco sintetico 055 · Farmaco sintetico 056 · Farmaco sintetico 057 · Farmaco sintetico 058 · Farmaco sintetico 059 · Farmaco sintetico 060 · Farmaco sintetico 061 · Farmaco sintetico 062 · Farmaco sintetico 063 · Farmaco sintetico 064 · Farmaco sintetico 065 · Farmaco sintetico 066 · Farmaco sintetico 067 · Farmaco sintetico 068 · Farmaco sintetico 069 · Farmaco sintetico 070 · Farmaco sintetico 071 · Farmaco sintetico 072 · Farmaco sintetico 073 · Farmaco sintetico 074 · Farmaco sintetico 075 · Farmaco sintetico 076 · Farmaco sintetico 077 · Farmaco sintetico 078 · Farmaco sintetico 079 · Farmaco sintetico 080 · Farmaco sintetico 081 · Farmaco sintetico 082 · Farmaco sintetico 083 · Farmaco sintetico 084 · Farmaco sintetico 085 · Farmaco sintetico 086 · Farmaco sintetico 087 · Farmaco sintetico 088 · Farmaco sintetico 089 · Farmaco sintetico 090 · Farmaco sintetico 091 · Farmaco sintetico 092 · Farmaco sintetico 093 · Farmaco sintetico 094 · Farmaco sintetico 095 · Farmaco sintetico 096 · Farmaco sintetico 097 · Farmaco sintetico 098 · Farmaco sintetico 099 · Farmaco sintetico 105 · Farmaco sintetico 107
                      - generic [ref=e83]: 102 dosi · Stato non disponibile
                    - img [ref=e84]
                - cell [ref=e86]:
                  - button [ref=e87] [cursor=pointer]:
                    - img [ref=e88]
                    - generic [ref=e96]:
                      - strong [ref=e97]: Farmaco sintetico 000 · Farmaco sintetico 001 · Farmaco sintetico 002 · Farmaco sintetico 003 · Farmaco sintetico 004 · Farmaco sintetico 005 · Farmaco sintetico 006 · Farmaco sintetico 007 · Farmaco sintetico 008 · Farmaco sintetico 009 · Farmaco sintetico 010 · Farmaco sintetico 011 · Farmaco sintetico 012 · Farmaco sintetico 013 · Farmaco sintetico 014 · Farmaco sintetico 015 · Farmaco sintetico 016 · Farmaco sintetico 017 · Farmaco sintetico 018 · Farmaco sintetico 019 · Farmaco sintetico 020 · Farmaco sintetico 021 · Farmaco sintetico 022 · Farmaco sintetico 023 · Farmaco sintetico 024 · Farmaco sintetico 025 · Farmaco sintetico 026 · Farmaco sintetico 027 · Farmaco sintetico 028 · Farmaco sintetico 029 · Farmaco sintetico 030 · Farmaco sintetico 031 · Farmaco sintetico 032 · Farmaco sintetico 033 · Farmaco sintetico 034 · Farmaco sintetico 035 · Farmaco sintetico 036 · Farmaco sintetico 037 · Farmaco sintetico 038 · Farmaco sintetico 039 · Farmaco sintetico 040 · Farmaco sintetico 041 · Farmaco sintetico 042 · Farmaco sintetico 043 · Farmaco sintetico 044 · Farmaco sintetico 045 · Farmaco sintetico 046 · Farmaco sintetico 047 · Farmaco sintetico 048 · Farmaco sintetico 049 · Farmaco sintetico 050 · Farmaco sintetico 051 · Farmaco sintetico 052 · Farmaco sintetico 053 · Farmaco sintetico 054 · Farmaco sintetico 055 · Farmaco sintetico 056 · Farmaco sintetico 057 · Farmaco sintetico 058 · Farmaco sintetico 059 · Farmaco sintetico 060 · Farmaco sintetico 061 · Farmaco sintetico 062 · Farmaco sintetico 063 · Farmaco sintetico 064 · Farmaco sintetico 065 · Farmaco sintetico 066 · Farmaco sintetico 067 · Farmaco sintetico 068 · Farmaco sintetico 069 · Farmaco sintetico 070 · Farmaco sintetico 071 · Farmaco sintetico 072 · Farmaco sintetico 073 · Farmaco sintetico 074 · Farmaco sintetico 075 · Farmaco sintetico 076 · Farmaco sintetico 077 · Farmaco sintetico 078 · Farmaco sintetico 079 · Farmaco sintetico 080 · Farmaco sintetico 081 · Farmaco sintetico 082 · Farmaco sintetico 083 · Farmaco sintetico 084 · Farmaco sintetico 085 · Farmaco sintetico 086 · Farmaco sintetico 087 · Farmaco sintetico 088 · Farmaco sintetico 089 · Farmaco sintetico 090 · Farmaco sintetico 091 · Farmaco sintetico 092 · Farmaco sintetico 093 · Farmaco sintetico 094 · Farmaco sintetico 095 · Farmaco sintetico 096 · Farmaco sintetico 097 · Farmaco sintetico 098 · Farmaco sintetico 099 · Farmaco sintetico 107
                      - generic [ref=e98]: 101 dosi · Stato non disponibile
                    - img [ref=e99]
                - cell [ref=e101]:
                  - button [ref=e102] [cursor=pointer]:
                    - img [ref=e103]
                    - generic [ref=e111]:
                      - strong [ref=e112]: Farmaco sintetico 000 · Farmaco sintetico 001 · Farmaco sintetico 002 · Farmaco sintetico 003 · Farmaco sintetico 004 · Farmaco sintetico 005 · Farmaco sintetico 006 · Farmaco sintetico 007 · Farmaco sintetico 008 · Farmaco sintetico 009 · Farmaco sintetico 010 · Farmaco sintetico 011 · Farmaco sintetico 012 · Farmaco sintetico 013 · Farmaco sintetico 014 · Farmaco sintetico 015 · Farmaco sintetico 016 · Farmaco sintetico 017 · Farmaco sintetico 018 · Farmaco sintetico 019 · Farmaco sintetico 020 · Farmaco sintetico 021 · Farmaco sintetico 022 · Farmaco sintetico 023 · Farmaco sintetico 024 · Farmaco sintetico 025 · Farmaco sintetico 026 · Farmaco sintetico 027 · Farmaco sintetico 028 · Farmaco sintetico 029 · Farmaco sintetico 030 · Farmaco sintetico 031 · Farmaco sintetico 032 · Farmaco sintetico 033 · Farmaco sintetico 034 · Farmaco sintetico 035 · Farmaco sintetico 036 · Farmaco sintetico 037 · Farmaco sintetico 038 · Farmaco sintetico 039 · Farmaco sintetico 040 · Farmaco sintetico 041 · Farmaco sintetico 042 · Farmaco sintetico 043 · Farmaco sintetico 044 · Farmaco sintetico 045 · Farmaco sintetico 046 · Farmaco sintetico 047 · Farmaco sintetico 048 · Farmaco sintetico 049 · Farmaco sintetico 050 · Farmaco sintetico 051 · Farmaco sintetico 052 · Farmaco sintetico 053 · Farmaco sintetico 054 · Farmaco sintetico 055 · Farmaco sintetico 056 · Farmaco sintetico 057 · Farmaco sintetico 058 · Farmaco sintetico 059 · Farmaco sintetico 060 · Farmaco sintetico 061 · Farmaco sintetico 062 · Farmaco sintetico 063 · Farmaco sintetico 064 · Farmaco sintetico 065 · Farmaco sintetico 066 · Farmaco sintetico 067 · Farmaco sintetico 068 · Farmaco sintetico 069 · Farmaco sintetico 070 · Farmaco sintetico 071 · Farmaco sintetico 072 · Farmaco sintetico 073 · Farmaco sintetico 074 · Farmaco sintetico 075 · Farmaco sintetico 076 · Farmaco sintetico 077 · Farmaco sintetico 078 · Farmaco sintetico 079 · Farmaco sintetico 080 · Farmaco sintetico 081 · Farmaco sintetico 082 · Farmaco sintetico 083 · Farmaco sintetico 084 · Farmaco sintetico 085 · Farmaco sintetico 086 · Farmaco sintetico 087 · Farmaco sintetico 088 · Farmaco sintetico 089 · Farmaco sintetico 090 · Farmaco sintetico 091 · Farmaco sintetico 092 · Farmaco sintetico 093 · Farmaco sintetico 094 · Farmaco sintetico 095 · Farmaco sintetico 096 · Farmaco sintetico 097 · Farmaco sintetico 098 · Farmaco sintetico 099 · Farmaco sintetico 107
                      - generic [ref=e113]: 101 dosi · Stato non disponibile
                    - img [ref=e114]
                - cell [ref=e116]:
                  - button [ref=e117] [cursor=pointer]:
                    - img [ref=e118]
                    - generic [ref=e126]:
                      - strong [ref=e127]: Farmaco sintetico 000 · Farmaco sintetico 001 · Farmaco sintetico 002 · Farmaco sintetico 003 · Farmaco sintetico 004 · Farmaco sintetico 005 · Farmaco sintetico 006 · Farmaco sintetico 007 · Farmaco sintetico 008 · Farmaco sintetico 009 · Farmaco sintetico 010 · Farmaco sintetico 011 · Farmaco sintetico 012 · Farmaco sintetico 013 · Farmaco sintetico 014 · Farmaco sintetico 015 · Farmaco sintetico 016 · Farmaco sintetico 017 · Farmaco sintetico 018 · Farmaco sintetico 019 · Farmaco sintetico 020 · Farmaco sintetico 021 · Farmaco sintetico 022 · Farmaco sintetico 023 · Farmaco sintetico 024 · Farmaco sintetico 025 · Farmaco sintetico 026 · Farmaco sintetico 027 · Farmaco sintetico 028 · Farmaco sintetico 029 · Farmaco sintetico 030 · Farmaco sintetico 031 · Farmaco sintetico 032 · Farmaco sintetico 033 · Farmaco sintetico 034 · Farmaco sintetico 035 · Farmaco sintetico 036 · Farmaco sintetico 037 · Farmaco sintetico 038 · Farmaco sintetico 039 · Farmaco sintetico 040 · Farmaco sintetico 041 · Farmaco sintetico 042 · Farmaco sintetico 043 · Farmaco sintetico 044 · Farmaco sintetico 045 · Farmaco sintetico 046 · Farmaco sintetico 047 · Farmaco sintetico 048 · Farmaco sintetico 049 · Farmaco sintetico 050 · Farmaco sintetico 051 · Farmaco sintetico 052 · Farmaco sintetico 053 · Farmaco sintetico 054 · Farmaco sintetico 055 · Farmaco sintetico 056 · Farmaco sintetico 057 · Farmaco sintetico 058 · Farmaco sintetico 059 · Farmaco sintetico 060 · Farmaco sintetico 061 · Farmaco sintetico 062 · Farmaco sintetico 063 · Farmaco sintetico 064 · Farmaco sintetico 065 · Farmaco sintetico 066 · Farmaco sintetico 067 · Farmaco sintetico 068 · Farmaco sintetico 069 · Farmaco sintetico 070 · Farmaco sintetico 071 · Farmaco sintetico 072 · Farmaco sintetico 073 · Farmaco sintetico 074 · Farmaco sintetico 075 · Farmaco sintetico 076 · Farmaco sintetico 077 · Farmaco sintetico 078 · Farmaco sintetico 079 · Farmaco sintetico 080 · Farmaco sintetico 081 · Farmaco sintetico 082 · Farmaco sintetico 083 · Farmaco sintetico 084 · Farmaco sintetico 085 · Farmaco sintetico 086 · Farmaco sintetico 087 · Farmaco sintetico 088 · Farmaco sintetico 089 · Farmaco sintetico 090 · Farmaco sintetico 091 · Farmaco sintetico 092 · Farmaco sintetico 093 · Farmaco sintetico 094 · Farmaco sintetico 095 · Farmaco sintetico 096 · Farmaco sintetico 097 · Farmaco sintetico 098 · Farmaco sintetico 099 · Farmaco sintetico 107
                      - generic [ref=e128]: 101 dosi · Stato non disponibile
                    - img [ref=e129]
                - cell [ref=e131]:
                  - button [ref=e132] [cursor=pointer]:
                    - img [ref=e133]
                    - generic [ref=e141]:
                      - strong [ref=e142]: Farmaco sintetico 000 · Farmaco sintetico 001 · Farmaco sintetico 002 · Farmaco sintetico 003 · Farmaco sintetico 004 · Farmaco sintetico 005 · Farmaco sintetico 006 · Farmaco sintetico 007 · Farmaco sintetico 008 · Farmaco sintetico 009 · Farmaco sintetico 010 · Farmaco sintetico 011 · Farmaco sintetico 012 · Farmaco sintetico 013 · Farmaco sintetico 014 · Farmaco sintetico 015 · Farmaco sintetico 016 · Farmaco sintetico 017 · Farmaco sintetico 018 · Farmaco sintetico 019 · Farmaco sintetico 020 · Farmaco sintetico 021 · Farmaco sintetico 022 · Farmaco sintetico 023 · Farmaco sintetico 024 · Farmaco sintetico 025 · Farmaco sintetico 026 · Farmaco sintetico 027 · Farmaco sintetico 028 · Farmaco sintetico 029 · Farmaco sintetico 030 · Farmaco sintetico 031 · Farmaco sintetico 032 · Farmaco sintetico 033 · Farmaco sintetico 034 · Farmaco sintetico 035 · Farmaco sintetico 036 · Farmaco sintetico 037 · Farmaco sintetico 038 · Farmaco sintetico 039 · Farmaco sintetico 040 · Farmaco sintetico 041 · Farmaco sintetico 042 · Farmaco sintetico 043 · Farmaco sintetico 044 · Farmaco sintetico 045 · Farmaco sintetico 046 · Farmaco sintetico 047 · Farmaco sintetico 048 · Farmaco sintetico 049 · Farmaco sintetico 050 · Farmaco sintetico 051 · Farmaco sintetico 052 · Farmaco sintetico 053 · Farmaco sintetico 054 · Farmaco sintetico 055 · Farmaco sintetico 056 · Farmaco sintetico 057 · Farmaco sintetico 058 · Farmaco sintetico 059 · Farmaco sintetico 060 · Farmaco sintetico 061 · Farmaco sintetico 062 · Farmaco sintetico 063 · Farmaco sintetico 064 · Farmaco sintetico 065 · Farmaco sintetico 066 · Farmaco sintetico 067 · Farmaco sintetico 068 · Farmaco sintetico 069 · Farmaco sintetico 070 · Farmaco sintetico 071 · Farmaco sintetico 072 · Farmaco sintetico 073 · Farmaco sintetico 074 · Farmaco sintetico 075 · Farmaco sintetico 076 · Farmaco sintetico 077 · Farmaco sintetico 078 · Farmaco sintetico 079 · Farmaco sintetico 080 · Farmaco sintetico 081 · Farmaco sintetico 082 · Farmaco sintetico 083 · Farmaco sintetico 084 · Farmaco sintetico 085 · Farmaco sintetico 086 · Farmaco sintetico 087 · Farmaco sintetico 088 · Farmaco sintetico 089 · Farmaco sintetico 090 · Farmaco sintetico 091 · Farmaco sintetico 092 · Farmaco sintetico 093 · Farmaco sintetico 094 · Farmaco sintetico 095 · Farmaco sintetico 096 · Farmaco sintetico 097 · Farmaco sintetico 098 · Farmaco sintetico 099 · Farmaco sintetico 107
                      - generic [ref=e143]: 101 dosi · Stato non disponibile
                    - img [ref=e144]
                - cell [ref=e146]:
                  - button [ref=e147] [cursor=pointer]:
                    - img [ref=e148]
                    - generic [ref=e156]:
                      - strong [ref=e157]: Farmaco sintetico 000 · Farmaco sintetico 001 · Farmaco sintetico 002 · Farmaco sintetico 003 · Farmaco sintetico 004 · Farmaco sintetico 005 · Farmaco sintetico 006 · Farmaco sintetico 007 · Farmaco sintetico 008 · Farmaco sintetico 009 · Farmaco sintetico 010 · Farmaco sintetico 011 · Farmaco sintetico 012 · Farmaco sintetico 013 · Farmaco sintetico 014 · Farmaco sintetico 015 · Farmaco sintetico 016 · Farmaco sintetico 017 · Farmaco sintetico 018 · Farmaco sintetico 019 · Farmaco sintetico 020 · Farmaco sintetico 021 · Farmaco sintetico 022 · Farmaco sintetico 023 · Farmaco sintetico 024 · Farmaco sintetico 025 · Farmaco sintetico 026 · Farmaco sintetico 027 · Farmaco sintetico 028 · Farmaco sintetico 029 · Farmaco sintetico 030 · Farmaco sintetico 031 · Farmaco sintetico 032 · Farmaco sintetico 033 · Farmaco sintetico 034 · Farmaco sintetico 035 · Farmaco sintetico 036 · Farmaco sintetico 037 · Farmaco sintetico 038 · Farmaco sintetico 039 · Farmaco sintetico 040 · Farmaco sintetico 041 · Farmaco sintetico 042 · Farmaco sintetico 043 · Farmaco sintetico 044 · Farmaco sintetico 045 · Farmaco sintetico 046 · Farmaco sintetico 047 · Farmaco sintetico 048 · Farmaco sintetico 049 · Farmaco sintetico 050 · Farmaco sintetico 051 · Farmaco sintetico 052 · Farmaco sintetico 053 · Farmaco sintetico 054 · Farmaco sintetico 055 · Farmaco sintetico 056 · Farmaco sintetico 057 · Farmaco sintetico 058 · Farmaco sintetico 059 · Farmaco sintetico 060 · Farmaco sintetico 061 · Farmaco sintetico 062 · Farmaco sintetico 063 · Farmaco sintetico 064 · Farmaco sintetico 065 · Farmaco sintetico 066 · Farmaco sintetico 067 · Farmaco sintetico 068 · Farmaco sintetico 069 · Farmaco sintetico 070 · Farmaco sintetico 071 · Farmaco sintetico 072 · Farmaco sintetico 073 · Farmaco sintetico 074 · Farmaco sintetico 075 · Farmaco sintetico 076 · Farmaco sintetico 077 · Farmaco sintetico 078 · Farmaco sintetico 079 · Farmaco sintetico 080 · Farmaco sintetico 081 · Farmaco sintetico 082 · Farmaco sintetico 083 · Farmaco sintetico 084 · Farmaco sintetico 085 · Farmaco sintetico 086 · Farmaco sintetico 087 · Farmaco sintetico 088 · Farmaco sintetico 089 · Farmaco sintetico 090 · Farmaco sintetico 091 · Farmaco sintetico 092 · Farmaco sintetico 093 · Farmaco sintetico 094 · Farmaco sintetico 095 · Farmaco sintetico 096 · Farmaco sintetico 097 · Farmaco sintetico 098 · Farmaco sintetico 099 · Farmaco sintetico 107
                      - generic [ref=e158]: 101 dosi · Stato non disponibile
                    - img [ref=e159]
                - cell [ref=e161]:
                  - button [ref=e162] [cursor=pointer]:
                    - img [ref=e163]
                    - generic [ref=e171]:
                      - strong [ref=e172]: Farmaco sintetico 000 · Farmaco sintetico 001 · Farmaco sintetico 002 · Farmaco sintetico 003 · Farmaco sintetico 004 · Farmaco sintetico 005 · Farmaco sintetico 006 · Farmaco sintetico 007 · Farmaco sintetico 008 · Farmaco sintetico 009 · Farmaco sintetico 010 · Farmaco sintetico 011 · Farmaco sintetico 012 · Farmaco sintetico 013 · Farmaco sintetico 014 · Farmaco sintetico 015 · Farmaco sintetico 016 · Farmaco sintetico 017 · Farmaco sintetico 018 · Farmaco sintetico 019 · Farmaco sintetico 020 · Farmaco sintetico 021 · Farmaco sintetico 022 · Farmaco sintetico 023 · Farmaco sintetico 024 · Farmaco sintetico 025 · Farmaco sintetico 026 · Farmaco sintetico 027 · Farmaco sintetico 028 · Farmaco sintetico 029 · Farmaco sintetico 030 · Farmaco sintetico 031 · Farmaco sintetico 032 · Farmaco sintetico 033 · Farmaco sintetico 034 · Farmaco sintetico 035 · Farmaco sintetico 036 · Farmaco sintetico 037 · Farmaco sintetico 038 · Farmaco sintetico 039 · Farmaco sintetico 040 · Farmaco sintetico 041 · Farmaco sintetico 042 · Farmaco sintetico 043 · Farmaco sintetico 044 · Farmaco sintetico 045 · Farmaco sintetico 046 · Farmaco sintetico 047 · Farmaco sintetico 048 · Farmaco sintetico 049 · Farmaco sintetico 050 · Farmaco sintetico 051 · Farmaco sintetico 052 · Farmaco sintetico 053 · Farmaco sintetico 054 · Farmaco sintetico 055 · Farmaco sintetico 056 · Farmaco sintetico 057 · Farmaco sintetico 058 · Farmaco sintetico 059 · Farmaco sintetico 060 · Farmaco sintetico 061 · Farmaco sintetico 062 · Farmaco sintetico 063 · Farmaco sintetico 064 · Farmaco sintetico 065 · Farmaco sintetico 066 · Farmaco sintetico 067 · Farmaco sintetico 068 · Farmaco sintetico 069 · Farmaco sintetico 070 · Farmaco sintetico 071 · Farmaco sintetico 072 · Farmaco sintetico 073 · Farmaco sintetico 074 · Farmaco sintetico 075 · Farmaco sintetico 076 · Farmaco sintetico 077 · Farmaco sintetico 078 · Farmaco sintetico 079 · Farmaco sintetico 080 · Farmaco sintetico 081 · Farmaco sintetico 082 · Farmaco sintetico 083 · Farmaco sintetico 084 · Farmaco sintetico 085 · Farmaco sintetico 086 · Farmaco sintetico 087 · Farmaco sintetico 088 · Farmaco sintetico 089 · Farmaco sintetico 090 · Farmaco sintetico 091 · Farmaco sintetico 092 · Farmaco sintetico 093 · Farmaco sintetico 094 · Farmaco sintetico 095 · Farmaco sintetico 096 · Farmaco sintetico 097 · Farmaco sintetico 098 · Farmaco sintetico 099 · Farmaco sintetico 107
                      - generic [ref=e173]: 101 dosi · Stato non disponibile
                    - img [ref=e174]
          - region "Al bisogno" [ref=e176]:
            - heading "Al bisogno (2)" [level=4] [ref=e177]:
              - text: Al bisogno
              - generic [ref=e178]: (2)
            - paragraph [ref=e179]: Prescrizioni al bisogno valide nella settimana; le dosi registrabili sono solo quelle di oggi.
            - list [ref=e180]:
              - listitem [ref=e181]:
                - strong [ref=e182]: Farmaco sintetico 101
                - generic [ref=e183]: Prescrizione sintetica · orale · Prescr. Prescrittore sintetico
                - button "Somministra al bisogno · dosi di oggi" [ref=e184] [cursor=pointer]
              - listitem [ref=e185]:
                - strong [ref=e186]: Farmaco sintetico 104
                - generic [ref=e187]: Prescrizione sintetica · orale · Prescr. Prescrittore sintetico
```

# Test source

```ts
  1  | import { test, expect } from 'playwright/test';
  2  | import { writeFileSync } from 'node:fs';
  3  | import { guard } from './fixtures.mjs';
  4  | test('canonical mobile PRN button fits the available region without clipping', async ({ page }, info) => {
  5  |  await page.setViewportSize({ width: 390, height: 844 }); const log = await guard(page); await page.goto('/qa-therapy');
  6  |  await page.getByRole('button', { name: 'Settimana', exact: true }).click();
  7  |  const prn = page.getByRole('region', { name: 'Al bisogno', exact: true });
  8  |  const button = prn.getByRole('button', { name: 'Somministra al bisogno · dosi di oggi' });
  9  |  await expect(button).toBeVisible(); await expect(prn).toContainText('Farmaco sintetico 101');
  10 |  await prn.screenshot({ path: info.outputPath('mobile-prn-clipped-control.png') });
  11 |  const measure = await button.evaluate(node => { const rect = node.getBoundingClientRect();
  12 |   const parent = node.closest('.patient-therapy-calendar__unscheduled').getBoundingClientRect();
  13 |   return { button: { left: rect.left, right: rect.right, width: rect.width },
  14 |    region: { left: parent.left, right: parent.right, width: parent.width }, viewport: innerWidth }; });
  15 |  writeFileSync(info.outputPath('geometry.json'), JSON.stringify(measure, null, 2));
  16 |  expect(log.errors).toEqual([]); expect(log.blocked).toEqual([]);
> 17 |  expect(measure.button.right, 'Canonical PRN control extends outside available mobile region').toBeLessThanOrEqual(measure.region.right);
     |                                                                                                ^ Error: Canonical PRN control extends outside available mobile region
  18 | });
  19 | 
```