/**
 * 팀 즐겨찾기 별 버튼 — 서버 저장 판.
 *
 * 두 자리에서 쓴다:
 *   TeamsPage 카드(<Link> 안) — 별을 눌러도 팀 페이지로 이동하지 않게 preventDefault + stopPropagation
 *   TeamPage 헤더 — 팀 이름 옆에 큰 별
 *
 * 세 갈래:
 *   - 컨텍스트 off (env·supabase 미설치) → 아예 렌더하지 않는다.
 *   - 로그인 안 됨: 별을 그린다. 클릭하면 로그인 힌트 팝업 + Google 로그인 CTA. toggle 은 호출하지 않는다.
 *   - 로그인 됨:  별·토글. 컨텍스트의 actionError 를 별 아래 힌트로 매핑한다.
 *      · limit_exceeded → favorites.limit_reached   (상한 초과 — toggle 이 actionError 를 세운다)
 *      · unknown_team   → favorites.errors.unknown_team
 *      · duplicate      → favorites.errors.duplicate
 *      · network        → favorites.errors.network
 *      · not_authenticated 는 힌트 없음 (ERROR_KEY 에 없다)
 *     힌트는 actionError.ref === slug 인 인스턴스에서만 뜬다 — 같은 화면의 다른 별에는 뜨지 않는다.
 *     띄운 뒤 clearActionError(slug) 로 그 ref 의 오류만 지운다.
 *
 * disabled = isLoggedIn && (isSyncing || loadState 'idle' | 'loading')
 *   PUT 진행 중이거나 첫 로드가 끝나기 전에는 별을 회색으로 그리고 클릭을 받지 않는다.
 *   loadState 'error' 는 disabled 가 아니다 — 클릭하면 favorites.errors.load_failed 힌트를 띄우고
 *   toggle 은 부르지 않는다 (첫 로드 실패를 빈 목록으로 숨기지 않는다).
 *
 * @param {{ slug:string, label:string, size?:'sm'|'md' }} props  slug 값은 실제로는 팀 ref.
 */

import { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFavorites } from '@/contexts/FavoritesContext'
import { useAuth } from '@/contexts/AuthContext'

const SIZE_PX = { sm: 32, md: 40 }
const ICON_PX = { sm: 16, md: 20 }
const HINT_MS = 2800

const ERROR_KEY = {
  limit_exceeded: 'favorites.limit_reached',
  unknown_team:   'favorites.errors.unknown_team',
  duplicate:      'favorites.errors.duplicate',
  network:        'favorites.errors.network',
  load_failed:    'favorites.errors.load_failed',
}

