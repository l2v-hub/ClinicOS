# Piano: Parametro Vitale Modal

## FileDaCreare
- `frontend/src/components/operator/ParametroVitaleModal.tsx`

## FileDaModificare
- `frontend/src/components/operator/MultiPatientParametri.tsx`

## InterfaceModal

```typescript
type CampoParametro = 'pa' | 'fc' | 'spo2' | 'temperatura' | 'dtx' | 'evacuazione' | 'note';

interface ParametroVitaleModalProps {
  /** Quale campo parametro modificare */
  campo: CampoParametro;
  /** Valore corrente del campo (stringa, come in RigaEditabile) */
  valoreCorrente: string;
  /** Nome paziente per header modal */
  nomePaziente: string;
  /** Callback salvataggio: restituisce il nuovo valore validato */
  onSalva: (nuovoValore: string) => void;
  /** Callback chiusura senza salvare */
  onChiudi: () => void;
}
```

## IntegrazioneProposta

### In RigaPaziente

1. Aggiungere stato locale per la modal:
```typescript
const [modalCampo, setModalCampo] = useState<CampoParametro | null>(null);
```

2. Sostituire ogni `<label className="mpp-field"><input ...>` con un `<button>` cliccabile:
```typescript
<button className="mpp-cell-btn" onClick={() => setModalCampo('pa')}>
  <span className="mpp-cell-btn__label">PA <span className="mpp-field__unit">mmHg</span></span>
  <span className="mpp-cell-btn__value">{riga.pa || '—'}</span>
</button>
```

3. Renderizzare la modal condizionalmente:
```typescript
{modalCampo && (
  <ParametroVitaleModal
    campo={modalCampo}
    valoreCorrente={riga[modalCampo]}
    nomePaziente={`${paziente.lastName}, ${paziente.firstName}`}
    onSalva={(nuovoValore) => {
      // Aggiorna riga locale
      setRiga(prev => ({ ...prev, [modalCampo]: nuovoValore }));
      // Costruisci riga aggiornata e salva immediatamente
      const rigaAggiornata = { ...riga, [modalCampo]: nuovoValore };
      onSalva(paziente.id, rigaAggiornata);
      setModalCampo(null);
    }}
    onChiudi={() => setModalCampo(null)}
  />
)}
```

4. Rimuovere il pulsante "Salva riga" e "Annulla" dalla riga (il salvataggio avviene dalla modal).

5. Mantenere i campi "Ora rilevazione" e "Operatore" come input inline (non aprono modal).

### Toast feedback

Dopo `onSalva` nella modal, mostrare toast verde "Valore salvato" per 2.5s. Gestito dallo stato `saved` gia presente in RigaPaziente (il `setTimeout(() => setSaved(false), 2500)` esiste gia).

## ValidationRules

| Campo | Tipo input | Validazione |
|---|---|---|
| PA | Due input numerici: sistolica + diastolica | Entrambi interi 40-300, sistolica > diastolica. Join come "120/80" su salva. Se valoreCorrente contiene "/", split per pre-popolare. |
| FC | Input numerico | Intero positivo, range 20-300 |
| SpO2 | Input numerico | Intero, range 70-100 |
| Temperatura | Input numerico (step 0.1) | Decimale, range 35.0-42.0 |
| DTX | Input numerico | Intero positivo (> 0) |
| Evacuazione | Select dropdown | Opzioni: "", "Si", "No", "Alvo regolare", "Stipsi", "Diarrea" |
| Note | Textarea | Nessuna validazione, max 500 caratteri |

Errore di validazione mostrato sotto l'input con classe `npm-field-error` (riusata da NewPatientModal).

Il pulsante "Salva" nella modal e disabilitato se la validazione fallisce.

## ClassiCSSRiusate

Da NewPatientModal (gia definite nel CSS globale):
- `modal-overlay` — sfondo scuro semi-trasparente
- `npm-header` — header della modal
- `npm-header__text` — wrapper testo header
- `npm-header__title` — titolo h3
- `npm-header__subtitle` — sottotitolo descrittivo
- `npm-body` — corpo scrollabile
- `npm-footer` — footer con azioni
- `npm-footer__actions` — wrapper bottoni footer
- `npm-field` — wrapper campo singolo
- `npm-field--error` — stato errore campo
- `npm-label` — etichetta campo
- `npm-input` — stile input
- `npm-input--error` — input con bordo rosso
- `npm-select` — stile select
- `npm-field-error` — testo errore sotto il campo
- `btn-primary` — bottone primario (Salva)
- `btn-secondary` — bottone secondario (Annulla)
- `icon-btn npm-close-btn` — bottone X chiusura

## ClassiCSSNuove

1. `modal-box--parametro` — variante compatta della modal box:
```css
.modal-box--parametro {
  max-width: 440px;
  min-height: auto;
}
```

2. `mpp-cell-btn` — bottone cella che sostituisce gli input inline nella riga:
```css
.mpp-cell-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 6px 10px;
  border: 1px solid var(--border-light, #e2e8f0);
  border-radius: 6px;
  background: var(--bg-white, #fff);
  cursor: pointer;
  min-width: 90px;
  transition: border-color 0.15s;
}
.mpp-cell-btn:hover {
  border-color: var(--primary, #2563eb);
}
.mpp-cell-btn__label { font-size: 11px; color: var(--text-muted); }
.mpp-cell-btn__value { font-size: 14px; font-weight: 500; color: var(--text-primary); }
```

## Configurazione campi (dentro ParametroVitaleModal)

Mappa statica `CAMPO_CONFIG` che per ogni `CampoParametro` definisce:
- `titolo`: string (es. "Pressione arteriosa")
- `unita`: string | null (es. "mmHg")
- `tipo`: 'testo' | 'numero' | 'numero_doppio' | 'select' | 'textarea'
- `placeholder`: string
- `opzioni?`: string[] (solo per select)
- `range?`: { min: number; max: number } (solo per numero)
- `step?`: number (per decimali)

Questo evita if/switch ripetuti nel render.
