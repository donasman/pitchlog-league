import { knownApiPlayerId } from './api-player-id.js';

describe('knownApiPlayerId', () => {
  it.each([
    [343027, 343027],
    [1, 1],
    [0, null],
    [null, null],
    [undefined, null],
    [-1, null],
    [1.5, null],
    [NaN, null],
    [Infinity, null],
    ['153' as unknown as number, null],
  ])('%s → %s', (input, expected) => {
    expect(knownApiPlayerId(input)).toBe(expected);
  });
});
