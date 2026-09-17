import { Random } from './random.js';
import { EventBus } from './event-bus.js';
import { DeckManager } from './deck.js';
import { EffectSystem } from './effects.js';
import { resolvedCard } from './card.js';
import { validateTargets } from './target.js';
import { bindPower, bindStatuses } from './status.js';
import { bindRelic } from './relic.js';
import { createEnemy, enemyTurn } from './enemy.js';
import { powers, statuses } from '../data/statuses.js';
export class CombatEngine {
  constructor({ character, cardDefinitions, extension, encounter, deck, hp, maxHp, relics = [], seed = 'combat', saved,modifiers=[] }) {
    this.character = character; this.cardDefinitions = cardDefinitions; this.extension = extension; this.actions = new Map();
    this.rng = new Random(saved ? saved.rngState : seed);
    this.state = saved ? structuredClone(saved) : {
      encounter, turn: 0, phase: 'player', outcome: null, energy: 0,
      player: { id: 'player', hp, maxHp, block: 0, statuses: {}, powers: {} },
      enemies: encounter.enemies.map(createEnemy), draw: this.rng.shuffle(structuredClone(deck)), hand: [], discard: [], exhaust: [], powers: [], resolving: [],
      relics: [...relics], extensions: extension ? { [extension.id]: extension.createState() } : {},
      nextCardId: 1, log: [], logEnabled: true, eventSequence: 0, rngState: this.rng.state,
    };
    this.state.frames ??= []; this.state.choice ??= null;
    this.state.openingModifiers??=structuredClone(modifiers);
    this.state.metrics ??= { drawn:0, played:0, exhausted:0, names:{} };
    this.state.triggerUsage ??= {}; this.state.retainedIds ??= [];
    this.state.permanentDeckSize ??= deck?.length || 0;
    this.state.lastPlayed ??= null; this.state.drawLocked ??= false;
    this.bus = new EventBus((event, payload) => {
      this.state.eventSequence++;
      if (this.state.logEnabled) { this.state.log.push({ sequence: this.state.eventSequence, turn: this.state.turn, event, ...structuredClone(payload) }); if (this.state.log.length > 1000) this.state.log.shift(); }
    });
    this.deck = new DeckManager(this); this.effects = new EffectSystem(this); bindStatuses(this);
    this.bus.on('card:drawn', payload => { payload.drawn=++this.state.metrics.drawn; },-200);
    this.bus.on('card:played', payload => { payload.played=++this.state.metrics.played;payload.sameNameCount=this.state.metrics.names[payload.definitionId]=(this.state.metrics.names[payload.definitionId] || 0)+1; },-200);
    this.bus.on('card:exhausted', payload => { payload.exhausted=++this.state.metrics.exhausted; },-200);
    this.registerLifecycle();
    for (const id of this.state.relics) bindRelic(this, id);
    for (const id of Object.keys(this.state.player.powers)) bindPower(this, id);
    extension?.setup(this);
    if (!saved) this.effects.execute([{type:'@start-turn'},{type:'@emit',event:'combat:start'}]);
  }
  nextId() { return `combat-copy-${this.state.nextCardId++}`; }
  resolve(card) { const result=resolvedCard(card,this.cardDefinitions);if(this.state.nextCardModifier && this.state.hand.some(c=>c.id===card.id))result.cost=0;return result; }
  allCards() {return [...['hand','draw','discard','exhaust','powers','resolving'].flatMap(z=>this.state[z]),...(this.extension?.getCards?.(this) || [])];}
  findCard(id) { return this.allCards().find(c=>c.id===id); }
  rule(name) { return Object.entries(this.state.player.powers).reduce((total,[id,stacks])=>total+(powers[id]?.rules?.[name] || 0)*stacks,0); }
  snapshot() { this.state.rngState = this.rng.state; return structuredClone(this.state); }
  spendEnergy(amount) { if (this.state.energy < amount) throw new Error('能量不足。'); this.state.energy -= amount; this.bus.emit('energy:spent', { amount }); }
  play(cardId, targets = {}) {
    if (this.state.phase !== 'player' || this.state.outcome || this.state.choice || this.state.frames.length) throw new Error('请先完成当前选择。');
    const card = this.state.hand.find(c => c.id === cardId); if (!card) throw new Error('卡牌不在手中。');
    if(this.resolve(card).keywords.includes('AutoWorkflow')) {this.act('workflow:add',{cardId});return;}
    validateTargets(this, card, targets);
    this.prepareCard(card);
    const resolved = this.resolve(card); this.spendEnergy(resolved.cost);
    card.modifiers=card.modifiers.filter(m=>!m.untilPlayed);
    this.deck.remove(cardId); this.state.resolving.push(card);
    this.effects.execute([...resolved.effects,{type:'@finish-card',cardId}],{...targets,sourceId:card.id,previousCard:structuredClone(this.state.lastPlayed)});
  }
  prepareCard(card) {if(this.state.nextCardModifier){card.modifiers.push({...this.state.nextCardModifier,expiresTurn:this.state.turn});this.state.nextCardModifier=null;}}
  act(action,args) {if(this.state.outcome || this.state.phase!=='player' || this.state.choice)throw new Error('请先完成当前选择。');const handler=this.actions.get(action);if(!handler)throw new Error('角色不支持此操作。');handler(args);this.checkOutcome();}
  choose(ids) {
    const choice=this.state.choice;if(!choice)throw new Error('当前没有等待中的选择。');
    if(new Set(ids).size!==ids.length || ids.length<choice.min || ids.length>choice.max || ids.some(id=>!choice.options.some(o=>o.id===id)))throw new Error(`请选择 ${choice.min}–${choice.max} 项。`);
    this.state.choice=null;this.effects.execute([{type:'choice:complete',choice,ids}]);
  }
  damage(target, amount, sourceId) {
    for(const [id,n] of Object.entries(target.statuses))if(n>0)amount=Math.floor(amount*(statuses[id]?.damageTakenMultiplier || 1));
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
    if(this.state.player.hp>0 && (this.state.frames.length || this.state.choice))return;
    const outcome = this.state.player.hp <= 0 ? 'defeat' : this.state.enemies.every(e => e.hp <= 0) ? 'victory' : null;
    if (outcome) { this.state.outcome = outcome; this.state.phase = 'finished'; this.bus.emit('combat:end', { outcome }); }
  }
  startTurn() {
    if(!this.state.outcome && !this.state.choice)this.effects.execute([{type:'@start-turn'}]);
  }
  endTurn() {
    if(this.state.outcome || this.state.phase!=='player' || this.state.choice)return;
    this.effects.execute([{type:'@emit',event:'turn:end'},{type:'@discard-hand'},...this.state.enemies.map(e=>({type:'@enemy-turn',enemyId:e.id})),{type:'@start-turn'}]);
  }
  registerLifecycle() {
    this.effects.register('@emit',e=>this.bus.emit(e.event,{turn:this.state.turn}));
    this.effects.register('@finish-card',e=>{
      const card=this.state.resolving.find(c=>c.id===e.cardId);if(!card)return;
      const resolved=this.resolve(card);this.state.lastPlayed=structuredClone(card);
      if(resolved.keywords.includes('Exhaust'))this.deck.exhaust(card);
      else {this.deck.remove(card.id);this.state[resolved.type==='Power'?'powers':'discard'].push(card);}
      this.bus.emit('card:played',{cardId:card.id,definitionId:card.definitionId});
    });
    this.effects.register('@discard-hand',()=>{this.deck.endTurn();this.state.phase='enemy';});
    this.effects.register('@enemy-turn',e=>{if(this.state.player.hp>0)enemyTurn(this,this.state.enemies.find(enemy=>enemy.id===e.enemyId));});
    this.effects.register('@start-turn',()=>{
      if(this.state.player.hp<=0 || this.state.enemies.every(e=>e.hp<=0))return;
      this.state.turn++;this.state.phase='player';this.state.player.block=0;
      this.state.metrics={drawn:0,played:0,exhausted:0,names:{}};
      this.state.retainedIds=[];this.state.drawLocked=false;this.state.nextCardModifier=null;
      for(const card of this.allCards())card.modifiers=card.modifiers.filter(m=>m.expiresTurn===undefined || m.expiresTurn>=this.state.turn);
      this.state.energy=typeof this.character.energyPerTurn==='function'?this.character.energyPerTurn(this):this.character.energyPerTurn;
      let draw=typeof this.character.drawPerTurn==='function'?this.character.drawPerTurn(this):this.character.drawPerTurn;
      if(this.state.turn===1)for(const m of this.state.openingModifiers){draw+=m.firstTurnDrawDelta||0;this.state.energy+=m.firstTurnEnergy||0;if(m.startBlock)this.gainBlock(this.state.player,m.startBlock);}
      this.effects.execute([{type:'draw',amount:Math.max(0,draw)},{type:'@emit',event:'turn:start'}]);
    });
  }
}
