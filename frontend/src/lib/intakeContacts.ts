// Contatti raccolti dal wizard di intake → campi del paziente e della cartella.
// Il wizard (e l'import dalle lettere) scrivono referenteNome/referenteTelefono/referenteRelazione,
// emergencyContact e l'indirizzo spezzato in via/CAP/comune/provincia; la conferma inviava invece
// emergencyContactName/Phone mai valorizzati e la sola via, quindi referente e indirizzo si
// perdevano. Regola: si invia solo ciò che l'operatore ha inserito.

export interface IntakeAnagraficaContacts {
  address?: string;
  comune?: string;
  provincia?: string;
  cap?: string;
  referenteNome?: string;
  referenteRelazione?: string;
  referenteTelefono?: string;
  emergencyContact?: string;
}

export interface IntakeContacts {
  patient: { address?: string; emergencyContactName?: string; emergencyContactPhone?: string };
  // Indirizzo e referente hanno colonne proprie nel paziente: sono l'unica fonte (li aggiornano
  // anche i comandi vocali e PATCH /patients/:id). In cartella va solo ciò che il paziente non ha.
  cartella: {
    contattoEmergenzaRel?: string;
    contattoEmergenzaAltro?: string;
  };
}

// Codici della relazione nel wizard → testo mostrato all'operatore. In cartella la relazione è
// testo libero: si salva l'etichetta scelta, non il codice interno.
const RELAZIONE_LABEL: Record<string, string> = {
  coniuge: 'Coniuge / Partner',
  figlio: 'Figlio / Figlia',
  genitore: 'Genitore',
  fratello_sorella: 'Fratello / Sorella',
  nipote: 'Nipote',
  amico_caregiver: 'Amico / Caregiver',
  tutore: 'Tutore legale',
  altro: 'Altro',
};

const text = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined;

/** "Via Roma 1, 24100 Bergamo (BG)" con le sole parti presenti; undefined se non c'è nulla. */
export function composeAddress(a: IntakeAnagraficaContacts): string | undefined {
  const via = text(a.address);
  const cap = text(a.cap);
  const comune = text(a.comune);
  const prov = text(a.provincia)?.toUpperCase();
  const locality = [cap, comune].filter(Boolean).join(' ') + (prov ? ` (${prov})` : '');
  const parts = [via, locality.trim() || undefined].filter(Boolean);
  return parts.length ? parts.join(', ') : undefined;
}

export function buildIntakeContacts(a: IntakeAnagraficaContacts): IntakeContacts {
  const out: IntakeContacts = { patient: {}, cartella: {} };
  const address = composeAddress(a);
  if (address) out.patient.address = address;
  const nome = text(a.referenteNome);
  if (nome) out.patient.emergencyContactName = nome;
  const tel = text(a.referenteTelefono);
  if (tel) out.patient.emergencyContactPhone = tel;
  const rel = text(a.referenteRelazione);
  if (rel) out.cartella.contattoEmergenzaRel = RELAZIONE_LABEL[rel] ?? rel;
  const altro = text(a.emergencyContact);
  if (altro) out.cartella.contattoEmergenzaAltro = altro;
  return out;
}
