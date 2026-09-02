/**
 * 홈 상단 4칸 요약 스트립
 * LIVE 중 경기 수, 오늘 경기 수 등 핵심 수치를 한눈에.
 * tone='live'이면 보더를 destructive로, 라벨 앞에 펄스 점 추가.
 *
 * @param {{ items: Array<{ label:string, value:string|number, tone?:'default'|'live'|'warning' }> }} props
 */

export default function SummaryStrip({ items = [] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className={`bg-card rounded-lg p-3 border transition-colors ${
            item.tone === 'live' ? 'border-destructive' : 'border-border'
          }`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            {item.tone === 'live' && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" aria-hidden="true" />
            )}
            <span className="text-xs text-muted-foreground truncate">{item.label}</span>
          </div>
          <div
            className={`text-lg font-bold tabular-nums ${
              item.tone === 'live'    ? 'text-destructive'
              : item.tone === 'warning' ? 'text-amber-600 dark:text-amber-400'
              : 'text-foreground'
            }`}
          >
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
