import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './design-system/tokens.css'
import './index.css'
import App from './App.tsx'

import { setActiveKey } from './api/client';

// Pre-seed the default admin API key on first load so API calls work immediately.
// Users can override this from the Security tab or the role switcher at any time.
if (!localStorage.getItem('erp_api_key')) {
  setActiveKey('erp_pubadmin_defaultadminsecretkey987654321');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
