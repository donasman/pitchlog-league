/**
 * 언어 전환 버튼
 * localStorage 'pitchlog-lang' 에 선택 언어를 저장.
 * ko ↔ en 토글.
 */

import { useTranslation } from 'react-i18next'

const STORAGE_KEY = 'pitchlog-lang'

export default function LanguageToggle() {
  const { i18n } = useTranslation()
  const isKo = i18n.language === 'ko'

  function toggle() {
    const next = isKo ? 'en' : 'ko'
    i18n.changeLanguage(next)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next)
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={isKo ? 'Switch to English' : '한국어로 전환'}
      title={isKo ? 'Switch to English' : '한국어로 전환'}
      className="flex items-center justify-center w-8 h-8 rounded text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isKo ? 'EN' : '한'}
    </button>
  )
}
