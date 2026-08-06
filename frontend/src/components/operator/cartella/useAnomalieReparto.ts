// Anomalie di terapia su tutto il reparto, per la lista pazienti e il cruscotto operatore.
//
// PERCHE' PASSA DA /therapy-slots. Serve sapere quali farmaci sono prescritti a **tutti** i
// pazienti. Interrogare `/patients/:id/therapies` una volta per paziente costerebbe una richiesta
// a testa a ogni apertura della lista; `GET /therapy-slots?date=` restituisce le terapie attive di
// tutto il reparto in una sola richiesta, e il backend resta intatto.
//
// LIMITE, da dichiarare in interfaccia e non nascondere: quella rotta filtra le terapie **attive
// e valide nella data richiesta** ed esclude i «al bisogno». Le anomalie su terapie sospese,
// future o al bisogno non compaiono qui — restano visibili nella cartella del paziente, che legge
// le proprie terapie per intero.

import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '../../../config';
import { cachedGetJson } from '../../../lib/cachedFetch';
import { anomalieDi, NESSUNA_ANOMALIA, type AnomaliePaziente } from './anomalieFarmaco';
import {
  trovaRisoluzione,
  useRisoluzioniFarmaco,
  type RigaDaRisolvere,
} from './farmacoRiferimento';

// Le somministrazioni del giorno cambiano durante il turno, ma l'insieme dei farmaci prescritti
// no: un minuto di cache evita di ripetere la richiesta a ogni navigazione fra le schermate.
const TTL_MS = 60 * 1000;

interface SommministrazioneSlot {
  drugName: string;
  dosage: string | null;
}

interface PazienteSlot {
  patientId: string;
  firstName: string;
  lastName: string;
  administrations: SommministrazioneSlot[];
}

interface Slot {
  patients: PazienteSlot[];
}

export interface AnomalieReparto {
  /** Anomalie per paziente. I pazienti senza anomalie non compaiono. */
  perPaziente: Map<string, AnomaliePaziente>;
  /** Pazienti con almeno un'anomalia, con nome pronto da mostrare. */
  pazienti: { patientId: string; nome: string; esito: AnomaliePaziente }[];
  /** true finche' la verifica non e' conclusa: nessun conteggio va presentato come definitivo. */
  inCorso: boolean;
}

const VUOTO: AnomalieReparto = { perPaziente: new Map(), pazienti: [], inCorso: true };

/** Data di oggi in formato ISO, come la vuole `/therapy-slots`. */
function oggi(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Anomalie di terapia di tutto il reparto.
 *
 * `attivo` permette di non interrogare nulla dove la funzione non serve: un hook non si puo'
 * chiamare condizionalmente, ma si puo' spegnere.
 */
export function useAnomalieReparto(attivo = true): AnomalieReparto {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [fallito, setFallito] = useState(false);

  useEffect(() => {
    if (!attivo) return;
    let annullato = false;

    void cachedGetJson<Slot[]>(`${API_URL}/therapy-slots?date=${oggi()}`, TTL_MS)
      .then((dati) => {
        if (!annullato) setSlots(Array.isArray(dati) ? dati : []);
      })
      .catch(() => {
        // Terapie non leggibili: nessuna anomalia dichiarata. Vedi AC10 in anomalieFarmaco.ts.
        if (!annullato) setFallito(true);
      });

    return () => {
      annullato = true;
    };
  }, [attivo]);

  // Righe da risolvere e appartenenza al paziente, ricavate una volta sola dagli slot.
  const {
    righe,
    perPaziente: righePerPaziente,
    nomi,
  } = useMemo(() => {
    const righe: RigaDaRisolvere[] = [];
    const perPaziente = new Map<string, RigaDaRisolvere[]>();
    const nomi = new Map<string, string>();

    for (const slot of slots ?? []) {
      for (const paziente of slot.patients ?? []) {
        nomi.set(paziente.patientId, `${paziente.lastName} ${paziente.firstName}`.trim());
        const proprie = perPaziente.get(paziente.patientId) ?? [];
        for (const somministrazione of paziente.administrations ?? []) {
          if (!somministrazione.drugName) continue;
          const riga: RigaDaRisolvere = {
            farmacoNome: somministrazione.drugName,
            dosaggio: somministrazione.dosage,
          };
          // Lo stesso farmaco compare in ogni fascia della giornata: una riga per farmaco basta,
          // e `anomalieDi` conterebbe comunque un'anomalia sola.
          if (!proprie.some((r) => r.farmacoNome === riga.farmacoNome)) {
            proprie.push(riga);
            righe.push(riga);
          }
        }
        perPaziente.set(paziente.patientId, proprie);
      }
    }
    return { righe, perPaziente, nomi };
  }, [slots]);

  const risoluzioni = useRisoluzioniFarmaco(righe);

  return useMemo(() => {
    if (fallito) return { perPaziente: new Map(), pazienti: [], inCorso: false };
    if (slots === null) return VUOTO;

    const trova = (nome: string, dosaggio?: string | null) =>
      trovaRisoluzione(risoluzioni, nome, dosaggio);

    const perPaziente = new Map<string, AnomaliePaziente>();
    let inCorso = false;

    for (const [patientId, proprie] of righePerPaziente) {
      const esito = anomalieDi(proprie, trova);
      if (esito.verificaIncompleta) inCorso = true;
      if (esito.totale > 0) perPaziente.set(patientId, esito);
    }

    const pazienti = [...perPaziente.entries()]
      .map(([patientId, esito]) => ({
        patientId,
        nome: nomi.get(patientId) ?? patientId,
        esito,
      }))
      // Prima chi ha piu' farmaci da sanare: e' l'ordine in cui conviene lavorarli.
      .sort((a, b) => b.esito.totale - a.esito.totale || a.nome.localeCompare(b.nome));

    return { perPaziente, pazienti, inCorso };
  }, [fallito, slots, righePerPaziente, risoluzioni, nomi]);
}

/** Anomalie di un singolo paziente dalla mappa di reparto. */
export function anomalieDelPaziente(reparto: AnomalieReparto, patientId: string): AnomaliePaziente {
  return reparto.perPaziente.get(patientId) ?? NESSUNA_ANOMALIA;
}
