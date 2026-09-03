# PitchLog Web Foundation — Audit & 접근성 수정 기록

> ⚠ **역사 기록 (2026-09-03 은퇴).** 이 문서가 다루는 4개 파일은 `archive/` 로 옮겼다.
> 현재 토큰 기준은 `pitchlog-tokens.css` 다 — Claude Design 시안에서 나온 값이며,
> 이 문서의 접근성 원칙(대비 4.5:1 / 3:1, 색상 단독 금지, focus-visible)은 그대로 이어진다.
> 실제로 신규 토큰도 같은 방식으로 25쌍을 실측해 2건을 수정했다.

작성: 2026-09-02 · 대상: `design/` 폴더의 Foundation 4개 파일

---

## 1. 가장 큰 문제 — Foundation이 렌더되지 않는 상태였음

`pitchlog-foundation.css`는 **23개의 `--wds-*` 토큰에 alias만 걸어둔 파일**입니다.
그 값들의 실제 정의는 아래 경로에 있었습니다.

```
_ds/wanted-design-system-1d1c38ad-f62b-4dbc-98cf-ccac9a972b73/tokens/semantic.css
```

이 경로는 Claude Design 샌드박스 내부 경로라 **로컬에 존재하지 않습니다.**
결과적으로 `PitchLog Web Foundation.html`을 열면:

- 스타일시트 링크 6개 전부 404
- `--pl-primary` 등 모든 semantic alias가 빈 값으로 해석
- 색상·배경·테두리가 전부 소실된 채 렌더

`styles.css`(172바이트)도 `./tokens/*.css`를 가리키는 **import 매니페스트일 뿐**이고,
`fig-assets.css`가 참조하는 `./assets/*.png` 34개도 함께 누락돼 있었습니다.

### 부수적으로 확인된 것 — 번들 재유입은 없었음

HTML이 `react@18.3.1`, `react-dom`, `_ds_bundle.js` 3개 스크립트를 로드하고 있었지만,
**페이지는 이 중 어느 것도 사용하지 않습니다.** 아이콘·탭·모달·토스트·페이지네이션은
전부 하단 인라인 `<script>`의 바닐라 DOM 코드로 동작합니다.
`fig-asset` 클래스 사용도 0건입니다.

→ 우려했던 "제외한 네이티브 컴포넌트 CSS 재유입"은 **실제로는 일어나지 않았습니다.**
   다만 죽은 링크 9개가 남아 있었을 뿐이며, 전부 제거했습니다.

### 조치

`pitchlog-base-tokens.css`를 신설해 23개 토큰을 모두 정의했습니다.

- **recovered (15개)** — `pitchlog-design.pdf`를 400dpi로 재렌더해 스와치 라벨을 판독하고
  픽셀을 샘플링해 복원. 라벨의 알파 표기와 픽셀 합성값이 일치하는 것으로 교차검증했습니다.
- **decided (8개)** — 원본을 확보할 수 없어 PitchLog가 직접 정한 값.
  전부 WCAG 계산 근거를 주석에 명시했습니다.

---

## 2. 접근성 수정 — 11건

브라우저에서 실제 렌더한 뒤 계산된 스타일로 측정한 값입니다(추정치 아님).

| # | 항목 | Before | After | 근거 |
|---|---|---|---|---|
| 1 | Badge positive 전경 | `#00893A` **3.85:1** | `#007833` **4.81:1** | 12px 텍스트, 4.5:1 필요 |
| 2 | Badge cautionary 전경 | `#A35A00` **4.46:1** | `#9C5600` **4.79:1** | 〃 |
| 3 | Badge negative 전경 | `#D92020` **4.15:1** | `#C71D1D` **4.77:1** | 〃 |
| 4 | Badge primary 전경 | primary-strong **4.48:1** | primary-heavy **5.70:1** | surface-alt 위 tint 기준 |
| 5 | Count Badge 배경 | `#FF4242` + 흰글자 **3.44:1** | `#D01919` **5.48:1** | Danger 버튼과 동일 토큰으로 통일 |
| 6 | 에러 도움말 텍스트 | `#FF4242` 12px **3.44:1** | `#D01919` **5.48:1** | 오류 메시지는 본문 기준 적용 |
| 7 | `--pl-text-sub` | α .61 → **3.66 / 3.56:1** | α .71 → **4.83 / 4.66:1** | 보조 텍스트 15곳에 일괄 적용 |
| 8 | Input·Select·Textarea 테두리 | `--pl-line` **1.32:1** | `--pl-line-strong` **3.23:1** | WCAG 1.4.11 (3:1) |
| 9 | Input 포커스 링 | tint 6% (거의 안 보임) | 2px solid outline + offset 2px | 1.4.11 |
| 10 | Button·Link 포커스 | **정의 없음** | 전역 `:focus-visible` outline | 2.4.7 |
| 11 | Switch off 트랙 | 경계 없음 **2.02:1** | inset 1px line-strong **3.23:1** | 1.4.11 |

