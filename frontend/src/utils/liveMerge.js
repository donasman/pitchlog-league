/**
 * 라이브 폴링 결과와 기존 목록/상세 병합.
 * 이 파일은 순수 함수만 · React 의존성 0 · 부수효과 0.
 *
 * mergeLive(list, liveMap):
 *   - list 각 항목의 id 로 liveMap 을 조회
 *   - liveMap 히트 없음 → 항목 그대로 반환
 *   - 히트 있음:
 *       · list 항목의 dataVersion 이 null/undefined 이면 항상 덮는다
 *         (normalizeMatch 는 dataVersion 필드를 안 넣으므로 실 API 목록 대부분이 여기 걸린다)
 *       · list 항목에 dataVersion 이 있고 live.dataVersion <= list.dataVersion 이면 무시 (원본 유지)
 *       · 그 밖에는 다음 필드만 덮는다: score · minute · statusCode · displayState · asOf · dataVersion
 *   - round · venue · events · statsState · hasEvents · homeTeam · awayTeam · leg · aggregateScore 등 나머지는 전부 원본 유지
 *
 * toLiveMap(list): Map<id, NormalizedLive> — 편의 함수.
 */
export function mergeLive(list, liveMap) {
  if (!Array.isArray(list) || list.length === 0) return list ?? []
  if (!liveMap || liveMap.size === 0) return list
  return list.map(m => {
    if (!m || m.id == null) return m
    const live = liveMap.get(m.id)
    if (!live) return m
    if (m.dataVersion != null && live.dataVersion != null && live.dataVersion <= m.dataVersion) {
      return m
    }
    return {
      ...m,
      score:        live.score,
      minute:       live.minute,
      statusCode:   live.statusCode,
      displayState: live.displayState,
      asOf:         live.asOf,
      dataVersion:  live.dataVersion,
    }
  })
}

export function toLiveMap(list) {
  const m = new Map()
  if (!Array.isArray(list)) return m
  for (const item of list) if (item && item.id != null) m.set(item.id, item)
  return m
}
