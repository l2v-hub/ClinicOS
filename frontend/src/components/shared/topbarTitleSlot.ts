import { createContext } from 'react';

/** Spazio del titolo nell'intestazione dell'app (HMI 1): quando c'è, `PageHeader` vi porta titolo
 *  e sottotitolo della pagina. Senza (test, anteprime) il titolo resta nella pagina. */
export const TopbarTitleSlot = createContext<HTMLElement | null>(null);
