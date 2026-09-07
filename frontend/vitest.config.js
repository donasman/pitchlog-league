/**
 * Vitest — vite.config.js 를 그대로 물려받는다 (`@` alias · import.meta.env).
 * 순수 함수(utils/services)만 돌리므로 jsdom 없이 node 환경이다.
 */
import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.js'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'node',
      include: ['src/**/*.test.js'],
    },
  }),
)
