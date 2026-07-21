# Attivazione Azure Entra ID per i documenti clinici (#260)

Il codice è già deployabile: senza le variabili qui sotto gli endpoint documenti restano
**fail-closed** (503) e la SPA mantiene il flusso demo. L'attivazione è solo configurazione.

## 1. App registration nel tenant Entra

Servono **due** registrazioni nel tenant aziendale (Portale Azure → Entra ID → App registrations):

### a) API backend (`ClinicOS API`)

1. New registration → nome `ClinicOS API` → account "single tenant".
2. **Expose an API** → Application ID URI: accetta `api://<client-id>` → Add a scope:
   nome `access_as_operator`, admin consent, abilitato.
3. Annota: **Directory (tenant) ID** e l'**Application ID URI** (es. `api://xxxxxxxx-...`).

### b) SPA frontend (`ClinicOS SPA`)

1. New registration → nome `ClinicOS SPA` → single tenant.
2. **Authentication** → Add a platform → **Single-page application** → Redirect URI:
   `https://clinicos-eosin.vercel.app` (e `http://localhost:5173` per lo sviluppo).
3. **API permissions** → Add a permission → My APIs → `ClinicOS API` → scope
   `access_as_operator` → Grant admin consent.
4. Annota: **Application (client) ID** della SPA.

## 2. Variabili d'ambiente

### Railway (backend) — poi redeploy

| Variabile         | Valore                                                 |
| ----------------- | ------------------------------------------------------ |
| `AUTH_MODE`       | `entra`                                                |
| `ENTRA_TENANT_ID` | Directory (tenant) ID                                  |
| `ENTRA_AUDIENCE`  | Application ID URI dell'API (es. `api://xxxxxxxx-...`) |

(Opzionali: `ENTRA_ISSUER` / `ENTRA_JWKS_URL` per override non standard — normalmente NON servono.)

### Vercel (frontend) — poi `vercel deploy --prod`

| Variabile              | Valore                                     |
| ---------------------- | ------------------------------------------ |
| `VITE_ENTRA_CLIENT_ID` | Application (client) ID della SPA          |
| `VITE_ENTRA_TENANT_ID` | Directory (tenant) ID                      |
| `VITE_ENTRA_API_SCOPE` | `api://<client-id-API>/access_as_operator` |

## 3. Mapping utenti

L'identità verificata (claim `oid`) si aggancia a `User.entraObjectId`. Al primo login di un
utente il backend collega automaticamente l'account ClinicOS con la **stessa e-mail**
(`preferred_username`) se non già collegato ad altro `oid`. Prerequisito quindi: per ogni
operatore reale deve esistere un `User` con e-mail aziendale corretta, `isActive=true` e il
relativo record `Operator`. Un account già collegato a un altro `oid` NON viene mai ri-agganciato.

## 4. Verifica post-attivazione

1. `curl -s -o /dev/null -w "%{http_code}" https://<backend>/patients/<id>/documents` → **401**
   (non più 503: la modalità entra è attiva e rifiuta gli anonimi).
2. Dalla SPA autenticata: apertura tab Documenti → login Entra (redirect) → elenco/apertura
   documenti funzionanti.
3. Un utente Entra non presente in ClinicOS (o disattivato) riceve **403**.
