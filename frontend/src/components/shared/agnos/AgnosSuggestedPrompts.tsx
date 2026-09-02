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
      <div className="agnos-suggestions__header">
        <h2 id="agnos-suggestions-title">Domande suggerite</h2>
        <p id="agnos-suggestions-help">
          Scegli una domanda: potrai rileggerla e modificarla prima di inviarla.
        </p>
      </div>
      {groups.map((group) => (
        <div className="agnos-suggestions__group" key={group.id}>
          <h3>{group.label}</h3>
          <div className="agnos-suggestions__list">
            {group.prompts.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                className="agnos-suggestions__button"
                disabled={disabled}
                aria-describedby="agnos-suggestions-help"
                data-selected={selectedText.trim() === prompt.text || undefined}
                onClick={() => onSelect(prompt.text)}
              >
                <span>{prompt.text}</span>
                <span className="agnos-suggestions__arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
