import type { DocumentoFarmaco, FarmacoTrovato } from './farmacoDocumento';
import type { MedicationSearchCriterion } from './medicationSearch';

export interface PackageFilters {
  forma: string;
  confezione: string;
}

// Presentation only: match the source strings, never infer strength from ingredients.
export function filterPackages(items: FarmacoTrovato[], filters: PackageFilters): FarmacoTrovato[] {
  const text = filters.confezione.trim().toLocaleLowerCase('it');
  if (!filters.forma && !text) return items;
  return items.filter((item) =>
    (!filters.forma || item.forma === filters.forma) &&
    (!text || [item.denominazione, item.descrizione].filter(Boolean).join(' ').toLocaleLowerCase('it').includes(text)),
  );
}

export function packageForms(items: FarmacoTrovato[]): string[] {
  return [...new Set(items.map((item) => item.forma).filter((form): form is string => Boolean(form)))].sort();
}

export function packageDocumentName(item: FarmacoTrovato, document: DocumentoFarmaco): string {
  const identity = [item.denominazione, item.descrizione, item.forma, `AIC ${item.aic}`].filter(Boolean).join(' · ');
  return `Apri ${document.tipo === 'rcp' ? 'RCP' : 'foglietto'} di ${identity}`;
}

interface SearchPresentation {
  query: string;
  criterion: MedicationSearchCriterion;
  filters: PackageFilters;
}
type SearchPresentationEvent =
  | { type: 'query'; value: string }
  | { type: 'criterion'; value: MedicationSearchCriterion }
  | { type: 'filter'; key: keyof PackageFilters; value: string }
  | { type: 'clear' };
const emptyFilters = (): PackageFilters => ({ forma: '', confezione: '' });

export function initialSearchPresentation(query: string): SearchPresentation {
  return { query, criterion: 'nome', filters: emptyFilters() };
}

// One transition clears local filters before the new search can render.
export function searchPresentationReducer(state: SearchPresentation, event: SearchPresentationEvent): SearchPresentation {
  switch (event.type) {
    case 'query': return event.value === state.query ? state : { ...state, query: event.value, filters: emptyFilters() };
    case 'criterion': return event.value === state.criterion ? state : { ...state, criterion: event.value, filters: emptyFilters() };
    case 'filter': return { ...state, filters: { ...state.filters, [event.key]: event.value } };
    case 'clear': return { ...state, filters: emptyFilters() };
  }
}