export default function FavoriteToggle({ slug, label, size = 'md' }) {
  const { t } = useTranslation()
  const {
    isFavoritesEnabled, isLoggedIn, isFavorite, toggle, limit,
    isSyncing, loadState, actionError, clearActionError,
  } = useFavorites()
  const { signInWithGoogle } = useAuth()
  const [hint, setHint] = useState({ visible: false, kind: null })
  const timerRef = useRef(null)

  const active = isLoggedIn ? isFavorite(slug) : false
  const px = SIZE_PX[size] ?? SIZE_PX.md
  const iconPx = ICON_PX[size] ?? ICON_PX.md
  const ariaLabel = active
    ? t('favorites.remove', { name: label })
    : t('favorites.add', { name: label })

  // 별 자체는 그대로 그린다(hover/pressed 를 잃지 않게). click 만 막는다.
  // loadState 'error' 는 여기 들지 않는다 — 클릭 시 load_failed 힌트로 드러낸다.
  const disabled = isLoggedIn && (isSyncing || loadState === 'idle' || loadState === 'loading')

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  // 타이머 종료 시 지역 힌트만 숨긴다. 컨텍스트 actionError 는 띄우는 순간 이미 지웠다.
  const showHint = (kind) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setHint({ visible: true, kind })
    timerRef.current = setTimeout(() => {
      setHint({ visible: false, kind: null })
      timerRef.current = null
    }, HINT_MS)
  }

  // actionError 감지 — 상한 초과(toggle 즉시) 또는 PUT 실패(400·네트워크) 때 컨텍스트가 세운다.
  // 이 별의 ref 에서 난 오류만 힌트로 띄우고, 띄운 뒤 그 ref 의 오류만 지운다.
  // not_authenticated 는 ERROR_KEY 에 없어 힌트가 없다.
  //
  // 훅 규칙 상 early return 위에 있어야 한다 (isFavoritesEnabled=false 렌더 스킵 분기 위).
  useEffect(() => {
    if (!actionError || actionError.ref !== slug) return
    if (!ERROR_KEY[actionError.code]) return
    showHint(actionError.code)
    clearActionError(slug)
    // showHint 는 안정 참조가 아니지만 이 자리는 상수처럼 쓴다 (렌더마다 새로 만들어도 setTimeout 하나만 남는다).
    // clearActionError 는 컨텍스트의 useCallback([]) 안정 참조다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionError, slug])

  // 컨텍스트 off — 별 자체를 그리지 않는다 (env·mock 모드). 훅 호출은 위에 다 마쳤다.
  if (!isFavoritesEnabled) return null

  const handleClick = (e) => {
    // TeamsPage 는 이 버튼을 <Link> 안에 둔다 — Link 로의 이벤트 전파를 막지 않으면
    // 별을 누르는 순간 팀 페이지로 이동한다. 카드 링크는 카드의 몫이다.
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    if (!isLoggedIn) {
      showHint('login_required')
      return
    }

    // 첫 로드 실패 — toggle 을 부르지 않고 힌트로 드러낸다.
    if (loadState === 'error') {
      showHint('load_failed')
      return
    }

    // 상한 초과·서버 오류는 컨텍스트가 actionError 를 세우고 위 useEffect 가 힌트를 띄운다 (경로 하나).
    toggle(slug)
  }

  const hintText = (() => {
    if (!hint.visible || !hint.kind) return ''
    if (hint.kind === 'login_required') return t('favorites.loginRequired')
    const key = ERROR_KEY[hint.kind]
    if (!key) return ''
    if (hint.kind === 'limit_exceeded') return t(key, { limit })
    return t(key)
  })()

  return (
    <span style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={active}
        aria-label={ariaLabel}
        aria-disabled={disabled ? 'true' : undefined}
        title={ariaLabel}
        style={{
          width: px,
          height: px,
          display: 'grid',
          placeItems: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 8,
          cursor: disabled ? 'default' : 'pointer',
          color: disabled
            ? 'var(--pl-sub)'
            : active ? '#f5b301' : 'var(--pl-sub)',
          opacity: disabled ? 0.6 : 1,
          transition: 'color .15s, opacity .15s',
        }}
      >
        <Star
          size={iconPx}
          strokeWidth={active ? 0 : 1.75}
          fill={active ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      </button>
      {/* 힌트 — 별 아래 인라인. login_required 는 CTA 버튼을 함께 실어 이벤트 전파를 막고 로그인으로 넘긴다. */}
      <span
        role="status"
        aria-live="polite"
        style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 30,
          // login_required 는 CTA 클릭을 받아야 해서 pointerEvents 를 켠다.
          pointerEvents: hint.kind === 'login_required' ? 'auto' : 'none',
          padding: '6px 10px',
          background: 'var(--pl-card)',
          color: 'var(--pl-text)',
          border: '1px solid var(--pl-line)',
          borderRadius: 'var(--r-sm)',
          boxShadow: 'var(--sh-over)',
          fontSize: 12,
          lineHeight: 1.35,
          fontWeight: 500,
          whiteSpace: 'nowrap',
          opacity: hint.visible ? 1 : 0,
          transform: hint.visible ? 'translateY(0)' : 'translateY(-2px)',
          transition: 'opacity .18s ease, transform .18s ease',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span>{hintText}</span>
        {hint.visible && hint.kind === 'login_required' && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              signInWithGoogle()
            }}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 8px',
              border: '1px solid var(--pl-line)',
              borderRadius: 'var(--r-sm)',
              background: 'var(--pl-fill)',
              color: 'var(--pl-text)',
              cursor: 'pointer',
            }}
          >
            {t('favorites.loginCta')}
          </button>
        )}
      </span>
    </span>
  )
}
