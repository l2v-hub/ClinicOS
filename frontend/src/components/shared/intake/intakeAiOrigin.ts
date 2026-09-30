// Campi della scheda d'ingresso scritti dall'AI (`_fieldOrigin`), letti in un solo punto
// (IntakeWorkspace) e resi disponibili a ogni campo: stile AI ed etichetta "AI" centralizzati.
import { createContext, createElement, useContext, type ReactNode } from 'react';
import type { ImportJob } from '../import/importSessionTypes';
import type { PanelTarget } from './intakeDocumentPages';

export const IntakeAiOriginContext = createContext<ReadonlySet<string>>(new Set());

/** true se il campo (percorso della bozza, es. 'anagrafica.firstName') ha ancora il valore AI. */
export function useAiField(path: string | undefined): boolean {
  const paths = useContext(IntakeAiOriginContext);
  return !!path && paths.has(path);
}

/**
 * Provenienza dei campi AI (ciclo 3a): bozza e job collegato per il chip "L1 · p. 1", e apertura
 * del pannello documento. Senza job collegato il chip resta "AI" e non si apre.
 */
export interface IntakeAiSource {
  data: Record<string, unknown>;
  job: ImportJob | null;
  open: ((target: PanelTarget, opener: HTMLElement) => void) | null;
}

export const IntakeAiSourceContext = createContext<IntakeAiSource>({
  data: {},
  job: null,
  open: null,
});

/** Campi AI e loro provenienza per tutta la scheda (un solo punto: IntakeWorkspace). */
export function IntakeAiProvider({
  paths,
  source,
  children,
}: {
  paths: ReadonlySet<string>;
  source: IntakeAiSource;
  children: ReactNode;
}) {
  return createElement(
    IntakeAiOriginContext.Provider,
    { value: paths },
    createElement(IntakeAiSourceContext.Provider, { value: source }, children),
  );
}
