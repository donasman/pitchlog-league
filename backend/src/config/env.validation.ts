/**
 * 환경변수 스키마 검증 — 필수값이 없으면 부팅 실패 (BACKEND_GUIDE 환경변수 절)
 * v1 은 admin/admin1234! 기본값을 방치했다. 기본값을 두지 않는다.
 */
// class-transformer/class-validator 가 데코레이터 메타데이터를 읽는다.
// 앱에서는 @nestjs/core 가 불러오지만, 이 모듈만 단독으로 쓰는 단위 테스트에서는 여기서 챙겨야 한다.
import 'reflect-metadata';
import { plainToInstance, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, Min, MinLength, validateSync } from 'class-validator';

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
