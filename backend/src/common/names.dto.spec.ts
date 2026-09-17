import { describe, expect, it } from 'vitest';
import { names } from './names.dto.js';

describe('names() — 이름 3종 조립', () => {
  it('override 없음 → 종전 동작 (원본)', () => {
    const r = names('Manchester United', 'Man Utd');
    expect(r.displayName).toBe('Manchester United');
    expect(r.shortDisplayName).toBe('Man Utd');
    expect(r.originalName).toBe('Manchester United');
  });

  it('override.name 있음 → displayName 은 override, originalName 은 그대로 원본 (계약 2)', () => {
    const r = names('Manchester United', 'Man Utd', { name: '맨체스터 유나이티드' });
    expect(r.displayName).toBe('맨체스터 유나이티드');
    expect(r.shortDisplayName).toBe('Man Utd'); // 로컬 short 없음 → 원본 short 유지
    expect(r.originalName).toBe('Manchester United');
  });

  it('override.name + override.shortName 있음', () => {
    const r = names('Manchester United', 'Man Utd', { name: '맨체스터 유나이티드', shortName: '맨유' });
    expect(r.displayName).toBe('맨체스터 유나이티드');
    expect(r.shortDisplayName).toBe('맨유');
    expect(r.originalName).toBe('Manchester United');
  });

  it('override.name 만 · 로컬 short null · 원본 short 없음 → shortDisplayName = 로컬 name', () => {
    const r = names('Real Madrid', null, { name: '레알 마드리드' });
    expect(r.displayName).toBe('레알 마드리드');
    expect(r.shortDisplayName).toBe('레알 마드리드');
    expect(r.originalName).toBe('Real Madrid');
  });

  it('override.shortName 만 → displayName 원본 · shortDisplayName 로컬', () => {
    const r = names('Manchester United', 'Man Utd', { shortName: '맨유' });
    expect(r.displayName).toBe('Manchester United');
    expect(r.shortDisplayName).toBe('맨유');
    expect(r.originalName).toBe('Manchester United');
  });

  it('short trim · 빈 문자열은 폴백', () => {
    const r = names('Team', '   ');
    expect(r.shortDisplayName).toBe('Team');
  });
});
