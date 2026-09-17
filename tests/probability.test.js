import test from 'node:test';
import assert from 'node:assert/strict';
import { rollCardRarity,createRarityOdds,cardOffers } from '../src/core/reward.js';
import { rollUnknownRoom,createUnknownOdds } from '../src/core/unknown-room.js';
import { Random } from '../src/core/random.js';
import { Game } from '../src/core/game.js';
import { characterClasses } from '../src/data/characters.js';
import { cards } from '../src/data/cards.js';
const fixed=n=>({next:()=>n});
test('reward threshold boundaries honor negative starting rare offset',()=>{
 assert.equal(rollCardRarity(fixed(0),'Combat',createRarityOdds()),'uncommon');assert.equal(rollCardRarity(fixed(.3499),'Combat',createRarityOdds()),'uncommon');assert.equal(rollCardRarity(fixed(.3501),'Combat',createRarityOdds()),'common');
 for(const [context,rare,blue] of [['Combat',.03,.37],['Elite',.10,.40],['Shop',.09,.37]]){
  assert.equal(rollCardRarity(fixed(rare-.00001),context,{offset:0}),'rare');assert.equal(rollCardRarity(fixed(rare+.00001),context,{offset:0}),'uncommon');assert.equal(rollCardRarity(fixed(rare+blue+.00001),context,{offset:0}),'common');
 }
});
test('nonrare cards increment pity per generated card, rare resets, cap holds, shops leave it untouched',()=>{
 const odds=createRarityOdds();rollCardRarity(fixed(.1),'Combat',odds);assert.equal(odds.offset,-.04);rollCardRarity(fixed(.9),'Combat',odds);assert.equal(odds.offset,-.03);
 for(let i=0;i<100;i++)rollCardRarity(fixed(.99),'Combat',odds);assert.equal(odds.offset,.4);
 rollCardRarity(fixed(.01),'Shop',odds);assert.equal(odds.offset,.4);rollCardRarity(fixed(0),'Combat',odds);assert.equal(odds.offset,-.05);
 odds.offset=.4;assert.equal(rollCardRarity(fixed(.999),'Boss',odds),'rare');assert.equal(odds.offset,-.05);
});
test('distinct offers, exact rarity for events, Boss all rare; shop and event packs do not change pity',()=>{
 const rng=new Random('offers'),odds={offset:.2};for(const context of ['Shop','Boss']){const ids=cardOffers(rng,characterClasses.clerk,3,{context,odds});assert.equal(new Set(ids).size,3);if(context==='Boss')assert.ok(ids.every(id=>cards[id].rarity==='rare'));else assert.equal(odds.offset,.2);}
 const before=odds.offset,ids=cardOffers(rng,characterClasses.clerk,3,{rarity:'uncommon',odds});assert.ok(ids.every(id=>cards[id].rarity==='uncommon'));assert.equal(odds.offset,before);
 const narrow={cardPool:ids.slice(0,1)};assert.equal(cardOffers(rng,narrow,3,{rarity:'uncommon'}).length,1);assert.equal(cardOffers(rng,narrow,3,{rarity:'rare'}).length,0);
});
test('unknown initial distribution boundaries and adaptive reset/increments',()=>{
 for(const [roll,result] of [[0,'Combat'],[.0999,'Combat'],[.1001,'Treasure'],[.1199,'Treasure'],[.1201,'Shop'],[.1499,'Shop'],[.1501,'Event'],[.99,'Event']])assert.equal(rollUnknownRoom(fixed(roll),createUnknownOdds()),result);
 const odds=createUnknownOdds();rollUnknownRoom(fixed(.99),odds);assert.deepEqual(odds,{Combat:.2,Treasure:.04,Shop:.06});rollUnknownRoom(fixed(0),odds);assert.deepEqual(odds,{Combat:.1,Treasure:.06,Shop:.09});
 const shop=odds.Shop;rollUnknownRoom(fixed(.2),odds,['Shop']);assert.equal(odds.Shop,shop);
});
test('unknown resolution is separate from displayed map, no event selection on non-event results, deterministic reload',()=>{
 for(let i=0;i<25;i++){const g=new Game({seed:`unknown-${i}`}),n=g.run.map.nodes.find(n=>n.type==='Unknown'),map=structuredClone(g.run.map),copy=new Game({saved:g.snapshot()});
  g.enterNode(n.id,true);copy.enterNode(n.id,true);assert.deepEqual(g.snapshot(),copy.snapshot());assert.deepEqual(g.run.map,map);assert.equal(g.run.nodeState.mapType,'Unknown');assert.equal(g.run.seenEvents.length,g.run.nodeState.type==='Event'?1:0);
 }
});
test('unknown shops are forbidden immediately after an actual shop or before all-shop destinations',()=>{
 for(const mode of ['previous','next']){const g=new Game({seed:mode}),n=g.run.map.nodes.find(n=>n.type==='Unknown');g.run.unknownOdds={Combat:0,Treasure:0,Shop:1};
  if(mode==='previous')g.run.roomHistory=[{act:0,type:'Shop'}];else for(const id of n.next)g.run.map.nodes.find(n=>n.id===id).type='Shop';
  g.enterNode(n.id,true);assert.equal(g.run.nodeState.type,'Event');assert.equal(g.run.unknownOdds.Shop,1);
 }
});
test('reward and event streams survive JSON roundtrip independently',()=>{
 const a=new Game({seed:'stream'});a.stream('rewards').next();a.stream('events').next();const b=new Game({saved:JSON.parse(JSON.stringify(a.snapshot()))});
 for(let i=0;i<15;i++){assert.deepEqual(cardOffers(a.stream('rewards'),a.character,3,{odds:a.run.rarityOdds}),cardOffers(b.stream('rewards'),b.character,3,{odds:b.run.rarityOdds}));assert.equal(a.stream('events').next(),b.stream('events').next());}
});
