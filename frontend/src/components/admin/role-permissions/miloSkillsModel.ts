// «Competenze di Milo»: regole di presentazione, senza rete né componenti.

import type { MiloFeedbackItem, MiloSkill } from '../../../lib/miloSkillsApi';

export const MAX_INSTRUCTIONS = 20;
export const MAX_INSTRUCTION_CHARS = 700;

/** Istruzioni oggi in uso: la versione approvata, altrimenti quelle rilasciate. */
export function instructionsInUse(skill: Pick<MiloSkill, 'approved' | 'instructions'>): string[] {
  return skill.approved ? skill.approved.instructions : skill.instructions;
}

export function versionInUse(skill: Pick<MiloSkill, 'approved' | 'releasedVersion'>): string {
  if (skill.approved) return skill.approved.label;
  return skill.releasedVersion ? `${skill.releasedVersion} (rilasciata)` : 'non disponibile';
}

/** Una istruzione per riga; le righe vuote e i trattini iniziali non contano. */
export function parseInstructionLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*[-•]\s*/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}

/** Perché l'elenco scritto a mano non può essere inviato (null = valido). */
export function instructionsProblem(lines: string[]): string | null {
  if (lines.length === 0) return 'Scrivi almeno una istruzione, una per riga.';
  if (lines.length > MAX_INSTRUCTIONS) return `Al massimo ${MAX_INSTRUCTIONS} istruzioni.`;
  const long = lines.findIndex((line) => line.length > MAX_INSTRUCTION_CHARS);
  if (long >= 0)
    return `La riga ${long + 1} supera i ${MAX_INSTRUCTION_CHARS} caratteri (${lines[long].length}).`;
  return null;
}

export interface InstructionDiff {
  line: string;
  change: 'same' | 'added' | 'removed';
}
/** Confronto riga per riga: prima le istruzioni proposte (uguali o nuove), poi quelle tolte. */
export function diffInstructions(current: string[], proposed: string[]): InstructionDiff[] {
  const before = new Set(current);
  const after = new Set(proposed);
  return [
    ...proposed.map((line) => ({
      line,
      change: before.has(line) ? ('same' as const) : ('added' as const),
    })),
    ...current
      .filter((line) => !after.has(line))
      .map((line) => ({ line, change: 'removed' as const })),
  ];
}

/** Giudizi aperti che riguardano uno specialista (il coordinatore partecipa a ogni risposta del team). */
export function feedbackForSkill(
  feedback: MiloFeedbackItem[],
  skillId: string,
): MiloFeedbackItem[] {
  return feedback.filter(
    (f) =>
      f.status === 'open' &&
      (skillId === 'coordinatore' ? f.mode === 'team' : f.members.includes(skillId)),
  );
}

export function openNegativeCount(feedback: MiloFeedbackItem[]): number {
  return feedback.filter((f) => f.status === 'open' && f.rating === 'down').length;
}
