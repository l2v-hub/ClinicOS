// Prompt 10 §6.4 / §7: a new diary note sends only what the operator writes. Time (trusted server
// clock), author (session identity) and patient (route) are never asked; there is no «Stato».

export interface DiaryCreateFields {
  title: string;
  content: string;
  priority: string;
}

export function diaryCreatePayload(form: DiaryCreateFields) {
  return {
    title: form.title.trim() || null,
    content: form.content.trim(),
    priority: form.priority,
  };
}

/** Backend validation message (400) instead of a generic red banner; fallback otherwise. */
export async function diaryWriteErrorMessage(res: Response, fallback: string): Promise<string> {
  if (res.status !== 400 && res.status !== 409) return fallback;
  try {
    const body = (await res.json()) as { error?: unknown };
    return typeof body.error === 'string' && body.error.trim()
      ? `${fallback} ${body.error.trim()}`
      : fallback;
  } catch {
    return fallback;
  }
}
