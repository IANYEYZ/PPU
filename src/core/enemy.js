import { enemies } from '../data/enemies.js';
import { attackDamage } from './status.js';
export function createEnemy(id, index) { const def = enemies[id]; return { id: `enemy-${index}`, definitionId: id, hp: def.hp, maxHp: def.hp, block: 0, statuses: {}, step: 0 }; }
export function intent(enemy) { const pattern = enemies[enemy.definitionId].pattern; const move = structuredClone(pattern[enemy.step % pattern.length]); if (move.kind === 'attack') move.amount = attackDamage(enemy, move.amount); return move; }
export function enemyTurn(engine, enemy) {
  if (enemy.hp <= 0 || engine.state.outcome) return;
  enemy.block = 0;
  const action = intent(enemy);
  if (action.kind === 'attack') for (let hit = 0; hit < (action.hits || 1); hit++) { const base = enemies[enemy.definitionId].pattern[enemy.step % enemies[enemy.definitionId].pattern.length].amount; engine.damage(engine.state.player, engine.calculateAttack(enemy, base), enemy.id); if (engine.state.outcome) break; }
  if (action.kind === 'block') engine.gainBlock(enemy, action.amount);
  if (action.kind === 'debuff') engine.state.player.statuses[action.status] = (engine.state.player.statuses[action.status] || 0) + action.amount;
  engine.bus.emit('enemy:turn-end', { enemyId: enemy.id });
  if (action.kind === 'buff') enemy.statuses[action.status] = (enemy.statuses[action.status] || 0) + action.amount;
  enemy.step++;
  engine.bus.emit('enemy:acted', { enemyId: enemy.id, action: action.kind });
}
