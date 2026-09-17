import { events } from '../src/data/events.js';
import { eventOptionAvailability } from '../src/core/event.js';
import { conditionMatches,resolveValue } from '../src/core/conditions.js';
export function settleChoices(engine,{optional=false}={}) {
  if(!engine)return;
  let count=0;
  while(engine.state.choice) {
    if(++count>100)throw new Error('Choice resolution did not terminate');
    const c=engine.state.choice;
    let options=[...c.options];
    if(c.effect.zone==='hand' && c.effect.then?.some(e=>e.type==='moveCard' || e.type==='exhaust')) options.sort((a,b)=>Number(engine.resolve(b.card).type==='Skill')-Number(engine.resolve(a.card).type==='Skill'));
    if(c.effect.then?.some(e=>e.type==='annotate'))options.sort((a,b)=>Number(engine.resolve(b.card).type==='Attack')-Number(engine.resolve(a.card).type==='Attack'));
    const amount=c.min===0&&!optional?0:Math.max(c.min,Math.min(c.max,1));
    engine.choose(options.slice(0,amount).map(o=>o.id));
  }
}
export function flatEffects(engine,effects) {return effects.flatMap(e=>e.type==='if'?flatEffects(engine,conditionMatches(engine,e.condition,{})?e.then:e.else || []):[e]);}
export function effectAmount(engine,e) {return resolveValue(engine,e.amount,{});}

export function settleEvent(game){
  const n=game.run.nodeState;
  if(n.resolved)return;
  if(n.choiceIndex===undefined){
    const options=events[n.eventId].choices;
    const index=options.findIndex(c=>eventOptionAvailability(game,c).allowed&&!c.effects.some(e=>['LoseHP','LoseGold','RandomChoice'].includes(e.type)));
    game.eventChoice(index>=0?index:options.findIndex(c=>eventOptionAvailability(game,c).allowed));
  }
  while(n.eventSelection)game.selectEventCards(n.eventSelection.options.slice(0,n.eventSelection.min).map(o=>o.id));
}
