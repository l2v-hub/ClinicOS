import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PatientDetail} from '../../../../frontend/src/components/operator/PatientDetail';
import {createDefaultCartella} from '../../../../frontend/src/mockData';
import {setCurrentOperator} from '../../../../frontend/src/lib/operatorSession';
import '../../../../frontend/src/index.css';
import '../../../../frontend/src/App.css';
import '../../../../frontend/src/app-additions.css';
import '../../../../frontend/src/print-forms.css';
const actor={id:'PO09-QA',role:'operator'};
setCurrentOperator(actor);
const patient:any={id:'po09-patient',firstName:'Anna',lastName:'Sintetica',dateOfBirth:'1950-01-01',gender:'F',codiceFiscale:'',email:'',phone:'',status:'active',primaryDoctorId:actor.id};
const chart={...createDefaultCartella(patient.id,actor.id),statoRicovero:'ricoverato',cameraNumero:'12',lettoNumero:'A'};
function Preview(){
 const [key,setKey]=useState(0),[initialTab,setInitialTab]=useState<any>('profilo'),[writes,setWrites]=useState(0);
 const noop=()=>{};
 return <main className="page-content content-panel" style={{padding:16}}>
 <p>PO09 · solo paziente sintetico · Scritture richieste: {writes}</p>
 <button className="btn-secondary" onClick={()=>{setInitialTab('dimissione');setKey(k=>k+1);}}>Vecchio collegamento diretto</button>
 <PatientDetail key={key} paziente={patient} cartella={chart as any} initialTab={initialTab} consegne={[]} consegneSummary={null} consegneLoading={false} consegneError={null} consegneHasMore={false} onLoadMoreConsegne={noop} onRetryConsegne={noop} operatori={[]} camere={[]} camereLoadState="ready" camereLoadError={null} onRetryCamere={noop} canAssignRooms={false} onBack={noop} onAddConsegna={async()=>({kind:'failed',message:'Fixture in sola lettura',uncertain:false}) as any} onUpdateConsegnaStato={noop} onUpdateCartella={async()=>{setWrites(n=>n+1);return true}} onUpdatePaziente={async()=>false} onAssignCamera={async()=>({ok:false})} operatoreNome="Operatrice QA" operatoreId={actor.id} operatoreRole={actor.role}/>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
