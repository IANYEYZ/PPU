export const SAVE_KEY = 'please-upstairs-v1';
export function encodeSave(game) { return JSON.stringify({ version: 1, savedAt: new Date().toISOString(), state: game.snapshot() }); }
export function decodeSave(text) {
  const payload = JSON.parse(text);
  if (payload.version !== 1 || !payload.state?.run?.deck || !payload.state.run.map?.nodes || !Number.isInteger(payload.state.rngState)) throw new Error('存档格式不兼容或已损坏。');
  return payload.state;
}
export function persist(game, storage = globalThis.localStorage) { storage.setItem(SAVE_KEY, encodeSave(game)); }
export function loadSaved(storage = globalThis.localStorage) { const text = storage.getItem(SAVE_KEY); return text ? decodeSave(text) : null; }
