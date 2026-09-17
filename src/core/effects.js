import { effectEnemies } from './target.js';
import { addPower } from './status.js';
import { conditionMatches, resolveValue } from './conditions.js';
import { openChoice, completeChoice } from './choices.js';
export class EffectSystem {
  constructor(engine) {
    this.engine = engine; this.handlers = new Map(); this.running = false; this.scheduled = [];
    this.register('damage', (e,c) => { for(let hit=0;hit<(e.hits || 1);hit++) for(const enemy of effectEnemies(engine,e,c)) engine.damage(enemy,engine.calculateAttack(engine.state.player,resolveValue(engine,e.amount,c)),'player'); });
    this.register('block', (e,c) => engine.gainBlock(engine.state.player,resolveValue(engine,e.amount,c)));
    this.register('draw', (e,c) => { c.lastDrawn=engine.deck.draw(resolveValue(engine,e.amount,c)); });
    this.register('energy', (e,c) => { engine.state.energy+=resolveValue(engine,e.amount,c); });
    this.register('heal', effect => { engine.state.player.hp = Math.min(engine.state.player.maxHp, engine.state.player.hp + effect.amount); });
    this.register('status', (effect, context) => { const targets = effect.target === 'enemy' || effect.target === 'allEnemies' ? effectEnemies(engine, effect, context) : [engine.state.player]; for (const target of targets) target.statuses[effect.status] = (target.statuses[effect.status] || 0) + effect.amount; });
    this.register('power', effect => addPower(engine, effect.power, effect.amount));
    this.register('exhaust', (effect, context) => { const card = engine.findCard(effect.target === 'self' ? context.sourceId : context.cardId); if (card) engine.deck.exhaust(card); });
    this.register('move', effect => engine.deck.move(effect.from, effect.to, effect.amount));
    this.register('moveCard', (e,c) => { const card=engine.deck.remove(c.cardId);if(card)engine.deck.put(card,e.to,e.position); });
    this.register('choose', (e,c) => openChoice(engine,e,c));
    this.register('choice:complete', e => completeChoice(engine,e.choice,e.ids));
    this.register('if', (e,c) => this.execute(conditionMatches(engine,e.condition,c)?e.then:e.else || [],c));
    this.register('modifyCard', (e,c) => { const card=engine.findCard(c.cardId);if(card)card.modifiers.push({...structuredClone(e.modifier),...(e.untilTurnEnd?{expiresTurn:engine.state.turn}:{}),...(e.untilPlayed?{untilPlayed:true}:{})}); });
    this.register('nextCard', e => {engine.state.nextCardModifier=structuredClone(e.modifier);});
    this.register('noDraw', () => {engine.state.drawLocked=true;});
    this.register('shuffleDiscard', () => {engine.state.draw=engine.rng.shuffle([...engine.state.draw,...engine.state.discard]);engine.state.discard=[];engine.bus.emit('deck:shuffled',{count:engine.state.draw.length});});
    this.register('retainLeftmost', () => {const card=engine.state.hand[0];if(card)engine.state.retainedIds.push(card.id);});
  }
  register(type, handler) { this.handlers.set(type, handler); }
  execute(effects = [], context = {}) {
    if(!effects.length)return;
    const frame={effects:structuredClone(effects),index:0,context:structuredClone(context)};
    if(this.running)this.scheduled.push(frame);
    else {this.engine.state.frames.push(frame);this.drain();}
  }
  drain() {
    if(this.running)return;
    this.running=true;
    try {
      const state=this.engine.state;
      while(state.frames.length && !state.choice) {
        const frame=state.frames.at(-1);
        if(frame.index>=frame.effects.length){state.frames.pop();continue;}
        const effect=frame.effects[frame.index++],handler=this.handlers.get(effect.type);
        if(!handler)throw new Error(`Unregistered effect: ${effect.type}`);
        this.scheduled=[];handler(effect,frame.context);
        // Nested effects execute before continuation, in authored/trigger order.
        state.frames.push(...this.scheduled.reverse());
        if(state.outcome==='defeat'){state.frames=[];state.choice=null;break;}
      }
    } finally {this.running=false;this.scheduled=[];}
    if(!this.engine.state.frames.length && !this.engine.state.choice)this.engine.checkOutcome();
  }
}
