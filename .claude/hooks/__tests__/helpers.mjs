// 훅 회귀 테스트 공용 도구 — 임시 git 저장소를 만들고 훅에 payload 를 먹여 종료 코드를 본다.
// 외부 패키지 없이 node 내장 모듈만 쓴다 (CI frontend-verify 잡에서 npm ci 와 무관하게 돈다).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * GIT_ 로 시작하는 환경변수를 전부 뺀 env. git 훅 안처럼 GIT_DIR · GIT_WORK_TREE · GIT_INDEX_FILE 이
 * 설정된 채 테스트를 돌리면, 임시 저장소가 아니라 그 변수가 가리키는 저장소에서 init · commit · checkout 이
 * 일어나고 훅도 그 저장소의 브랜치를 읽는다 (검증 단계에서 재현: 대상 저장소의 dev · main 이 재설정됐다).
 */
const CLEAN_ENV = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")));

/** 임시 저장소 안에서 git 을 부른다. 실패하면 테스트 준비 실패로 던진다 */
export function git(cwd, args) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", env: CLEAN_ENV });
  if (r.status !== 0) {
    throw new Error(`git ${args.join(" ")} 실패 (status=${r.status}): ${r.stderr || r.error}`);
  }
  return r.stdout.trim();
}

/**
 * os.tmpdir() 아래 임시 git 저장소. 커밋 하나를 만들어 둔다 — 커밋이 없으면
 * `git rev-parse --abbrev-ref HEAD` 가 실패해 guard-git 이 브랜치를 "" 로 본다.
 * realpath 로 푼다 — macOS 의 /var → /private/var 처럼 tmpdir 이 심볼릭 링크면
 * `git rev-parse --show-toplevel` 과 path.resolve 결과가 어긋나 guard-paths 규칙이 빗나간다.
 * CI 러너의 git 에는 user 설정이 없을 수 있어 commit 에 -c 로 넘긴다.
 * 준비 중에 실패하면(git 이 없거나 commit 이 거부되면) 만든 임시 폴더를 지우고 다시 던진다 — 폴더가 남지 않게.
 */
export function makeRepo({ branch, dirs = [] } = {}) {
  const dir = realpathSync.native(mkdtempSync(path.join(os.tmpdir(), "pitchlog-hook-")));
  try {
    git(dir, ["init", "-q"]);
    git(dir, [
      "-c", "user.email=t@t",
      "-c", "user.name=t",
      "-c", "commit.gpgsign=false",
      "commit", "-q", "--allow-empty", "-m", "init",
    ]);
    if (branch) {
      // -B: init 기본 브랜치가 이미 main 이어도 실패하지 않는다
      git(dir, ["checkout", "-q", "-B", branch]);
      // 준비가 틀어졌는데 "통과" 케이스가 우연히 맞는 일을 막는다
      assert.equal(git(dir, ["rev-parse", "--abbrev-ref", "HEAD"]), branch);
    }
    for (const d of dirs) mkdirSync(path.join(dir, d), { recursive: true });
  } catch (err) {
    removeRepo(dir);
    throw err;
  }
  return dir;
}

export function removeRepo(dir) {
  if (dir) rmSync(dir, { recursive: true, force: true });
}

/** payload 가 문자열이면 그대로(깨진 JSON 케이스), 객체면 JSON 으로 stdin 에 넣는다 */
export function runHook(hookPath, payload) {
  const input = typeof payload === "string" ? payload : JSON.stringify(payload);
  return spawnSync(process.execPath, [hookPath], { input, encoding: "utf8", env: CLEAN_ENV });
}

/** 종료 코드 2 + stderr 에 `[<tag>] 차단` */
export function assertBlocked(r, tag) {
  assert.equal(r.status, 2, `차단(2)이어야 하는데 status=${r.status}\nstderr: ${r.stderr}`);
  assert.ok(
    r.stderr.includes(`[${tag}] 차단`),
    `stderr 에 "[${tag}] 차단" 이 없다\nstderr: ${r.stderr}`
  );
}

/** 종료 코드 0 */
export function assertAllowed(r) {
  assert.equal(r.status, 0, `통과(0)이어야 하는데 status=${r.status}\nstderr: ${r.stderr}`);
}
