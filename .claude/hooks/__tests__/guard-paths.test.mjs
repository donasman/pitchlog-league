// guard-paths.mjs 회귀 테스트 — Write · Edit · MultiEdit 직전 경로 검사.
// 규칙 근거: docs/AGENT_WORKFLOW.md 7장 · 커밋 71044e6 (12케이스로 돌려보니 거꾸로 동작한 규칙이 있었다).
// 실행: 저장소 루트에서 `node --test .claude/hooks/__tests__/*.test.mjs`
import { after, before, describe, test } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertAllowed, assertBlocked, makeRepo, removeRepo, runHook } from "./helpers.mjs";

const HOOK = fileURLToPath(new URL("../guard-paths.mjs", import.meta.url));
const TAG = "guard-paths";

let repo;

before(() => {
  repo = makeRepo({
    branch: "feature/x",
    dirs: ["frontend/src/mocks", "backend/src", "backend/prisma/migrations/20260101000000_x"],
  });
});

after(() => removeRepo(repo));

/** Write — file_path 는 레포 루트 기준 상대경로를 절대경로로 바꿔 넘긴다 (Claude Code 가 넘기는 형태) */
const write = (rel, content = "x") => runHook(HOOK, { tool_input: { file_path: path.join(repo, rel), content }, cwd: repo });
/** Edit */
const edit = (rel, new_string) => runHook(HOOK, { tool_input: { file_path: path.join(repo, rel), new_string }, cwd: repo });

const SCHEMA = "backend/prisma/schema.prisma";
const MIGRATION = "backend/prisma/migrations/20260101000000_x/migration.sql";

describe("guard-paths: frontend/src/mocks", () => {
  test("frontend/src/mocks/x.js Write → 차단", () => {
    assertBlocked(write("frontend/src/mocks/x.js"), TAG);
  });

  test("cwd=frontend/ 에서 상대경로 src/mocks/x.js → 차단 — 레포 루트 기준 (71044e6)", () => {
    const r = runHook(HOOK, {
      tool_input: { file_path: "src/mocks/x.js", content: "x" },
      cwd: path.join(repo, "frontend"),
    });
    assertBlocked(r, TAG);
  });
});

describe("guard-paths: .env 계열", () => {
  test(".env → 차단", () => {
    assertBlocked(write(".env", "A=1"), TAG);
  });

  test("backend/.env.local → 차단", () => {
    assertBlocked(write("backend/.env.local", "A=1"), TAG);
  });

  test("frontend/.env.production → 차단 (71044e6)", () => {
    assertBlocked(write("frontend/.env.production", "A=1"), TAG);
  });

  test("backend/.env.example → 통과", () => {
    assertAllowed(write("backend/.env.example", "A="));
  });
});

describe("guard-paths: 프론트 TypeScript", () => {
  test("frontend/src/a.ts → 차단", () => {
    assertBlocked(write("frontend/src/a.ts"), TAG);
  });

  test("frontend/src/a.tsx → 차단", () => {
    assertBlocked(write("frontend/src/a.tsx"), TAG);
  });

  test("frontend/src/a.jsx → 통과", () => {
    assertAllowed(write("frontend/src/a.jsx"));
  });

  test("backend/src/a.ts → 통과 — 백엔드는 TypeScript", () => {
    assertAllowed(write("backend/src/a.ts"));
  });
});

describe("guard-paths: schema.prisma relationMode", () => {
  const datasource = mode =>
    `datasource db {\n  provider     = "postgresql"\n  url          = env("DATABASE_URL")\n  relationMode = "${mode}"\n}\n`;

  test('relationMode = "foreignKeys" → 차단 (71044e6)', () => {
    assertBlocked(write(SCHEMA, datasource("foreignKeys")), TAG);
  });

  test('relationMode = "prisma" → 통과 (71044e6)', () => {
    assertAllowed(write(SCHEMA, datasource("prisma")));
  });

  test("@relation 만 있는 content → 통과 — relationMode=prisma 라 DDL 을 안 만든다 (71044e6)", () => {
    const content =
      "model Player {\n  id     Int  @id\n  teamId Int\n  team   Team @relation(fields: [teamId], references: [id])\n}\n";
    assertAllowed(edit(SCHEMA, content));
  });

  test('MultiEdit edits[].new_string 에 relationMode = "foreignKeys" → 차단 (71044e6)', () => {
    const r = runHook(HOOK, {
      tool_input: {
        file_path: path.join(repo, SCHEMA),
        edits: [{ old_string: 'relationMode = "prisma"', new_string: 'relationMode = "foreignKeys"' }],
      },
      cwd: repo,
    });
    assertBlocked(r, TAG);
  });
});

describe("guard-paths: 마이그레이션 SQL 외래키", () => {
  // REFERENCES 를 따옴표 없이 써서 FOREIGN KEY 정규식 하나만 걸리게 한다 — 두 규칙을 따로 검증한다
  test("FOREIGN KEY → 차단", () => {
    const sql =
      'ALTER TABLE "players" ADD CONSTRAINT "players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES teams ("id");\n';
    assertBlocked(write(MIGRATION, sql), TAG);
  });

  test('REFERENCES "teams" → 차단', () => {
    const sql = 'CREATE TABLE "players" (\n  "id" INTEGER PRIMARY KEY,\n  "team_id" INTEGER REFERENCES "teams"("id")\n);\n';
    assertBlocked(write(MIGRATION, sql), TAG);
  });

  test("평범한 CREATE TABLE → 통과", () => {
    const sql = 'CREATE TABLE "players" (\n  "id" INTEGER NOT NULL,\n  "team_id" INTEGER NOT NULL,\n  CONSTRAINT "players_pkey" PRIMARY KEY ("id")\n);\n';
    assertAllowed(write(MIGRATION, sql));
  });
});

describe("guard-paths: 훅이 작업을 방해하지 않는다", () => {
  test("stdin 이 JSON 이 아님 → 통과", () => {
    assertAllowed(runHook(HOOK, "not json {"));
  });

  test("file_path 없음 → 통과", () => {
    assertAllowed(runHook(HOOK, { tool_input: { content: "x" }, cwd: repo }));
  });
});
