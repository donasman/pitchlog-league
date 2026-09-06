/**
 * 알림 전역 컨텍스트
 * - 알림 목록 + 안 읽음 수
 * - 토스트 스택 (최대 3개 visible, 초과분 collapse)
 * - 권한 상태 (default · granted · denied)
 * - 권한 요청 카드 표시 여부
 * - 설정 (관심팀·대회·이벤트 타입·인앱/푸시)
 *
 * 로그인이 없으므로 모든 상태는 이 세션(메모리)에만 존재.
 * 실 서비스에서는 localStorage + Service Worker로 교체.
 */

import { createContext, useContext, useState, useCallback } from 'react'
import { NOTIFICATIONS, NOTIFICATION_SETTINGS } from '@/mocks/notifications'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState(() =>
    NOTIFICATIONS.map(n => ({ ...n }))
  )
  const [settings, setSettings] = useState(() => ({ ...NOTIFICATION_SETTINGS }))
  const [toasts, setToasts]   = useState([])     // active toast stack
  const [panelOpen, setPanelOpen] = useState(false)
  const [permCardVisible, setPermCardVisible] = useState(false)

  /* ── 안 읽음 수 ── */
  const unreadCount = notifications.filter(n => !n.read).length

  /* ── 읽음 처리 ── */
  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const markRead = useCallback(id => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  /* ── 토스트 ── */
  const showToast = useCallback((notification) => {
    const id = notification.id ?? `t-${Date.now()}`
    setToasts(prev => {
      // 확정 알림은 항상 맨 앞, 나머지는 그 뒤에
      const isConfirmed = notification.type === 'confirmed'
      const next = isConfirmed
        ? [{ ...notification, id, _toastId: id }, ...prev]
        : [...prev, { ...notification, id, _toastId: id }]
      return next
    })
    return id
  }, [])

  const dismissToast = useCallback(toastId => {
    setToasts(prev => prev.filter(t => (t._toastId ?? t.id) !== toastId))
  }, [])

  const dismissAllToasts = useCallback(() => setToasts([]), [])

  /* ── 알림 패널 ── */
  const togglePanel = useCallback(() => setPanelOpen(o => !o), [])
  const closePanel  = useCallback(() => setPanelOpen(false), [])

  /* ── 권한 요청 (2단계) ── */
  const showPermCard = useCallback(() => setPermCardVisible(true), [])
  const hidePermCard = useCallback(() => setPermCardVisible(false), [])

  const requestPermission = useCallback(async () => {
    setPermCardVisible(false)
    // Mock: 실제 브라우저 권한 요청 대신 상태 토글
    if (!('Notification' in window)) {
      setSettings(s => ({ ...s, permission: 'denied' }))
      return
    }
    try {
      const result = await Notification.requestPermission()
      setSettings(s => ({ ...s, permission: result }))
    } catch {
      setSettings(s => ({ ...s, permission: 'denied' }))
    }
  }, [])

  const updateSettings = useCallback(patch => {
    setSettings(prev => ({ ...prev, ...patch }))
  }, [])

  const value = {
    notifications,
    unreadCount,
    markAllRead,
    markRead,
    toasts,
    showToast,
    dismissToast,
    dismissAllToasts,
    panelOpen,
    togglePanel,
    closePanel,
    permCardVisible,
    showPermCard,
    hidePermCard,
    requestPermission,
    settings,
    updateSettings,
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider')
  return ctx
}
