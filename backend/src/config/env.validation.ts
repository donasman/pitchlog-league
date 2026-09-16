/**
 * 환경변수 스키마 검증 — 필수값이 없으면 부팅 실패 (BACKEND_GUIDE 환경변수 절)
 * v1 은 admin/admin1234! 기본값을 방치했다. 기본값을 두지 않는다.
 */
// class-transformer/class-validator 가 데코레이터 메타데이터를 읽는다.
// 앱에서는 @nestjs/core 가 불러오지만, 이 모듈만 단독으로 쓰는 단위 테스트에서는 여기서 챙겨야 한다.
import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUrl, Matches, Max, Min, MinLength, validateSync } from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  /** 환경변수는 항상 문자열이라 명시적으로 숫자 변환한다 — enableImplicitConversion 은
   *  TS 의 emitDecoratorMetadata 에 기대는데 vitest(oxc) 변환에선 보장되지 않는다 */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  /** Supabase 는 sslmode=require 가 붙는다. 프로토콜만 검사한다 */
  @IsString()
  @MinLength(1)
  DATABASE_URL!: string;

  /** 수집 기능이 켜지기 전까지는 선택. L0 착수 시 필수로 올린다 */
  @IsOptional()
  @IsString()
  @MinLength(20)
  API_FOOTBALL_KEY?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  REDIS_URL?: string;

  /** 프론트 출처 허용 목록. 쉼표 구분. 비면 CORS 를 켜지 않는다 (app.setup.ts) */
  @IsOptional()
  @IsString()
  CORS_ORIGIN?: string;

  /** `ingest -- logos` 가 로고를 쓸 위치. backend/ 기준 상대 경로 허용 */
  @IsOptional()
  @IsString()
  LOGO_OUTPUT_DIR?: string;

  /** Gemini API 키. 없으면 부팅은 성공하지만 POST /api/assistant 호출 시 503 */
  @IsOptional()
  @IsString()
  @MinLength(1)
  GEMINI_API_KEY?: string;

  /** Gemini 모델 ID. 기본값 gemini-3.5-flash */
  @IsString()
  @MinLength(1)
  GEMINI_MODEL: string = 'gemini-3.5-flash';

  /** 어시스턴트 응답에 X-Gemini-* 디버그 헤더를 실을지. 프로덕션 false 유지. E2 계측용.
   *  boolean 캐스팅 안 함 — 컨트롤러에서 `=== 'true'` 문자열 비교로 사용 (M3 결함 방지).
   *  @IsIn 으로 'true'/'false' 외 오타(예: 'flase')를 부팅 시 잡는다 — fix/debug-header-gate 09-15. */
  @IsOptional()
  @IsIn(['true', 'false'])
  @IsString()
  ASSISTANT_DEBUG_HEADERS: string = 'false';

  /** 스케줄러 마스터 스위치 (4-b-1). false 면 어떤 잡도 등록되지 않는다.
   *  ASSISTANT_DEBUG_HEADERS 와 같은 이유로 boolean 캐스팅 안 함 — 컨테이너 부팅에서 정확한 문자열 비교로 판정. */
  @IsOptional()
  @IsIn(['true', 'false'])
  @IsString()
  SCHEDULER_ENABLED: string = 'false';

  /** 백필 워커 개별 스위치. SCHEDULER_ENABLED=true 여야 효과 있음. */
  @IsOptional()
  @IsIn(['true', 'false'])
  @IsString()
  BACKFILL_WORKER_ENABLED: string = 'false';

  /** 백필 워커 cron 표현식 (5 필드 · 기본 매시 5분). 완전 유효성은 부팅 시 CronJob 생성자가 검증. */
  @IsString()
  @Matches(/^(\S+\s+){4}\S+$/, { message: 'BACKFILL_WORKER_CRON 은 5 필드 cron 표현식이어야 한다' })
  BACKFILL_WORKER_CRON: string = '5 * * * *';

  /** 백필 워커 1회 실행당 경기 수 상한 (4콜/경기 · 200 = 800콜 · DAILY_CAP 5,700 안에서 하루 여러 번 트리거). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  BACKFILL_WORKER_LIMIT: number = 200;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const detail = errors
      .map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`)
      .join('\n  ');
    throw new Error(`환경변수 검증 실패\n  ${detail}`);
  }
  return validated;
}
