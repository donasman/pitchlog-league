/**
 * 환경변수 스키마 검증 — 필수값이 없으면 부팅 실패 (BACKEND_GUIDE 환경변수 절)
 * v1 은 admin/admin1234! 기본값을 방치했다. 기본값을 두지 않는다.
 */
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, Min, MinLength, validateSync } from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

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