> ①~③의 Before 값이 이전 보고(4.12 / 4.68 / 4.45)보다 낮은 이유는,
> 배지 배경이 알파(10~12%)라서 **페이지 배경(`surface-alt`) 위에 얹혔을 때가 더 어둡기 때문**입니다.
> 최악 케이스로 다시 계산했습니다.

### 추가한 토큰

```
--pl-negative-solid-hover / -active     Danger 상태를 하드코딩에서 토큰으로
--pl-badge-{positive,cautionary,negative}-fg
--pl-positive-solid  #00872D            흰 텍스트 4.67:1
--pl-cautionary-solid #A86300           흰 텍스트 4.71:1
--pl-focus / --pl-focus-width / --pl-focus-offset
--pl-text-assistive                     placeholder 전용
```

`--pl-positive-solid` / `--pl-cautionary-solid`를 새로 만든 이유:
원색 `rgb(0,191,64)` / `#FF9200` 위에 흰 텍스트를 얹으면 **2.49:1 / 2.26:1**로 크게 미달합니다.
LIVE 배지나 승격 구역 표시에 solid를 쓰는 순간 깨지므로, 쓸 수 있는 짝을 미리 정의했습니다.

### 색 이외의 구분 단서

"상태를 색상만으로 구분하지 않는다"는 규칙을 지킬 수 있도록 다음을 추가했습니다.

- `.pl-badge__dot` — 배지에 도트/아이콘을 함께 넣기 위한 요소
- `.pl-badge--live` + 깜빡임 (`prefers-reduced-motion`에서 정지)
- `.pl-zone--promotion / --europe / --relegation` — 순위표 구역을 **좌측 3px 바 + 배경 + 범례 텍스트** 조합으로 표시

### 숫자 정렬

`font-variant-numeric: tabular-nums`를 `table`, `.pl-table`, `.pl-page`,
`.pl-badge-dot`, `.pl-num`에 적용했습니다. 순위표와 스코어에서 자릿수가 흔들리지 않습니다.

---

## 3. 검증 결과

Chromium 실제 렌더 후 계산된 스타일 기준 자동 측정입니다.

| 검사 | 결과 |
|---|---|
| 네트워크 실패 | **0건** (Pretendard CDN 제외 — 아래 참조) |
| 미해결 CSS 변수 | **0개** |
| 텍스트 대비 (전경/배경 합성) | **126쌍 검사 · 실패 0** |
| 컨트롤 경계 대비 (1.4.11) | **15개 검사 · 3:1 미만 0** |
| 가로 오버플로 @1440 | 없음 (`scrollWidth == innerWidth`) |
| 가로 오버플로 @390 | 없음 (`scrollWidth == innerWidth`) |

대비 계산은 조상 요소의 배경을 역순으로 합성해 실제 보이는 색으로 수행했고,
18.66px/700 이상은 3:1, 나머지는 4.5:1 기준을 적용했습니다.

---

## 4. 남은 항목

| 항목 | 상태 |
|---|---|
| **Pretendard 웹폰트** | `pitchlog-base-tokens.css`에 jsdelivr CDN `@import`를 넣었습니다. 이 컨테이너는 해당 CDN이 차단돼 **로드 검증을 못 했습니다.** 프로덕션에서는 self-host 서브셋을 권장합니다. |
| **Dark mode** | ✅ 완료 — 6장 참조. |
| **최종 브랜드 컬러** | **확정 (2026-09-03) — `#3366FF` 유지.** 현재 라이트·다크 6개 값을 그대로 씁니다. 다만 UCL 직행 구역색(`blue-500`)과 색상환 8° 차이라, 순위표 안에서는 브랜드 색을 쓰지 않는 형태 분리 규칙이 필요합니다 (`docs/PRD.md` 9-2). |
| **Wanted DS 원본 8개 값** | `line-strong`, `line-alternative`, `fill-alternative`, `text-assistive`, `interaction-disable`, `interaction-inactive`, shadow 3종은 원본 미확보. PitchLog 값으로 대체했습니다. 원본을 나중에 구하면 대조가 필요합니다. |
| **`fig-assets.css`** | 참조하는 `assets/` 34개가 없고 사용처도 0건입니다. 삭제 후보입니다. |
| **`styles.css`** | `./tokens/*` import 매니페스트이며 대상 파일이 전부 없습니다. 삭제 후보입니다. |

