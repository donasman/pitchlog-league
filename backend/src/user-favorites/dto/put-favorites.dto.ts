/**
 * PUT /api/me/favorites 요청 DTO.
 *
 * 의도적으로 클래스 검증기를 최소한으로만 쓴다:
 *   - @IsArray, @IsString({each:true}) 만 → 형식이 완전히 잘못된 요청 (문자열 배열 아님) 에만 400
 *   - @ArrayMaxSize / @ArrayUnique 는 쓰지 않는다.
 *     ValidationPipe 의 기본 400 응답이 우리 { code } 계약을 깨뜨리기 때문 —
 *     상한·중복은 서비스가 { code: 'favorites_limit_exceeded' } · { code: 'favorites_duplicate' } 로 판정한다.
 */
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class PutFavoritesDto {
  @ApiProperty({
    type: [String],
    description: '즐겨찾기 팀 ref 배열. 순서 = position. 예: ["33-manchester-united", "40-liverpool"]',
    example: ['33-manchester-united', '40-liverpool'],
  })
  @IsArray()
  @IsString({ each: true })
  teamRefs!: string[];
}
