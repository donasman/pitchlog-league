/**
 * AI 어시스턴트 패널
 *
 * 데스크톱: 우측 슬라이드 패널 (420px)
 * 모바일: 바텀시트 (위로 끌어올려 전체 화면)
 *
 * ★ 완료 조건:
 *  - 답변의 숫자가 조회된 것임이 화면에서 읽힌다 (근거 카드 + 타임스탬프)
 *  - 재검증 중 배지가 접힌 상태에서도 보인다
 *  - 지어낸 것처럼 보이지 않는다
 *
 * 말풍선만 있는 챗봇으로 그리면 실패한다 — 숫자는 데이터 카드로 렌더링한다.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAssistant } from '@/contexts/AssistantContext'
import MatchStatusBadge from '@/components/ui/MatchStatusBadge'
import TeamBadge from '@/components/ui/TeamBadge'
import { ZONE_COLOR_VAR, ZONE_PAT } from '@/utils/standingsZone'
import { toKSTDateTime } from '@/utils/dateFormat'

/* ── P 마크 (AI 아바타) ── */
function PMark({ size = 28 }) {
  return (
    <span
      style={{
        width: size, height: size,
        borderRadius: 8,
        background: 'var(--pl-text)',
        color: 'var(--pl-bg)',
        display: 'grid', placeItems: 'center',
        flexShrink: 0,
        fontSize: size * 0.42,
        fontWeight: 700,
        fontFamily: 'var(--font)',
      }}
      aria-hidden="true"
    >
      P
    </span>
  )
}

/* ── 사용자 메시지 ── */
function UserMessage({ text }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <span
        style={{
          maxWidth: '78%',
          background: 'var(--pl-primary)',
          color: 'var(--pl-on-primary)',
          padding: '10px 14px',
          borderRadius: '14px 14px 4px 14px',
          fontSize: 14,
          fontWeight: 500,
          lineHeight: 1.5,
        }}
      >
        {text}
      </span>
    </div>
  )
}

