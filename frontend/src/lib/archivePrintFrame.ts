import type { ArchivePrintPage } from './archivePrint';

/** Own a same-origin, resource-free print surface; never interpolate document text as HTML. */
export async function createArchivePrintFrame(pages: ArchivePrintPage[], signal: AbortSignal) {
  signal.throwIfAborted();
  if (!pages.length) throw new Error('Nessuna pagina da stampare.');
  const frame = document.createElement('iframe');
  frame.title = 'Documenti selezionati per la stampa';
  frame.className = 'patient-archive-print-frame';
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = 'position:fixed;left:-20000px;top:0;width:210mm;height:297mm;border:0;';
  const urls: string[] = [];
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    signal.removeEventListener('abort', dispose);
    frame.remove();
    urls.forEach((url) => URL.revokeObjectURL(url));
  };
  signal.addEventListener('abort', dispose, { once: true });
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => { cleanup(); reject(signal.reason); };
      const cleanup = () => { signal.removeEventListener('abort', abort); frame.onload = null; };
      frame.onload = () => { cleanup(); resolve(); };
      signal.addEventListener('abort', abort, { once: true });
      frame.src = 'about:blank';
      document.body.append(frame);
    });
    signal.throwIfAborted();
    const target = frame.contentDocument;
    if (!target) throw new Error('Impossibile aprire la stampa.');
    target.title = 'Documenti selezionati';
    target.documentElement.lang = 'it';
    const style = target.createElement('style');
    style.textContent = `
      @page { size:A4; margin:10mm; }
      * { box-sizing:border-box; } html,body { margin:0; padding:0; background:white; }
      .print-page { width:190mm; height:276mm; margin:0; display:flex; align-items:center;
        justify-content:center; break-after:page; page-break-after:always; }
      .print-page:last-child { break-after:auto; page-break-after:auto; }
      img { display:block; max-width:100%; max-height:100%; object-fit:contain; }
    `;
    target.head.append(style);
    for (const page of pages) {
      signal.throwIfAborted();
      const section = target.createElement('section');
      section.className = 'print-page';
      const image = target.createElement('img');
      image.alt = `${page.documentName} · pagina ${page.pageNumber}`;
      image.width = page.width; image.height = page.height;
      const url = URL.createObjectURL(page.blob);
      urls.push(url); image.src = url;
      section.append(image); target.body.append(section);
      await image.decode();
      signal.throwIfAborted();
    }
    return {
      pageCount: pages.length,
      print() {
        signal.throwIfAborted();
        if (disposed || !frame.isConnected || !frame.contentWindow)
          throw new Error('La stampa non è più disponibile.');
        frame.contentWindow.focus();
        frame.contentWindow.print();
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
