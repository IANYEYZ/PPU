import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { act1Events } from '../src/data/act-events.js';
import { EVENT_EFFECTS,eventOptionAvailability,pickEvent } from '../src/core/event.js';
import { cards } from '../src/data/cards.js';
import { encounters,enemies } from '../src/data/enemies.js';
import { encodeSave,decodeSave } from '../src/core/save.js';
import { settleChoices } from './helpers.js';
const restore=g=>new Game({saved:decodeSave(encodeSave(g))});
function fixture(id,seed='events'){
  const g=new Game({seed,variantId:'carbon'});g.run.gold=200;g.run.hp=40;
  g.run.nodeState={type:'Event',mapType:'Unknown',eventId:id};g.run.screen='node';return g;
}
function settle(g){while(g.run.nodeState.eventSelection){const s=g.run.nodeState.eventSelection;g.selectEventCards(s.options.slice(0,s.min).map(o=>o.id));}}
// Explicit outcomes for every non-random option: [gold change, HP change, deck change, upgraded total, next-combat count, relic change].
const expected={
 ticket:[[0,8,0,0,0,0],[50,-6,0,0,0,0],[0,0,0,0,0,0]],
 wrongWindow:[[0,-5,0,1,0,0],[35,0,0,0,0,0],[0,0,0,0,0,0]],
 lunch:[[0,16,0,0,0,0],[70,-8,0,0,0,0],[0,0,0,0,0,0]],
 copyShop:[[-40,0,1,0,0,0],[-75,0,1,1,0,0],[0,0,0,0,0,0]],
 suggestionBox:[[0,0,-1,0,0,0],[-50,0,0,0,0,1],[0,0,0,0,0,0]],
 jam:[[75,-7,0,0,0,0],[0,-4,-1,0,0,0],[0,0,0,0,0,0]],
 forms:[[0,0,0,0,0,0],[0,0,0,1,0,0],[0,0,0,0,0,0]],
 unclaimed:[null,[35,0,0,0,0,0],[0,0,0,0,0,0]],
 training:[[0,0,0,1,1,0],[0,0,1,0,0,0],[0,0,0,0,0,0]],
 oldCabinet:[[0,0,1,0,0,0],[0,-5,-1,0,0,0],[45,0,0,0,0,0]],
 inspection:[[40,0,0,0,1,0],[75,-7,0,0,0,0],[0,0,0,0,0,0]],
 wrongStamp:[[0,0,0,1,0,0],[-45,0,0,1,0,0],[0,-8,-1,0,0,0]],
 vendingMachine:[[-30,12,0,0,0,0],[-50,0,0,0,1,0],null,[0,0,0,0,0,0]],
 overtimeForm:[[0,-10,1,0,0,0],[0,-18,0,0,0,1],[0,0,0,0,0,0]],
 mediation:[[80,0,1,0,0,0],[0,15,0,1,0,0],[25,0,0,0,0,0]],
};
for(const [id,event] of Object.entries(act1Events))for(const [index,choice] of event.choices.entries())test(`event ${event.title} / ${choice.label}: outcomes, save continuity, unchanged map`,()=>{
 const g=fixture(id),map=structuredClone(g.run.map);g.eventChoice(index);
 const saved=restore(g);assert.deepEqual(saved.snapshot(),g.snapshot());
 settle(g);settle(saved);assert.deepEqual(saved.snapshot(),g.snapshot());
 const r=g.run;assert.ok(r.nodeState.resolved);assert.deepEqual(r.map,map);
 const delta=[r.gold-200,r.hp-40,r.deck.length-10,r.deck.filter(c=>c.upgrade).length,r.nextCombatModifiers.length,r.relics.length-1];
 if(expected[id][index])assert.deepEqual(delta,expected[id][index]);
 else assert.ok((id==='unclaimed'?[[90,0],[0,-10]]:[[40,0],[0,-6]]).some(d=>d[0]===delta[0]&&d[1]===delta[1]));
 assert.throws(()=>g.eventChoice(index));g.leaveNode();assert.equal(r.screen,'map');
});
test('all fifteen definitions use supported, data-driven effect handlers',()=>{
 assert.equal(Object.keys(act1Events).length,15);
 for(const name of ['GainGold','LoseGold','Heal','LoseHP','UpgradeCard','DowngradeCard','RemoveCard','TransformCard','AddRandomCard','CardReward','GainRelic','AddNextCombatModifier','RandomChoice'])assert.equal(typeof EVENT_EFFECTS[name],'function');
 const check=e=>{assert.ok(EVENT_EFFECTS[e.type],e.type);for(const b of e.branches||[])b.effects.forEach(check);};
 for(const event of Object.values(act1Events))for(const c of event.choices)c.effects.forEach(check);
});
test('paid selection charges once, blocks leaving and rejects invalid/repeated submissions',()=>{
 let g=fixture('copyShop');g.eventChoice(1);assert.equal(g.run.gold,125);assert.throws(()=>g.leaveNode());
 g=restore(g);assert.equal(g.run.gold,125);assert.throws(()=>g.selectEventCards(['missing']));assert.throws(()=>g.selectEventCards([]));
 const original=g.run.deck[0];g.selectEventCards([original.id]);assert.equal(original.upgrade,0);assert.equal(g.run.deck.at(-1).upgrade,1);assert.notEqual(original.id,g.run.deck.at(-1).id);assert.equal(g.run.deck.at(-1).isCopy,false);assert.throws(()=>g.selectEventCards([original.id]));assert.equal(g.run.gold,125);
});
test('affordability and depleted targets disable options before any cost or RNG consumption',()=>{
 for(const id of ['copyShop','vendingMachine','wrongStamp','suggestionBox']){const g=fixture(id);g.run.gold=0;const index=id==='copyShop'||id==='vendingMachine'?0:1;assert.equal(eventOptionAvailability(g,act1Events[id].choices[index]).allowed,false);const snap=g.snapshot();assert.throws(()=>g.eventChoice(index));assert.deepEqual(g.snapshot(),snap);}
 const g=fixture('forms');g.run.deck.forEach(c=>c.upgrade=1);assert.throws(()=>g.eventChoice(1));
});
test('transform keeps rarity, changes definition and resets upgrade with a fresh permanent ID',()=>{
 const g=fixture('forms'),original=g.run.deck[0];original.upgrade=1;g.eventChoice(0);g.selectEventCards([original.id]);const c=g.run.deck[0];assert.notEqual(c.id,original.id);assert.notEqual(c.definitionId,original.definitionId);assert.equal(cards[c.definitionId].rarity,cards[original.definitionId].rarity);assert.equal(c.upgrade,0);
});
test('blue rewards are three distinct blue class cards, white addition is white; no combat pity mutation',()=>{
 for(const [id,index] of [['training',1],['overtimeForm',0]]){const g=fixture(id);g.eventChoice(index);const options=g.run.nodeState.eventSelection.options;assert.equal(options.length,3);assert.equal(new Set(options.map(o=>o.id)).size,3);assert.ok(options.every(o=>cards[o.id].rarity==='uncommon'));assert.equal(g.run.rarityOdds.offset,-.05);}
 const g=fixture('mediation');g.eventChoice(0);assert.equal(cards[g.run.deck.at(-1).definitionId].rarity,'common');
});
test('event pool is Act-specific, without replacement, seeded and preserved after reload',()=>{
 let a=fixture('ticket','pool'),b=fixture('ticket','pool');const found=[];
 for(let i=0;i<15;i++){const id=pickEvent(a,'act1');found.push(id);assert.equal(id,pickEvent(b,'act1'));b=restore(b);}
 assert.equal(new Set(found).size,15);assert.equal(pickEvent(a,'act1'),null);assert.ok(pickEvent(a,'act2').startsWith('act2'));assert.ok(pickEvent(a,'act3').startsWith('act3'));
});
test('both coin-flip branches occur and identical seeds keep identical results through save',()=>{
 for(const [id,index] of [['unclaimed',0],['vendingMachine',2]]){const branches=new Set();for(let i=0;i<80;i++){const a=fixture(id,`random-${i}`),b=restore(a);a.eventChoice(index);b.eventChoice(index);assert.deepEqual(a.snapshot(),b.snapshot());branches.add(a.run.gold>200?'gold':'damage');}assert.equal(branches.size,2);}
});
test('lethal event damage ends Run and does not grant later rewards',()=>{const g=fixture('overtimeForm');g.run.hp=1;g.eventChoice(0);assert.equal(g.run.screen,'defeat');assert.equal(g.run.deck.length,10);assert.equal(g.run.nodeState.eventSelection,null);assert.equal(g.run.hp,0);});
test('next-combat modifiers stack, survive noncombat and reload, apply only to first turn of next fight',()=>{
 let g=fixture('training');g.eventChoice(0);settle(g);
 g.run.nodeState={type:'Event',eventId:'inspection'};g.eventChoice(0);
 g.run.nodeState={type:'Event',eventId:'vendingMachine'};g.eventChoice(1);g=restore(g);
 assert.equal(g.run.nextCombatModifiers.length,3);g.startCombat(encounters.queue);const e=g.combat;
 assert.equal(e.state.hand.length,3);assert.equal(e.state.energy,5);assert.equal(e.state.player.block,12);assert.equal(g.run.nextCombatModifiers.length,0);
 const saved=restore(g);assert.deepEqual(saved.snapshot(),g.snapshot());
 e.endTurn();assert.equal(e.state.energy,3);assert.equal(e.state.hand.length,5);assert.equal(e.state.player.block,0);
 g.startCombat(encounters.queue);assert.equal(g.combat.state.energy,3);assert.equal(g.combat.state.hand.length,5);assert.equal(g.combat.state.player.block,0);
});
test('opening draw modifier combines with file tray and does not repeat on pending choice reload',()=>{const g=new Game({variantId:'red'});g.run.nextCombatModifiers=[{firstTurnDrawDelta:-2}];g.startCombat(encounters.queue);assert.equal(g.combat.state.hand.length,6);const b=restore(g);assert.equal(b.combat.state.hand.length,6);settleChoices(b.combat);assert.equal(b.combat.state.hand.length,5);});
test('placeholder enemies grow stronger in every Act; Boss reward advances through exactly three Acts',()=>{
 assert.ok(enemies.queue2.hp>enemies.queue.hp);assert.ok(enemies.queue3.hp>enemies.queue2.hp);
 const g=new Game();for(let act=0;act<3;act++){g.run.act=act;g.run.unknownOdds={Combat:.6,Treasure:.2,Shop:.15};g.startCombat(encounters[act?`director${act+1}`:'director']);g.debug('win');g.finishCombat();assert.ok(g.run.reward.cards.every(id=>cards[id].rarity==='rare'));g.claimReward();assert.equal(g.run.screen,act===2?'victory':'map');if(act<2)assert.deepEqual(g.run.unknownOdds,{Combat:.1,Treasure:.02,Shop:.03});}
 assert.equal(g.run.actHistory.length,3);
});
