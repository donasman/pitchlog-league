import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, parseLocale } from './locale.js';

describe('parseLocale', () => {
  it('ko | en 은 그 값 그대로', () => {
    expect(parseLocale('ko')).toBe('ko');
    expect(parseLocale('en')).toBe('en');
  });

  it('기본은 ko', () => {
    expect(DEFAULT_LOCALE).toBe('ko');
  });

  it('undefined · null · 빈 문자열은 기본 (ko)', () => {
    expect(parseLocale(undefined)).toBe('ko');
    expect(parseLocale(null)).toBe('ko');
    expect(parseLocale('')).toBe('ko');
  });

  it('알 수 없는 값 · 대소문자 다른 값은 400 을 내지 않고 기본으로 폴백 (계약 1)', () => {
    expect(parseLocale('KO')).toBe('ko');
    expect(parseLocale('ja')).toBe('ko');
    expect(parseLocale('fr')).toBe('ko');
    expect(parseLocale('xx-YY')).toBe('ko');
  });
});