---

## 5. 정정 — 이전 보고에서 틀렸던 것

- **Spacing에 40px이 없다** → 틀렸습니다. CSS에는 `--pl-s-10:40px`이 있습니다.
  PDF의 스케일 다이어그램이 8단계만 그린 것이었습니다. 실제는 9단계입니다.
- **Badge primary가 `#3366FF`를 쓴다** → 틀렸습니다. `--pl-primary-strong`을 씁니다.
  (그래도 surface-alt 위에서 4.48:1로 미달이라 `-heavy`로 바꿨습니다.)

---

## 6. Dark mode 추가 (2026-09-02)

`pitchlog-theme-dark.css` 신설. **컴포넌트 CSS는 한 줄도 수정하지 않고 토큰 값만 재정의**합니다.

### 로드 순서 (고정)

```
pitchlog-base-tokens.css   ← --wds-* 라이트 값
pitchlog-foundation.css    ← --pl-* alias + 컴포넌트
pitchlog-theme-dark.css    ← 다크일 때 두 레이어를 함께 덮어씀
```

### 적용 방식

- 시스템 설정 따름 — `@media (prefers-color-scheme: dark)`
- 사용자가 고정 — `<html data-theme="dark">` / `data-theme="light"` (시스템보다 우선)

두 블록의 토큰 값은 스크립트로 생성해 동일합니다. 한쪽만 고치면 어긋납니다.

### 다크에서 뒤집히는 규칙 3가지

**1. surface 관계가 역전됩니다.**
라이트는 페이지(`#F7F7F8`)가 어둡고 카드(`#FFF`)가 밝습니다.
다크는 페이지(`#121216`)가 어둡고 카드(`#1E1E23`)가 밝습니다 — 방향은 같지만 값이 반대편입니다.

**2. hover/pressed가 밝아집니다.**
라이트: `#3366FF` → `#025FEB` → `#0054D1` (어두워짐)
다크: `#6E93FF` → `#8FACFF` → `#A0BAFF` (밝아짐)

**3. 채워진 버튼의 글자색이 어두워집니다.**
다크에서 primary를 `#6E93FF`까지 밝히지 않으면 텍스트로 읽히지 않는데(`#3366FF`는 다크 카드 위 3.67:1),
그만큼 밝히면 **흰 글자가 2.88:1로 무너집니다.**
그래서 `--pl-on-primary` / `--pl-on-negative` 토큰을 만들고 다크에서 `#0B0B0D`로 바꿉니다.
Danger도 같은 규칙입니다 — `#FF6B6B` + 어두운 글자(7.09:1).

### 이번에 토큰화한 하드코딩 값

다크 대응이 불가능했던 하드코딩을 전부 토큰으로 바꿨습니다.

| 대상 | 이전 | 이후 |
|---|---|---|
| primary·danger·pagination 버튼 글자 | `#fff` | `--pl-on-primary` / `--pl-on-negative` |
| Checkbox 체크 표시 | `#fff` | `--pl-on-primary` |
| Switch 손잡이 | `#fff` | `--pl-switch-thumb` |
| solid 배지 글자 | `#fff` | `--pl-surface` |
| Tooltip·Toast 배경/글자 | `#171717` / `#fff` | `--pl-inverse-surface` / `--pl-inverse-text` |
| Badge tint 배경 3종 | `rgba(...)` 리터럴 | `--pl-badge-*-bg` |
| Skeleton 그라디언트 | `rgba(112,115,124,...)` | `--pl-skel-a` / `--pl-skel-b` |

Select의 caret은 data URI라 `currentColor`가 먹지 않아 다크용 이미지로 교체합니다.

### 검증

라이트 / 다크(속성 고정) / 다크(시스템 설정) **3가지 모드 전부**:

| 검사 | 결과 |
|---|---|
| 텍스트 대비 | 127쌍 × 3모드 · **실패 0** |
| 컨트롤 경계 (1.4.11) | 15개 × 3모드 · **3:1 미만 0** |
| 미해결 CSS 변수 | **0개** |
| 가로 오버플로 @1440 / @390 | 없음 |

> 검증 스크립트가 처음에 다크에서 대량 실패를 냈는데, 원인은 CSS가 아니라
> `.pl-btn`의 140ms 트랜지션이 끝나기 전에 값을 읽은 것이었습니다.
> 측정 전 대기를 넣어 해결했습니다.
