import React from 'react';
import {createRoot} from 'react-dom/client';
import {RicercaFarmacoModal} from '/src/components/operator/cartella/RicercaFarmaco.tsx';
import '/src/App.css';
import '/src/design-system.css';
import '/src/index.css';
import '/src/print-forms.css';
window.qa422={closed:false,chosen:null};
createRoot(document.getElementById('root')).render(React.createElement(RicercaFarmacoModal,{nomeIniziale:'Medicinale',onChiudi:()=>{window.qa422.closed=true;document.getElementById('root').replaceChildren();},onApriDocumento:(doc,packageRecord)=>{window.qa422.chosen={doc,packageRecord};}}));
