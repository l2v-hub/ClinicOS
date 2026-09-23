import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ClinicalTableSection} from '../../../../../frontend/src/components/operator/cartella/shared';
import '../../../../../frontend/src/index.css';
import '../../../../../frontend/src/App.css';
import '../../../../../frontend/src/app-additions.css';
function Preview(){
 const [count,setCount]=useState(0);
 return <main style={{padding:24,maxWidth:900,margin:'auto'}}>
  <h1>PO16 · Verifica tastiera senza dati paziente</h1>
  <p role="status">Azioni eseguite: {count}</p>
  <ClinicalTableSection title="Sezione di prova" actions={<button type="button" className="btn-primary" onClick={()=>setCount(value=>value+1)}>Nuova compilazione</button>}>
   <div className="cts__body--padded"><p>Contenuto della sezione aperta</p><label>Nota locale<input aria-label="Nota locale"/></label></div>
  </ClinicalTableSection>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Preview/>);
