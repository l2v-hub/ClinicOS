import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {TopNav} from '../../../../frontend/src/components/navigation/TopNav';
import {DIARIO_AUTHOR_FILTERS} from '../../../../frontend/src/components/operator/cartella/diarioFilters';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/app-additions.css';
import '../../../../frontend/src/components/operator/PatientRecordData.css';

function Preview() {
  const [area,setArea]=useState('Diario');
  const [author,setAuthor]=useState('tutti');
  return <div className="app-shell"><nav className="teams-sidebar"><div className="teams-sidebar__nav"><span>ClinicOS</span></div></nav><div className="main-area-clean"><div className="compact-topbar">Verifica locale · dati sintetici</div><main className="page-content content-panel"><div className="patient-record-view">
    <div className="patient-compact-header"><strong>Paziente sintetico · Spaziatura Diario</strong></div>
    <TopNav variant="level2" ariaLabel="Aree della cartella paziente" visualLabel="Aree cartella" idPrefix="patient-primary" panelId="patient-tab-panel" items={['Raccolta dati ingresso','Clinica','Diario','Moduli','Documenti','Dimissione'].map(label=>({key:label,label}))} activeKey={area} onChange={setArea}/>
    {area==='Diario' ? <div className="filter-chips patient-diary-filters no-print" role="group" aria-label="Filtra il diario per autore">
      {DIARIO_AUTHOR_FILTERS.map(filter=><button key={filter.id} id={`patient-diary-filter-${filter.id}`} type="button" className={`filter-chip${author===filter.id?' active':''}`} aria-pressed={author===filter.id} aria-controls="patient-tab-panel" onClick={()=>setAuthor(filter.id)}>{filter.label}</button>)}
    </div> : <TopNav variant="level3" className="top-nav--section-grid" ariaLabel="Sezioni di Clinica" idPrefix="patient-secondary" panelId="patient-tab-panel" items={['Diagnosi','Terapia farmacologica','Parametri vitali','Sezioni cliniche'].map(label=>({key:label,label}))} activeKey="Diagnosi" onChange={()=>{}}/>}
    <div className="cr-detail-layout cr-detail-layout--no-sidebar"><div id="patient-tab-panel" role="tabpanel" className="cr-detail-content"><div className="cr-tab-content"><section className="clinical-card"><div className="clinical-card__header">{area==='Diario'?`Diario · ${DIARIO_AUTHOR_FILTERS.find(filter=>filter.id===author)?.label}`:'Clinica'}</div><p>Contenuto sintetico per la sola verifica visiva.</p></section></div></div></div>
  </div></main></div></div>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
