import test from 'node:test';
import assert from 'node:assert/strict';
import { CombatEngine } from '../src/core/combat.js';
import { Game } from '../src/core/game.js';
import { createCard } from '../src/core/card.js';
import { cards,activeCards } from '../src/data/cards.js';
import { clerkCards,clerkCardId,starterCards } from '../src/data/clerk-cards.js';
import { clerkSource } from '../src/data/clerk-source.js';
import { characterClasses,characterVariants } from '../src/data/characters.js';
import { clerkExtension } from '../src/characters/clerk.js';
import { cardOffers,relicOffer } from '../src/core/reward.js';
import { Random } from '../src/core/random.js';
import { encodeSave,decodeSave } from '../src/core/save.js';
import { settleChoices,settleEvent } from './helpers.js';
import { resolveValue } from '../src/core/conditions.js';

function engineFor(id,{upgrade=0,relics=[]}={}) {
  const e=new CombatEngine({character:{...characterClasses.clerk,drawPerTurn:0},cardDefinitions:cards,extension:clerkExtension,encounter:{enemies:['director','paper']},deck:[],hp:1000,maxHp:1000,seed:'formal-cards',relics});
  settleChoices(e);e.state.energy=100;e.state.permanentDeckSize=10;e.state.enemies.forEach(x=>{x.hp=x.maxHp=10000;});
  const source=createCard(id,'subject',{upgrade});
  e.state.hand=[source,createCard(clerkCardId('处理'),'attack',{annotations:[{label:'原批注',effects:[{type:'damage',amount:2,target:'enemy'}]}]}),createCard(clerkCardId('防备'),'defense',{isCopy:true}),createCard(clerkCardId('限期办结'),'large')];
  e.state.draw=Array.from({length:12},(_,i)=>createCard(clerkCardId(i%2?'处理':'防备'),`draw-${i}`));
  e.state.discard=[createCard(clerkCardId('翻阅'),'discarded')];
  e.state.lastPlayed=createCard(clerkCardId('处理'),'previous');
  e.state.extensions.clerk.workflows=[1,2].map(id=>({id,cursor:0,executions:0,items:[createCard(clerkCardId('处理'),`flow-${id}-1`),createCard(clerkCardId('防备'),`flow-${id}-2`),createCard(clerkCardId('防备'),`flow-${id}-3`)]}));
  e.state.extensions.clerk.nextWorkflowId=3;
  return e;
}
function play(e){e.play('subject',{enemyId:'enemy-0'});settleChoices(e,{optional:true});}
function count(e,event){return e.state.log.filter(x=>x.event===event).length;}

