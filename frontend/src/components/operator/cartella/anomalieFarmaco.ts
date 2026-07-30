// Anomalie di terapia: farmaci prescritti che l'anagrafica AIFA non riconosce.
//
// Logica pura, separata dai hook e dai componenti, perche' da qui dipende un allarme mostrato su
// quattro schermate. La regola difficile non e' contare i farmaci mancanti: e' NON contare quelli
// di cui non sappiamo nulla.
//
// REGOLA (AC10): solo `non-trovato` e' un'anomalia. `fonte-non-disponibile` — l'anagrafica non ha
// risposto, o non e' mai stata importata — non lo e'. Dichiarare un'anomalia su uno stato
// indeterminato significa mandare un operatore a «sanare» una prescrizione corretta, e in ambito
// clinico un allarme falso costa la fiducia in tutti gli allarmi successivi.

import { chiaveFarmaco, type RisoluzioneFarmaco } from './farmacoDocumento';

/** Un farmaco prescritto che l'anagrafica non riconosce. */
export interface AnomaliaFarmaco {
  /** Nome come scritto in terapia: e' cio' che l'operatore deve correggere. */
  farmacoNome: string;
  /** Quante righe di terapia lo prescrivono. */
  righe: number;
  motivo: 'non-in-anagrafica' | 'senza-documento';
}

/** Esito complessivo per un paziente. */
export interface AnomaliePaziente {
  anomalie: AnomaliaFarmaco[];
  /** Numero di farmaci distinti da sanare. */
  totale: number;
  /**
   * true quando almeno una risoluzione non ha risposto. In questo caso `anomalie` puo' essere
   * incompleto: chi mostra il conteggio deve dirlo, non spacciarlo per una verifica riuscita.
   */
  verificaIncompleta: boolean;
}

export const NESSUNA_ANOMALIA: AnomaliePaziente = {
  anomalie: [],
  totale: 0,
  verificaIncompleta: false,
};

/** Riga di terapia ridotta a cio' che serve qui. */
export interface RigaConFarmaco {
  farmacoNome: string;
  dosaggio?: string | null;
}

/**
 * Calcola le anomalie di un paziente dalle sue righe di terapia e dalle risoluzioni.
 *
 * `trova` e' la funzione di lookup (in pratica `trovaRisoluzione` legata alla mappa del hook):
 * passarla dall'esterno tiene questo modulo indipendente da React e dalla forma della cache.
 *
 * Un farmaco prescritto su tre righe conta **una** anomalia, non tre: e' un solo nome da
 * correggere, e gonfiare il numero renderebbe l'allarme meno credibile.
 */
export function anomalieDi(
  righe: RigaConFarmaco[],
  trova: (nome: string, dosaggio?: string | null) => RisoluzioneFarmaco | undefined,
): AnomaliePaziente {
  const perNome = new Map<string, AnomaliaFarmaco>();
  let verificaIncompleta = false;

  for (const riga of righe) {
    const nome = riga.farmacoNome?.trim();
    if (!nome) continue;

    const risoluzione = trova(nome, riga.dosaggio);
    // Nessuna risoluzione ancora disponibile: la verifica e' in corso, non e' un esito.
    if (!risoluzione || risoluzione.stato === 'fonte-non-disponibile') {
      verificaIncompleta = true;
      continue;
    }
    if (risoluzione.stato === 'trovato') continue;

    const chiave = chiaveFarmaco(nome);
    const esistente = perNome.get(chiave);
    if (esistente) {
      esistente.righe += 1;
      continue;
    }
    perNome.set(chiave, {
      farmacoNome: nome,
      righe: 1,
      motivo: risoluzione.stato === 'non-trovato' ? 'non-in-anagrafica' : 'senza-documento',
    });
  }

  // Solo i farmaci assenti dall'anagrafica sono anomalie da sanare. «In anagrafica ma senza
  // documento ufficiale» e' un limite della pubblicazione AIFA, non un errore di prescrizione:
  // mandarlo nello stesso elenco confonderebbe due problemi diversi.
  const anomalie = [...perNome.values()].filter((a) => a.motivo === 'non-in-anagrafica');

  return {
    anomalie: anomalie.sort((a, b) => a.farmacoNome.localeCompare(b.farmacoNome)),
    totale: anomalie.length,
    verificaIncompleta,
  };
}

/** Frase pronta per l'avviso, al singolare o al plurale. */
export function messaggioAnomalie(esito: AnomaliePaziente): string {
  if (esito.totale === 0) return '';
  const farmaci = esito.anomalie.map((a) => a.farmacoNome).join(', ');
  return esito.totale === 1
    ? `1 farmaco in terapia non risulta in anagrafica AIFA: ${farmaci}. Va corretto.`
    : `${esito.totale} farmaci in terapia non risultano in anagrafica AIFA: ${farmaci}. Vanno corretti.`;
}
