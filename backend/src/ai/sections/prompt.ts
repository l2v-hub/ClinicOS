// Builds the faithful-section extraction prompt from the document profile (REQ-026).
//
// The prompt is generated from the profile so that editing aliases in the JSON
// asset automatically updates the instructions the model receives — no code change.

import type { DocumentProfile } from './profile.js';

function aliasLines(profile: DocumentProfile): string {
  return profile.sections
    .filter((s) => s.key !== 'UNMAPPED_CONTENT')
    .map((s) => `- ${s.key} (${s.label}): ${s.aliases.join(' | ')}`)
    .join('\n');
}

/** Compose the model instructions for faithful section extraction + semantic tagging. */
export function buildSectionsPrompt(profile: DocumentProfile): string {
  return [
    'Sei un sistema clinico che SEGMENTA una lettera di dimissione ospedaliera italiana',
    'nelle sezioni canoniche ClinicOS. NON riassumere, NON interpretare, NON riscrivere,',
    'NON dedurre dati assenti, NON frammentare inutilmente il testo.',
    '',
    'MAPPATURA SEZIONI',
    'Associa ogni titolo del documento a UNA chiave canonica usando questi alias:',
    aliasLines(profile),
    'Il testo leggibile che non appartiene con sicurezza a nessuna sezione va in UNMAPPED_CONTENT (mai eliminato).',
    '',
    'REGOLE rawText (per ogni sezione)',
    "- Conserva TUTTO il testo della sezione in UN UNICO blocco, nell'ordine originale.",
    '- Mantieni date, abbreviazioni, punteggiatura ed eventuali errori presenti nel documento.',
    '- Non trasformare in elenchi se il documento non li contiene; non perdere righe secondarie.',
    '- Una sola voce per chiave canonica (un solo rawText per sezione).',
    '',
    'TAG SEMANTICI (annotations)',
    `Tag ammessi: ${profile.tags.join(', ')}.`,
    '- Le annotazioni NON modificano il testo: indicano solo intervalli [startOffset, endOffset) dentro rawText.',
    '- "text" deve essere ESATTAMENTE rawText.substring(startOffset, endOffset).',
    '- VIETATO inserire HTML (es. <b>...</b>) nel contenuto. Il grassetto è responsabilità del frontend.',
    '- Annota titoli (SECTION_TITLE), sottotitoli interni (SUBSECTION_TITLE), date (DATE), orari (TIME),',
    '  riferimenti temporali (TEMPORAL_MARKER), e nelle terapie nome farmaco/dose/schema/frequenza.',
    '',
    'ANAMNESI: un unico blocco con remota/recente/prossima/fisiologica/familiare; annota i sottotitoli con SUBSECTION_TITLE.',
    'DIAGNOSI/DECORSO/CONSULENZE/IMMAGINI/PRESTAZIONI: un unico blocco fedele, niente riordino né separazione automatica.',
    '',
    'TERAPIE (HOSPITAL_THERAPY, DISCHARGE_HOME_THERAPY)',
    '- Il rawText della sezione contiene SEMPRE tutto il testo della terapia.',
    '- In "medications" prova a identificare per ogni riga: medicationName, dose, schedule, frequency, route, duration.',
    '- Conserva sempre "exactText" (testo originale completo della riga). Non omettere parti non comprese.',
    '- Non dedurre frequenza/orario, non correggere dosaggi, non uniformare nomi, non convertire unità.',
    '- Se un componente non è identificabile lascialo "" e aggiungi warning "MEDICATION_COMPONENTS_NOT_FULLY_IDENTIFIED".',
    '',
    'ALLERGIE (priorità massima)',
    `- Campo "allergies.status" tra: ${profile.allergyStatuses.join(', ')}.`,
    "- L'assenza di testo NON significa assenza di allergie (usa not_documented).",
    '- Non dedurre allergene/gravità, non completare parole illeggibili, mantieni il testo esatto.',
    '- Annota gli allergeni con ALLERGY_CRITICAL; conserva sourceFileId e sourcePage.',
    '- Testo ambiguo => status "unclear"; informazioni contrastanti => status "conflicting".',
    '',
    'ANAGRAFICA (PATIENT_DEMOGRAPHICS -> "demographics")',
    '- Estrai SOLO se presenti: nome, cognome, data di nascita, luogo di nascita, sesso, codice fiscale,',
    '  indirizzo, telefono, email, numero cartella. Non dedurre sesso dal nome né età dalla diagnosi.',
    '',
    'Rispondi ESCLUSIVAMENTE con un oggetto JSON conforme allo schema fornito, senza testo aggiuntivo.',
  ].join('\n');
}
