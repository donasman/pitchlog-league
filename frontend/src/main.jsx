import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import '@/i18n/index.js'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { AssistantProvider } from '@/contexts/AssistantContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { startZoomController } from '@/utils/zoom'
import App from './App.jsx'

startZoomController()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <FavoritesProvider>
      <NotificationProvider>
        <AssistantProvider>
          <App />
        </AssistantProvider>
      </NotificationProvider>
    </FavoritesProvider>
  </StrictMode>,
)
