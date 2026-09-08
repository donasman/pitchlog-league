// PreToolUse 훅 — Bash 직전에 명령을 검사한다.
// 막는 것: dev · main 직접 커밋·push, Bash 로 우회하는 파일 쓰기.
// 종료 코드 2 = 차단. stderr 가 에이전트에게 이유로 전달된다.
//
// 2026-09-08 실측으로 고친 것 넷:
//   ① `fix/dev-tools` 같은 브랜치 이름이 \bdev\b 에 걸렸다 → 토큰 단위로 본다
//   ② `git checkout dev && git commit` 이 통과했다 → 세그먼트로 쪼개 checkout 을 따라간다
//   ③ mocks 를 읽어 스크래치로 리다이렉션하는 것이 막혔다 → 리다이렉션 대상만 본다
//   ④ python -c · node -e · heredoc 으로 쓰면 통째로 통과했다 → 인라인 인터프리터 쓰기를 막는다
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

let input = {};
try {
  input = JSON.parse(readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const cmd = String(input?.tool_input?.command ?? "");
if (!cmd) process.exit(0);
const cwd = input?.cwd ?? process.cwd();

function block(msg) {
  process.stderr.write(`[guard-git] 차단\n${msg}\n`);
  process.exit(2);
}

function currentBranch() {
  const r = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
}

const PROTECTED_BRANCH = /^(dev|main)$/;
/** `a && b ; c | d` 를 하나씩 본다 — 한 줄에 여러 명령을 붙여 우회하는 것은 막는다 */
const segments = cmd.split(/(?:&&|\|\||[;|\n])/).map(s => s.trim()).filter(Boolean);
const tokens = s => s.split(/\s+/).filter(Boolean);

// ── 1. dev · main 에서 직접 커밋 ────────────────────────────────
// 같은 명령 안에서 checkout · switch 로 옮겨간 브랜치도 따라간다.
let branch = currentBranch();
for (const seg of segments) {
  const t = tokens(seg);
  if (t[0] === "git" && (t[1] === "checkout" || t[1] === "switch")) {
    // `-b new` 는 새 브랜치, 그 외 마지막 비옵션 토큰이 대상
    const args = t.slice(2).filter(a => !a.startsWith("-"));
    if (args.length) branch = args[args.length - 1];
  }
  if (t[0] === "git" && t[1] === "commit" && PROTECTED_BRANCH.test(branch)) {
    block(`현재 브랜치가 ${branch} 다. dev · main 은 직접 커밋 금지 — feature/ · fix/ · chore/ 브랜치를 먼저 만든다.`);
  }
}

// ── 2. dev · main 으로 직접 push ────────────────────────────────
// 토큰이 정확히 dev·main 이거나 refspec 의 목적지가 그것일 때만. 브랜치 이름에 든 dev 는 안 건드린다.
for (const seg of segments) {
  const t = tokens(seg);
  if (t[0] !== "git" || t[1] !== "push") continue;
  if (t.includes("--delete") || t.includes("-d")) continue; // 원격 브랜치 정리는 허용

  const args = t.slice(2).filter(a => !a.startsWith("-"));
  const dest = args.map(a => (a.includes(":") ? a.split(":").pop() : a));
  const hit = dest.find(d => PROTECTED_BRANCH.test(d.replace(/^refs\/heads\//, "")));
  if (hit) block(`${hit} 으로 직접 push 하지 않는다. feature 브랜치를 push 하고 PR 을 낸다.`);

  // 인자 없는 `git push` 는 현재 브랜치를 업스트림으로 민다
  if (args.length === 0 && PROTECTED_BRANCH.test(branch)) {
    block(`현재 브랜치가 ${branch} 다. 인자 없는 git push 는 그대로 ${branch} 으로 간다.`);
  }
}

// ── 3. 보호 경로에 Bash 로 쓰기 ─────────────────────────────────
const PROTECTED_PATH = /(^|[\s'"=(])(\.\/)?(frontend\/src\/mocks\/|[\w./-]*\.env(\.(?!example)[\w.]+)?(?=$|[\s'")]))/;

/** 리다이렉션 **대상**만 본다 — mocks 를 읽어 다른 곳으로 보내는 것은 막지 않는다 */
function redirectTargets(seg) {
  return [...seg.matchAll(/>>?\s*(\S+)/g)].map(m => m[1]);
}

for (const seg of segments) {
  const t = tokens(seg);
  const targets = redirectTargets(seg);
  if (targets.some(x => PROTECTED_PATH.test(` ${x}`))) {
    block("src/mocks 와 .env 로 리다이렉션하지 않는다. 읽어서 다른 곳으로 보내는 것은 괜찮다.");
  }
  if (/\bsed\s+-i\b|\btruncate\b|\bdd\b|\bpatch\b|\bgit\s+apply\b/.test(seg) && PROTECTED_PATH.test(seg)) {
    block("src/mocks 와 .env 는 제자리 수정 금지다. 읽기(cat · grep · head)만 한다.");
  }
  if (/\btee\b/.test(seg) && PROTECTED_PATH.test(seg)) {
    block("src/mocks 와 .env 에 tee 로 쓰지 않는다.");
  }
  // cp · mv 는 목적지만, rm 은 대상 전부
  if ((t[0] === "cp" || t[0] === "mv") && PROTECTED_PATH.test(` ${t[t.length - 1]}`)) {
    block("src/mocks 와 .env 를 덮어쓰지 않는다.");
  }
  if (t[0] === "rm" && PROTECTED_PATH.test(seg)) {
    block("src/mocks 와 .env 를 지우지 않는다.");
  }
}

// ── 4. 인라인 인터프리터로 파일 쓰기 ────────────────────────────
// `tools:` 에서 Edit·Write 를 뺀 에이전트(verifier·explorer)도 Bash 는 갖고 있다.
// python -c · node -e · heredoc 으로 쓰면 3번 규칙을 통째로 지나간다 (2026-09-08 실측).
// **읽고 계산만 하는 스크립트는 막지 않는다** — 쓰기 호출이 보일 때만 막는다.
const INLINE_INTERPRETER = /\b(python3?|node|perl|ruby|php)\b[^\n]*?(\s-[ce]\b|<<-?\s*['"]?\w+)/;
const INLINE_WRITE = /open\s*\([^)]*['"][wax]\+?['"]|writeFileSync|appendFileSync|createWriteStream|\.write_text\s*\(|Path\s*\([^)]*\)\s*\.\s*write|shutil\.(copy|move)|os\.(remove|rename|replace)|fs\.(rm|unlink|rename|cp|copyFile)/;
if (INLINE_INTERPRETER.test(cmd) && INLINE_WRITE.test(cmd)) {
  block(
    "Bash 안의 인라인 스크립트(python -c · node -e · heredoc)로 파일을 쓰지 않는다.\n" +
      "파일 수정은 Edit · Write 도구로 한다 — 그래야 guard-paths 가 경로를 검사하고, 도구가 없는 에이전트는 쓰지 못한다.\n" +
      "읽고 계산만 하는 인라인 스크립트는 그대로 써도 된다."
  );
}

process.exit(0);
