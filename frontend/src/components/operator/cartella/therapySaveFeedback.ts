// Prompt 10 §5.3: la maschera terapia della cartella usa lo stesso controllo per campo
// dell'ingresso e del Diario → Terapia (therapyInputDiagnostics sul payload completo, senza righe
// scartate in silenzio) e, se il server rifiuta comunque, ne mostra il motivo invece di «Errore 400».
import type { TherapyFormValue } from './TherapyFormFields';
import type { TherapyFieldIssue } from './therapyFieldFeedback';
import { therapyFormToInput } from '../../shared/intake/therapyFormPayload';
import { therapyInputDiagnostics } from '../../shared/intake/intakeTherapies';

export function therapyFormIssues(form: TherapyFormValue): TherapyFieldIssue[] {
  return therapyInputDiagnostics(therapyFormToInput(form));
}

/** Riepilogo leggibile vicino al pulsante: quanti campi e il primo motivo. */
export function therapyIssuesSummary(issues: readonly TherapyFieldIssue[]): string {
  const messages = [...new Set(issues.map((issue) => issue.message))];
  if (!messages.length) return '';
  const rest = messages.length - 1;
  return `Correggi prima di salvare: ${messages[0]}${rest > 0 ? ` (e ${rest} ${rest === 1 ? 'altro campo' : 'altri campi'})` : ''}.`;
}

/** Motivo del server (400/409/…), altrimenti un messaggio per stato. Mai solo «Errore NNN». */
export async function therapySaveErrorMessage(
  res: Response,
  outcome = 'Terapia non salvata',
): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (typeof body?.error === 'string' && body.error.trim())
      return `${outcome}: ${body.error.trim()}`;
  } catch {
    // corpo assente o non JSON
  }
  if (res.status === 403) return `${outcome}: il tuo ruolo non può eseguire questa operazione.`;
  if (res.status === 404) return `${outcome}: paziente o terapia non trovati.`;
  return `${outcome} (errore ${res.status}). Riprova.`;
}
