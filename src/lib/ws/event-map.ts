// Default map is pre-populated (same as server sends via e0).
// e0 = event-map, e1–e21 = domain events
const DEFAULT_MAP: Record<string, string> = {
  e1: 'message:new',
  e2: 'message:read',
  e3: 'message:deleted',
  e4: 'message:edited',
  e5: 'message:reaction_updated',
  e6: 'conversation:updated',
  e7: 'conversation:notify',
  e8: 'conversation:deleted',
  e9: 'conversation:mute_updated',
  e10: 'conversation:pin_updated',
  e11: 'conversation:members_added',
  e12: 'conversation:member_removed',
  e13: 'conversation:join_request',
  e14: 'conversation:join_request_resolved',
  e15: 'notification:new',
  e16: 'notification:cleared',
  e17: 'friend:update',
  e18: 'presence:update',
  e19: 'typing',
  e20: 'scheduled_message:update',
  e21: 'scheduled_message:sent',
  e22: 'user:updated',
};

let _codeToName: Record<string, string> = { ...DEFAULT_MAP };
let _nameToCode: Record<string, string> = Object.fromEntries(
  Object.entries(DEFAULT_MAP).map(([k, v]) => [v, k]),
);

export function applyEventMap(map: Record<string, string>): void {
  _codeToName = map;
  _nameToCode = Object.fromEntries(Object.entries(map).map(([k, v]) => [v, k]));
}

export function toCode(eventName: string): string {
  return _nameToCode[eventName] ?? eventName;
}

export function toName(code: string): string {
  return _codeToName[code] ?? code;
}

export function clearEventMap(): void {
  _codeToName = { ...DEFAULT_MAP };
  _nameToCode = Object.fromEntries(Object.entries(DEFAULT_MAP).map(([k, v]) => [v, k]));
}
