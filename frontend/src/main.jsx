import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.css'
import '@/i18n/index.js'
import { AuthProvider } from '@/contexts/AuthContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { AssistantProvider } from '@/contexts/AssistantContext'
import { FavoritesProvider } from '@/contexts/FavoritesContext'
import { startZoomController } from '@/utils/zoom'
import App from './App.jsx'

startZoomController()

// 즐겨찾기가 서버 저장으로 옮겨갔다 — 옛 localStorage 잔여물은 부팅 시 한 번만 지운다.
// 실패해도 앱은 계속 뜬다. 무음 catch 금지 — 이유가 콘솔에 남아야 한다.
try {
  localStorage.removeItem('pitchlog-favorites')
} catch (e) {
  console.warn('[favorites] localStorage cleanup failed', e)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <FavoritesProvider>
        <NotificationProvider>
          <AssistantProvider>
            <App />
          </AssistantProvider>
        </NotificationProvider>
      </FavoritesProvider>
    </AuthProvider>
  </StrictMode>,
)
