import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Pre-seed the default admin API key on first load so API calls work immediately.
// Users can override this from the Security tab at any time.
if (!localStorage.getItem('erp_api_key')) {
  localStorage.setItem('erp_api_key', 'erp_pubadmin_defaultadminsecretkey987654321');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

