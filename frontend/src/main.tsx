import { applyTabletScale } from './lib/tabletScale';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './print-forms.css';
import App from './App.tsx';

// Prima di disegnare: sui tablet l'interfaccia parte al 90% (vedi lib/tabletScale.ts).
applyTabletScale();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
