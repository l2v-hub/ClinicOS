// Logica pura per collegare un farmaco al suo documento ufficiale AIFA.
//
// Sta in un file separato dal hook perche' non dipende da React ne' da `import.meta.env`:
// cosi' e' verificabile con `node:test` senza montare Vite.

export interface FarmacoTrovato {
  aic: string;
  denominazione: string;
  linkFi: string | null;
  linkRcp: string | null;
}

export interface DocumentoFarmaco {
  href: string;
  tipo: 'rcp' | 'fi';
  denominazione: string;
}

/** Chiave di lookup stabile: maiuscole e spazi normalizzati, come l'indice del backend. */
export function chiaveFarmaco(nome: string): string {
  return nome.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Documento da mostrare: il Riassunto delle Caratteristiche del Prodotto se disponibile,
 * altrimenti il Foglietto Illustrativo.
 *
 * L'ordine non e' arbitrario: l'RCP e' il documento destinato al professionista sanitario, il
 * foglietto illustrativo e' scritto per il paziente. Con un operatore davanti allo schermo il
 * primo e' la fonte giusta; il secondo e' un ripiego, non un equivalente.
 *
 * `null` quando il farmaco non ha nessuno dei due: meglio nessuna icona che un link rotto.
 */
export function documentoDi(farmaco: FarmacoTrovato): DocumentoFarmaco | null {
  if (farmaco.linkRcp) {
    return { href: farmaco.linkRcp, tipo: 'rcp', denominazione: farmaco.denominazione };
  }
  if (farmaco.linkFi) {
    return { href: farmaco.linkFi, tipo: 'fi', denominazione: farmaco.denominazione };
  }
  return null;
}

/** Etichetta accessibile del link: nomina il documento per esteso, perche' i due non coincidono. */
export function etichettaDocumento(doc: DocumentoFarmaco): string {
  const nome =
    doc.tipo === 'rcp' ? 'Riassunto delle Caratteristiche del Prodotto' : 'Foglietto Illustrativo';
  return `${nome} AIFA di ${doc.denominazione} (si apre in una nuova scheda)`;
}

/** Nomi distinti da risolvere, normalizzati e ordinati: una ricerca per farmaco, non per riga. */
export function chiaviDistinte(nomi: string[]): string[] {
  return [...new Set(nomi.map(chiaveFarmaco).filter(Boolean))].sort();
}
