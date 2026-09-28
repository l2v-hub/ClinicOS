import { agnosSuggestedPromptGroups } from './agnosSuggestionModel';

interface Props {
  operatorRole?: string;
  hasCurrentPatient: boolean;
  selectedText: string;
  disabled: boolean;
  onSelect: (text: string) => void;
}

export function AgnosSuggestedPrompts({
  operatorRole,
  hasCurrentPatient,
  selectedText,
  disabled,
  onSelect,
}: Props) {
  const groups = agnosSuggestedPromptGroups(operatorRole, hasCurrentPatient);

  return (
    <section className="agnos-suggestions" aria-labelledby="agnos-suggestions-title">
      {/* HMI 1: solo l'elenco; titolo e aiuto restano per i lettori di schermo */}
      <h2 id="agnos-suggestions-title" className="ds-sr-only">
        Domande suggerite
      </h2>
      <p id="agnos-suggestions-help" className="ds-sr-only">
        Scegli una domanda: potrai rileggerla e modificarla prima di inviarla.
      </p>
      {groups.map((group) => (
        <div className="agnos-suggestions__group" key={group.id}>
          {groups.length > 1 && <h3 className="ds-eyebrow">{group.label}</h3>}
          <div className="agnos-suggestions__list">
            {group.prompts.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className="ds-btn ds-btn--secondary ds-btn--block"
                disabled={disabled}
                aria-describedby="agnos-suggestions-help"
                data-selected={selectedText.trim() === prompt.text || undefined}
                onClick={() => onSelect(prompt.text)}
              >
                {prompt.text}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
