/**
 * "아직 백엔드에 없음" 상태 — 빈 결과(EmptyState)·실패(ErrorState) 와 구분된다.
 * 데이터가 0건인 것도, 요청이 실패한 것도 아니다. 그 기능이 아직 만들어지지 않았다.
 * 그래서 EmptyState 의 "필터를 바꿔 보라" 힌트가 없고, 재시도 버튼도 없다.
 *
 * 문구 두 방식 중 하나를 넘긴다:
 *   - featureKey: i18n 키 (errors.feature.*) — `errors.notImplemented` 템플릿에 끼워 넣는다 ("아직 백엔드에 없는 데이터입니다 (X)")
 *   - messageKey: 문구 그대로 표시할 i18n 키 — 자리마다 다른 어감(예: "선수단 데이터는 아직 수집되지 않았습니다") 을 넘길 때
 *
 * @param {{ featureKey?: string, messageKey?: string }} props
 */

import { useTranslation } from 'react-i18next'

export default function NotImplementedState({ featureKey, messageKey }) {
  const { t } = useTranslation()

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: 12,
        textAlign: 'center',
      }}
      role="status"
    >
      {/* 아이콘 — 공사 중(도구) 모양으로 "아직 없음" 표현 */}
      <span
        aria-hidden="true"
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--pl-fill)',
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--pl-sub)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      </span>

      <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--pl-text)', margin: 0 }}>
        {messageKey ? t(messageKey) : t('errors.notImplemented', { what: t(featureKey) })}
      </p>
    </div>
  )
}
