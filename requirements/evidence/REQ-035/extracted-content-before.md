# REQ-035 — Extracted content (already present in rawText, before the fix)

The model (Mistral OCR) produced the section markdown in `resultData.rawText`, e.g.:

```markdown
## Anamnesi Patologica Recente:

Inviata in PS in data 09/03 per dolore toracico...

## Anamnesi Patologica Remota:

Pregresso intervento...
```

The content existed; it was never mapped into the per-section `originalText`.
