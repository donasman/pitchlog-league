#!/usr/bin/env node
/**
 * check-doc-refs.mjs — NEXT_STEPS 1장 순서표와 그것을 가리키는 참조들의 정합성 검사
 *
 * 왜: 2026-09-09 PR #37 에서 순서표를 재번호했다가 같은 파일 10곳 · 다른 파일 10곳이
 *     어긋난 채 자가체크 PASS 로 통과했다. 사람이 잡은 실패를 기계 검사로 바꾼다.
 *
 * 두 가지를 검사한다:
 *
 * (a) 재번호 가드 — NEXT_STEPS 1장 순서표에서 `| N |` · `| ~~N~~ |` 행을 파싱해
 *     번호 → 제목 키워드를 뽑고, 아래 MANIFEST 와 대조한다.
 *     번호 있는 항목을 표 끝에 추가하는 건 MANIFEST 에 한 줄 더하면 된다.
 *     중간 삽입·재번호는 MANIFEST 를 깨뜨리므로 막힌다. 그게 목적이다.
 *
 * (b) 범위 가드 — 아래 CHECKED_FILES 에서 `1장 N번` · `1장 N~M번` · `1장 N·M번` 을
 *     전부 찾아 N (M) 이 MANIFEST 에 존재하는 번호인지 확인. 없는 번호면 실패.
 *
 * 한계: **번호가 존재하는데 뜻이 다른 것은 못 잡는다** (예: 4번이 서버화 → 전환으로 바뀌어도
 *      번호 4 는 여전히 유효). 그래서 (a) 로 재번호 자체를 막는다.
 *
 * 실행: node scripts/check-doc-refs.mjs
 * 종료: 통과 exit 0, 실패 exit 1 (어느 파일:줄이 왜 틀렸는지 출력)
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * NEXT_STEPS.md 1장 순서표의 안정 인덱스.
 * 각 번호가 담아야 할 제목 키워드 (하나라도 있으면 통과).
 * 번호 있는 항목을 표 끝에 추가하려면 여기 한 줄 더하면 된다.
 */
const MANIFEST = {
  1: ['꺼내기'],
  2: ['백필-1', '백필-1 기록'],
  3: ['L3', 'L5', '경기 상세'],
  4: ['서버화'],
  5: ['전환'],
  6: ['L4', '실시간'],
  7: ['L6', '한국어', 'L1', '알림', 'AI', 'L2-b'],
  8: ['도구', 'MCP', 'assistant', '챗봇'],
  9: ['즐겨찾기'],
  10: ['LLM', '로고'],
  11: ['조회 성능', 'ETag', '캐시'],
};

/** (b) 범위 가드가 검사할 파일 목록 (레포 루트 기준) */
const CHECKED_FILES = [
  'docs/NEXT_STEPS.md',
  'CLAUDE.md',
  'backend/README.md',
  'infra/README.md',
  'docs/BACKEND_FEATURES.md',
  'docs/V2_DESIGN.md',
  'docs/SCHEMA_DESIGN.md',
  'docs/INGESTION_STRATEGY.md',
];

const NEXT_STEPS_PATH = 'docs/NEXT_STEPS.md';

// ─── (a) 재번호 가드 ────────────────────────────────────────────

