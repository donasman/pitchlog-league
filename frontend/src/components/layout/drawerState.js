/**
 * 모바일 드로어 상태 머신 — 순수 reducer.
 *
 * 왜 4-state 인가:
 *   열림 시 데이터 흐름이 mount(요소 삽입) + data-open="true"(최종 스타일) 를
 *   같은 React 커밋에 밀어 넣으면 CSS transition 이 안 걸린다 —
 *   브라우저가 "이전 값(translateX(100%))" 을 페인트할 기회를 안 준다.
 *
 *   'opening' 을 한 프레임 두고 (mount 는 되지만 data-open="false"),
 *   requestAnimationFrame 2회 뒤 'open' 으로 뒤집으면 브라우저가 초기 상태를
 *   페인트한 뒤 attribute 가 바뀌어 transition 이 정상 실행된다.
 *
 * 상태 전이:
 *   closed  --open-->  opening
 *   opening --enter-->  open        (2× rAF 콜백에서 dispatch)
 *   open    --close--> closing
 *   closing --exit-->  closed       (onTransitionEnd 또는 350ms 안전장치)
 *
 * 연속 탭 처리:
 *   opening --close--> closing      (열리는 중 닫기)
 *   closing --open-->  open         (닫히는 중 다시 열기; opening 이 아니라 open 으로
 *                                    가야 이미 마운트된 요소에서 data-open flip 만
 *                                    일어나 정상 transition)
 *   그 외 idempotent (예: open + open → open)
 *
 * reducedMotion:
 *   opening 을 건너뛰고 open, closing 을 건너뛰고 closed 로 간다.
 *   결과적으로 transition 없이 즉시 열고 닫힘.
 */

/** @typedef {'closed'|'opening'|'open'|'closing'} DrawerState */
/** @typedef {'open'|'enter'|'close'|'exit'} DrawerAction */

/**
 * @param {DrawerState} prev
 * @param {DrawerAction} action
 * @param {{ reducedMotion?: boolean }} [opts]
 * @returns {DrawerState}
 */
export function nextDrawerState(prev, action, opts = {}) {
  const reduced = !!opts.reducedMotion

  if (action === 'open') {
    if (prev === 'open')     return 'open'
    if (prev === 'opening')  return 'opening'
    if (prev === 'closing')  return 'open'    // 닫히는 중 다시 열기 — mount 유지, data-open 만 flip
    // closed
    return reduced ? 'open' : 'opening'
  }

  if (action === 'enter') {
    // opening 이 아닌 상태에서 enter 가 오면 무시 (동시성 방어)
    return prev === 'opening' ? 'open' : prev
  }

  if (action === 'close') {
    if (prev === 'closed')  return 'closed'
    if (prev === 'closing') return 'closing'
    // opening | open
    return reduced ? 'closed' : 'closing'
  }

  if (action === 'exit') {
    return prev === 'closing' ? 'closed' : prev
  }

  return prev
}

/** 마운트 여부 — closed 만 언마운트, opening/open/closing 은 DOM 에 존재 */
export function drawerMounted(state) {
  return state !== 'closed'
}

/** 사용자 의도상 열림 — 버튼 라벨·아이콘 결정용 */
export function drawerIntendedOpen(state) {
  return state === 'open' || state === 'opening'
}

/**
 * DOM 에 넣을 data-open 속성 값.
 *   opening 은 방금 마운트된 프레임이라 "false" (초기 스타일) 를 보여줘야
 *   다음 rAF 에서 "true" 로 바뀔 때 transition 이 발동한다.
 *   closing 도 "false" (닫힌 상태로 향하는 transition).
 */
export function drawerDataOpen(state) {
  return state === 'open' ? 'true' : 'false'
}

/**
 * 열림 완료 시 포커스 대상.
 *   'drawer' 만 반환하고, 첫 링크로 자동 포커스는 하지 않는다 —
 *   Safari 는 프로그램 포커스에도 링을 그려서, 현재 페이지와 무관한 첫 항목
 *   (예: '홈') 이 강조되는 것처럼 보인다. 드로어 컨테이너 자체(tabIndex=-1,
 *   outline:none)로 포커스를 옮기면 스크린리더는 dialog 를 읽고 시각적 링은
 *   나오지 않는다. 키보드 사용자는 Tab 으로 첫 링크부터 자연스럽게 이동.
 *
 *   open 이 아닌 상태에서는 null — 컴포넌트가 별도로 처리 (닫힘 완료 시 메뉴 버튼).
 */
export function drawerFocusTarget(state) {
  return state === 'open' ? 'drawer' : null
}
