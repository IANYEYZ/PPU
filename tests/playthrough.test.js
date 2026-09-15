import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { availableNodes } from '../src/core/map.js';
import { intent } from '../src/core/enemy.js';
import { targetingFor } from '../src/core/target.js';
import { attackDamage } from '../src/core/status.js';
// A small acceptance-test player. Uses only legal actions, visible hand/intent,
// connected routes and earned resources. No debug actions or state boosts.
function playCombat(engine) {
  let rounds = 0;
  while (!engine.state.outcome && rounds++ < 100) {
    for (let actions = 0; actions < 60 && !engine.state.outcome; actions++) {
      const s = engine.state, alive = s.enemies.filter(e => e.hp > 0);
      const incoming = alive.reduce((sum,e) => { const i = intent(e); return sum + (i.kind === 'attack' ? i.amount * (i.hits || 1) : 0); }, 0);
      const enemy = [...alive].sort((a,b)=>(a.hp+a.block)-(b.hp+b.block))[0];
      const attack = s.hand.filter(c=>engine.resolve(c).type==='Attack').sort((a,b)=>engine.resolve(b).effects.reduce((n,e)=>n+(e.type==='damage'?e.amount:0),0)-engine.resolve(a).effects.reduce((n,e)=>n+(e.type==='damage'?e.amount:0),0))[0];
      const choices = s.hand.map(c => {
        const r=engine.resolve(c), needs=targetingFor(r); let score = -100, target = attack || s.hand.find(t=>t.id!==c.id);
        if (r.cost>s.energy || (needs.card && (!target || target.id===c.id))) return {score};
        const damage=r.effects.reduce((n,e)=>n+(e.type==='damage'?attackDamage(s.player,e.amount)*(e.target==='allEnemies'?alive.length:1):0),0);
        if (r.type==='Attack') score=20 + damage / Math.max(1,r.cost) + (damage>=enemy.hp+enemy.block?100:0);
        if (r.effects.some(e=>e.type==='block')) score=Math.max(score,incoming>s.player.block ? 22 + Math.min(incoming-s.player.block,r.effects.filter(e=>e.type==='block').reduce((n,e)=>n+e.amount,0)) : 0);
        if (r.type==='Power') score=s.turn<5?48:4;
        if (r.effects.some(e=>e.type==='energy')) score=95;
        if (r.effects.some(e=>e.type==='annotate')) score=70;
        if (r.effects.some(e=>e.type==='copy') && attack && s.energy>=r.cost+engine.resolve(attack).cost+1) score=43;
        if (r.effects.some(e=>e.type==='draw') && s.energy>r.cost) score=Math.max(score,14);
        if (r.effects.some(e=>e.type==='workflow:add')) score=-100;
        if (r.effects.some(e=>e.type==='exhaust')) score=-100;
        return {c,score,targets:{enemyId:enemy.id,cardId:target?.id}};
      }).filter(c=>c.score>=0).sort((a,b)=>b.score-a.score);
      if(!choices.length)break;
      engine.play(choices[0].c.id,choices[0].targets);
    }
    if(!engine.state.outcome)engine.endTurn();
  }
  return engine.state.outcome;
}
function playRun(variantId, seed) {
  const game=new Game({variantId,seed});
  for(let floors=0;floors<15 && !['victory','defeat'].includes(game.run.screen);floors++) {
    const priorities={Treasure:8,Rest:game.run.hp<55?9:5,Event:7,Shop:game.run.gold>=50?6:2,Combat:3,Elite:1,Boss:10};
    const node=availableNodes(game.run.map,game.run.currentNode,game.run.visited).sort((a,b)=>priorities[b.type]-priorities[a.type])[0];
    game.enterNode(node.id);
    if(game.run.screen==='combat') {
      playCombat(game.combat);game.finishCombat();if(game.run.screen==='defeat')break;
      const ranking=['power','weaken','staple','routine','circulate','coffee','retain','annotate','read'];
      const offer=game.run.reward.cards.filter(id=>ranking.includes(id)).sort((a,b)=>ranking.indexOf(a)-ranking.indexOf(b))[0];game.claimReward(offer || null);
    } else {
      const n=game.run.nodeState;
      if(n.type==='Rest')game.rest();
      if(n.type==='Treasure')game.treasure();
      if(n.type==='Event'){if(n.eventId==='vending')game.eventChoice(game.run.gold>=15?0:2);if(n.eventId==='lost')game.eventChoice(game.run.gold>=30?0:1);if(n.eventId==='window')game.eventChoice(1);}
      if(n.type==='Shop'){for(let i=0;i<n.cards.length;i++)if(['power','staple','weaken','routine'].includes(n.cards[i].id)&&game.run.gold>=n.cards[i].price)game.buy('card',i);}
      game.leaveNode();
    }
  }
  return game;
}
test('complete legal playthrough from each starting variant through a seeded map and Boss',()=>{
  const results=[];
  for(const variant of ['red','carbon','archive']) {
    const victories=[];
    for(let i=0;i<12;i++){const game=playRun(variant,`ACCEPTANCE-${i}`);if(game.run.screen==='victory')victories.push({seed:game.run.seed,hp:game.run.hp});assert.equal(game.run.debugUsed,false);}
    results.push({variant,victories});assert.ok(victories.length>0,`${variant}: no complete victories`);
  }
  console.log('Legal playthroughs:',JSON.stringify(results));
});
