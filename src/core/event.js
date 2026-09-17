import { events,eventPools } from '../data/events.js';
import { cards } from '../data/cards.js';
import { relics } from '../data/relics.js';
import { createCard,upgradeCard } from './card.js';
import { cardOffers,eligibleCardPool,relicOffer } from './reward.js';
export function eventPoolFor(pool){return eventPools[pool] || [];}
export function pickEvent(game,pool){
  const candidates=eventPoolFor(pool).filter(id=>!game.run.seenEvents.includes(id));
  if(!candidates.length)return null;
  const id=game.stream('events').pick(candidates);game.run.seenEvents.push(id);return id;
}
const amount=(game,e)=>e.percent!==undefined?Math.ceil(game.run.maxHp*e.percent):e.amount || 0;
const transformPool=(game,card,e)=>Object.keys(cards).filter(id=>!cards[id].legacy&&cards[id].classId===game.run.classId&&id!==card.definitionId&&(!e.sameRarity||cards[id].rarity===cards[card.definitionId].rarity));
function deckCandidates(game,e){
  return game.run.deck.filter(c=>e.type==='UpgradeCard'?!c.upgrade:e.type==='DowngradeCard'?!!c.upgrade:e.type==='RemoveCard'?game.run.deck.length>1:e.type==='TransformCard'?transformPool(game,c,e).length>0:true);
}
function availableRelics(game,rarity){return Object.keys(relics).filter(id=>!relics[id].starter&&!relics[id].legacy&&!game.run.relics.includes(id)&&(!rarity||(relics[id].rarity||'common')===rarity));}
export function eventOptionAvailability(game,choice){
  if(!choice)return {allowed:false,reason:'无效选项'};
  const c=choice.conditions || {},r=game.run;
  const cost=Math.max(c.goldAtLeast || choice.goldCost || 0,(choice.effects || []).filter(e=>e.type==='LoseGold').reduce((n,e)=>n+amount(game,e),0));
  if(r.gold<cost)return {allowed:false,reason:`需要${cost}金币`};
  if(c.deckAtLeast&&r.deck.length<c.deckAtLeast)return {allowed:false,reason:'牌组中没有可选牌'};
  if(c.upgradableCardsAtLeast&&r.deck.filter(card=>!card.upgrade).length<c.upgradableCardsAtLeast)return {allowed:false,reason:`需要${c.upgradableCardsAtLeast}张未升级牌`};
  if(c.removableCardsAtLeast&&r.deck.length<=1)return {allowed:false,reason:'牌组至少保留1张牌'};
  if(c.transformableCardsAtLeast&&!deckCandidates(game,{type:'TransformCard',sameRarity:true}).length)return {allowed:false,reason:'没有可转化的牌'};
  if(c.relicAvailable&&!availableRelics(game,c.relicAvailable).length)return {allowed:false,reason:'该稀有度遗物已全部获得'};
  if(choice.hpCost&&r.hp<=choice.hpCost)return {allowed:false,reason:'生命不足'};
  return {allowed:true,reason:''};
}
function log(game,text){game.run.nodeState.eventLog.push(text);}
function applyCard(game,e,card){
  const name=cards[card.definitionId].name;
  if(e.type==='UpgradeCard'){upgradeCard(card);log(game,`${name}已升级。`);}
  if(e.type==='DowngradeCard'){card.upgrade=0;log(game,`${name}已降级。`);}
  if(e.type==='RemoveCard'){game.run.deck=game.run.deck.filter(c=>c.id!==card.id);log(game,`移除了${name}。`);}
  if(e.type==='TransformCard'){
    const id=game.stream('events').pick(transformPool(game,card,e));if(!id)return;
    const replacement=createCard(id,`run-${game.run.nextCardId++}`);game.run.deck.splice(game.run.deck.indexOf(card),1,replacement);log(game,`${name}转化为${cards[id].name}。`);
  }
  if(e.type==='DuplicateCard'){
    const copy=structuredClone(card);Object.assign(copy,{id:`run-${game.run.nextCardId++}`,isCopy:false,sourceId:null,rootSourceId:null});if(e.upgrade)upgradeCard(copy);
    game.run.deck.push(copy);log(game,`获得${name}${copy.upgrade?'+':''}的永久复制品。`);
  }
}
function selectCardEffect(game,e){
  const candidates=deckCandidates(game,e),count=Math.min(e.count || 1,candidates.length);
  if(!count){log(game,'没有符合条件的牌，此项略过。');return;}
  if(e.random){for(const card of game.stream('events').shuffle(candidates).slice(0,count))applyCard(game,e,card);return;}
  game.run.nodeState.eventSelection={kind:'deck',effect:e,min:count,max:count,options:candidates.map(card=>({id:card.id,card:structuredClone(card)}))};
}
export const EVENT_EFFECTS={
  GainGold(game,e){const n=amount(game,e);game.run.gold+=n;log(game,`获得${n}金币。`);},
  LoseGold(game,e){const n=amount(game,e);if(game.run.gold<n)throw new Error('金币不足。');game.run.gold-=n;log(game,`支付${n}金币。`);},
  Heal(game,e){const n=Math.min(game.run.maxHp-game.run.hp,amount(game,e));game.run.hp+=n;log(game,`回复${n}生命。`);},
  LoseHP(game,e){const n=Math.min(game.run.hp,amount(game,e));game.run.hp-=n;log(game,`失去${n}生命。`);if(game.run.hp<=0)game.run.screen='defeat';},
  UpgradeCard:selectCardEffect,DowngradeCard:selectCardEffect,RemoveCard:selectCardEffect,TransformCard:selectCardEffect,DuplicateCard:selectCardEffect,
  AddRandomCard(game,e){const id=game.stream('events').pick(eligibleCardPool(game.character,e.rarity));if(id){game.addCard(id);log(game,`获得${cards[id].name}。`);}},
  CardReward(game,e){const ids=cardOffers(game.stream('events'),game.character,e.count || 3,{rarity:e.rarity,uniform:true});game.run.nodeState.eventSelection={kind:'reward',effect:e,min:1,max:1,options:ids.map(id=>({id,card:createCard(id,`event-${id}`)}))};},
  GainRelic(game,e){const id=relicOffer(game.stream('events'),game.run.relics,e.rarity);if(id){game.run.relics.push(id);log(game,`获得遗物：${relics[id].name}。`);}else log(game,'没有尚未获得的对应遗物。');},
  AddNextCombatModifier(game,e){game.run.nextCombatModifiers.push(structuredClone(e.modifier));log(game,`下一场战斗：${e.modifier.label}。`);},
  RandomChoice(game,e){const i=game.stream('events').weighted(Object.fromEntries(e.branches.map((b,i)=>[i,b.weight])));game.run.nodeState.eventQueue.unshift(...structuredClone(e.branches[Number(i)].effects));},
};
function legacyEffects(choice){return [
  ...(choice.goldCost?[{type:'LoseGold',amount:choice.goldCost}]:[]),...(choice.hpCost?[{type:'LoseHP',amount:choice.hpCost}]:[]),
  ...choice.effects.map(e=>({...e,type:({heal:'Heal',gold:'GainGold',relic:'GainRelic',upgradeChoice:'UpgradeCard',removeChoice:'RemoveCard'})[e.type] || e.type})),
];}
export function chooseEvent(game,index){
  const node=game.run.nodeState,choice=events[node?.eventId]?.choices[index];
  if(game.run.screen!=='node'||node.type!=='Event'||node.resolved||node.choiceIndex!==undefined||!choice)throw new Error('事件已经结束或正在结算。');
  const availability=eventOptionAvailability(game,choice);if(!availability.allowed)throw new Error(availability.reason);
  node.choiceIndex=index;node.eventLog=[];node.eventQueue=structuredClone(legacyEffects(choice));node.result=choice.label;
  resumeEvent(game);
}
export function resumeEvent(game){
  const node=game.run.nodeState;
  while(node.eventQueue.length&&!node.eventSelection&&game.run.hp>0){const e=node.eventQueue.shift(),handler=EVENT_EFFECTS[e.type];if(!handler)throw new Error(`未知事件效果：${e.type}`);handler(game,e);}
  if(game.run.hp<=0){node.eventQueue=[];node.eventSelection=null;node.resolved=true;}
  else if(!node.eventQueue.length&&!node.eventSelection)node.resolved=true;
}
export function selectEventCards(game,ids){
  const node=game.run.nodeState,s=node?.eventSelection;
  if(game.run.screen!=='node'||!s||!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.length<s.min||ids.length>s.max||ids.some(id=>!s.options.some(o=>o.id===id)))throw new Error('请选择有效的卡牌。');
  if(s.kind==='deck')for(const id of ids){const card=deckCandidates(game,s.effect).find(c=>c.id===id);if(!card)throw new Error('卡牌不再符合条件。');}
  node.eventSelection=null;
  if(s.kind==='reward'){for(const id of ids){game.addCard(id);log(game,`获得${cards[id].name}。`);}}
  else for(const id of ids)applyCard(game,s.effect,game.run.deck.find(c=>c.id===id));
  resumeEvent(game);
}
