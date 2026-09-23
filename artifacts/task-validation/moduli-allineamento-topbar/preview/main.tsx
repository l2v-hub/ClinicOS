import React from 'react';
import {createRoot} from 'react-dom/client';
import {TopNav} from '../../../../frontend/src/components/navigation/TopNav';
import {AssessmentCatalogView} from '../../../../frontend/src/components/operator/assessments/AssessmentCatalog';
import {CATALOG_TYPES} from '../../../../frontend/src/lib/assessments/assessmentCatalog';
import {ASSESSMENT_VERSIONS} from '../../../../frontend/src/lib/assessments/assessmentTypes';
import type {CartellaPaziente} from '../../../../frontend/src/types';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/app-additions.css';
const modules=CATALOG_TYPES.map(type=>({type,formVersion:ASSESSMENT_VERSIONS[type],latestFinal:null,ownDraftCount:0,latestOwnDraft:null}));
createRoot(document.getElementById('root')!).render(<div className="app-shell"><nav className="teams-sidebar"><div className="teams-sidebar__nav"><span>ClinicOS</span></div></nav><div className="main-area-clean"><div className="compact-topbar">Verifica locale · dati sintetici</div><main className="page-content content-panel"><div className="patient-record-view">
 <div className="patient-compact-header"><strong>Paziente sintetico · Moduli</strong></div>
 <TopNav variant="level2" ariaLabel="Aree della cartella paziente" visualLabel="Aree cartella" idPrefix="patient-primary" panelId="patient-tab-panel" items={['Raccolta dati ingresso','Clinica','Diario','Moduli','Documenti','Dimissione'].map(label=>({key:label,label}))} activeKey="Moduli" onChange={()=>{}}/>
 <div className="cr-detail-layout cr-detail-layout--no-sidebar"><div id="patient-tab-panel" role="tabpanel" className="cr-detail-content"><AssessmentCatalogView cartella={{medicazioniFerite:[],contenzioni:[],valutazioniBraden:[]} as unknown as CartellaPaziente} state={{status:'ready',data:{items:modules},error:null}} localDraftTypes={new Set()} onRetry={()=>{}} onOpen={()=>{}} onNrs={()=>{}}/></div></div>
 </div></main></div></div>);
