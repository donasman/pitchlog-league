import { BadRequestException } from '@nestjs/common';
import { kstDayRange } from './kst-date.js';

describe('kstDayRange', () => {
  it('from 은 KST 00:00 = UTC 전날 15:00', () => {
    expect(kstDayRange('2026-11-23').gte?.toISOString()).toBe('2026-11-22T15:00:00.000Z');
    expect(kstDayRange('2026-11-23').lt).toBeUndefined();
  });

  it('to 는 그 날을 포함한다 — 다음날 KST 00:00 미만', () => {
    expect(kstDayRange(undefined, '2026-11-23').lt?.toISOString()).toBe('2026-11-23T15:00:00.000Z');
    expect(kstDayRange(undefined, '2026-11-23').gte).toBeUndefined();
  });

  it('둘 다 없으면 빈 객체, 같은 날은 하루 범위', () => {
    expect(kstDayRange()).toEqual({});
    const r = kstDayRange('2026-11-23', '2026-11-23');
    expect(r.gte?.toISOString()).toBe('2026-11-22T15:00:00.000Z');
    expect(r.lt?.toISOString()).toBe('2026-11-23T15:00:00.000Z');
  });

  it('from > to 는 400', () => {
    expect(() => kstDayRange('2026-11-24', '2026-11-23')).toThrow(BadRequestException);
    expect(() => kstDayRange('2026-11-24', '2026-11-23')).toThrow(/from 이 to 보다 늦다/);
  });

  it('YYYY-MM-DD 가 아니면 400 — 자릿수 · 존재하지 않는 날짜', () => {
    expect(() => kstDayRange('2026-1-1')).toThrow(BadRequestException);
    expect(() => kstDayRange(undefined, '20261123')).toThrow(BadRequestException);
    expect(() => kstDayRange('2026-13-45')).toThrow(BadRequestException);
  });
});
