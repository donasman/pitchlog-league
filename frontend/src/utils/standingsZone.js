/**
 * 순위 구역 유틸리티
 * 국내 리그와 UCL 리그 페이즈에서 순위 구역을 시각적으로 구분.
 *
 * 색은 ZONE_COLOR_VAR 의 CSS 변수로만 주입한다 (StandingsTable 이 --zc 로 받아
 * 좌측 2px 표시선 + 4% 배경 틴트에 쓴다). Tailwind 클래스 표는 참조가 끊겨 제거했다.
 * ZONE_STICKY_BG 는 행 배경(틴트)과 카드 배경을 미리 합성한 불투명 hex.
 * — light: white(#fff) + tint-500/0.04
 * — dark : card(rgb 15,23,41) + tint-400/0.08
 */

/**
 * @typedef {'champions_league'|'champions_league_playoff'|'europa_league'|
 *   'europa_conference'|'relegation_playoff'|'relegation'|'none'|
 *   'ucl_direct'|'ucl_playoff'|'ucl_eliminated'} StandingZone
 */

/**
 * sticky 열(순위·팀) 전용 배경 — 가로 스크롤 시 뒤쪽 콘텐츠를 가리는 불투명 배경.
 * 행 배경의 틴트를 카드 배경 위에 미리 합성한 hex 값:
 *   light: #ffffff + zone-color @ 4% (color-mix 와 동일 공식)
 *   dark : #0f172a + zone-color @ 4% (color-mix 와 동일 공식 — 이전 8%에서 수정)
 */
export const ZONE_STICKY_BG = {
  champions_league:          'bg-[#f7faff] dark:bg-[#111b32]',
  champions_league_playoff:  'bg-[#fefcf5] dark:bg-[#181d29]',
  europa_league:             'bg-[#fff9f6] dark:bg-[#181b29]',
  europa_conference:         'bg-[#f6fbf8] dark:bg-[#0f1d2b]',
  relegation_playoff:        'bg-[#fff9f9] dark:bg-[#181b2d]',
  relegation:                'bg-[#fef6f6] dark:bg-[#17182a]',
  none:                      'bg-card',
  ucl_direct:                'bg-[#f7faff] dark:bg-[#111b32]',
  ucl_playoff:               'bg-[#fefcf5] dark:bg-[#181d29]',
  ucl_eliminated:            'bg-card',
}

/**
 * 구역별 좌측 표시선 패턴 (색을 빼도 구역 구분 가능).
 * solid: 실선 | dash: 점선 | dot: 점 | block: 블록
 * 패턴은 data-pat 속성으로 .zrow CSS에 전달된다.
 */
export const ZONE_PAT = {
  champions_league:         'solid',
  champions_league_playoff: 'dash',
  europa_league:            'dash',
  europa_conference:        'dot',
  relegation_playoff:       'block',
  relegation:               'solid',
  none:                     null,
  ucl_direct:               'solid',
  ucl_playoff:              'dash',
  ucl_eliminated:           'dot',
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
