/**
 * i18n 초기화 — i18next + react-i18next
 * 지원 언어: ko (기본), en
 * 언어 저장소: localStorage 'pitchlog-lang'
 * 폴백: 'en'
 * TypeScript 설정 불필요 — JavaScript 전용
 */

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ko from '../locales/ko.json'
import en from '../locales/en.json'

const STORAGE_KEY = 'pitchlog-lang'
const SUPPORTED   = ['ko', 'en']
const DEFAULT_LNG = 'ko'

function detectLanguage() {
  const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
  if (saved && SUPPORTED.includes(saved)) return saved
  return DEFAULT_LNG
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ko: { translation: ko },
      en: { translation: en },
    },
    lng: detectLanguage(),
    fallbackLng: 'en',
    supportedLngs: SUPPORTED,
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
