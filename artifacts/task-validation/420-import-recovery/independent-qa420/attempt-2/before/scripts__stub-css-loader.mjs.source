// Loader per node:test: neutralizza gli import di CSS.
//
// Vite risolve `import './X.css'` come effetto collaterale di bundling; Node no, e solleva
// ERR_UNKNOWN_FILE_EXTENSION. Basta che un test importi — anche solo transitivamente — un
// componente che porta con se' il proprio foglio di stile, e la suite si spegne su un errore che
// non ha nulla a che vedere con cio' che stava verificando.
//
// La correzione sta qui e non nei componenti: chiedere che nessun modulo raggiungibile da un test
// importi CSS e' una regola invisibile che si rompe al primo componente nuovo.

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

const FOGLI_DI_STILE = /\.(css|scss|sass|less)$/;

export async function resolve(specifier, context, nextResolve) {
  if (FOGLI_DI_STILE.test(specifier)) {
    // `shortCircuit` evita che la catena provi a risolverlo come modulo JavaScript.
    return {
      url: new URL(specifier, context.parentURL ?? pathToFileURL(`${process.cwd()}/`)).href,
      shortCircuit: true,
      format: 'stub-css',
    };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (context.format === 'stub-css' || FOGLI_DI_STILE.test(new URL(url).pathname)) {
    return { format: 'module', source: 'export default {};', shortCircuit: true };
  }
  return nextLoad(url, context);
}

// Auto-registrazione quando il file e' passato a `node --import`.
register(import.meta.url, import.meta.url);
