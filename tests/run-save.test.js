import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { createCard } from '../src/core/card.js';
import { availableNodes } from '../src/core/map.js';
import { encodeSave, decodeSave, persist, loadSaved } from '../src/core/save.js';
import { characterVariants, characterClasses } from '../src/data/characters.js';
import { cards } from '../src/data/cards.js';
import { encounters } from '../src/data/enemies.js';
import { settleChoices,settleEvent } from './helpers.js';
function roundtrip(game) { return new Game({saved:decodeSave(encodeSave(game))}); }
test('variants share class card pool but have distinct decks and relics',()=>{const games=characterVariants.map(v=>new Game({variantId:v.id,seed:'s'}));assert.ok(games.every(g=>g.character===characterClasses.clerk));assert.equal(new Set(games.map(g=>g.run.relics[0])).size,3);assert.notDeepEqual(games[0].run.deck.map(c=>c.definitionId),games[1].run.deck.map(c=>c.definitionId));});
test('save/load preserves permanent modifications, all combat zones, copies, powers and independent workflow cursors',()=>{
  const game=new Game({seed:'save'});game.run.deck[0].upgrade=1;game.run.deck[0].modifiers.push({costDelta:-1,copyable:true});game.enterNode(game.run.map.nodes.find(n=>n.row===0).id);settleChoices(game.combat);const e=game.combat;
  e.state.hand=Array.from({length:8},(_,i)=>createCard('defend',`save-${i}`,{upgrade:i%2,annotations:[{label:'kept',effects:[{type:'block',amount:i}]}],isCopy:i===0}));
  for(let i=0;i<6;i++)e.act('workflow:add',{cardId:e.state.hand[0].id,free:true});e.startTurn();e.act('workflow:add',{cardId:e.state.hand[0].id,free:true});
  e.effects.execute([{type:'power',power:'steady',amount:3}],{});
  const copy=roundtrip(game);assert.deepEqual(copy.snapshot(),game.snapshot());
  game.combat.endTurn();copy.combat.endTurn();assert.deepEqual(copy.snapshot(),game.snapshot());
  assert.equal(copy.combat.state.extensions.clerk.workflows.length,2);assert.equal(copy.combat.state.extensions.clerk.pending.length,1);
});
test('saving a reward or ending does not accidentally resume the finished combat',()=>{
  const game=new Game();game.enterNode(game.run.map.nodes.find(n=>n.row===0).id);settleChoices(game.combat);game.combat.state.enemies.forEach(e=>e.hp=0);game.combat.checkOutcome();game.finishCombat();const copy=roundtrip(game);assert.equal(copy.run.screen,'reward');
  const gold=copy.run.gold;copy.claimReward(copy.run.reward.cards[0]);assert.equal(copy.run.deck.length,11);assert.ok(copy.run.gold>gold);const paid=copy.run.gold;copy.claimReward();assert.equal(copy.run.gold,paid);assert.equal(roundtrip(copy).run.screen,'map');
});
test('reloading finished combat does not fire combat start or combat end twice',()=>{const game=new Game();game.enterNode(game.run.map.nodes.find(n=>n.row===0).id);settleChoices(game.combat);game.debug('win');const count=game.combat.state.log.length;const copy=roundtrip(game);assert.equal(copy.combat.state.log.length,count);assert.equal(copy.combat.state.outcome,'victory');});
test('node can only be entered from map through a current connection',()=>{const game=new Game();assert.throws(()=>game.enterNode('3-0'));game.enterNode(game.run.map.nodes.find(n=>n.row===0).id);settleChoices(game.combat);assert.throws(()=>game.enterNode('1-0'));});
test('shop purchases, removal and rest upgrades persist without duplicate spending',()=>{
  const game=new Game();const node=game.run.map.nodes[0];node.type='Shop';game.enterNode(node.id);game.run.gold=300;game.buy('card',0);const gold=game.run.gold;assert.throws(()=>game.buy('card',0));assert.equal(game.run.gold,gold);game.run.nodeState.selection='remove';const id=game.run.deck[0].id;game.selectDeckCard(id,'remove');assert.ok(!game.run.deck.some(c=>c.id===id));assert.equal(game.run.gold,gold-50);assert.equal(roundtrip(game).run.nodeState.removed,true);
  game.run.screen='map';const next=availableNodes(game.run.map,game.run.currentNode,game.run.visited)[0];next.type='Rest';game.enterNode(next.id);game.run.nodeState.selection='upgrade';game.selectDeckCard(game.run.deck[0].id,'upgrade');assert.equal(game.run.deck[0].upgrade,1);assert.equal(game.run.nodeState.resolved,true);
});
test('events charge once, enforce affordability and apply deck choices',()=>{const game=new Game();game.run.map.nodes[0].type='Event';game.enterNode(game.run.map.nodes.find(n=>n.row===0).id);settleChoices(game.combat);game.run.nodeState.eventId='vending';game.run.gold=0;assert.throws(()=>game.eventChoice(0));assert.equal(game.run.nodeState.resolved,undefined);game.eventChoice(1);assert.equal(game.run.hp,game.run.maxHp-5);assert.equal(game.run.nodeState.eventSelection.effect.type,'UpgradeCard');assert.throws(()=>game.eventChoice(1));});
test('three-act vertical slice reaches victory via connected nodes and preserves run summary',()=>{
  const game=new Game({seed:'slice'});
  while(game.run.screen!=='victory') {
    const next=availableNodes(game.run.map,game.run.currentNode,game.run.visited)[0];assert.ok(next);game.enterNode(next.id);
    if(game.run.screen==='combat'){settleChoices(game.combat);game.combat.state.enemies.forEach(e=>e.hp=0);game.combat.checkOutcome();game.finishCombat();game.claimReward();}
    else {if(game.run.nodeState.type==='Treasure')game.treasure();if(game.run.nodeState.type==='Rest')game.rest();if(game.run.nodeState.type==='Event')settleEvent(game);game.leaveNode();}
  }
  assert.equal(game.run.visited.length,game.run.map.floors);assert.ok(game.run.battlesWon>0);assert.equal(roundtrip(game).run.screen,'victory');
});
test('real card actions and enemy turns can defeat Boss without debug tools',()=>{
  const game=new Game({seed:'boss-proof'});game.run.deck=['strike','strike','defend','defend','routine','routine','coffee','staple','power','weaken'].map((id,i)=>createCard(id,`proof-${i}`,{upgrade:1}));game.run.hp=game.run.maxHp;game.startCombat(encounters.director);settleChoices(game.combat);let turns=0;
  while(!game.combat.state.outcome && turns++<80) {const e=game.combat;for(const type of ['coffee','power','weaken','staple','routine','strike','defend']){for(const c of [...e.state.hand].filter(c=>c.definitionId===type)){if(e.state.outcome)break;const def=e.resolve(c);if(e.state.energy>=def.cost)e.play(c.id,{enemyId:e.state.enemies.find(e=>e.hp>0)?.id});}}if(!e.state.outcome)e.endTurn();}
  assert.equal(game.combat.state.outcome,'victory');assert.equal(game.run.debugUsed,false);
});
test('storage roundtrip and corrupt/incompatible files',()=>{const store=new Map();const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};assert.equal(loadSaved(storage),null);const game=new Game();persist(game,storage);assert.deepEqual(loadSaved(storage),game.snapshot());assert.throws(()=>decodeSave('{'));assert.throws(()=>decodeSave('{"version":9}'));});
test('all placeholder cards use definitions with valid composable effect arrays',()=>{for(const [id,card] of Object.entries(cards)){assert.ok(card.name,id);assert.ok(Array.isArray(card.effects),id);assert.ok(card.cost>=0,id);assert.ok(['Attack','Skill','Power'].includes(card.type),id);}});
