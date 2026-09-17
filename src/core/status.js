import { statuses, powers } from '../data/statuses.js';
import { bindTriggers } from './triggers.js';
export function attackDamage(actor, amount) {
  let result = amount;
  for (const [id, stacks] of Object.entries(actor.statuses)) result += (statuses[id]?.damageAdd || 0) * stacks;
  for (const [id, stacks] of Object.entries(actor.statuses)) if (stacks > 0) result *= statuses[id]?.damageMultiplier || 1;
  return Math.max(0, Math.floor(result));
}
export function decayStatuses(actor) { for (const id of Object.keys(actor.statuses)) if (statuses[id]?.decay && --actor.statuses[id] <= 0) delete actor.statuses[id]; }
export function bindStatuses(engine) {
  engine.bus.on('attack:calculate', context => { context.result = attackDamage(context.actor, context.base); }, -100);
  engine.bus.on('turn:end', () => decayStatuses(engine.state.player), 50);
  engine.bus.on('enemy:turn-end', ({ enemyId }) => { const enemy = engine.state.enemies.find(e => e.id === enemyId); if (enemy) decayStatuses(enemy); }, 50);
}
export function bindPower(engine, powerId) {
  bindTriggers(engine,`power:${powerId}`,powers[powerId].triggers,()=>engine.state.player.powers[powerId] || 0,10);
}
export function addPower(engine, id, amount) {
  if (!powers[id]) throw new Error(`Unknown power ${id}`);
  if (!engine.state.player.powers[id]) { engine.state.player.powers[id] = 0; bindPower(engine, id); }
  engine.state.player.powers[id] += amount;
}