/** NEXT_STEPS 1장 순서표에서 번호 있는 행만 뽑아 { number, title } 배열 반환 */
function parseNextStepsTable() {
  const src = readFileSync(resolve(REPO_ROOT, NEXT_STEPS_PATH), 'utf8');
  const lines = src.split('\n');

  // 1장(## 1.) 시작 이후 첫 번째 표를 찾는다.
  const ch1Start = lines.findIndex((l) => /^##\s+1\.\s/.test(l));
  if (ch1Start === -1) throw new Error('NEXT_STEPS: `## 1.` 절을 못 찾음');

  // 다음 `## ` 절 이전까지가 1장.
  const nextSection = lines.findIndex(
    (l, i) => i > ch1Start && /^##\s+\d+\.\s/.test(l),
  );
  const ch1End = nextSection === -1 ? lines.length : nextSection;

  const rows = [];
  for (let i = ch1Start; i < ch1End; i++) {
    const line = lines[i];
    // `| N |` 또는 `| ~~N~~ |` 형태만. `| ~~—~~ |` 처럼 번호 없는 완료 항목은 스킵.
    const m = line.match(/^\|\s*~*(\d+)~*\s*\|\s*(.+?)\s*\|/);
    if (!m) continue;
    const num = Number(m[1]);
    const title = m[2].replace(/~~/g, '').trim();
    rows.push({ number: num, title, lineNo: i + 1 });
  }
  return rows;
}

function checkManifest() {
  const problems = [];
  const rows = parseNextStepsTable();
  const seen = new Set();

  for (const row of rows) {
    seen.add(row.number);
    const keywords = MANIFEST[row.number];
    if (!keywords) {
      problems.push({
        file: NEXT_STEPS_PATH,
        line: row.lineNo,
        message: `번호 ${row.number} 이 MANIFEST 에 없음 (표에 새 번호를 추가했으면 scripts/check-doc-refs.mjs 의 MANIFEST 도 갱신)`,
      });
      continue;
    }
    const ok = keywords.some((kw) => row.title.includes(kw));
    if (!ok) {
      problems.push({
        file: NEXT_STEPS_PATH,
        line: row.lineNo,
        message: `번호 ${row.number} 의 제목 셀에 키워드 [${keywords.join(', ')}] 중 하나도 없음. 실제 제목: "${row.title.slice(0, 60)}${row.title.length > 60 ? '…' : ''}"  → 재번호 의심. MANIFEST 는 안정 인덱스다`,
      });
    }
  }

  // MANIFEST 에는 있는데 표엔 없는 번호도 문제 (표에서 지워졌거나 번호가 다른 것으로 바뀜)
  for (const num of Object.keys(MANIFEST).map(Number)) {
    if (!seen.has(num)) {
      problems.push({
        file: NEXT_STEPS_PATH,
        line: 0,
        message: `MANIFEST 에는 번호 ${num} 이 있는데 순서표에서 못 찾음 (재번호 의심)`,
      });
    }
  }

  return problems;
}

// ─── (b) 범위 가드 ────────────────────────────────────────────

/**
 * 파일에서 `1장 N번` · `1장 N~M번` · `1장 N·M번` (또는 조합) 참조를 전부 찾아
 * { file, line, raw, numbers[] } 배열 반환.
 * `1장 3~5번` → numbers=[3,4,5], `1장 1·4·7번` → numbers=[1,4,7]
 */
function findRefsIn(relPath) {
  const src = readFileSync(resolve(REPO_ROOT, relPath), 'utf8');
  const lines = src.split('\n');
  const refs = [];

  // "1장" 뒤에 공백·마크다운 강조(`*`) 를 허용하고 숫자·`~`·`·`·`,` 조합 + "번"
  // 예: "1장 4번", "1장 **4번**", "1장 3~5번", "1장 1·4·7번"
  const RE = /1장\s*\*{0,2}([0-9]+(?:\s*[~·,]\s*[0-9]+)*)번/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    while ((m = RE.exec(line)) !== null) {
      const rawGroup = m[1];
      const parts = rawGroup.split(/\s*[·,]\s*/); // "3·4·5", "1,4"
      const numbers = new Set();
      for (const p of parts) {
        const rangeMatch = p.match(/^(\d+)\s*~\s*(\d+)$/);
        if (rangeMatch) {
          const a = Number(rangeMatch[1]);
          const b = Number(rangeMatch[2]);
          const [lo, hi] = a <= b ? [a, b] : [b, a];
          for (let n = lo; n <= hi; n++) numbers.add(n);
        } else {
          const n = Number(p);
          if (Number.isFinite(n)) numbers.add(n);
        }
      }
      refs.push({
        file: relPath,
        line: i + 1,
        raw: m[0],
        numbers: [...numbers],
      });
    }
  }
  return refs;
}

function checkRefs() {
  const problems = [];
  const validNumbers = new Set(Object.keys(MANIFEST).map(Number));

  for (const relPath of CHECKED_FILES) {
    const refs = findRefsIn(relPath);
    for (const ref of refs) {
      const missing = ref.numbers.filter((n) => !validNumbers.has(n));
      if (missing.length > 0) {
        problems.push({
          file: ref.file,
          line: ref.line,
          message: `참조 "${ref.raw}" 의 번호 [${missing.join(', ')}] 이 MANIFEST 밖 (유효 번호: ${[...validNumbers].sort((a, b) => a - b).join(', ')})`,
        });
      }
    }
  }
  return problems;
}

// ─── main ────────────────────────────────────────────────────

function main() {
  const problems = [];
  try {
    problems.push(...checkManifest());
    problems.push(...checkRefs());
  } catch (err) {
    console.error(`\n[check-doc-refs] 파싱 오류: ${err.message}\n`);
    process.exit(2);
  }

  if (problems.length === 0) {
    console.log('[check-doc-refs] OK — MANIFEST 정합 · 참조 유효');
    process.exit(0);
  }

  console.error(`\n[check-doc-refs] 실패 ${problems.length}건:\n`);
  for (const p of problems) {
    const loc = p.line > 0 ? `${p.file}:${p.line}` : p.file;
    console.error(`  ${loc}`);
    console.error(`    ${p.message}\n`);
  }
  console.error(
    'MANIFEST 는 scripts/check-doc-refs.mjs 상단. 새 번호를 표 끝에 추가하려면 MANIFEST 에 한 줄 더한다.\n중간 삽입·재번호는 다른 파일 참조까지 어긋나므로 막힌다.\n',
  );
  process.exit(1);
}

main();
