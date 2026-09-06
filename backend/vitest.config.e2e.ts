import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // e2e 파일들이 같은 DB 를 쓴다 — 동시에 돌리지 않는다
    fileParallelism: false,
  },
});
