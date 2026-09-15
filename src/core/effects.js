import { effectEnemies } from './target.js';
import { addPower } from './status.js';
export class EffectSystem {
  constructor(engine) {
    this.engine = engine; this.handlers = new Map();
    this.register('damage', (effect, context) => { for (const enemy of effectEnemies(engine, effect, context)) engine.damage(enemy, engine.calculateAttack(engine.state.player, effect.amount), 'player'); });
    this.register('block', effect => engine.gainBlock(engine.state.player, effect.amount));
    this.register('draw', effect => engine.deck.draw(effect.amount));
    this.register('energy', effect => { engine.state.energy += effect.amount; });
    this.register('heal', effect => { engine.state.player.hp = Math.min(engine.state.player.maxHp, engine.state.player.hp + effect.amount); });
    this.register('status', (effect, context) => { const targets = effect.target === 'enemy' || effect.target === 'allEnemies' ? effectEnemies(engine, effect, context) : [engine.state.player]; for (const target of targets) target.statuses[effect.status] = (target.statuses[effect.status] || 0) + effect.amount; });
    this.register('power', effect => addPower(engine, effect.power, effect.amount));
    this.register('exhaust', (effect, context) => { const card = engine.findCard(effect.target === 'self' ? context.sourceId : context.cardId); if (card) engine.deck.exhaust(card); });
    this.register('move', effect => engine.deck.move(effect.from, effect.to, effect.amount));
  }
  register(type, handler) { this.handlers.set(type, handler); }
  execute(effects, context = {}) {
    for (const effect of effects) {
      if (this.engine.state.outcome === 'defeat') break;
      const handler = this.handlers.get(effect.type); if (!handler) throw new Error(`Unregistered effect: ${effect.type}`);
      handler(effect, context);
    }
  }
}
