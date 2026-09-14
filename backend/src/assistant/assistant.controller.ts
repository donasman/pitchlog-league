/**
 * POST /api/assistant — 자연어 질문 → Gemini function-calling → 도구 wrapper 요약 + 답변.
 *
 * 계약:
 *   - GlobalPrefix 'api' 가 setupApp 에서 붙는다. 여기 Controller path 는 'assistant' 만.
 *   - ValidationPipe 전역 → question 검증(1..500) 실패는 400.
 *   - RateLimit 가드: IP 당 분당 10회 → 429.
 *   - 키 미설정 → 503 (GeminiService 가 던진다).
 */
import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { AskAssistantRequestDto, AskAssistantResponseDto } from './assistant.dto.js';
import { AssistantRateLimitGuard } from './assistant-rate-limit.guard.js';
import { GeminiService } from './gemini.service.js';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly gemini: GeminiService,
    private readonly config: ConfigService,
  ) {}

  /**
   * ASSISTANT_DEBUG_HEADERS=true 일 때만 X-Gemini-Requests 를 실는다.
   * env.validation.ts 는 이 값을 string 으로 유지한다 — 여기서 `=== 'true'` 로 비교한다.
   */
  private setDebugHeader(res: Response, requests: number): void {
    if (this.config.get<string>('ASSISTANT_DEBUG_HEADERS') === 'true') {
      res.setHeader('X-Gemini-Requests', String(requests));
    }
  }

  @Post()
  @UseGuards(AssistantRateLimitGuard)
  @ApiOperation({ summary: '자연어 질문 → 도구를 자동 호출해 답과 근거를 돌려준다' })
  @ApiOkResponse({ type: AskAssistantResponseDto })
  @ApiBadRequestResponse({ description: 'question 길이가 1..500 밖 · 필드 없음' })
  @ApiTooManyRequestsResponse({ description: 'IP 당 분당 10회 초과' })
  @ApiServiceUnavailableResponse({ description: 'GEMINI_API_KEY 미설정' })
  async ask(
    @Body() dto: AskAssistantRequestDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AskAssistantResponseDto> {
    // passthrough: true — 헤더 세팅 후에도 Nest 가 자기 응답 파이프라인을 계속 진행한다.
    try {
      const result = await this.gemini.ask(dto.question);
      this.setDebugHeader(res, result.geminiRequests);
      // geminiRequests 는 공개 응답 DTO 에 넣지 않는다 — 헤더로만 노출.
      return {
        answer: result.answer,
        evidence: result.evidence,
        data: result.data,
        truncated: result.truncated,
        model: result.model,
        asOf: result.asOf,
      };
    } catch (e) {
      // 에러 경로에도 헤더가 실려야 한다 — wrapSdkError 가 err.geminiRequests 를 attach 한다.
      // Nest 예외 필터가 응답 body 를 쓰기 전에 여기서 헤더를 먼저 붙인다.
      const requests = (e as { geminiRequests?: number }).geminiRequests ?? 0;
      this.setDebugHeader(res, requests);
      throw e;
    }
  }
}
