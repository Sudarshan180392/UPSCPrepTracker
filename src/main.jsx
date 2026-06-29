import { createRoot } from 'react-dom/client'
import './index.css'
import AuthWrapper from './AuthWrapper'
import UPSCTracker from './upsc_tracker.jsx'

createRoot(document.getElementById('root')).render(
  <AuthWrapper>
    <UPSCTracker />
  </AuthWrapper>,
)
