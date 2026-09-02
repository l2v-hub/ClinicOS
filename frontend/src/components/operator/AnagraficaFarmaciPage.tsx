// Pagina dedicata all'anagrafica farmaci AIFA.
//
// Stesso corpo di ricerca della modale che si apre dalla scheda terapia (`RicercaFarmaco`): la
// modale serve a non perdere il contesto del paziente, questa pagina a consultare l'anagrafica
// senza avere una terapia davanti. La logica di ricerca esiste una volta sola.
//
// Da qui i documenti si aprono senza prescrizione di riferimento: il visore non ha un dosaggio
// su cui riconoscere la formulazione, quindi la chiedera' all'operatore invece di sceglierne una.

import { useState } from 'react';
import { PageHeader } from '../shared/PageHeader';
import { RicercaFarmaco } from './cartella/RicercaFarmaco';
import { VisoreDocumentoFarmaco } from './cartella/VisoreDocumentoFarmaco';
import type { DocumentoFarmaco, FarmacoTrovato } from './cartella/farmacoDocumento';
import type { PrescrizioneDaAbbinare } from './cartella/farmacoCorrispondenza';

export function AnagraficaFarmaciPage() {
  const [aperto, setAperto] = useState<{
    documento: DocumentoFarmaco;
    prescrizione: PrescrizioneDaAbbinare;
  } | null>(null);

  return (
    <div className="page-anagrafica-farmaci">
      <PageHeader
        breadcrumb={[{ label: 'ClinicOS' }, { label: 'Farmaci' }]}
        title="Anagrafica farmaci"
      />

      <div className="page-anagrafica-farmaci__corpo">
        <RicercaFarmaco
          onApriDocumento={(documento: DocumentoFarmaco, confezione: FarmacoTrovato) =>
            // La confezione e' scelta dall'operatore: la sua forma e la sua descrizione sono un
            // dato esplicito, non un'ipotesi, quindi possono guidare l'evidenziazione.
            setAperto({
              documento,
              prescrizione: { dosaggio: confezione.descrizione, forma: confezione.forma },
            })
          }
        />
      </div>

      {aperto && (
        <VisoreDocumentoFarmaco
          documento={aperto.documento}
          prescrizione={aperto.prescrizione}
          onChiudi={() => setAperto(null)}
        />
      )}
    </div>
  );
}
