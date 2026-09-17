export function targetingFor(card) {
  if(card.keywords?.includes('AutoWorkflow'))return {card:false,enemy:false};
  const cardTarget = card.target === 'card' || card.effects.some(e => e.target === 'card' || ((e.type === 'annotate' || e.type === 'copy') && !e.source));
  const enemyTarget = card.target === 'enemy' || card.effects.some(e => e.target === 'enemy');
  return { card: cardTarget, enemy: enemyTarget };
}
export function validateTargets(engine, source, targets = {}) {
  const needs = targetingFor(engine.resolve(source));
  if (needs.enemy && !engine.state.enemies.some(e => e.id === targets.enemyId && e.hp > 0)) throw new Error('请选择一个存活的敌人。');
  if (needs.card && !engine.state.hand.some(c => c.id === targets.cardId && c.id !== source.id)) throw new Error('请选择另一张手牌。');
}
export function effectEnemies(engine, effect, context) {
  const alive = engine.state.enemies.filter(e => e.hp > 0);
  if (effect.target === 'allEnemies') return alive;
  if (effect.target === 'randomEnemy') return [engine.rng.pick(alive)].filter(Boolean);
  const selected = alive.find(e => e.id === context.enemyId);
  // A normal targeted card keeps its selected target across all effects.
  // Automatic workflow actions may retarget when an earlier effect killed it.
  return [selected || ((!context.enemyId || context.fromWorkflow) ? alive[0] : null)].filter(Boolean);
}
