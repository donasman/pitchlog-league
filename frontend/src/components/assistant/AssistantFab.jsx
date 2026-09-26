/**
 * AI 어시스턴트 진입 버튼 (FAB)
 * 우하단 고정. 토큰 --pl-z-fab 이 층을 정한다 — 드로어보다 아래, 스티키보다 위.
 * 패널이 열려 있으면 숨긴다.
 */

import { useTranslation } from 'react-i18next'
import { useAssistant } from '@/contexts/AssistantContext'

export default function AssistantFab() {
  const { t } = useTranslation()
  const { isOpen, openPanel } = useAssistant()

  if (isOpen) return null

  return (
    <button
      onClick={openPanel}
      aria-label={t('assistant.open')}
      className="pl-btn"
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 'var(--pl-z-fab)',
        height: 52,
        borderRadius: 999,
        padding: '0 20px',
        gap: 10,
        boxShadow: 'var(--sh-modal)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* 검색/질문 아이콘 (말풍선 아님) */}
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
        <circle cx="9" cy="9" r="6" />
        <path d="m13.6 13.6 3.4 3.4M9 6.4v.1M9 8.4v3" />
      </svg>
      {t('assistant.open')}
    </button>
  )
}
