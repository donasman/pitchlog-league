/**
 * GET /health — 배포 PoC 와 상시 백엔드 감시용.
 * 모든 응답에 asOf 를 넣는다 (설계검토 C-1). 여기서부터 습관을 들인다.
 */
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthResponseDto } from './health.dto.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  @ApiServiceUnavailableResponse({ description: 'DB 연결 실패' })
  async check(): Promise<HealthResponseDto> {
    const db = await this.prisma.ping();
    const body: HealthResponseDto = {
      status: db ? 'ok' : 'degraded',
      db,
      asOf: new Date().toISOString(),
    };
    if (!db) throw new ServiceUnavailableException(body);
    return body;
  }
}
