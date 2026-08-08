import type { AssistantNav } from '../AIAssistantButton';

// Unico renderer delle azioni di navigazione di Agnos: le azioni del brief automatico e quelle di
// una risposta devono essere indistinguibili, quindi condividono questo componente invece di
// duplicare la riga di chip.

interface Props {
  navigation: AssistantNav[];
  onNavigate?: (n: AssistantNav) => void;
  /** Etichetta ricomposta dai campi strutturati; senza, resta la label del backend. */
  formatLabel?: (n: AssistantNav) => string;
  max?: number;
}

export function NavChips({ navigation, onNavigate, formatLabel, max = 8 }: Props) {
  if (navigation.length === 0) return null;
  return (
    <div className="ai-asst__actions">
      {navigation.slice(0, max).map((n, i) => {
        const label = formatLabel ? formatLabel(n) : n.label;
        return (
          <button
            key={i}
            type="button"
            className="srev-chip"
            title={label}
            onClick={() => onNavigate?.(n)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
