/**
 * 홈 히어로용 어시스턴트 진입 바
 *
 * 입력창처럼 생겼지만 실제로는 <button>. 누르면 어시스턴트 패널이 열린다.
 * 실 입력창처럼 보이는데 못 치면 버그이므로 button으로 만든다.
 *
 * 색상 규칙 (design/pitchlog-tokens.css):
 * - 채워진 브랜드 파랑은 히어로에서 "오늘 경기 보기" 하나뿐. 여기는 8% 틴트만.
 * - 테두리는 --pl-line이 배경 위 1.14:1로 미달이라 --pl-control 사용.
 */

import { useTranslation } from 'react-i18next'
import { useAssistant } from '@/contexts/AssistantContext'

export default function AskBar() {
  const { t } = useTranslation()
  const { openPanel } = useAssistant()

  return (
    <button
      type="button"
      onClick={openPanel}
      aria-label={t('home.askAria')}
      className="pl-focus-ring pl-ask-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        maxWidth: 520,
        height: 52,
        padding: '0 6px 0 18px',
        borderRadius: 999,
        background: 'var(--pl-card)',
        border: '1px solid var(--pl-control)',
        cursor: 'pointer',
        fontFamily: 'var(--font)',
        textAlign: 'left',
        transition: 'border-color .15s',
      }}
    >
      {/* 좌측 아이콘 — AssistantFab과 동일한 SVG (원+손잡이+물음표) */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        aria-hidden="true"
        style={{ color: 'var(--pl-sub)', flexShrink: 0 }}
      >
        <circle cx="9" cy="9" r="6" />
        <path d="m13.6 13.6 3.4 3.4M9 6.4v.1M9 8.4v3" />
      </svg>

      {/* 안내 문구 — placeholder가 아니라 텍스트 */}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: 15,
          fontWeight: 500,
          color: 'var(--pl-sub)',
          textAlign: 'left',
        }}
      >
        {t('home.askPlaceholder')}
      </span>

      {/* 알약 CTA — 8% 틴트 배경 + primary 글자 (채워진 파랑 아님) */}
      <span
        className="pl-ask-cta"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: 36,
          padding: '0 14px',
          borderRadius: 999,
          background: 'color-mix(in srgb, var(--pl-primary) 8%, transparent)',
          color: 'var(--pl-primary)',
          fontSize: 13,
          fontWeight: 600,
          flexShrink: 0,
          transition: 'background .15s',
        }}
      >
        <span className="pl-ask-cta-label">{t('home.askCta')}</span>
        {/* 좁은 화면: 라벨 대신 아이콘만 */}
        <svg
          className="pl-ask-cta-icon"
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          style={{ display: 'none' }}
        >
          <path d="M4 10h12M11 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <style>{`
        .pl-ask-bar:hover {
          border-color: var(--pl-primary);
        }
        .pl-ask-bar:hover .pl-ask-cta {
          background: color-mix(in srgb, var(--pl-primary) 14%, transparent);
        }
        @media (max-width: 479px) {
          .pl-ask-cta-label { display: none; }
          .pl-ask-cta-icon  { display: inline-block !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pl-ask-bar, .pl-ask-bar .pl-ask-cta { transition: none; }
        }
      `}</style>
    </button>
  )
}
