# Claude Design 내보내기 원본

Claude Design에서 **HTML로 내보낸 파일**을 여기에 둔다.
이 파일들은 **읽기 전용 원본**이다 — 직접 수정하지 않는다.

## 왜 HTML인가

PNG에서 색을 뽑으면 압축 아티팩트와 안티앨리어싱 때문에 값이 미세하게 어긋난다
(`../FOUNDATION_AUDIT.md` 참조 — 이 문제로 400dpi 재렌더와 교차검증까지 해야 했다).

HTML은 색·간격·타이포 값이 그대로 들어있어 **추측할 필요가 없다.**

## 파일 이름

Claude Design의 시안 이름을 그대로 쓰되, 앞에 단계 번호를 붙인다.

```
02-common-components.html
03-home.html
04-standings.html
05-matches.html
05-2-match-detail.html
06-remaining.html
07-notifications.html
08-assistant.html
```

⚠ 홈 관련 시안이 여러 개다(홈 / 홈 C안 시안 / 홈 레이아웃 시안 / 3단계 홈).
**최종본 하나만 내보낸다.** 나머지는 탐색 과정이라 저장소에 넣지 않는다.

## 여기서 무엇을 추출하는가

| 추출물 | 목적지 |
|---|---|
| 색 토큰 | `../pitchlog-base-tokens.css` · `../pitchlog-theme-dark.css` |
| 간격·타이포 스케일 | 같음 |
| 컴포넌트 크기·상태 | `../COMPONENT_SPEC.md` |
| 화면 구조 | `frontend/` 구현 기준 |

## 규칙 검증에 쓴다 ★

HTML이 있으면 브리프의 **절대 규칙이 실제로 지켜졌는지 기계로 검사**할 수 있다.

- 순위표 안에서 팀 이름이 브랜드 파랑인가 → PRD 9-2 위반
- 활성 필터 칩이 틴트인가 채움인가 → 9-2 위반
- 텍스트 대비 4.5:1 · 컨트롤 경계 3:1 충족하는가
- 상태를 색상 단독으로 구분하는 곳이 있는가

Foundation 감사 때 같은 방식으로 **11건을 잡았다.** 눈으로는 안 보이는 것들이었다.
