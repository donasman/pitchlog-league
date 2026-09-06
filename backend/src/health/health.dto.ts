import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] })
  status!: 'ok' | 'degraded';

  @ApiProperty({ description: 'PostgreSQL 연결 여부' })
  db!: boolean;

  @ApiProperty({ description: '데이터 기준 시각 (ISO 8601). 모든 응답 공통', example: '2026-09-06T12:00:00.000Z' })
  asOf!: string;
}
