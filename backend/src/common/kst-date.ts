/**
 * KST 날짜 범위 — 경기 목록의 from/to 는 한국 날짜(포함)다. `2026-11-23` 은 KST 00:00 = UTC 전날 15:00 부터.
 * 형식은 `YYYY-MM-DD` 만 받는다. 형식 오류·역순은 400 — 빈 결과로 위장하지 않는다.
 */
import { BadRequestException } from '@nestjs/common';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

function kstMidnight(value: string, what: string): Date {
  if (!DAY.test(value)) throw new BadRequestException(`${what} 형식이 아니다: ${value} — "YYYY-MM-DD"`);
  const d = new Date(`${value}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) throw new BadRequestException(`${what} 가 유효한 날짜가 아니다: ${value}`);
  return d;
}

/** `{ gte: from 의 KST 00:00, lt: to 다음날의 KST 00:00 }` — Prisma DateTime 필터 조각 */
export function kstDayRange(from?: string, to?: string): { gte?: Date; lt?: Date } {
  const range: { gte?: Date; lt?: Date } = {};
  if (from !== undefined) range.gte = kstMidnight(from, 'from');
  if (to !== undefined) range.lt = new Date(kstMidnight(to, 'to').getTime() + DAY_MS);
  if (range.gte && range.lt && range.gte.getTime() >= range.lt.getTime()) {
    throw new BadRequestException(`from 이 to 보다 늦다: ${from} > ${to}`);
  }
  return range;
}
