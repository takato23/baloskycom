import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Delirio design system — loaded after index.css so its tokens (5 themes,
// explosive palette, keyframes, chrome classes) override the legacy Artefakt
// ones. Phase 1 of the Delirio-to-React migration.
import './styles/delirio.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
