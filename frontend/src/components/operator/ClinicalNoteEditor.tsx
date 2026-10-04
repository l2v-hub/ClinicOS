import { useId } from 'react';
import './ClinicalNoteEditor.css';

/** Common handover/diary fields. Historical priorities are never silently rewritten. */
export function ClinicalNoteEditor({ content, priority, title, disabled = false, onChange }: {
  content: string; priority: string; title?: string; disabled?: boolean;
  onChange: (fields: { content?: string; priority?: string; title?: string }) => void;
}) {
  const id = useId();
  const historical = !['normale', 'urgente'].includes(priority);
  return <div className="clinical-note-editor">
    {title !== undefined && <label htmlFor={`${id}-title`}>Titolo (opzionale)
      <input id={`${id}-title`} className="form-input" value={title} disabled={disabled}
        maxLength={200} onChange={e => onChange({ title: e.target.value })} />
    </label>}
    <label htmlFor={`${id}-content`}>Segnalazione
      <textarea id={`${id}-content`} className="form-input" rows={4} required maxLength={4000}
        value={content} disabled={disabled} placeholder="Descrivi cosa hai osservato o cosa serve fare…"
        onChange={e => onChange({ content: e.target.value })} />
    </label>
    <div><label htmlFor={`${id}-severity`}>Gravità</label>
      <select id={`${id}-severity`} className="form-select" value={priority} disabled={disabled}
        aria-describedby={`${id}-severity-help`} onChange={e => onChange({ priority: e.target.value })}>
        <option value="normale">Normale</option>
        {historical && <option value={priority}>{priority === 'importante' ? 'Importante' : 'Alta'} · registrata in precedenza</option>}
        <option value="urgente">Alta · richiede presa in carico</option>
      </select>
    </div>
    <p id={`${id}-severity-help`} className="form-hint">
      {priority === 'urgente' ? 'Segnalazione urgente: un collega deve confermare «Ho capito».' : historical ? 'Gravità storica conservata senza modificarne il significato.' : 'Normale: informazione per la continuità assistenziale.'}
    </p>
    <p className="form-hint" data-testid="diary-auto-time">Data, ora e autore sono registrati automaticamente al salvataggio.</p>
  </div>;
}
