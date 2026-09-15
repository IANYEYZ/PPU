import { Random } from './random.js';
import { createCard, upgradeCard } from './card.js';
import { CombatEngine } from './combat.js';
import { generateMap, availableNodes } from './map.js';
import { cardOffers, relicOffer, combatReward } from './reward.js';
import { chooseEvent } from './event.js';
import { characterClasses, characterVariants } from '../data/characters.js';
import { cards } from '../data/cards.js';
import { relics } from '../data/relics.js';
import { encounters } from '../data/enemies.js';
import { events } from '../data/events.js';
import { acts } from '../data/map-config.js';
import { extensions } from '../characters/registry.js';
export class Game {
  constructor({ variantId = 'red', seed = 'UPSTAIRS', saved } = {}) {
    this.combat = null;
    if (saved) { this.run = structuredClone(saved.run); this.rng = new Random(saved.rngState); const screen = this.run.screen; if (saved.combat) this.startCombat(saved.combat.encounter, saved.combat); this.run.screen = screen; return; }
    const variant = characterVariants.find(v => v.id === variantId); if (!variant) throw new Error('Unknown character variant');
    const character = characterClasses[variant.classId]; this.rng = new Random(seed);
    this.run = { seed: String(seed), classId: character.id, variantId, hp: character.maxHp, maxHp: character.maxHp, gold: 70, relics: [variant.relic], deck: [], nextCardId: 1, act: 0, map: generateMap(`${seed}:0`, acts[0].mapConfig), currentNode: null, visited: [], screen: 'map', nodeState: null, reward: null, battlesWon: 0, startedAt: Date.now(), debugUsed: false };
    variant.deck.forEach(id => this.addCard(id));
  }
  get character() { return characterClasses[this.run.classId]; }
  addCard(id) { if (!cards[id]) throw new Error('Unknown card'); const card = createCard(id, `run-${this.run.nextCardId++}`); this.run.deck.push(card); return card; }
  snapshot() { if (this.combat) this.run.hp = this.combat.state.player.hp; return { run: structuredClone(this.run), rngState: this.rng.state, combat: this.combat?.snapshot() || null }; }
  startCombat(encounter, saved) { this.combat = new CombatEngine({ character: this.character, cardDefinitions: cards, extension: extensions[this.character.extension], encounter, deck: this.run.deck, hp: this.run.hp, maxHp: this.run.maxHp, relics: this.run.relics, seed: `${this.run.seed}:${this.run.act}:${this.run.currentNode}`, saved }); this.run.screen = 'combat'; }
  enterNode(id, debug = false) {
    if (!debug && this.run.screen !== 'map') throw new Error('请先完成当前节点。');
    const node = this.run.map.nodes.find(n => n.id === id);
    if (!node || (!debug && !availableNodes(this.run.map, this.run.currentNode, this.run.visited).some(n => n.id === id))) throw new Error('请沿已连接的路线前进。');
    this.run.currentNode = id; if (!this.run.visited.includes(id)) this.run.visited.push(id); this.run.nodeState = { type: node.type }; this.combat = null; this.run.reward = null;
    const act = acts[this.run.act];
    if (['Combat','Elite','Boss'].includes(node.type)) { const encounterId = node.type === 'Boss' ? act.boss : node.type === 'Elite' ? act.elite : node.row === 0 ? act.encounters[0] : this.rng.pick(act.encounters); this.startCombat(encounters[encounterId]); }
    else { this.run.screen = 'node';
      if (node.type === 'Event') this.run.nodeState.eventId = this.rng.pick(Object.keys(events));
      if (node.type === 'Shop') Object.assign(this.run.nodeState, { cards: cardOffers(this.rng, this.character).map(id => ({ id, price: cards[id].rarity === 'uncommon' ? 65 : 42, sold: false })), relic: relicOffer(this.rng, this.run.relics), relicSold: false, removed: false });
      if (node.type === 'Treasure') this.run.nodeState.relic = relicOffer(this.rng, this.run.relics);
    }
  }
  finishCombat() {
    const state = this.combat?.state; if (!state?.outcome || this.run.screen !== 'combat') return;
    this.run.hp = state.player.hp;
    if (state.outcome === 'defeat') this.run.screen = 'defeat';
    else { this.run.battlesWon++; this.run.reward = combatReward(this.rng, this.character, this.run.relics, state.encounter); this.run.screen = 'reward'; }
  }
  claimReward(cardId = null) {
    const reward = this.run.reward; if (this.run.screen !== 'reward' || !reward || reward.claimed) return;
    if (cardId && !reward.cards.includes(cardId)) throw new Error('请选择奖励中的卡牌。');
    if (cardId) this.addCard(cardId); this.run.gold += reward.gold; if (reward.relic) this.run.relics.push(reward.relic); reward.claimed = true;
    const boss = this.combat?.state.encounter.boss; this.combat = null;
    if (boss) { if (this.run.act + 1 < acts.length) { this.run.act++; this.run.map = generateMap(`${this.run.seed}:${this.run.act}`, acts[this.run.act].mapConfig); this.run.currentNode = null; this.run.visited = []; this.run.screen = 'map'; } else this.run.screen = 'victory'; }
    else this.run.screen = 'map';
  }
  leaveNode() { if (this.run.screen !== 'node' || this.run.nodeState.selection) throw new Error('请先完成卡牌选择。'); this.run.screen = 'map'; }
  eventChoice(index) { chooseEvent(this, index); }
  rest() { if (this.run.nodeState.type !== 'Rest' || this.run.nodeState.resolved) return; this.run.hp = Math.min(this.run.maxHp, this.run.hp + Math.ceil(this.run.maxHp * .3)); this.run.nodeState.resolved = true; this.run.nodeState.result = '休息完毕，回复了 30% 最大生命。'; }
  selectDeckCard(id, mode) {
    const node = this.run.nodeState; if (node?.selection !== mode) throw new Error('当前没有卡牌选择。');
    const card = this.run.deck.find(c => c.id === id); if (!card) return;
    if (mode === 'upgrade') { if (card.upgrade) throw new Error('这张牌已升级。'); upgradeCard(card); }
    if (mode === 'remove') { if (this.run.deck.length <= 1) throw new Error('牌组至少保留一张牌。'); if (node.type === 'Shop') { if (this.run.gold < 50 || node.removed) throw new Error('无法删除。'); this.run.gold -= 50; node.removed = true; } this.run.deck = this.run.deck.filter(c => c.id !== id); }
    node.selection = null; if (node.type === 'Rest') node.resolved = true; node.result = mode === 'upgrade' ? '文件已修订。' : '文件已销毁。';
  }
  buy(kind, index) {
    const node = this.run.nodeState; if (this.run.screen !== 'node' || node.type !== 'Shop') return;
    if (kind === 'card') { const offer = node.cards[index]; if (!offer || offer.sold || this.run.gold < offer.price) throw new Error('无法购买。'); this.run.gold -= offer.price; offer.sold = true; this.addCard(offer.id); }
    if (kind === 'relic') { if (!node.relic || node.relicSold || this.run.gold < 95) throw new Error('无法购买。'); this.run.gold -= 95; this.run.relics.push(node.relic); node.relicSold = true; }
  }
  treasure() { const node = this.run.nodeState; if (node.type !== 'Treasure' || node.resolved) return; if (node.relic) this.run.relics.push(node.relic); this.run.gold += 25; node.resolved = true; node.result = '物品已收入档案袋。'; }
  debug(action, value) {
    this.run.debugUsed = true;
    const engine = this.combat;
    if (action === 'gold') this.run.gold += 100;
    if (action === 'heal') { this.run.hp = this.run.maxHp; if (engine) engine.state.player.hp = engine.state.player.maxHp; }
    if (action === 'card') { const c = this.addCard(value); if (engine && !engine.state.outcome) engine.state.hand.push(structuredClone(c)); }
    if (action === 'relic' && relics[value] && !this.run.relics.includes(value)) { this.run.relics.push(value); if (engine) { engine.state.relics.push(value); bindDebugRelic(engine, value); } }
    if (action === 'encounter' && encounters[value]) { this.run.reward = null; this.startCombat(encounters[value]); }
    if (action === 'node') this.enterNode(value, true);
    const card = engine?.findCard(value) || this.run.deck.find(c => c.id === value);
    if (action === 'upgrade' && card) upgradeCard(card);
    if (action === 'annotate' && card && engine) engine.effects.execute([{ type: 'annotate', modifier: { label: '测试批注', costDelta: -1, effects: [{ type: 'damage', amount: 3, target: 'enemy' }, { type: 'block', amount: 2 }], keywords: ['Retain'] } }], { cardId: card.id });
    if (action === 'copy' && card && engine) engine.effects.execute([{ type: 'copy', amount: 1 }], { cardId: card.id });
    if (action === 'workflow' && card && engine) engine.act('workflow:add', { cardId: card.id, free: true });
    if (action === 'pack' && engine) { const state = engine.state.extensions.clerk; if (state) { while (state.pending.length < 3) { const c = createCard('defend', engine.nextId()); engine.state.hand.push(c); engine.act('workflow:add', { cardId: c.id, free: true }); if (state.pending.length === 0) break; } } }
    if (action === 'energy' && engine) engine.state.energy += 10;
    if (action === 'win' && engine) { engine.state.enemies.forEach(e => { e.hp = 0; }); engine.checkOutcome(); }
  }
}
import { bindRelic as bindDebugRelic } from './relic.js';
