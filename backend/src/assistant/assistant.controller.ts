/**
 * POST /api/assistant — 자연어 질문 → Gemini function-calling → 도구 wrapper 요약 + 답변.
 *
 * 계약:
 *   - GlobalPrefix 'api' 가 setupApp 에서 붙는다. 여기 Controller path 는 'assistant' 만.
 *   - ValidationPipe 전역 → question 검증(1..500) 실패는 400.
 *   - RateLimit 가드: IP 당 분당 10회 → 429.
 *   - 키 미설정 → 503 (GeminiService 가 던진다).
 */
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiTooManyRequestsResponse } from '@nestjs/swagger';
import { AskAssistantRequestDto, AskAssistantResponseDto } from './assistant.dto.js';
import { AssistantRateLimitGuard } from './assistant-rate-limit.guard.js';
import { GeminiService } from './gemini.service.js';

@ApiTags('assistant')
@Controller('assistant')
export class AssistantController {
  constructor(private readonly gemini: GeminiService) {}

  @Post()
  @UseGuards(AssistantRateLimitGuard)
  @ApiOperation({ summary: '자연어 질문 → 도구를 자동 호출해 답과 근거를 돌려준다' })
  @ApiOkResponse({ type: AskAssistantResponseDto })
  @ApiBadRequestResponse({ description: 'question 길이가 1..500 밖 · 필드 없음' })
  @ApiTooManyRequestsResponse({ description: 'IP 당 분당 10회 초과' })
  @ApiServiceUnavailableResponse({ description: 'GEMINI_API_KEY 미설정' })
  async ask(@Body() dto: AskAssistantRequestDto): Promise<AskAssistantResponseDto> {
    const result = await this.gemini.ask(dto.question);
    return {
      answer: result.answer,
      evidence: result.evidence,
      data: result.data,
      truncated: result.truncated,
      model: result.model,
      asOf: result.asOf,
    };
  }
}
