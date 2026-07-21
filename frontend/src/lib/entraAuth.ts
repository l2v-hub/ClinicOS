// #260: acquisizione token Entra ID (OIDC, PKCE) per le chiamate ai documenti clinici.
// ATTIVO SOLO quando VITE_ENTRA_CLIENT_ID + VITE_ENTRA_TENANT_ID + VITE_ENTRA_API_SCOPE sono
// configurati: senza config la SPA mantiene il flusso demo attuale invariato (header espliciti,
// accettati dal backend solo con AUTH_MODE=demo non-production). In modalità entra il backend
// ignora gli header e richiede il Bearer verificato.
// PRIVACY: questo modulo non logga mai token o identità.

import {
  createStandardPublicClientApplication,
  type IPublicClientApplication,
} from '@azure/msal-browser';

const CLIENT_ID = (import.meta.env.VITE_ENTRA_CLIENT_ID as string | undefined)?.trim();
const TENANT_ID = (import.meta.env.VITE_ENTRA_TENANT_ID as string | undefined)?.trim();
const API_SCOPE = (import.meta.env.VITE_ENTRA_API_SCOPE as string | undefined)?.trim();

export function entraEnabled(): boolean {
  return Boolean(CLIENT_ID && TENANT_ID && API_SCOPE);
}

let appPromise: Promise<IPublicClientApplication> | null = null;

function msalApp(): Promise<IPublicClientApplication> {
  if (!appPromise) {
    appPromise = createStandardPublicClientApplication({
      auth: {
        clientId: CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${TENANT_ID}`,
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'sessionStorage' },
    }).then(async (app) => {
      // Completa un eventuale redirect di login in corso e fissa l'account attivo.
      const result = await app.handleRedirectPromise().catch(() => null);
      const account = result?.account ?? app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null;
      if (account) app.setActiveAccount(account);
      return app;
    });
  }
  return appPromise;
}

/** Access token per lo scope API, o null se Entra non è configurato. Se serve interazione,
 *  avvia il redirect di login (la pagina si ricarica autenticata). */
export async function acquireApiToken(): Promise<string | null> {
  if (!entraEnabled()) return null;
  const app = await msalApp();
  const account = app.getActiveAccount() ?? app.getAllAccounts()[0] ?? null;
  if (!account) {
    await app.loginRedirect({ scopes: [API_SCOPE!] });
    return null; // non raggiunto: il redirect lascia la pagina
  }
  try {
    const r = await app.acquireTokenSilent({ scopes: [API_SCOPE!], account });
    return r.accessToken;
  } catch {
    await app.acquireTokenRedirect({ scopes: [API_SCOPE!] });
    return null;
  }
}

/**
 * Header di autenticazione per gli endpoint documenti. Con Entra configurato → Bearer verificabile
 * dal backend; altrimenti gli header demo espliciti di #246 (invariati). Gli header demo vengono
 * comunque inclusi accanto al Bearer: in AUTH_MODE=entra il backend li ignora per contratto (AC6),
 * e mantenerli evita divergenze del flusso QA sintetico.
 */
export async function documentAuthHeaders(
  patientId: string,
  operatorId?: string,
  operatorRole?: string,
): Promise<Record<string, string>> {
  const h: Record<string, string> = {};
  if (operatorId) h['X-Operator-Id'] = operatorId;
  if (operatorRole) h['X-Operator-Role'] = operatorRole;
  h['X-Demo-Patient-Id'] = patientId;
  const token = await acquireApiToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}
