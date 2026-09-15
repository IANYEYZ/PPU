import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap, availableNodes } from '../src/core/map.js';
import { mapConfig } from '../src/data/map-config.js';
function validate(map) {
  const nodes=new Map(map.nodes.map(n=>[n.id,n]));const boss=map.nodes.filter(n=>n.type==='Boss');assert.equal(boss.length,1);
  const incoming=new Map(map.nodes.map(n=>[n.id,0]));
  for(const n of map.nodes) {
    assert.equal(new Set(n.next).size,n.next.length);
    if(n.row<map.floors-1) assert.ok(n.next.length>0);
    for(const id of n.next) { assert.ok(nodes.has(id));assert.equal(nodes.get(id).row,n.row+1);incoming.set(id,incoming.get(id)+1); }
    if(n.row>0) assert.ok(map.nodes.some(other=>other.next.includes(n.id)));
    let frontier=[n],seen=new Set();while(frontier.length) {const curr=frontier.pop();if(seen.has(curr.id))continue;seen.add(curr.id);frontier.push(...curr.next.map(id=>nodes.get(id)));}assert.ok(seen.has(boss[0].id));
  }
  const reachable=new Set();const stack=map.nodes.filter(n=>n.row===0);while(stack.length){const n=stack.pop();if(reachable.has(n.id))continue;reachable.add(n.id);stack.push(...n.next.map(id=>nodes.get(id)));}assert.equal(reachable.size,nodes.size);
  assert.ok(map.nodes.some(n=>n.next.length>1));assert.ok([...incoming.values()].some(n=>n>1));assert.ok(availableNodes(map,null).length>1);
}
test('1500 seeds: every node reachable, every choice reaches Boss, no dead ends or isolates, branching and merging',()=>{for(let i=0;i<1500;i++)validate(generateMap(`MAP-${i}`));});
test('same seed and configuration generate byte-identical maps',()=>{for(let i=0;i<100;i++)assert.deepEqual(generateMap(`det-${i}`),generateMap(`det-${i}`));assert.notDeepEqual(generateMap('a'),generateMap('b'));});
test('floor counts, node ranges, Boss-before rest rule and density configuration',()=>{for(let i=0;i<100;i++){const map=generateMap(i,{floors:14,minNodes:2,maxNodes:5,densities:{Elite:0,Shop:0,Rest:0}});assert.equal(map.floors,14);assert.ok(!map.nodes.some(n=>n.type==='Elite'||n.type==='Shop'));assert.ok(map.nodes.filter(n=>n.row===12).every(n=>n.type==='Rest'));for(let row=0;row<13;row++){const count=map.nodes.filter(n=>n.row===row).length;assert.ok(count>=2&&count<=5);}validate(map);}});
test('guaranteed branching also works with zero optional branch probability',()=>{validate(generateMap('zero',{branching:0,minNodes:2,maxNodes:2}));});
test('node choices respect current outgoing connections and visited nodes',()=>{const map=generateMap('route');const first=availableNodes(map,null)[0];const next=availableNodes(map,first.id,[first.id]);assert.deepEqual(next.map(n=>n.id).sort(),[...first.next].sort());assert.equal(availableNodes(map,first.id,[...first.next]).length,0);});
test('irregular node counts occur across seeded layouts',()=>{const counts=new Set();for(let i=0;i<20;i++){const map=generateMap(i);for(let row=0;row<mapConfig.floors-1;row++)counts.add(map.nodes.filter(n=>n.row===row).length);}assert.ok(counts.size>1);});
test('invalid configurations fail explicitly',()=>{assert.throws(()=>generateMap('x',{floors:2}));assert.throws(()=>generateMap('x',{minNodes:1}));});
