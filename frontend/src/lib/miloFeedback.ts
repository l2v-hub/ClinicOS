// Milo: giudizio di chi ha fatto la domanda sulla risposta ricevuta (👍/👎 con correzione).
// Qui solo la forma dei dati inviati: della risposta partono i metadati (percorso, specialisti,
// letture, versioni delle competenze), mai il suo contenuto.

export type MiloRating = 'up' | 'down';
export const MAX_CORRECTION_CHARS = 1000;

export interface MiloFeedbackAnswer {
  intent?: string;
  mode?: string;
  team?: { members?: string[]; tools?: string[]; skills?: Record<string, string> };
  plan?: { tools?: Array<{ tool?: string }> };
}

export function miloFeedbackBody(
  answerId: string,
  question: string,
  answer: MiloFeedbackAnswer,
  rating: MiloRating,
  correction: string,
) {
  const tools = answer.team?.tools?.length
    ? answer.team.tools
    : (answer.plan?.tools ?? []).map((t) => t.tool ?? '').filter(Boolean);
  const text = correction.trim().slice(0, MAX_CORRECTION_CHARS);
  return {
    answerId,
    rating,
    question: question.trim().slice(0, 500),
    ...(rating === 'down' && text ? { correction: text } : {}),
    ...(answer.mode ? { mode: answer.mode } : {}),
    ...(answer.intent ? { intent: answer.intent } : {}),
    members: answer.team?.members ?? [],
    tools: [...new Set(tools)],
    ...(answer.team?.skills ? { skillVersions: answer.team.skills } : {}),
  };
}
