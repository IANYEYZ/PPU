export function hashSeed(text) {
  let h = 2166136261;
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}
export class Random {
  constructor(seed) { this.state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed); }
  next() { let t = this.state = (this.state + 0x6D2B79F5) >>> 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  int(min, max) { return min + Math.floor(this.next() * (max - min + 1)); }
  pick(items) { return items[this.int(0, items.length - 1)]; }
  shuffle(items) { const copy = [...items]; for (let i = copy.length - 1; i > 0; i--) { const j = this.int(0, i); [copy[i], copy[j]] = [copy[j], copy[i]]; } return copy; }
  weighted(weights) { const entries = Object.entries(weights).filter(([, w]) => w > 0); let roll = this.next() * entries.reduce((s, [, w]) => s + w, 0); for (const [key, w] of entries) { roll -= w; if (roll < 0) return key; } return entries.at(-1)?.[0]; }
}
