import type { ReactNode } from 'react';
import type {
  CartellaPaziente,
  Consegna,
  DiarioPazienteEntry,
  PatientTherapyAPI,
  Paziente,
} from '../../types';
import type { PatientRecordPrintSectionId } from './patientRecordPrintSections';

interface Props {
  paziente: Paziente;
  cartella: CartellaPaziente;
  consegne: Consegna[];
  selected: ReadonlySet<PatientRecordPrintSectionId>;
  therapyRows: PatientTherapyAPI[];
  diaryRows: DiarioPazienteEntry[];
}

function display(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value).replaceAll('_', ' ');
}

function date(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('it-IT');
}

function PrintSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="patient-record-print__section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EmptyPrintState({ children }: { children: ReactNode }) {
  return <p className="patient-record-print__empty">{children}</p>;
}

export default function PatientRecordPrintDocument({
  paziente,
  cartella,
  consegne,
  selected,
  therapyRows,
  diaryRows,
}: Props) {
  const fullName = `${paziente.lastName}, ${paziente.firstName}`;
  const clinicalNotes = cartella.noteClinica ?? [];
  const visits = cartella.visite ?? [];
  const legacyDiary = [...(cartella.diarioInfermieristico ?? []), ...(cartella.diarioMedico ?? [])];

  return (
    <article className="patient-record-print print-only" aria-label="Scheda paziente da stampare">
      <header className="patient-record-print__header">
        <div>
          <p>ClinicOS · Scheda paziente</p>
          <h1>{fullName}</h1>
        </div>
        <dl>
          <div>
            <dt>Codice fiscale</dt>
            <dd>{display(paziente.codiceFiscale ?? cartella.codiceFiscale)}</dd>
          </div>
          <div>
            <dt>Data di nascita</dt>
            <dd>{date(paziente.dateOfBirth)}</dd>
          </div>
        </dl>
      </header>

      {selected.has('profilo') && (
        <PrintSection title="Profilo e degenza">
          <dl className="patient-record-print__facts">
            <div>
              <dt>Sesso</dt>
              <dd>{display(paziente.sex)}</dd>
            </div>
            <div>
              <dt>Telefono</dt>
              <dd>{display(paziente.phone)}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{display(paziente.email)}</dd>
            </div>
            <div>
              <dt>Indirizzo</dt>
              <dd>{display(cartella.indirizzo)}</dd>
            </div>
            <div>
              <dt>Stato</dt>
              <dd>{display(cartella.statoRicovero)}</dd>
            </div>
            <div>
              <dt>Reparto</dt>
              <dd>{display(cartella.repartoRicovero)}</dd>
            </div>
            <div>
              <dt>Camera</dt>
              <dd>{display(cartella.cameraNumero)}</dd>
            </div>
            <div>
              <dt>Letto</dt>
              <dd>{display(cartella.lettoNumero)}</dd>
            </div>
          </dl>
        </PrintSection>
      )}

      {selected.has('clinica') && (
        <PrintSection title="Quadro clinico">
          <h3>Diagnosi</h3>
          {cartella.diagnosi.length === 0 ? (
            <EmptyPrintState>Nessuna diagnosi registrata.</EmptyPrintState>
          ) : (
            <ul>
              {cartella.diagnosi.map((item) => (
                <li key={item.id}>
                  <strong>{item.descrizione}</strong> · {display(item.stato)}
                  {item.codiceICD ? ` · ICD ${item.codiceICD}` : ''}
                </li>
              ))}
            </ul>
          )}
          <h3>Indicatori di rischio</h3>
          {cartella.indicatoriRischio.length === 0 ? (
            <EmptyPrintState>Nessun rischio registrato.</EmptyPrintState>
          ) : (
            <ul>
              {cartella.indicatoriRischio.map((item) => (
                <li key={item.id}>
                  <strong>{display(item.tipo)}</strong> · {display(item.livello)} —{' '}
                  {display(item.descrizione)}
                </li>
              ))}
            </ul>
          )}
          {(cartella.pianoCura.obiettivi || cartella.pianoCura.interventiPrevisti) && (
            <div className="patient-record-print__note">
              <strong>Piano di cura</strong>
              <br />
              {display(cartella.pianoCura.obiettivi)}
              <br />
              {display(cartella.pianoCura.interventiPrevisti)}
            </div>
          )}
        </PrintSection>
      )}

      {selected.has('terapie') && (
        <PrintSection title="Terapie e allergie">
          <h3>Allergie</h3>
          {cartella.allergie.length === 0 ? (
            <EmptyPrintState>
              Stato: {display(cartella.allergieStatus ?? 'non documentato')}.
            </EmptyPrintState>
          ) : (
            <ul>
              {cartella.allergie.map((item) => (
                <li key={item.id}>
                  <strong>{item.allergene}</strong> · {item.gravita} — {display(item.reazione)}
                </li>
              ))}
            </ul>
          )}
          <h3>Farmaci</h3>
          {therapyRows.length > 0 ? (
            <ul>
              {therapyRows.map((item) => (
                <li key={item.id}>
                  <strong>{item.farmacoNome}</strong> · {display(item.dosaggio)} ·{' '}
                  {display(item.viaSomministrazione)} · {display(item.stato)}
                </li>
              ))}
            </ul>
          ) : cartella.farmaci.length === 0 ? (
            <EmptyPrintState>Nessun farmaco registrato.</EmptyPrintState>
          ) : (
            <ul>
              {cartella.farmaci.map((item) => (
                <li key={item.id}>
                  <strong>{item.nome}</strong> · {display(item.dose)} · {display(item.frequenza)} ·{' '}
                  {display(item.stato)}
                </li>
              ))}
            </ul>
          )}
          <h3>Altre terapie</h3>
          {cartella.terapie.length === 0 ? (
            <EmptyPrintState>Nessuna terapia registrata.</EmptyPrintState>
          ) : (
            <ul>
              {cartella.terapie.map((item) => (
                <li key={item.id}>
                  <strong>{item.descrizione}</strong> · {display(item.tipo)} · {display(item.stato)}
                </li>
              ))}
            </ul>
          )}
        </PrintSection>
      )}

      {selected.has('parametri') && (
        <PrintSection title="Parametri vitali">
          {cartella.parametriVitali.length === 0 ? (
            <EmptyPrintState>Nessuna rilevazione registrata.</EmptyPrintState>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Parametro</th>
                  <th>Valore</th>
                  <th>Stato</th>
                  <th>Rilevato</th>
                </tr>
              </thead>
              <tbody>
                {cartella.parametriVitali.map((item) => (
                  <tr key={item.id}>
                    <td>{item.etichetta}</td>
                    <td>
                      {item.valore} {item.unita}
                    </td>
                    <td>{item.stato}</td>
                    <td>{date(item.rilevato)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </PrintSection>
      )}

      {selected.has('diario') && (
        <PrintSection title="Diario e consegne">
          <h3>Note e visite</h3>
          {clinicalNotes.length + visits.length === 0 ? (
            <EmptyPrintState>Nessuna nota o visita registrata.</EmptyPrintState>
          ) : (
            <ul>
              {clinicalNotes.map((item) => (
                <li key={`nota-${item.id}`}>
                  <strong>
                    {date(item.createdAt)} · {item.operatore}
                  </strong>{' '}
                  — {item.contenuto}
                </li>
              ))}
              {visits.map((item) => (
                <li key={`visita-${item.id}`}>
                  <strong>
                    {date(item.data)} · {item.tipo}
                  </strong>{' '}
                  — {item.esito}
                </li>
              ))}
            </ul>
          )}
          <h3>Diario clinico</h3>
          {diaryRows.length > 0 ? (
            <ul>
              {diaryRows.map((item) => (
                <li key={`diario-${item.id}`}>
                  <strong>
                    {date(item.entryDateTime)} · {item.authorName}
                  </strong>{' '}
                  — {item.content}
                </li>
              ))}
            </ul>
          ) : legacyDiary.length === 0 ? (
            <EmptyPrintState>Nessuna voce di diario registrata.</EmptyPrintState>
          ) : (
            <ul>
              {legacyDiary.map((item) => (
                <li key={`diario-${item.id}`}>
                  <strong>
                    {date(item.data)} {item.ora} · {item.operatore}
                  </strong>{' '}
                  — {item.testo}
                </li>
              ))}
            </ul>
          )}
          <h3>Consegne</h3>
          {consegne.length === 0 ? (
            <EmptyPrintState>Nessuna consegna registrata.</EmptyPrintState>
          ) : (
            <ul>
              {consegne.map((item) => (
                <li key={item.id}>
                  <strong>
                    {item.tipo} · {display(item.stato)}
                  </strong>{' '}
                  — {item.note}
                </li>
              ))}
            </ul>
          )}
        </PrintSection>
      )}

      {selected.has('documenti') && (
        <PrintSection title="Documenti e moduli">
          <h3>Documenti</h3>
          {cartella.documentiConsegnati.length === 0 ? (
            <EmptyPrintState>Nessun documento registrato.</EmptyPrintState>
          ) : (
            <ul>
              {cartella.documentiConsegnati.map((item) => (
                <li key={item.id}>
                  <strong>{display(item.tipo)}</strong> · {display(item.stato)} —{' '}
                  {display(item.descrizione)}
                </li>
              ))}
            </ul>
          )}
          <dl className="patient-record-print__facts patient-record-print__facts--modules">
            <div>
              <dt>Medicazioni</dt>
              <dd>{cartella.medicazioniFerite.length}</dd>
            </div>
            <div>
              <dt>Contenzioni</dt>
              <dd>{cartella.contenzioni.length}</dd>
            </div>
            <div>
              <dt>Valutazioni Braden</dt>
              <dd>{cartella.valutazioniBraden.length}</dd>
            </div>
            <div>
              <dt>Valutazioni Tinetti</dt>
              <dd>{cartella.valutazioniTinetti?.length ?? 0}</dd>
            </div>
            <div>
              <dt>Valutazioni NRS</dt>
              <dd>{cartella.valutazioniNRS?.length ?? 0}</dd>
            </div>
            <div>
              <dt>Dimissione</dt>
              <dd>{cartella.dimissione ? 'Compilata' : 'Non compilata'}</dd>
            </div>
          </dl>
        </PrintSection>
      )}

      <footer className="patient-record-print__footer">
        Documento generato il {new Date().toLocaleString('it-IT')} · ClinicOS
      </footer>
    </article>
  );
}
