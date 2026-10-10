import { OPERATOR_COLOR_PALETTE } from '../../types';
import type { RuoloOperatore, StatoOperatore } from '../../types';

export interface OperatorFormValue {
  nome: string;
  cognome: string;
  ruolo: RuoloOperatore;
  email: string;
  telefono: string;
  reparto: string;
  stato: StatoOperatore;
  qualifica: string;
  colore: string;
  note: string;
}

export const EMPTY_OPERATOR_FORM: OperatorFormValue = {
  nome: '',
  cognome: '',
  ruolo: 'medico',
  email: '',
  telefono: '',
  reparto: '',
  stato: 'attivo',
  qualifica: '',
  colore: OPERATOR_COLOR_PALETTE[0],
  note: '',
};
