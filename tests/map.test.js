import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMap,availableNodes } from '../src/core/map.js';
import { acts } from '../src/data/map-config.js';
function validate(map){
  const nodes=new Map(map.nodes.map(n=>[n.id,n])),boss=map.nodes.filter(n=>n.type==='Boss');
  assert.equal(nodes.size,map.nodes.length);assert.equal(boss.length,1);assert.equal(boss[0].row,map.rooms);
  const reach=new Set(),stack=availableNodes(map,null);assert.ok(stack.length>=1);
  while(stack.length){const n=stack.pop();if(reach.has(n.id))continue;reach.add(n.id);stack.push(...n.next.map(id=>nodes.get(id)));}
  assert.equal(reach.size,nodes.size);
  for(const n of map.nodes){
    assert.ok(Number.isInteger(n.col)&&n.col>=0&&n.col<7);assert.equal(new Set(n.next).size,n.next.length);
    assert.equal(map.nodes.filter(p=>p.row===n.row&&p.col===n.col).length,1);
    assert.ok(n.row===map.rooms||n.next.length>0);assert.ok(n.row===0||map.nodes.some(p=>p.next.includes(n.id)));
    if(n.row===0)assert.equal(n.type,'Combat');if(n.row===map.rooms-7)assert.equal(n.type,'Treasure');if(n.row===map.rooms-1)assert.equal(n.type,'Rest');
    if(n.row<5)assert.ok(!['Elite','Rest'].includes(n.type));if(n.type==='Rest'&&!n.fixed)assert.ok(n.row<map.rooms-3);
    for(const id of n.next){
      const child=nodes.get(id);assert.ok(child);assert.equal(child.row,n.row+1);
      if(child.type!=='Boss')assert.ok(Math.abs(child.col-n.col)<=1);
      if(['Rest','Shop','Elite','Treasure'].includes(n.type))assert.notEqual(child.type,n.type);
      for(const other of map.nodes.filter(p=>p.row===n.row&&p!==n))for(const target of other.next.map(id=>nodes.get(id)))assert.ok((other.col-n.col)*(target.col-child.col)>=0,'crossed edges');
    }
  }
}
test('1500 seeds across three Acts: connected noncrossing paths, fixed rooms, placement restrictions',()=>{for(let i=0;i<1500;i++)validate(generateMap(`MAP-${i}`,acts[i%3].mapConfig));});
test('map seeds reproduce all node types and geometry',()=>{for(let i=0;i<30;i++)assert.deepEqual(generateMap(i),generateMap(i));assert.notDeepEqual(generateMap('a'),generateMap('b'));});
test('three Act room counts and bounded requested distributions',()=>{for(let i=0;i<100;i++)for(const [index,act] of acts.entries()){const map=generateMap(i,act.mapConfig);assert.equal(map.rooms,15-index);assert.equal(map.floors,16-index);assert.equal(map.requested.Shop,3);assert.equal(map.requested.Elite,5);assert.ok(map.requested.Unknown>=10-(index>0?1:0)&&map.requested.Unknown<=14-(index>0?1:0));assert.ok(map.requested.Rest>=(index===2?5:6)&&map.requested.Rest<=(index===2?6:7));}});
test('unpruned map also has safe geometry',()=>{for(let i=0;i<100;i++)validate(generateMap(i,{prune:false}));});
test('available nodes follow only outgoing unvisited edges',()=>{const map=generateMap('route'),first=availableNodes(map,null)[0];assert.deepEqual(availableNodes(map,first.id).map(n=>n.id).sort(),[...first.next].sort());assert.equal(availableNodes(map,first.id,first.next).length,0);});
test('layouts have varied room counts and use Unknown nodes',()=>{const counts=new Set();for(let i=0;i<20;i++){const map=generateMap(i);assert.ok(map.nodes.some(n=>n.type==='Unknown'));for(let row=0;row<map.rooms;row++)counts.add(map.nodes.filter(n=>n.row===row).length);}assert.ok(counts.size>1);});
test('invalid configurations fail explicitly',()=>{for(const config of [{rooms:2},{columns:8},{paths:1},{unknowns:{mean:1,min:4,max:2}}])assert.throws(()=>generateMap('x',config));});
