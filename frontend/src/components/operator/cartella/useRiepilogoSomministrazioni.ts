// Riepilogo delle somministrazioni di oggi in tutto il reparto, per le dashboard Admin e
// Operatore. Stessa fonte dati di useAnomalieReparto (GET /therapy-slots?date=), stesso TTL di
// cache: chiamare entrambi gli hook nello stesso componente non raddoppia la richiesta di rete
// (cachedGetJson deduplica per URL).
//
// LIMITE, da dichiarare e non nascondere: la rotta e' reparto-wide, non filtrata per operatore
// (nessuna vera assegnazione paziente-operatore esiste nel modello dati attuale — vedi la nota
// nel commento di useAnomalieReparto.ts per lo stesso limite sulle anomalie). "In ritardo" e'
// quindi un dato di TUTTO il reparto, non solo dei pazienti di chi guarda.

import { useEffect, useState } from 'react';
import { API_URL } from '../../../config';
import { cachedGetJson } from '../../../lib/cachedFetch';
import type { TherapySlot } from '../../../types';

const TTL_MS = 60 * 1000;

export interface RitardoVoce {
  farmacoNome: string;
  scheduledTime: string;
  minutiRitardo: number;
}

export interface RitardoPaziente {
  patientId: string;
  nome: string;
  voci: RitardoVoce[];
}

export interface RiepilogoSomministrazioni {
  totale: number;
  daFare: number;
  fatte: number;
  nonErogate: number;
  /** Sottoinsieme di `daFare` il cui orario programmato e' gia' passato. */
  inRitardo: number;
  /** Pazienti con almeno una dose in ritardo, ordinati per ritardo massimo decrescente
   * (non per numero di dosi: un paziente con una dose sola ma molto in ritardo e' piu' urgente
   * di uno con piu' dosi lievemente in ritardo). */
  ritardi: RitardoPaziente[];
  /** true finche' il caricamento non e' concluso: nessun conteggio va presentato come definitivo. */
  inCorso: boolean;
  /** true quando la fonte reparto non e' leggibile: non equivale a un conteggio pari a zero. */
  fallito: boolean;
}

const VUOTO: RiepilogoSomministrazioni = {
  totale: 0,
  daFare: 0,
  fatte: 0,
  nonErogate: 0,
  inRitardo: 0,
  ritardi: [],
  inCorso: true,
  fallito: false,
};

function oggi(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Minuti da mezzanotte, robusto a ore non zero-paddate ("8:30" oltre a "08:30"). NaN se il
 * formato non e' riconoscibile: un orario illeggibile non deve mai contare come "in ritardo"
 * (falso negativo piu' sicuro di un crash o di un falso allarme). */
function minutiDaMezzanotte(orario: string): number {
  const m = orario.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return Number.NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutiCorrenti(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function useRiepilogoSomministrazioni(attivo = true): RiepilogoSomministrazioni {
  const [slots, setSlots] = useState<TherapySlot[] | null>(null);
  const [fallito, setFallito] = useState(false);

  useEffect(() => {
    if (!attivo) return;
    let annullato = false;

    void cachedGetJson<TherapySlot[]>(`${API_URL}/therapy-slots?date=${oggi()}`, TTL_MS)
      .then((dati) => {
        if (!annullato) setSlots(Array.isArray(dati) ? dati : []);
      })
      .catch(() => {
        if (!annullato) setFallito(true);
      });

    return () => {
      annullato = true;
    };
  }, [attivo]);

  if (fallito) return { ...VUOTO, inCorso: false, fallito: true };
  if (slots === null) return VUOTO;

  const soglia = minutiCorrenti();
  let totale = 0;
  let daFare = 0;
  let fatte = 0;
  let nonErogate = 0;
  let inRitardo = 0;
  const ritardiPerPaziente = new Map<string, RitardoPaziente>();

  for (const slot of slots) {
    for (const paziente of slot.patients ?? []) {
      for (const a of paziente.administrations ?? []) {
        totale++;
        if (a.status === 'administered') fatte++;
        else if (a.status === 'not_administered') nonErogate++;
        else {
          daFare++;
          const minutiSlot = minutiDaMezzanotte(a.scheduledTime);
          if (!Number.isNaN(minutiSlot) && minutiSlot < soglia) {
            inRitardo++;
            const voce: RitardoVoce = {
              farmacoNome: a.drugName,
              scheduledTime: a.scheduledTime,
              minutiRitardo: soglia - minutiSlot,
            };
            const esistente = ritardiPerPaziente.get(paziente.patientId);
            if (esistente) esistente.voci.push(voce);
            else
              ritardiPerPaziente.set(paziente.patientId, {
                patientId: paziente.patientId,
                nome: `${paziente.lastName} ${paziente.firstName}`.trim(),
                voci: [voce],
              });
          }
        }
      }
    }
  }

  const ritardi = [...ritardiPerPaziente.values()]
    .map((p) => ({ ...p, voci: [...p.voci].sort((a, b) => b.minutiRitardo - a.minutiRitardo) }))
    .sort((a, b) => b.voci[0].minutiRitardo - a.voci[0].minutiRitardo);

  return { totale, daFare, fatte, nonErogate, inRitardo, ritardi, inCorso: false, fallito: false };
}
