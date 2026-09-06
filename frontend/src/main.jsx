import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import '@/i18n/index.js'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { AssistantProvider } from '@/contexts/AssistantContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NotificationProvider>
      <AssistantProvider>
        <App />
      </AssistantProvider>
    </NotificationProvider>
  </StrictMode>,
)
