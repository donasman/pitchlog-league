/**
 * 검색 패널 오버레이
 * 팀·선수·대회를 한국어·영어 모두 검색. Esc·바깥 클릭으로 닫기.
 * 화살표+Enter 로 키보드 이동. 입력 즉시 자동 포커스.
 *
 * @param {{ onClose: () => void }} props
 */

import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { searchAll } from '@/utils/searchIndex'
import TeamBadge from '@/components/ui/TeamBadge'
import { getLocalizedName } from '@/utils/localization'

export default function SearchPanel({ onClose }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(-1)

  const results = useMemo(() => searchAll(query), [query])
  const flat = useMemo(
    () => [...results.teams, ...results.players, ...results.competitions],
    [results]
  )

  // 마운트 시 입력창 자동 포커스
  useEffect(() => { inputRef.current?.focus() }, [])

  // 쿼리 변경 시 활성 인덱스 초기화
  useEffect(() => { setActiveIdx(-1) }, [query])

  // 열려 있는 동안 body 스크롤 막기
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Esc 닫기 (document 레벨 — 입력창에 포커스 없어도 동작)
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx(i => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIdx >= 0 && flat[activeIdx]) {
      go(flat[activeIdx])
    }
  }

  function go(item) {
    const path = item.type === 'team'    ? `/teams/${item.slug}`
      : item.type === 'player'           ? `/players/${item.slug}`
      : `/competitions/${item.slug}`
    navigate(path)
    onClose()
  }

  const hasResults = flat.length > 0
  const showNoResults = query.trim() && !hasResults

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 z-[60] bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 패널 */}
      <div className="fixed inset-x-0 top-0 z-[61] flex justify-center pt-4 sm:pt-16 px-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('header.searchLabel')}
          className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
          onKeyDown={handleKeyDown}
        >
          {/* 입력 바 */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search size={16} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('header.searchPlaceholder')}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              onClick={onClose}
              aria-label={t('common.close')}
              className="text-muted-foreground hover:text-foreground p-1 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* 결과 영역 */}
          <div className="max-h-[60vh] overflow-y-auto">
            {showNoResults && (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('header.searchNoResults')}
              </p>
            )}

            {results.teams.length > 0 && (
              <ResultGroup
                label={t('nav.teams')}
                items={results.teams}
                startIdx={0}
                activeIdx={activeIdx}
                locale={locale}
                onSelect={go}
              />
            )}

            {results.players.length > 0 && (
              <ResultGroup
                label={t('nav.players')}
                items={results.players}
                startIdx={results.teams.length}
                activeIdx={activeIdx}
                locale={locale}
                onSelect={go}
              />
            )}

            {results.competitions.length > 0 && (
              <ResultGroup
                label={t('nav.competition')}
                items={results.competitions}
                startIdx={results.teams.length + results.players.length}
                activeIdx={activeIdx}
                locale={locale}
                onSelect={go}
              />
            )}

            {!query.trim() && (
              <p className="text-xs text-muted-foreground text-center py-8">
                {t('header.searchPlaceholder')}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function ResultGroup({ label, items, startIdx, activeIdx, locale, onSelect }) {
  return (
    <div>
      <div className="px-4 pt-3 pb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/30">
        {label}
      </div>
      {items.map((item, i) => {
        const idx = startIdx + i
        const isActive = idx === activeIdx
        const displayName = getLocalizedName({ id: item.id, name: item.label }, locale) || item.label
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
              isActive ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            {item.type === 'team' && (
              <TeamBadge initials={item.initials} color={item.color} size="xs" name={item.label} />
            )}
            {item.type === 'player' && (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-muted-foreground">
                {item.label[0]}
              </div>
            )}
            {item.type === 'competition' && (
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-primary">
                {(item.shortName ?? item.id).slice(0, 3).toUpperCase()}
              </div>
            )}
            <span className="flex-1 min-w-0">
              <span className="block font-medium text-foreground truncate">{displayName}</span>
              {item.sublabel && (
                <span className="text-xs text-muted-foreground truncate block">{item.sublabel}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
