/**
 * Prisma 7 설정 — CLI(migrate·generate·studio)가 읽는다.
 * DB URL 은 여기서만 정한다. schema.prisma 에는 provider 만 남는다.
 */
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
  },
})
