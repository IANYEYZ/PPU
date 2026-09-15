import { Random } from './random.js';
import { EventBus } from './event-bus.js';
import { DeckManager } from './deck.js';
import { EffectSystem } from './effects.js';
import { resolvedCard } from './card.js';
import { validateTargets } from './target.js';
import { bindPower, bindStatuses } from './status.js';
import { bindRelic } from './relic.js';
import { createEnemy, enemyTurn } from './enemy.js';
export class CombatEngine {
  constructor({ character, cardDefinitions, extension, encounter, deck, hp, maxHp, relics = [], seed = 'combat', saved }) {
    this.character = character; this.cardDefinitions = cardDefinitions; this.extension = extension; this.actions = new Map();
    this.rng = new Random(saved ? saved.rngState : seed);
    this.state = saved ? structuredClone(saved) : {
      encounter, turn: 0, phase: 'player', outcome: null, energy: 0,
      player: { id: 'player', hp, maxHp, block: 0, statuses: {}, powers: {} },
      enemies: encounter.enemies.map(createEnemy), draw: this.rng.shuffle(structuredClone(deck)), hand: [], discard: [], exhaust: [], powers: [], resolving: [],
      relics: [...relics], extensions: extension ? { [extension.id]: extension.createState() } : {},
      nextCardId: 1, log: [], logEnabled: true, eventSequence: 0, rngState: this.rng.state,
    };
    this.bus = new EventBus((event, payload) => {
      this.state.eventSequence++;
      if (this.state.logEnabled) { this.state.log.push({ sequence: this.state.eventSequence, turn: this.state.turn, event, ...structuredClone(payload) }); if (this.state.log.length > 1000) this.state.log.shift(); }
    });
    this.deck = new DeckManager(this); this.effects = new EffectSystem(this); bindStatuses(this);
    for (const id of this.state.relics) bindRelic(this, id);
    for (const id of Object.keys(this.state.player.powers)) bindPower(this, id);
    extension?.setup(this);
    if (!saved) { this.startTurn(); this.bus.emit('combat:start', {}); }
  }
  nextId() { return `combat-copy-${this.state.nextCardId++}`; }
  resolve(card) { return resolvedCard(card, this.cardDefinitions); }
  findCard(id) { return ['hand','draw','discard','exhaust','powers','resolving'].flatMap(z => this.state[z]).find(c => c.id === id); }
  snapshot() { this.state.rngState = this.rng.state; return structuredClone(this.state); }
  spendEnergy(amount) { if (this.state.energy < amount) throw new Error('能量不足。'); this.state.energy -= amount; this.bus.emit('energy:spent', { amount }); }
  play(cardId, targets = {}) {
    if (this.state.phase !== 'player' || this.state.outcome) throw new Error('当前不能出牌。');
    const card = this.state.hand.find(c => c.id === cardId); if (!card) throw new Error('卡牌不在手中。');
    validateTargets(this, card, targets);
    const resolved = this.resolve(card); this.spendEnergy(resolved.cost);
    this.deck.remove(cardId); this.state.resolving.push(card);
    this.effects.execute(resolved.effects, { ...targets, sourceId: card.id });
    if (this.state.resolving.some(c => c.id === cardId)) {
      if (resolved.keywords.includes('Exhaust')) this.deck.exhaust(card);
      else { this.deck.remove(card.id); this.state[resolved.type === 'Power' ? 'powers' : 'discard'].push(card); }
    }
    this.bus.emit('card:played', { cardId, definitionId: card.definitionId }); this.checkOutcome();
  }
  act(action, args) { if (this.state.outcome || this.state.phase !== 'player') throw new Error('战斗已经结束。'); const handler = this.actions.get(action); if (!handler) throw new Error('角色不支持此操作。'); handler(args); this.checkOutcome(); }
  damage(target, amount, sourceId) {
    const absorbed = Math.min(target.block, amount); target.block -= absorbed;
    const actual = Math.min(target.hp, amount - absorbed); target.hp -= actual;
    const payload = { sourceId, targetId: target.id, amount: actual, blocked: absorbed };
    this.bus.emit('damage:dealt', payload); this.bus.emit('damage:taken', payload);
    if (target.id === 'player' && target.hp <= 0) this.checkOutcome();
  }
  calculateAttack(actor, base) { const context = { actor, base, result: base }; this.bus.emit('attack:calculate', context); return Math.max(0, context.result); }
  gainBlock(target, amount) { target.block += amount; this.bus.emit('block:gained', { targetId: target.id, amount }); }
  checkOutcome() {
    if (this.state.outcome) return;
    const outcome = this.state.player.hp <= 0 ? 'defeat' : this.state.enemies.every(e => e.hp <= 0) ? 'victory' : null;
    if (outcome) { this.state.outcome = outcome; this.state.phase = 'finished'; this.bus.emit('combat:end', { outcome }); }
  }
  startTurn() {
    if (this.state.outcome) return;
    this.state.turn++; this.state.phase = 'player'; this.state.player.block = 0;
    this.state.energy = typeof this.character.energyPerTurn === 'function' ? this.character.energyPerTurn(this) : this.character.energyPerTurn;
    const draw = typeof this.character.drawPerTurn === 'function' ? this.character.drawPerTurn(this) : this.character.drawPerTurn;
    this.deck.draw(draw); this.bus.emit('turn:start', { turn: this.state.turn }); this.checkOutcome();
  }
  endTurn() {
    if (this.state.outcome || this.state.phase !== 'player') return;
    this.bus.emit('turn:end', { turn: this.state.turn }); this.deck.endTurn();
    this.state.phase = 'enemy'; for (const enemy of this.state.enemies) enemyTurn(this, enemy);
    this.checkOutcome(); if (!this.state.outcome) this.startTurn();
  }
}
