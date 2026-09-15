import { events } from '../data/events.js';
import { relicOffer } from './reward.js';
export function chooseEvent(game, index) {
  const node = game.run.nodeState; const choice = events[node.eventId].choices[index];
  if (!choice || node.resolved) throw new Error('事件已经结束。');
  if (game.run.gold < (choice.goldCost || 0)) throw new Error('金币不足。');
  if (game.run.hp <= (choice.hpCost || 0)) throw new Error('生命不足。');
  game.run.gold -= choice.goldCost || 0; game.run.hp -= choice.hpCost || 0; node.resolved = true;
  for (const effect of choice.effects) {
    if (effect.type === 'heal') game.run.hp = Math.min(game.run.maxHp, game.run.hp + effect.amount);
    if (effect.type === 'gold') game.run.gold += effect.amount;
    if (effect.type === 'relic') { const id = relicOffer(game.rng, game.run.relics); if (id) game.run.relics.push(id); else game.run.gold += 35; }
    if (effect.type === 'upgradeChoice') node.selection = 'upgrade';
    if (effect.type === 'removeChoice') node.selection = 'remove';
  }
  node.result = choice.label;
}
