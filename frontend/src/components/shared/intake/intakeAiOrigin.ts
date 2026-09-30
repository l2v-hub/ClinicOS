// Campi della scheda d'ingresso scritti dall'AI (`_fieldOrigin`), letti in un solo punto
// (IntakeWorkspace) e resi disponibili a ogni campo: stile AI ed etichetta "AI" centralizzati.
import { createContext, useContext } from 'react';

export const IntakeAiOriginContext = createContext<ReadonlySet<string>>(new Set());

/** true se il campo (percorso della bozza, es. 'anagrafica.firstName') ha ancora il valore AI. */
export function useAiField(path: string | undefined): boolean {
  const paths = useContext(IntakeAiOriginContext);
  return !!path && paths.has(path);
}
