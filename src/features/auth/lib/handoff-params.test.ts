import { describe, expect, it } from 'vitest';
import { parseHandoffParams } from './handoff-params';

const STATE = 'abcdefghijklmnop';
const CHALLENGE = 'A'.repeat(43);

describe('parseHandoffParams', () => {
  it('trả tham số khi client=desktop và state/code_challenge hợp lệ', () => {
    expect(parseHandoffParams({ client: 'desktop', state: STATE, code_challenge: CHALLENGE })).toEqual({
      state: STATE,
      codeChallenge: CHALLENGE,
    });
  });

  it('trả null khi không phải chế độ desktop', () => {
    expect(parseHandoffParams({ state: STATE, code_challenge: CHALLENGE })).toBeNull();
  });

  it('trả null khi state/code_challenge sai định dạng hoặc bị lặp', () => {
    expect(parseHandoffParams({ client: 'desktop', state: 'short', code_challenge: CHALLENGE })).toBeNull();
    expect(parseHandoffParams({ client: 'desktop', state: STATE, code_challenge: 'x' })).toBeNull();
    expect(parseHandoffParams({ client: 'desktop', state: [STATE, STATE], code_challenge: CHALLENGE })).toBeNull();
  });
});
