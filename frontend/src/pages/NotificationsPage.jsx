/**
 * 알림 설정 /notifications/settings
 * - 관심 팀 · 관심 대회 · 이벤트 종류 · 인앱/푸시 선택
 * - 권한 상태 3종 (default · granted · denied) 표시
 * - "이 브라우저에서만 적용됩니다" 명시
 *
 * 로그인이 없으므로 다른 기기와 동기화되지 않는다.
 * 이 사실을 화면이 숨기지 않는다.
 */

import { useTranslation } from 'react-i18next'
import { useNotifications } from '@/contexts/NotificationContext'

/* ── 토글 스위치 ── */
function Switch({ on, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        width: 52,
        height: 32,
        borderRadius: 999,
        background: on ? 'var(--pl-primary)' : 'var(--pl-fill-2)',
        boxShadow: on ? 'none' : 'inset 0 0 0 1px var(--pl-control)',
        position: 'relative',
        flexShrink: 0,
        border: 'none',
        cursor: 'pointer',
        transition: 'background .15s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: on ? 'var(--pl-on-primary)' : 'var(--pl-card)',
          boxShadow: '0 1px 2px rgba(0,0,0,.2)',
          transition: 'left .15s',
        }}
      />
    </button>
  )
}

/* ── 설정 행 ── */
function SettingRow({ label, desc, right, disabled = false }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '12px 16px',
        borderTop: '1px solid var(--pl-line)',
        minHeight: 56,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="t-body" style={{ fontWeight: 600 }}>{label}</div>
        {desc && <div className="t-sub">{desc}</div>}
      </div>
      {right}
    </div>
  )
}

/* ── 권한 상태 카드 ── */
function PermissionStateCard({ permission, t, onRequest, onDisable }) {
  const cfgMap = {
    default: {
      badge: 'pl-badge b-sched',
      title: t('notif.permDefault'),
      desc:  t('notif.permDefaultDesc'),
      action: (
        <button className="pl-btn pl-btn-sm" onClick={onRequest}>
          {t('notif.permEnable')}
        </button>
      ),
    },
    granted: {
      badge: 'pl-badge b-final',
      title: t('notif.permGranted'),
      desc:  t('notif.permGrantedDesc'),
      action: (
        <button className="pl-btn pl-btn-sm pl-btn-ghost" onClick={onDisable}>
          {t('notif.permDisable')}
        </button>
      ),
    },
    denied: {
      badge: 'pl-badge b-cancel',
      title: t('notif.permDenied'),
      desc:  t('notif.permDeniedDesc'),
      action: (
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pl-btn pl-btn-sm pl-btn-ghost">{t('notif.permHowTo')}</button>
          <button className="pl-btn pl-btn-sm">{t('notif.inappOnly')}</button>
        </div>
      ),
    },
  }
  const cfg = cfgMap[permission] ?? cfgMap.default

  return (
    <div className="pl-card" style={{ padding: 16, display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={cfg.badge}>{cfg.title}</span>
      </div>
      <span className="t-sub">{cfg.desc}</span>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>{cfg.action}</div>
    </div>
  )
}

/* ── 대회 목록 ── */
const COMPS = [
  { slug: 'premier-league',   label: 'EPL'    },
  { slug: 'la-liga',          label: 'LaLiga' },
  { slug: 'bundesliga',       label: 'BL'     },
  { slug: 'serie-a',          label: 'SA'     },
  { slug: 'ligue-1',          label: 'L1'     },
  { slug: 'champions-league', label: 'UCL'    },
]

/* ── NotificationsPage ── */
export default function NotificationsPage() {
  const { t } = useTranslation()
  const { settings, updateSettings, showPermCard } = useNotifications()
  const { permission, events, pushEnabled, competitions: followedComps } = settings

  function toggleEvent(key) {
    updateSettings({ events: { ...events, [key]: !events[key] } })
  }

  function toggleComp(slug) {
    const prev = followedComps ?? []
    const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    updateSettings({ competitions: next })
  }

  return (
    <div style={{ background: 'var(--pl-bg)', minHeight: '100dvh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 48px' }} className="lg:px-8">

        {/* 헤더 */}
        <div style={{ marginBottom: 20 }}>
          <h1 className="t-page" style={{ margin: 0, fontSize: 26 }}>{t('notif.settingsTitle')}</h1>
          <p className="t-sub" style={{ margin: '6px 0 0' }}>{t('notif.settingsSubtitle')}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }} className="notif-settings-grid">
          <style>{`@media(min-width:768px){.notif-settings-grid{grid-template-columns:1fr 320px!important}}`}</style>

          {/* 왼쪽 — 설정 카드들 */}
          <div style={{ display: 'grid', gap: 16 }}>

            {/* 관심 대회 */}
            <div className="pl-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--pl-line)' }}>
                <span className="t-card">{t('notif.competitionsSection')}</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {COMPS.map(c => (
                  <button
                    key={c.slug}
                    className="pl-chip"
                    aria-pressed={(followedComps ?? []).includes(c.slug)}
                    onClick={() => toggleComp(c.slug)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 어떤 일이 생겼을 때 */}
            <div className="pl-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px' }}>
                <span className="t-card">{t('notif.eventsSection')}</span>
              </div>
              {[
                { key: 'kickoff',   label: t('notif.kickoffEvent'),   desc: t('notif.kickoffEventDesc') },
                { key: 'goal',      label: t('notif.goalEvent'),      desc: t('notif.goalEventDesc') },
                { key: 'fulltime',  label: t('notif.fulltimeEvent'),  desc: t('notif.fulltimeEventDesc') },
                { key: 'confirmed', label: t('notif.confirmedEvent'), desc: t('notif.confirmedEventDesc') },
              ].map(row => (
                <SettingRow
                  key={row.key}
                  label={row.label}
                  desc={row.desc}
                  right={
                    <Switch
                      on={events?.[row.key] ?? false}
                      onChange={() => toggleEvent(row.key)}
                      label={row.label}
                    />
                  }
                />
              ))}
            </div>

            {/* 어디로 보낼까요 */}
            <div className="pl-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '10px 16px' }}>
                <span className="t-card">{t('notif.deliverySection')}</span>
              </div>
              <SettingRow
                label={t('notif.inapp')}
                desc={t('notif.inappDesc')}
                right={<Switch on label={t('notif.inapp')} onChange={() => {}} />}
              />
              <SettingRow
                label={t('notif.push')}
                desc={permission === 'denied' ? t('notif.pushDeniedDesc') : t('notif.pushDesc')}
                disabled={permission === 'denied'}
                right={
                  <Switch
                    on={permission === 'granted' && (pushEnabled ?? false)}
                    label={t('notif.push')}
                    onChange={v => {
                      if (permission === 'default' && v) showPermCard()
                      else updateSettings({ pushEnabled: v })
                    }}
                  />
                }
              />
            </div>
          </div>

          {/* 오른쪽 — 권한 상태 + 기기 안내 */}
          <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
            <PermissionStateCard
              permission={permission ?? 'default'}
              t={t}
              onRequest={showPermCard}
              onDisable={() => updateSettings({ permission: 'default', pushEnabled: false })}
            />

            <div className="pl-card" style={{ padding: 16, display: 'grid', gap: 8 }}>
              <span className="t-card">{t('notif.deviceNote')}</span>
              <span className="t-sub">{t('notif.deviceNoteDesc')}</span>
              <button
                className="pl-link"
                style={{ justifySelf: 'start' }}
                onClick={() => window.location.reload()}
              >
                {t('notif.resetDevice')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
