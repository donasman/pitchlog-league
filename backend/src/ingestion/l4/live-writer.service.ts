/**
 * L4 라이브 쓰기 — LiveWriterService.
 *
 * 조건부 UPDATE 1건. 역행 가드는 WHERE 절 안에서 rank 규칙을 계산해 경합 없이 판정한다 (D6-a).
 *
 * 판정 규칙 (WHERE 안 CASE 표현식):
 *   allow_write = (new_rank IS NULL AND cur_rank IS NULL)                               -- 둘 다 알 수 없음
 *              OR (new_rank > cur_rank)                                                  -- 진행 방향
 *              OR (new_rank = cur_rank AND coalesce($new_elapsed,0) >= coalesce(elapsed,0))
 *              OR (new_rank IS NULL AND cur_rank IS NOT NULL)                            -- next=SUSP/INT/LIVE → curRank 로 취급 → 같은 rank
 *              OR (new_rank IS NOT NULL AND cur_rank IS NULL)                            -- cur=SUSP/INT/LIVE → newRank 로 취급 → 같은 rank
 *   (마지막 두 개는 결국 elapsed 비교로 귀결)
 *
 * data_version 은 +1 · as_of · updated_at 은 now() 로 갱신한다.
 * winner_team_id 는 L2 매일이 정정하도록 두고 이 write 페이로드에서 제외한다 (관측자가 팀 매핑을 알기 어려움).
 *
 * 반환:
 *   { written: 1, blocked: 0 } — UPDATE 1행 (WHERE 통과)
 *   { written: 0, blocked: 1 } — UPDATE 0행 (WHERE 차단 · 또는 api_fixture_id 없음)
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { LIVE_STATUSES } from './status-rank.js';

export interface WriteInput {
  apiFixtureId: number;
  statusShort: string;
  statusLong: string | null;
  elapsed: number | null;
  extraElapsed: number | null;
  goalsHome: number | null;
  goalsAway: number | null;
  htHome: number | null;
  htAway: number | null;
  ftHome: number | null;
  ftAway: number | null;
  etHome: number | null;
  etAway: number | null;
  penHome: number | null;
  penAway: number | null;
}

export interface WriteResult {
  written: number; // 0 or 1
  blocked: number; // 0 or 1
}

/** 상태 → rank 를 계산하는 SQL CASE 조각. NULL 반환은 SUSP/INT/LIVE 및 알 수 없는 값. */
function rankCase(statusExpr: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    CASE ${statusExpr}
      WHEN 'NS' THEN 0
      WHEN 'TBD' THEN 0
      WHEN '1H' THEN 1
      WHEN 'HT' THEN 2
      WHEN '2H' THEN 3
      WHEN 'ET' THEN 4
      WHEN 'BT' THEN 5
      WHEN 'P'  THEN 6
      WHEN 'FT' THEN 7
      WHEN 'AET' THEN 7
      WHEN 'PEN' THEN 7
      WHEN 'PST' THEN 8
      WHEN 'CANC' THEN 8
      WHEN 'ABD' THEN 8
      WHEN 'AWD' THEN 8
      WHEN 'WO' THEN 8
      ELSE NULL
    END
  `;
}

@Injectable()
export class LiveWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: WriteInput): Promise<WriteResult> {
    const nextStatus = input.statusShort;
    const newRank = rankCase(Prisma.sql`${nextStatus}::text`);
    const curRank = rankCase(Prisma.sql`"status_short"`);
    const newElapsed = input.elapsed;

    // WHERE 안 rank 판정 — D6-a 규칙을 그대로 옮긴다.
    // LIVE_STATUSES 는 SUSP/INT/LIVE 등을 포함 · 이 상태는 rankCase 에서 NULL 반환.
    // (LIVE_STATUSES 는 status-rank.ts 와 값이 일치한다 · import 로 참조만 · SQL 은 CASE 로 자체 판정)
    void LIVE_STATUSES;

    const affected = await this.prisma.$executeRaw`
      UPDATE "matches"
         SET "status_short"  = ${input.statusShort},
             "status_long"   = ${input.statusLong},
             "elapsed"       = ${input.elapsed},
             "extra_elapsed" = ${input.extraElapsed},
             "goals_home"    = ${input.goalsHome},
             "goals_away"    = ${input.goalsAway},
             "ht_home"       = ${input.htHome},
             "ht_away"       = ${input.htAway},
             "ft_home"       = ${input.ftHome},
             "ft_away"       = ${input.ftAway},
             "et_home"       = ${input.etHome},
             "et_away"       = ${input.etAway},
             "pen_home"      = ${input.penHome},
             "pen_away"      = ${input.penAway},
             "data_version"  = "data_version" + 1,
             "as_of"         = now(),
             "updated_at"    = now()
       WHERE "api_fixture_id" = ${input.apiFixtureId}
         AND (
           -- 둘 다 알 수 없는 rank → 허용
           (${newRank} IS NULL AND ${curRank} IS NULL)
           -- 진행 방향
           OR (${newRank} IS NOT NULL AND ${curRank} IS NOT NULL AND ${newRank} > ${curRank})
           -- 같은 rank — elapsed 비교
           OR (${newRank} IS NOT NULL AND ${curRank} IS NOT NULL AND ${newRank} = ${curRank}
               AND coalesce(${newElapsed}::int, 0) >= coalesce("elapsed", 0))
           -- next=SUSP/INT/LIVE — curRank 로 취급 → elapsed 비교
           OR (${newRank} IS NULL AND ${curRank} IS NOT NULL
               AND coalesce(${newElapsed}::int, 0) >= coalesce("elapsed", 0))
           -- cur=SUSP/INT/LIVE — newRank 로 취급 → elapsed 비교
           OR (${newRank} IS NOT NULL AND ${curRank} IS NULL
               AND coalesce(${newElapsed}::int, 0) >= coalesce("elapsed", 0))
         )
    `;

    if (affected > 0) {
      return { written: 1, blocked: 0 };
    }
    return { written: 0, blocked: 1 };
  }
}
