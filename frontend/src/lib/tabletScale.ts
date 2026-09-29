// Tablet: interfaccia al 90% (richiesta dell'utente: su un tablet da 11" tutto risultava troppo
// grande). Invece di rimpicciolire il CSS (lo zoom CSS riduce anche le altezze a tutto schermo),
// il viewport parte a scala 0.9: il browser impagina come su uno schermo ~10% più largo e mostra
// tutto al 90%. Solo schermi touch di taglia tablet; computer e telefoni restano come prima.
// Modulo e non script inline: la CSP ammette solo script dello stesso sito.

export const TABLET_UI_SCALE = 0.9;

/** Tablet = schermo touch con lato corto ≥ 700px e lato lungo ≤ 1400px (px CSS dello schermo). */
export function isTabletScreen(width: number, height: number, coarsePointer: boolean): boolean {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  return coarsePointer && short >= 700 && long <= 1400;
}

export function tabletViewportContent(scale = TABLET_UI_SCALE): string {
  return `width=device-width, initial-scale=${scale}`;
}

/** Applica la scala al meta viewport se lo schermo è un tablet; restituisce true se applicata. */
export function applyTabletScale(win: Window = window): boolean {
  try {
    const meta = win.document.querySelector('meta[name="viewport"]');
    if (!meta) return false;
    const coarse = win.matchMedia?.('(pointer: coarse)').matches ?? false;
    if (!isTabletScreen(win.screen.width, win.screen.height, coarse)) return false;
    meta.setAttribute('content', tabletViewportContent());
    return true;
  } catch {
    return false;
  }
}
