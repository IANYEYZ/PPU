export const COMBAT_EVENTS = ['turn:start', 'turn:end', 'card:drawn', 'card:played', 'card:exhausted', 'card:copied', 'annotation:added', 'damage:dealt', 'damage:taken', 'block:gained', 'energy:spent', 'workflow:packed', 'workflow:item-executed', 'combat:start', 'combat:end'];
export class EventBus {
  constructor(onEvent = () => {}) { this.listeners = new Map(); this.onEvent = onEvent; }
  on(event, callback, priority = 0) { if (!this.listeners.has(event)) this.listeners.set(event, new Map()); this.listeners.get(event).set(callback, priority); return () => this.listeners.get(event)?.delete(callback); }
  emit(event, payload = {}) { this.onEvent(event, payload); for (const [fn] of [...(this.listeners.get(event) || [])].sort((a,b) => a[1]-b[1])) fn(payload); }
}
