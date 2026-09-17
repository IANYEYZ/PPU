import { Random } from './random.js';
import { createCard, upgradeCard } from './card.js';
import { CombatEngine } from './combat.js';
import { generateMap, availableNodes } from './map.js';
import { cardOffers, relicOffer, combatReward,createRarityOdds } from './reward.js';
import { chooseEvent,pickEvent,selectEventCards } from './event.js';
import { createUnknownOdds,rollUnknownRoom } from './unknown-room.js';
import { characterClasses, characterVariants } from '../data/characters.js';
import { cards } from '../data/cards.js';
import { relics } from '../data/relics.js';
import { encounters } from '../data/enemies.js';
import { events } from '../data/events.js';
import { acts } from '../data/map-config.js';
import { extensions } from '../characters/registry.js';
export class Game {
  constructor({ variantId = 'red', seed = 'UPSTAIRS', saved } = {}) {
    this.combat = null;this.streams=new Map();
    if (saved) { this.run = structuredClone(saved.run); this.rng = new Random(saved.rngState);this.normalizeRun(); const screen = this.run.screen; if (saved.combat) this.startCombat(saved.combat.encounter, saved.combat); this.run.screen = screen; return; }
    const variant = characterVariants.find(v => v.id === variantId); if (!variant) throw new Error('Unknown character variant');
    const character = characterClasses[variant.classId]; this.rng = new Random(seed);
    this.run = { seed: String(seed), classId: character.id, variantId, hp: character.maxHp, maxHp: character.maxHp, gold: 70, relics: [variant.relic], deck: [], nextCardId: 1, act: 0, map: generateMap(`${seed}:act_1_map`, acts[0].mapConfig), currentNode: null, visited: [], screen: 'map', nodeState: null, reward: null, battlesWon: 0, startedAt: Date.now(), debugUsed: false };
    this.normalizeRun();
    variant.deck.forEach(id => this.addCard(id));
  }
  get character() { return characterClasses[this.run.classId]; }
  normalizeRun(){this.run.streamStates??={};this.run.seenEvents??=[];this.run.unknownOdds??=createUnknownOdds();this.run.rarityOdds??=createRarityOdds();this.run.nextCombatModifiers??=[];this.run.roomHistory??=[];this.run.actHistory??=[];}
  stream(name){if(!this.streams.has(name))this.streams.set(name,new Random(this.run.streamStates[name]??`${this.run.seed}:${name}`));return this.streams.get(name);}
  addCard(id) { if (!cards[id]) throw new Error('Unknown card'); const card = createCard(id, `run-${this.run.nextCardId++}`); this.run.deck.push(card); return card; }
  snapshot() { if (this.combat) this.run.hp = this.combat.state.player.hp;for(const [name,rng] of this.streams)this.run.streamStates[name]=rng.state; return { run: structuredClone(this.run), rngState: this.rng.state, combat: this.combat?.snapshot() || null }; }
  startCombat(encounter, saved) { const modifiers=saved?[]:this.run.nextCombatModifiers;this.combat = new CombatEngine({ character: this.character, cardDefinitions: cards, extension: extensions[this.character.extension], encounter, deck: this.run.deck, hp: this.run.hp, maxHp: this.run.maxHp, relics: this.run.relics, seed: `${this.run.seed}:${this.run.act}:${this.run.currentNode}`, saved,modifiers });if(!saved)this.run.nextCombatModifiers=[]; this.run.screen = 'combat'; }
  enterNode(id, debug = false) {
    if (!debug && this.run.screen !== 'map') throw new Error('请先完成当前节点。');
    const node = this.run.map.nodes.find(n => n.id === id);
    if (!node || (!debug && !availableNodes(this.run.map, this.run.currentNode, this.run.visited).some(n => n.id === id))) throw new Error('请沿已连接的路线前进。');
    let type=node.type;
    if(type==='Unknown'){
      const last=this.run.roomHistory.at(-1),blacklist=[];
      if((last?.act===this.run.act&&last.type==='Shop')||(node.next.length&&node.next.every(id=>this.run.map.nodes.find(n=>n.id===id).type==='Shop')))blacklist.push('Shop');
      type=rollUnknownRoom(this.stream('unknownRooms'),this.run.unknownOdds,blacklist);
    }
    this.run.currentNode = id; if (!this.run.visited.includes(id)) this.run.visited.push(id); this.run.nodeState = { type,mapType:node.type }; this.combat = null; this.run.reward = null;
    this.run.roomHistory.push({act:this.run.act,nodeId:id,mapType:node.type,type});
    const act = acts[this.run.act];
    if (['Combat','Elite','Boss'].includes(type)) { const encounterId = type === 'Boss' ? act.boss : type === 'Elite' ? act.elite : node.row === 0 ? act.encounters[0] : this.stream('encounters').pick(act.encounters); this.startCombat(encounters[encounterId]); }
    else { this.run.screen = 'node';
      if (type === 'Event'){this.run.nodeState.eventId=pickEvent(this,act.eventPool);if(!this.run.nodeState.eventId)Object.assign(this.run.nodeState,{resolved:true,result:'这里没有新的事情。继续上楼吧。'});}
      if (type === 'Shop') Object.assign(this.run.nodeState, { cards: cardOffers(this.stream('shops'), this.character,3,{context:'Shop'}).map(id => ({ id, price: ({common:42,uncommon:65,rare:95}[cards[id].rarity] || 42), sold: false })), relic: relicOffer(this.stream('shops'), this.run.relics), relicSold: false, removed: false });
      if (type === 'Treasure') this.run.nodeState.relic = relicOffer(this.stream('treasure'), this.run.relics);
    }
  }
  finishCombat() {
    const state = this.combat?.state; if (!state?.outcome || this.run.screen !== 'combat') return;
    this.run.hp = state.player.hp;
    if (state.outcome === 'defeat') this.run.screen = 'defeat';
    else { this.run.battlesWon++; this.run.reward = combatReward(this.stream('rewards'), this.character, this.run.relics, state.encounter,this.run.rarityOdds); this.run.screen = 'reward'; }
  }
  claimReward(cardId = null) {
    const reward = this.run.reward; if (this.run.screen !== 'reward' || !reward || reward.claimed) return;
    if (cardId && !reward.cards.includes(cardId)) throw new Error('请选择奖励中的卡牌。');
    if (cardId) this.addCard(cardId); this.run.gold += reward.gold; if (reward.relic) this.run.relics.push(reward.relic); reward.claimed = true;
    const boss = this.combat?.state.encounter.boss; this.combat = null;
    if (boss) {this.run.actHistory.push({act:this.run.act,visited:[...this.run.visited],map:structuredClone(this.run.map)}); if (this.run.act + 1 < acts.length) { this.run.act++; this.run.map = generateMap(`${this.run.seed}:act_${this.run.act+1}_map`, acts[this.run.act].mapConfig); this.run.currentNode = null; this.run.visited = [];this.run.nodeState=null;this.run.unknownOdds=createUnknownOdds();this.run.hp=this.run.maxHp; this.run.screen = 'map'; } else this.run.screen = 'victory'; }
    else this.run.screen = 'map';
  }
  leaveNode() { if (this.run.screen !== 'node' || this.run.nodeState.selection || this.run.nodeState.eventSelection || (this.run.nodeState.type==='Event'&&!this.run.nodeState.resolved)) throw new Error('请先完成当前事件或卡牌选择。'); this.run.screen = 'map'; }
  eventChoice(index) { chooseEvent(this, index); }
  selectEventCards(ids){selectEventCards(this,ids);}
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
    if (action === 'pack' && engine) { const state = engine.state.extensions.clerk; if (state) { while (state.pending.length < 3) { const c = createCard('clerk_002', engine.nextId()); engine.state.hand.push(c); engine.act('workflow:add', { cardId: c.id, free: true }); if (state.pending.length === 0) break; } } }
    if (action === 'energy' && engine) engine.state.energy += 10;
    if (action === 'win' && engine) { engine.state.enemies.forEach(e => { e.hp = 0; });engine.state.frames=[];engine.state.choice=null; engine.checkOutcome(); }
  }
}
import { bindRelic as bindDebugRelic } from './relic.js';
