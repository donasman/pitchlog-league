# 화면 시안 이미지

Claude Design에서 내보낸 PNG를 여기에 둔다. **구현 후 대조용**이다.

## 파일 이름 규칙

```
<단계>-<화면>-<테마>-<폭>.png

예:
03-home-light-1440.png
03-home-dark-390.png
04-standings-light-1440.png
05-2-match-detail-light-1440.png
```

## ⚠ 이미지에서 색 값을 뽑지 않는다

PNG는 압축 아티팩트와 안티앨리어싱이 있어 색이 미세하게 어긋난다.
`FOUNDATION_AUDIT.md`에 기록된 대로, 이전에 이 문제로 400dpi 재렌더와
교차검증까지 해야 했다.

**색·간격·타이포 값은 Claude Design 속성 패널에서 직접 복사한다.**
이미지는 레이아웃과 배치 확인용으로만 쓴다.

## 값이 들어가는 곳

| 종류 | 파일 |
|---|---|
| 기본 색 토큰 | `../pitchlog-base-tokens.css` |
| 다크 테마 | `../pitchlog-theme-dark.css` |
| 컴포넌트 명세 | `../COMPONENT_SPEC.md` (작성 예정) |
