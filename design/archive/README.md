# 은퇴한 Foundation (2026-09-03)

여기 있는 4개 파일은 **더 이상 기준이 아니다.**
현재 기준은 `../pitchlog-tokens.css` 하나다.

## 무엇이었나

Claude Design 시안 작업 이전에 만든 토큰 체계다.
`pitchlog-design.pdf`에서 스와치를 판독하고 픽셀을 샘플링해 복원한 것으로,
Wanted DS의 `--wds-*` 토큰 위에 `--pl-*` 별칭 53개를 얹는 3단 구조였다.

```
pitchlog-base-tokens.css   --wds-* 23개 정의
pitchlog-foundation.css    --pl-* 별칭 + 컴포넌트 CSS
pitchlog-theme-dark.css    다크 테마 재정의
PitchLog Web Foundation.html   위 3개를 쓰는 데모 페이지
```

네 파일이 함께 있으므로 상대 링크가 그대로 살아 있다 — 데모는 지금도 열린다.

## 왜 은퇴했나

Claude Design 시안 내보내기에서 나온 `pitchlog.css`가 더 낫다.

| | 구 (여기) | 신 (`../pitchlog-tokens.css`) |
|---|---|---|
| 출처 | PDF 재렌더 + 픽셀 샘플링 복원 | 시안이 실제로 쓰는 값 |
| 구조 | 3파일 · `--wds-*` → `--pl-*` 2단 별칭 | 1파일 · 자체 완결 |
| 분량 | 76개 토큰 | 129줄 |
| 미해결 | 원본 미확보 8개 값은 추정 | 없음 |

구 체계는 **원본을 확보할 수 없어 8개 값을 직접 정해야 했다**
(`../FOUNDATION_AUDIT.md` 4장 참조). 신 체계는 그 문제가 없다.

## 남겨둔 이유

`../FOUNDATION_AUDIT.md`가 이 파일들을 근거로 접근성 11건 수정을 기록하고 있다.
그 기록이 가리키는 대상을 지우면 감사 문서가 의미를 잃는다.

**여기 있는 파일은 수정하지 않는다.** 역사 기록이다.
