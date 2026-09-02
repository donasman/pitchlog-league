/**
 * 라이트/다크 테마 전환 토글
 * - localStorage 'pitchlog-theme' 에 저장
 * - 초기값: localStorage 저장값 → 없으면 라이트
 * - document.documentElement에 'dark' 클래스 토글
 */

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ThemeToggle() {
  const { t } = useTranslation()
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('pitchlog-theme') === 'dark'
    } catch {
      return false
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('pitchlog-theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('pitchlog-theme', 'light')
    }
  }, [isDark])

  return (
    <button
      onClick={() => setIsDark(d => !d)}
      aria-label={isDark ? t('theme.toLight') : t('theme.toDark')}
      aria-pressed={isDark}
      className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isDark
        ? <Sun  size={18} aria-hidden="true" />
        : <Moon size={18} aria-hidden="true" />
      }
    </button>
  )
}
