/**
 * 순위 구역 유틸리티
 * 국내 리그와 UCL 리그 페이즈에서 순위 구역을 시각적으로 구분.
 *
 * border-l-{color} 를 사용해 왼쪽 표시선에만 색상 적용.
 * ZONE_STICKY_BG 는 행 배경(틴트)과 카드 배경을 미리 합성한 불투명 hex.
 * — light: white(#fff) + tint-500/0.04
 * — dark : card(rgb 15,23,41) + tint-400/0.08
 */

/**
 * @typedef {'champions_league'|'champions_league_playoff'|'europa_league'|
 *   'europa_conference'|'relegation_playoff'|'relegation'|'none'|
 *   'ucl_direct'|'ucl_playoff'|'ucl_eliminated'} StandingZone
 */

/** 구역별 왼쪽 표시선만 착색 (하단선 border-border/50 불변) */
export const ZONE_BORDER_CLASS = {
  champions_league:          'border-l-2 border-l-blue-500',
  champions_league_playoff:  'border-l-2 border-l-blue-300',
  europa_league:             'border-l-2 border-l-orange-500',
  europa_conference:         'border-l-2 border-l-green-600',
  relegation_playoff:        'border-l-2 border-l-red-400',
  relegation:                'border-l-2 border-l-red-600',
  none:                      'border-l-2 border-l-transparent',
  ucl_direct:                'border-l-2 border-l-blue-500',
  ucl_playoff:               'border-l-2 border-l-yellow-500',
  ucl_eliminated:            'border-l-2 border-l-gray-500',
}

/** 구역별 행 배경색 (4–8% 투명도) */
export const ZONE_BG_CLASS = {
  champions_league:          'bg-blue-500/[0.04] dark:bg-blue-400/[0.08]',
  champions_league_playoff:  'bg-blue-300/[0.04] dark:bg-blue-300/[0.08]',
  europa_league:             'bg-orange-500/[0.04] dark:bg-orange-400/[0.08]',
  europa_conference:         'bg-green-600/[0.04] dark:bg-green-500/[0.08]',
  relegation_playoff:        'bg-red-400/[0.04] dark:bg-red-400/[0.08]',
  relegation:                'bg-red-600/[0.04] dark:bg-red-500/[0.08]',
  none:                      '',
  ucl_direct:                'bg-blue-500/[0.04] dark:bg-blue-400/[0.08]',
  ucl_playoff:               'bg-yellow-500/[0.04] dark:bg-yellow-400/[0.08]',
  ucl_eliminated:            'bg-gray-500/[0.04] dark:bg-gray-400/[0.08]',
}

/**
 * sticky 열(순위·팀) 전용 배경 — 가로 스크롤 시 뒤쪽 콘텐츠를 가리는 불투명 배경.
 * 행 배경의 틴트를 카드 배경 위에 미리 합성한 hex 값:
 *   light: #ffffff + tint-500 @ 4% → 합성 rgb
 *   dark : rgb(15,23,41) + tint-400 @ 8% → 합성 rgb
 */
export const ZONE_STICKY_BG = {
  champions_league:          'bg-[#f7faff] dark:bg-[#15223a]',
  champions_league_playoff:  'bg-[#fbfdff] dark:bg-[#1a253a]',
  europa_league:             'bg-[#fff9f6] dark:bg-[#22212b]',
  europa_conference:         'bg-[#f6fbf8] dark:bg-[#11252d]',
  relegation_playoff:        'bg-[#fff9f9] dark:bg-[#221e2f]',
  relegation:                'bg-[#fef6f6] dark:bg-[#211b2b]',
  none:                      'bg-card',
  ucl_direct:                'bg-[#f7faff] dark:bg-[#15223a]',
  ucl_playoff:               'bg-[#fffcf5] dark:bg-[#222527]',
  ucl_eliminated:            'bg-[#f9f9fa] dark:bg-[#1a2234]',
}

/** 범례용 색상 배경 (범례 도트) — ZoneLegend 에서 직접 사용 */
export const ZONE_LEGEND_COLOR = {
  champions_league:         'bg-blue-500',
  champions_league_playoff: 'bg-blue-300',  // ZONE_BORDER_CLASS 와 동일 색
  europa_league:            'bg-orange-500',
  europa_conference:        'bg-green-600',
  relegation:               'bg-red-600',
  relegation_playoff:       'bg-red-400',
  ucl_direct:               'bg-blue-500',
  ucl_playoff:              'bg-yellow-500',
  ucl_eliminated:           'bg-gray-500',
}

/**
 * 구역별 CSS 변수값 (--z-* tokens).
 * StandingsTable 에서 --zc 로 주입해 좌측 2px 표시선 + 4% 배경 틴트에 사용.
 */
export const ZONE_COLOR_VAR = {
  champions_league:          'var(--z-ucl)',
  champions_league_playoff:  'var(--z-uclpo)',
  europa_league:             'var(--z-uel)',
  europa_conference:         'var(--z-uecl)',
  relegation_playoff:        'var(--z-relpo)',
  relegation:                'var(--z-rel)',
  none:                      null,
  ucl_direct:                'var(--z-ucl)',
  ucl_playoff:               'var(--z-uclpo)',
  ucl_eliminated:            null,
}