/* ── 순위 데이터 카드 ── */
function StandingsDataCard({ rows, t }) {
  if (!rows?.length) return null
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--pl-line)' }}>
      <div
        className="zrow t-cap"
        style={{ gridTemplateColumns: '26px 1fr 44px', height: 28 }}
      >
        <span>{t('assistant.rank')}</span>
        <span>{t('assistant.team')}</span>
        <span style={{ textAlign: 'right' }}>{t('assistant.points')}</span>
      </div>
      {rows.map(r => {
        const zc  = ZONE_COLOR_VAR[r.zone]
        const pat = ZONE_PAT[r.zone]
        return (
          <div
            key={r.rank}
            className="zrow num"
            data-zone={zc ? r.zone : undefined}
            data-pat={pat && pat !== 'solid' ? pat : undefined}
            style={{
              '--zc': zc ?? 'transparent',
              gridTemplateColumns: '26px 1fr 44px',
              height: 36,
            }}
          >
            <span style={{ fontWeight: 700 }}>{r.rank}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, fontVariantNumeric: 'normal', fontWeight: 600 }}>
              <TeamBadge initials={r.teamInitials} color={r.teamColor} size="xs" name={r.teamName} />
              <span className="tname">{r.teamName}</span>
            </span>
            <span style={{ textAlign: 'right', fontWeight: 700 }}>{r.points}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ── 경기 데이터 카드 ── */
function MatchDataCard({ card, t }) {
  const live = card.displayState === 'live' || card.displayState === 'halftime'
  const hasScore = card.homeScore !== null && card.awayScore !== null

  return (
    <div
      className="pl-card"
      style={{
        padding: 12,
        display: 'grid',
        gap: 8,
        boxShadow: live ? 'inset 0 0 0 1.5px var(--st-neg)' : 'inset 0 0 0 1px var(--pl-line)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <MatchStatusBadge state={card.displayState} />
        {live && card.minute && (
          <span className="t-cap num" style={{ color: 'var(--st-neg-text)' }}>{card.minute}′</span>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
        <span className="t-body tname" style={{ fontWeight: 600 }}>{card.homeName}</span>
        <span className="num t-body" style={{ fontWeight: 700 }}>
          {hasScore ? card.homeScore : '–'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
        <span className="t-body tname" style={{ fontWeight: 600 }}>{card.awayName}</span>
        <span className="num t-body" style={{ fontWeight: 700 }}>
          {hasScore ? card.awayScore : '–'}
        </span>
      </div>
      {card.matchId && (
        <Link to={`/matches/${card.matchId}`} className="pl-link" style={{ fontSize: 12, justifySelf: 'start' }}>
          {t('assistant.matchDetail')}
        </Link>
      )}
    </div>
  )
}

/* ── 통계 비교 데이터 카드 ── */
function StatsDataCard({ rows }) {
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', boxShadow: 'inset 0 0 0 1px var(--pl-line)' }}>
      {rows.map((r, i) => (
        <div
          key={i}
          className="num"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 72px 72px',
            gap: 8,
            padding: '0 12px',
            height: 34,
            alignItems: 'center',
            borderTop: i ? '1px solid var(--pl-line)' : 'none',
            fontSize: 13,
          }}
        >
          <span className="t-sub" style={{ fontVariantNumeric: 'normal' }}>{r[0]}</span>
          <span style={{ textAlign: 'right', fontWeight: 700 }}>{r[1]}</span>
          <span style={{ textAlign: 'right', fontWeight: 700 }}>{r[2]}</span>
        </div>
      ))}
    </div>
  )
}

/* ── 데이터 카드 디스패처 ── */
function DataCard({ card, t }) {
  if (card.type === 'standings') return <StandingsDataCard rows={card.rows} t={t} />
  if (card.type === 'match')     return <MatchDataCard card={card} t={t} />
  if (card.type === 'stats')     return <StatsDataCard rows={card.rows} />
  return null
}

/* ── 근거 카드 (접힘/펼침) ── */
function EvidenceSection({ evidence, dataStatus, locale, t }) {
  const [open, setOpen] = useState(false)

  const isRecheck = dataStatus === 'recheck'
  const isLive    = dataStatus === 'live'

  if (!evidence) return null

  const asOf = evidence.asOf
    ? toKSTDateTime(evidence.asOf, locale)
    : '—'

  return (
    <div style={{ borderTop: '1px solid var(--pl-line)', paddingTop: 10, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <button
          onClick={() => setOpen(o => !o)}
          className="pl-link"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-block',
              transform: open ? 'rotate(90deg)' : 'none',
              transition: 'transform .15s',
              fontSize: 10,
            }}
          >
            ▸
          </span>
          {t('assistant.evidenceBtn')}
        </button>

        {/* 재검증 중 / 라이브 배지 — 접힌 상태에서도 표시 */}
        {isRecheck && <MatchStatusBadge state="recheck" />}
        {isLive    && <MatchStatusBadge state="live" />}

        <span className="t-cap num" style={{ marginLeft: 'auto', color: 'var(--pl-sub)' }}>
          {asOf} {t('assistant.asOfSuffix')}
        </span>
      </div>

      {open && (
        <div
          style={{
            background: 'var(--pl-fill)',
            borderRadius: 8,
            padding: 12,
            display: 'grid',
            gap: 6,
          }}
        >
          {[
            [t('assistant.evidenceTool'), evidence.tool],
            [t('assistant.evidenceAsOf'),  asOf],
            [t('assistant.evidenceSource'), evidence.source],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'grid', gridTemplateColumns: '52px 1fr', gap: 10 }}>
              <span className="t-cap">{label}</span>
              <span className="t-sub" style={{ color: 'var(--pl-text)' }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── AI 답변 메시지 ── */
function AiMessage({ sample, locale, t }) {
  const { answer, cards, evidence, dataStatus, note, suggestions } = sample

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <PMark />
      <div
        className="pl-card"
        style={{ flex: 1, minWidth: 0, padding: 14, display: 'grid', gap: 10 }}
      >
        {/* 본문 텍스트 */}
        <span className="t-body">{answer}</span>

        {/* 데이터 카드들 */}
        {(cards ?? []).map((card, i) => (
          <DataCard key={i} card={card} t={t} />
        ))}

        {/* 노트 (재검증 중, 라이브 등) */}
        {note && (
          <span className="t-sub">{note}</span>
        )}

        {/* 답할 수 없음 — 대안 제시 */}
        {dataStatus === 'unanswerable' && suggestions?.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            <span className="t-sub">{t('assistant.unanswerableNote')}</span>
            {suggestions.map(q => (
              <button
                key={q}
                className="pl-btn pl-btn-ghost"
                style={{ justifyContent: 'flex-start', height: 40, fontWeight: 500, fontSize: 13 }}
                onClick={() => {}}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* 근거 카드 */}
        <EvidenceSection evidence={evidence} dataStatus={dataStatus} locale={locale} t={t} />
      </div>
    </div>
  )
}

/* ── 생각 중 메시지 ── */
function ThinkingMessage({ thinkingText, t }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <PMark />
      <div className="pl-card" style={{ flex: 1, padding: 14, display: 'grid', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 스피너 */}
          <span
            className="pl-spin"
            aria-hidden="true"
            style={{
              width: 14, height: 14,
              borderRadius: '50%',
              borderTop: '2px solid var(--pl-sub)',
              border: '2px solid var(--pl-fill-2)',
              borderTopColor: 'var(--pl-sub)',
              display: 'inline-block',
            }}
          />
          <span className="t-body">
            {thinkingText ?? t('assistant.thinking')}…
          </span>
        </div>
        {/* 스켈레톤 */}
        <div style={{ display: 'grid', gap: 6 }}>
          {[70, 52, 86].map((w, i) => (
            <span key={i} className="pl-sk" style={{ height: 12, width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── 빈 상태 ── */
function PanelEmpty({ suggestedQuestions, onAsk, t }) {
  return (
    <div style={{ display: 'grid', gap: 14, padding: 16, alignContent: 'start' }}>
      <div style={{ display: 'grid', gap: 8 }}>
        <PMark size={36} />
        <span className="t-sec" style={{ fontSize: 19, margin: 0 }}>{t('assistant.emptyTitle')}</span>
        <span className="t-sub">{t('assistant.emptyDesc')}</span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        <span className="t-cap">{t('assistant.suggestLabel')}</span>
        {(suggestedQuestions ?? []).map(q => (
          <button
            key={q}
            className="pl-btn pl-btn-ghost"
            style={{ justifyContent: 'flex-start', height: 44, fontWeight: 500, fontSize: 14 }}
            onClick={() => onAsk(q)}
          >
            {q}
          </button>
        ))}
      </div>
      <span className="t-cap">{t('assistant.disclaimer')}</span>
    </div>
  )
}

/* ── 입력창 ── */
function PanelInput({ onSend, t }) {
  const [value, setValue] = useState('')

  function handleSend() {
    const q = value.trim()
    if (!q) return
    setValue('')
    onSend(q)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div
      style={{
        padding: 12,
        borderTop: '1px solid var(--pl-line)',
        background: 'var(--pl-card)',
        display: 'grid',
        gap: 8,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          minHeight: 48,
          padding: '0 6px 0 14px',
          borderRadius: 12,
          background: 'var(--pl-fill)',
          boxShadow: 'inset 0 0 0 1px var(--pl-control)',
        }}
      >
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('assistant.placeholder')}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            color: 'var(--pl-text)',
            fontFamily: 'var(--font)',
          }}
          aria-label={t('assistant.placeholder')}
        />
        <button
          onClick={handleSend}
          aria-label={t('assistant.send')}
          className="pl-btn"
          style={{ width: 40, height: 40, padding: 0, borderRadius: 10, flexShrink: 0 }}
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
            <path d="M10 16V4m0 0L5 9m5-5 5 5" />
          </svg>
        </button>
      </div>
      <span className="t-cap">{t('assistant.dataNote')}</span>
    </div>
  )
}

/* ── AssistantPanel (메인) ── */
export default function AssistantPanel() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const { isOpen, closePanel, messages, isThinking, sendMessage, suggestedQuestions, clearConversation } = useAssistant()

  const scrollRef = useRef(null)

  /* 새 메시지 시 스크롤 */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isThinking])

  const handleAsk = useCallback(question => sendMessage(question), [sendMessage])

  const isEmpty = messages.length === 0 && !isThinking

  return (
    <>
      {/* 모바일 오버레이 — 페이드 */}
      <div
        className="lg:hidden assistant-overlay"
        data-open={isOpen ? 'true' : 'false'}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,.3)',
          zIndex: 7000,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity .22s ease',
        }}
        onClick={closePanel}
        aria-hidden="true"
      />

      {/* 패널 — 데스크톱: 우측 슬라이드 / 모바일: 바텀시트 슬라이드 */}
      <div
        style={{
          position: 'fixed',
          zIndex: 7001,
          background: 'var(--pl-card)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          visibility: isOpen ? 'visible' : 'hidden',
          transitionDelay: isOpen ? '0s' : '.28s',
          transitionProperty: 'visibility',
        }}
        className="assistant-panel"
        data-open={isOpen ? 'true' : 'false'}
        aria-hidden={!isOpen}
      >
        <style>{`
          /* 데스크톱: 우측 슬라이드 */
          @media(min-width:1024px){
            .assistant-panel{
              top:60px; right:0; bottom:0;
              width:420px;
              border-left:1px solid var(--pl-line);
              box-shadow:var(--sh-modal);
              transform:translateX(100%);
              transition:transform .28s cubic-bezier(.22,.61,.36,1), visibility 0s linear .28s;
            }
            .assistant-panel[data-open="true"]{
              transform:translateX(0);
              transition:transform .28s cubic-bezier(.22,.61,.36,1), visibility 0s linear 0s;
            }
          }
          /* 모바일: 바텀시트 슬라이드 */
          @media(max-width:1023px){
            .assistant-panel{
              left:0; right:0; bottom:0; top:34%;
              border-radius:16px 16px 0 0;
              box-shadow:var(--sh-modal);
              transform:translateY(100%);
              transition:transform .28s cubic-bezier(.22,.61,.36,1), visibility 0s linear .28s;
            }
            .assistant-panel[data-open="true"]{
              transform:translateY(0);
              transition:transform .28s cubic-bezier(.22,.61,.36,1), visibility 0s linear 0s;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .assistant-panel, .assistant-overlay {
              transition: none !important;
            }
          }
        `}</style>

        {/* 모바일 핸들 */}
        <div className="lg:hidden" style={{ padding: '8px 0', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <span style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--pl-line)', display: 'block' }} />
        </div>

        {/* 헤더 */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 8px 0 16px',
            borderBottom: '1px solid var(--pl-line)',
            flexShrink: 0,
          }}
        >
          <PMark size={24} />
          <span className="t-card">{t('assistant.title')}</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="t-cap"
                style={{
                  minHeight: 44, minWidth: 44, display: 'grid', placeItems: 'center',
                  color: 'var(--pl-sub)', background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font)', fontSize: 11,
                }}
                aria-label={t('assistant.clearChat')}
              >
                ↺
              </button>
            )}
            <button
              onClick={closePanel}
              aria-label={t('assistant.close')}
              style={{
                width: 44, height: 44, display: 'grid', placeItems: 'center',
                color: 'var(--pl-sub)', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 16, borderRadius: 8,
              }}
            >
              ✕
            </button>
          </span>
        </div>

        {/* 메시지 영역 */}
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'var(--pl-bg)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {isEmpty ? (
            <PanelEmpty suggestedQuestions={suggestedQuestions} onAsk={handleAsk} t={t} />
          ) : (
            <div style={{ display: 'grid', gap: 14, padding: 16 }}>
              {messages.map(msg => (
                msg.role === 'user'
                  ? <UserMessage key={msg.id} text={msg.text} />
                  : <AiMessage key={msg.id} sample={msg.sample} locale={locale} t={t} />
              ))}
              {isThinking && <ThinkingMessage t={t} />}
            </div>
          )}
        </div>

        {/* 입력창 */}
        <PanelInput onSend={handleAsk} t={t} />
      </div>
    </>
  )
}