test('workbook coverage is exactly 2 basic / 24 common / 42 uncommon / 16 rare plus 6 exclusive starters',()=>{
  assert.equal(clerkSource.length,84);assert.equal(Object.keys(starterCards).length,6);assert.equal(Object.keys(activeCards).length,90);
  for(const [rarity,total] of Object.entries({basic:2,common:24,uncommon:42,rare:16}))assert.equal(Object.values(clerkCards).filter(c=>c.rarity===rarity).length,total);
  for(const row of clerkSource){const c=clerkCards[row.id];assert.equal(c.name,row.name);assert.equal(c.cost,row.cost);assert.equal(c.type,row.type);assert.equal(c.sourceRow,row.sourceRow);assert.ok(c.effects.length);assert.ok(c.upgrade.effects.length);}
});
for(const [id,definition] of Object.entries(activeCards))for(const upgrade of [0,1])test(`${definition.name}${upgrade?'+':''}: resolves all effects, selections and destination`,()=>{
  const e=engineFor(id,{upgrade});play(e);
  assert.equal(e.state.choice,null);assert.equal(e.state.frames.length,0);assert.ok(Number.isFinite(e.state.energy));assert.ok(Number.isFinite(e.state.player.block));assert.ok(e.state.enemies.every(x=>Number.isFinite(x.hp)));
  const r=e.resolve(createCard(id,'check',{upgrade}));
  const zone=r.keywords.includes('Exhaust')?'exhaust':r.type==='Power'?'powers':'discard';
  assert.ok(e.state[zone].some(c=>c.id==='subject'),`${definition.name} expected in ${zone}`);
});
test('three exact starter decks and relics share a single pool; exclusive cards never appear in rewards',()=>{
  const expected=[['文书员','fileTray',['校阅','附签']],['收发员','receiptStamp',['传阅','复写件']],['调度员','stickyCalendar',['转办','暂缓']]];
  for(let i=0;i<3;i++){const v=characterVariants[i],g=new Game({variantId:v.id});assert.equal(v.name,expected[i][0]);assert.equal(v.relic,expected[i][1]);assert.equal(g.run.deck.length,10);assert.equal(v.deck.filter(id=>cards[id].name==='处理').length,4);assert.equal(v.deck.filter(id=>cards[id].name==='防备').length,4);assert.deepEqual(v.deck.slice(8).map(id=>cards[id].name),expected[i][2]);assert.equal(g.character,characterClasses.clerk);}
  const rng=new Random('pool');for(let i=0;i<100;i++)for(const id of cardOffers(rng,characterClasses.clerk)){assert.ok(clerkCards[id]);assert.notEqual(cards[id].rarity,'basic');assert.ok(!cards[id].legacy);}
  for(let i=0;i<100;i++)assert.ok(!['fileTray','receiptStamp','stickyCalendar','redPen','carbonPaper','binder'].includes(relicOffer(rng,[])));
});
test('file tray draws three extra then waits for chosen bottom card; choice survives save/reload',()=>{
  const g=new Game({variantId:'red',seed:'tray'});g.enterNode(g.run.map.nodes.find(n=>n.row===0).id);const e=g.combat;
  assert.equal(e.state.hand.length,8);assert.equal(e.state.draw.length,2);assert.ok(e.state.choice);assert.equal(e.state.metrics.drawn,8);
  assert.throws(()=>e.play(e.state.hand[0].id,{enemyId:'enemy-0'}));const restored=new Game({saved:decodeSave(encodeSave(g))});
  const id=e.state.hand[3].id;e.choose([id]);restored.combat.choose([id]);assert.deepEqual(restored.snapshot(),g.snapshot());
  assert.equal(e.state.hand.length,7);assert.equal(e.state.draw[0].id,id);assert.equal(e.state.choice,null);
});
test('传阅 chooses after drawing; drawn card can be placed on bottom and source exhausts',()=>{
  const e=engineFor('starter_circulate');e.play('subject');assert.equal(e.state.choice.options.length,5);const justDrawn='draw-11';assert.ok(e.state.choice.options.some(o=>o.id===justDrawn));e.choose([justDrawn]);assert.equal(e.state.draw[0].id,justDrawn);assert.ok(e.state.exhaust.some(c=>c.id==='subject'));
});
test('复写件 inherits current instance annotations and upgrade, recursive copy returns normally to discard',()=>{
  const e=engineFor('starter_carbon',{upgrade:1});e.findCard('subject').annotations.push({label:'防御',effects:[{type:'block',amount:3}]});play(e);
  const copy=e.state.hand.find(c=>c.sourceId==='subject');assert.equal(copy.upgrade,1);assert.equal(copy.annotations.length,1);assert.ok(e.resolve(copy).keywords.includes('Ethereal'));
  e.play(copy.id,{enemyId:'enemy-0'});assert.ok(e.state.discard.some(c=>c.id===copy.id));assert.ok(e.state.hand.some(c=>c.sourceId===copy.id));
});
test('转办 optional choice can skip or file another card free after damage',()=>{
  for(const skip of [true,false]){const e=engineFor('starter_transfer');e.state.extensions.clerk.workflows=[];const before=e.state.enemies[0].hp;e.play('subject',{enemyId:'enemy-0'});assert.equal(e.state.enemies[0].hp,before-7);assert.equal(e.state.choice.min,0);e.choose(skip?[]:['attack']);assert.equal(e.state.energy,99);assert.equal(e.state.extensions.clerk.pending.length,skip?0:1);if(!skip)assert.equal(e.state.extensions.clerk.pending[0].annotations.length,1);}
});
test('receipt stamp only pays once per combat on the first fourth normal play, not workflows',()=>{
  const e=engineFor(clerkCardId('防备'),{relics:['receiptStamp']});e.state.extensions.clerk.workflows=[];e.state.energy=20;
  for(let i=0;i<4;i++){const c=createCard(clerkCardId('防备'),`play-${i}`);e.state.hand.push(c);e.play(c.id);}assert.equal(e.state.energy,17);
  e.startTurn();e.state.energy=20;for(let i=0;i<4;i++){const c=createCard(clerkCardId('防备'),`again-${i}`);e.state.hand.push(c);e.play(c.id);}assert.equal(e.state.energy,16);
  const restored=new CombatEngine({character:e.character,cardDefinitions:cards,extension:clerkExtension,saved:e.snapshot()});restored.startTurn();restored.state.energy=20;for(let i=0;i<4;i++){const c=createCard(clerkCardId('防备'),`restored-${i}`);restored.state.hand.push(c);restored.play(c.id);}assert.equal(restored.state.energy,16);
});
test('sticky calendar retains only current leftmost, leaves native retain intact, Ethereal still exhausts',()=>{
  const e=engineFor('starter_defer',{relics:['stickyCalendar']});e.state.hand=[createCard(clerkCardId('处理'),'left'),createCard(clerkCardId('处理'),'right'),createCard('starter_defer','retained')];e.endTurn();assert.deepEqual(e.state.hand.map(c=>c.id),['left','retained']);
  e.state.hand=[createCard(clerkCardId('处理'),'ephemeral',{isCopy:true}),createCard(clerkCardId('处理'),'other')];e.endTurn();assert.ok(e.state.exhaust.some(c=>c.id==='ephemeral'));assert.ok(!e.state.hand.some(c=>c.id==='other'));
});
test('copy bonus is finite per operation; propagated annotations cannot recurse forever',()=>{
  const e=engineFor(clerkCardId('复印'));e.effects.execute([{type:'power',power:'copyCenter',amount:1},{type:'power',power:'literalImplementation',amount:1}]);
  const before=count(e,'card:copied');play(e);assert.equal(count(e,'card:copied')-before,2);
  const n=count(e,'annotation:added');e.effects.execute([{type:'annotate',source:'selected',modifier:{label:'传播',effects:[{type:'block',amount:3}]}}],{cardId:'attack'});assert.equal(count(e,'annotation:added')-n,2);
});
test('留存副本 removes Ethereal on that instance; copying it creates a fresh Ethereal copy',()=>{
  const e=engineFor(clerkCardId('留存副本'));play(e);assert.ok(!e.resolve(e.findCard('defense')).keywords.includes('Ethereal'));e.effects.execute([{type:'copy',source:'selected',amount:1}],{cardId:'defense'});assert.ok(e.resolve(e.state.hand.at(-1)).keywords.includes('Ethereal'));
});
test('temporary costs expire; ordinary reductions reach zero and explicit floors remain supported',()=>{
  const e=engineFor(clerkCardId('复印错误'));play(e);const copy=e.state.hand.find(c=>c.isCopy&&c.id!=='defense');assert.equal(e.resolve(copy).cost,0);e.deck.remove(copy.id);e.state.discard.push(copy);e.startTurn();assert.equal(e.resolve(copy).cost,cards[copy.definitionId].cost);
  e.effects.execute([{type:'annotate',source:'selected',modifier:{label:'减费',costDelta:-2,costFloor:1}}],{cardId:'large'});assert.equal(e.resolve(e.findCard('large')).cost,1);
  e.effects.execute([{type:'annotate',source:'selected',modifier:{label:'普通减费',costDelta:-2}}],{cardId:'attack'});assert.equal(e.resolve(e.findCard('attack')).cost,0);
});
test('flow advance executes effects and events; clone keeps independent cursor',()=>{
  const e=engineFor(clerkCardId('流程复核'));const before=count(e,'workflow:item-executed'),hp=e.state.enemies[0].hp;play(e);assert.equal(e.state.extensions.clerk.workflows[0].cursor,1);assert.equal(count(e,'workflow:item-executed'),before+1);assert.equal(e.state.enemies[0].hp,hp-6);
  e.effects.execute([{type:'workflow:copy',workflowId:1}]);assert.equal(e.state.extensions.clerk.workflows[2].cursor,1);e.effects.execute([{type:'workflow:execute',workflowId:1}]);assert.equal(e.state.extensions.clerk.workflows[0].cursor,2);assert.equal(e.state.extensions.clerk.workflows[2].cursor,1);
});
test('upgraded review advances all workflows and applies their effects and listeners',()=>{
  const e=engineFor(clerkCardId('流程复核'),{upgrade:1}),hp=e.state.enemies[0].hp;
  e.effects.execute([{type:'power',power:'autoCirculation',amount:3}]);play(e);
  assert.equal(e.state.enemies[0].hp,hp-12);assert.equal(e.state.player.block,6);
  assert.ok(e.state.extensions.clerk.workflows.every(f=>f.cursor===1));
});
test('减免手续 reduces a one-cost card to zero in both versions and stacks without negative costs',()=>{
  for(const upgrade of [0,1]){const e=engineFor(clerkCardId('减免手续'),{upgrade});e.play('subject');e.choose(['attack']);assert.equal(e.resolve(e.findCard('attack')).cost,0);e.effects.execute([{type:'annotate',source:'selected',modifier:{label:'更多减费',costDelta:-10}}],{cardId:'attack'});assert.equal(e.resolve(e.findCard('attack')).cost,0);}
});
test('积案清理 counts only four live card zones including copies and exhaust, excluding workflow and powers',()=>{
  for(const upgrade of [0,1]){
    const e=engineFor(clerkCardId('积案清理'),{upgrade});
    e.state.hand=[e.findCard('subject'),createCard(clerkCardId('防备'),'spare')];
    e.state.draw=[createCard(clerkCardId('处理'),'drawn')];e.state.discard=[createCard(clerkCardId('处理'),'discarded')];
    e.state.exhaust=[createCard(clerkCardId('防备'),'exhausted'),createCard(clerkCardId('防备'),'copy-counted',{isCopy:true})];
    e.state.powers=[createCard(clerkCardId('复印中心'),'power-not-counted')];e.state.permanentDeckSize=999;
    const effect=e.resolve(e.findCard('subject')).effects[0],per=upgrade?6:5;
    assert.equal(resolveValue(e,effect.amount),10+2*per);
    e.effects.execute([{type:'workflow:add'}],{cardId:'spare'});
    assert.equal(resolveValue(e,effect.amount),10+per);
    const hp=e.state.enemies[0].hp;e.play('subject',{enemyId:'enemy-0'});
    assert.equal(e.state.enemies[0].hp,hp-(10+per));
    e.state.exhaust.push(...[1,2,3].map(n=>createCard(clerkCardId('防备'),`extra-copy-${n}`,{isCopy:true})));
    assert.equal(resolveValue(e,effect.amount),10+2*per);
  }
});
test('manual filing rejects ordinary cards, while card effects still file them',()=>{
  const e=engineFor(clerkCardId('例行办理')),energy=e.state.energy;
  assert.throws(()=>e.act('workflow:add',{cardId:'subject'}),/卡牌效果/);assert.equal(e.state.energy,energy);
  assert.ok(e.state.hand.some(c=>c.id==='subject'));
  e.effects.execute([{type:'workflow:add'}],{cardId:'subject'});assert.equal(e.state.extensions.clerk.pending[0].id,'subject');
});
test('all normal workflows finish before extra auto-approval executes distinct workflows',()=>{
  const e=engineFor(clerkCardId('自动批办'),{upgrade:1});play(e);const before=count(e,'workflow:item-executed');e.startTurn();const events=e.state.log.filter(x=>x.event==='workflow:item-executed').slice(before);assert.equal(events.length,4);assert.deepEqual(events.slice(0,2).map(x=>x.workflowId),[1,2]);assert.equal(new Set(events.slice(2).map(x=>x.workflowId)).size,2);
});
test('layered approval locks subsequent draws only for the current turn',()=>{const e=engineFor(clerkCardId('层层审批'));play(e);assert.equal(e.state.drawLocked,true);const before=e.state.hand.length;e.deck.draw(2);assert.equal(e.state.hand.length,before);e.endTurn();assert.equal(e.state.drawLocked,false);});
test('discovered cards are zero cost and route straight into workflow without executing or ordinary play events',()=>{
  const e=engineFor(clerkCardId('请示上级'));e.state.extensions.clerk.workflows=[];e.play('subject');const selected=e.state.choice.options[0];assert.ok(e.state.choice.options.every(o=>cards[o.card.definitionId].rarity==='rare'&&cards[o.card.definitionId].type!=='Power'));e.choose([selected.id]);assert.equal(e.resolve(e.findCard(selected.id)).cost,0);const before=count(e,'card:played');e.play(selected.id);assert.equal(count(e,'card:played'),before);assert.equal(e.state.extensions.clerk.pending[0].id,selected.id);
});
for(const upgrade of [0,1])for(const name of ['详阅','内部传阅','闭门整理'])test(`${name}${upgrade?'+':''}: puts exactly one chosen hand card on TOP and it is drawn next`,()=>{
 const e=engineFor(clerkCardId(name),{upgrade});e.play('subject');assert.equal(e.state.choice.max,1);const selected=e.state.choice.options[0].id;e.choose([selected]);assert.equal(e.state.draw.at(-1).id,selected);assert.ok(!e.state.hand.some(c=>c.id===selected));e.deck.draw(1);assert.equal(e.state.hand.at(-1).id,selected);
});
test('updated ordinary costs apply to both versions of 联合办理 and 直接转办',()=>{for(const [name,cost] of [['联合办理',1],['直接转办',0]])for(const upgrade of [0,1]){const e=engineFor(clerkCardId(name),{upgrade});assert.equal(e.resolve(e.findCard('subject')).cost,cost);}});
test('查找原件+ discount persists through turns, discard and JSON save until next valid play',()=>{
 const e=engineFor(clerkCardId('查找原件'),{upgrade:1});e.state.draw.push(createCard(clerkCardId('限期办结'),'found'));e.play('subject');e.choose(['found']);assert.equal(e.resolve(e.findCard('found')).cost,0);
 e.endTurn();assert.equal(e.resolve(e.findCard('found')).cost,0);assert.ok(e.state.discard.some(c=>c.id==='found'));
 const restored=new CombatEngine({character:e.character,cardDefinitions:cards,extension:clerkExtension,saved:JSON.parse(JSON.stringify(e.snapshot()))});
 const card=restored.deck.remove('found');restored.state.hand.push(card);assert.throws(()=>restored.play('found',{enemyId:'missing'}));assert.equal(restored.resolve(card).cost,0);
 const energy=restored.state.energy;restored.play('found',{enemyId:'enemy-0'});assert.equal(restored.state.energy,energy);assert.equal(restored.resolve(card).cost,cards[card.definitionId].cost);
});
