import { describe, it, expect, beforeEach } from 'vitest';
import { applyEventMap, toCode, toName, clearEventMap } from './event-map';

describe('event-map', () => {
  beforeEach(() => clearEventMap());

  it('default map translates message:new → e1', () => {
    expect(toCode('message:new')).toBe('e1');
    expect(toName('e1')).toBe('message:new');
  });

  it('falls back to original when not in map', () => {
    expect(toCode('unknown:event')).toBe('unknown:event');
  });

  it('applyEventMap overrides default', () => {
    applyEventMap({ x1: 'custom:event' });
    expect(toCode('custom:event')).toBe('x1');
    expect(toCode('message:new')).toBe('message:new'); // no longer in map
  });
});
