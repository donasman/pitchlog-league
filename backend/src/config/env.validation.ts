/**
 * 환경변수 스키마 검증 — 필수값이 없으면 부팅 실패 (BACKEND_GUIDE 환경변수 절)
 * v1 은 admin/admin1234! 기본값을 방치했다. 기본값을 두지 않는다.
 */
// class-transformer/class-validator 가 데코레이터 메타데이터를 읽는다.
// 앱에서는 @nestjs/core 가 불러오지만, 이 모듈만 단독으로 쓰는 단위 테스트에서는 여기서 챙겨야 한다.
import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import {
  IsEnum, IsIn, IsInt, IsOptional, IsString, IsUrl, Matches, Max, Min, MinLength, Validate,
  ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface, validateSync,
} from 'class-validator';
import { SEASON_YEARS } from '../ingestion/l0/competitions.catalog.js';

/** BACKFILL_WORKER_SEASONS 검증 — 빈 문자열 허용 · 쉼표 구분 · SEASON_YEARS 안 · 중복·빈 항목 거부.
 *  EnvironmentVariables 클래스보다 먼저 정의해야 @Validate 데코레이터가 참조 가능. */
@ValidatorConstraint({ name: 'backfillWorkerSeasons', async: false })
export class BackfillWorkerSeasonsConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    if (value === '') return true;
    const parts = value.split(',');
    if (parts.some((p) => p.length === 0)) return false;
    const nums = parts.map((p) => Number(p));
    if (nums.some((n) => !Number.isInteger(n))) return false;
    if (nums.some((n) => !(SEASON_YEARS as readonly number[]).includes(n))) return false;
    if (new Set(nums).size !== nums.length) return false;
    return true;
  }
  defaultMessage(args: ValidationArguments): string {
    return `${args.property} 는 쉼표 구분 시즌 목록 · 각 항목이 [${SEASON_YEARS.join(', ')}] 에 있어야 하고 중복·빈 항목 금지`;
  }
}

/** BACKFILL_WORKER_SEASONS 문자열 → 시즌 정수 배열. 빈 문자열이면 빈 배열. */
export function parseBackfillWorkerSeasons(value: string): number[] {
  if (value === '') return [];
  return value.split(',').map(Number);
}

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

  /** 백필 워커가 순회할 시즌 목록 (쉼표 구분 · 앞에서부터 처리 · 빈 값 = 현재 시즌만).
   *  예: "2025,2024,2023,2022" (백필-2 나머지 4시즌). 각 항목은 SEASON_YEARS 에 있어야 한다. */
  @IsString()
  @Validate(BackfillWorkerSeasonsConstraint)
  BACKFILL_WORKER_SEASONS: string = '';

  /** 일일 자율 상한 (콜 수 · 하드 한도 7,500 미만). 워커·CLI 백필이 이걸로 자체 중단.
   *  /status 카운터 약 2분 지연 실측 · 소모 속도 약 160콜/분 → 실제 사용량은 상한보다 최대 ~320콜 많을 수 있다.
   *  기본 5700 (여유 1,480) · 백필-2 기간 운영값 6800 권장 (여유 380 · 실측 최대 ~7,120). */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(7500)
  BACKFILL_DAILY_CAP: number = 5700;
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
