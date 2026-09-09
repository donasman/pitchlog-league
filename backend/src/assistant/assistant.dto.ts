/**
 * POST /api/assistant 요청·응답 DTO.
 *
 * 계약:
 *   - question: 1..500자, ValidationPipe 가 whitelist·transform 적용
 *   - answer: LLM 최종 답변 (도구 호출 후 자연어로 정리한 것)
 *   - evidence[]: 실제로 부른 도구의 wrapper 요약 (tool·args·asOf). null 은 5건 정책 상 빈 배열이 될 수도 있다.
 *   - data[]: 도구가 돌려준 원 데이터. 프론트가 evidence 옆에 렌더할 수 있게 그대로 노출.
 *   - truncated: true 면 도구 호출 상한(5회) 또는 타임아웃(30초)에 걸려 답이 완성 전 잘렸다.
 *   - model: 실제로 부른 모델 ID (환경변수 값 그대로).
 *
 * 왜 이 shape 인가:
 *   - LLM 이 숫자를 지어냈는지 확인하려면 근거가 답 옆에 있어야 한다 (환각 방지).
 *   - evidence 는 요약이고 원 데이터는 data[] 로 분리 — 프론트가 필요하면 둘 다 그대로 쓴다.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class AskAssistantRequestDto {
  @ApiProperty({
    description: '한국어·영어 아무거나 자연어 질문. 1..500 자 사이.',
    example: 'EPL 우리가 다루는 대회 다 보여줘',
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @Length(1, 500)
  question!: string;
}

export class AssistantEvidenceDto {
  @ApiProperty({ description: '부른 도구 이름', example: 'get_standings' })
  tool!: string;

  @ApiProperty({ description: '스키마 · 자동 default 적용 후 실제로 서비스에 넘어간 인자', type: 'object', additionalProperties: true })
  args!: Record<string, unknown>;

  @ApiProperty({ description: '도구가 부른 서비스가 돌려준 asOf (ISO 시각 문자열)', example: '2026-09-09T00:00:00.000Z' })
  asOf!: string;
}

export class AskAssistantResponseDto {
  @ApiProperty({ description: 'LLM 최종 자연어 답변. 도구를 못 부르면 "데이터가 없다" 문장이 된다.' })
  answer!: string;

  @ApiProperty({ description: '실제로 호출된 도구 wrapper 요약. 비면 아무 도구도 안 불렀다는 뜻.', type: [AssistantEvidenceDto] })
  evidence!: AssistantEvidenceDto[];

  @ApiProperty({ description: '각 evidence 에 대응하는 도구 원 데이터. 인덱스 맞음.', isArray: true })
  data!: unknown[];

  @ApiProperty({ description: '도구 호출 상한(5회) 또는 타임아웃(30초)에 걸려 잘렸는지', example: false })
  truncated!: boolean;

  @ApiProperty({ description: '실제로 부른 모델 ID', example: 'gemini-3.5-flash' })
  model!: string;

  @ApiProperty({
    description: 'evidence 중 가장 오래된 asOf (ISO 시각 문자열). evidence 가 비면 null.',
    example: '2026-09-09T00:00:00.000Z',
    nullable: true,
    type: String,
  })
  asOf!: string | null;
}
