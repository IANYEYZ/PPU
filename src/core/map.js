import { Random } from './random.js';
import { mapConfig } from '../data/map-config.js';
import { parentsOf,pruneDuplicateSegments,layoutMap } from './map-layout.js';
export function gaussianCount(rng,{mean,min,max,uniform=false}){
  if(uniform)return rng.int(min,max);
  for(let i=0;i<1000;i++){
    const sample=Math.round(mean+Math.sqrt(-2*Math.log(1-rng.next()))*Math.sin(2*Math.PI*(1-rng.next())));
    if(sample>=min&&sample<=max)return sample;
  }
  throw new Error('Invalid truncated Gaussian configuration');
}
export function generateMap(seed,config=mapConfig){
  const c={...mapConfig,...config},rng=new Random(seed),nodes=[];
  if(!Number.isInteger(c.rooms)||c.rooms<9||c.rooms>40||c.columns!==7||!Number.isInteger(c.paths)||c.paths<2||c.paths>20)throw new Error('Map needs 9–40 rooms, 7 columns and 2–20 paths');
  for(const dist of [c.rests,c.unknowns])if(dist.min>dist.max)throw new Error('Invalid room distribution');
  const requested={Rest:gaussianCount(rng,c.rests),Shop:c.shops,Elite:c.elites,Unknown:gaussianCount(rng,c.unknowns)};
  const get=(row,col)=>{
    let n=nodes.find(n=>n.row===row&&n.col===col);
    if(!n){n={id:`${row}-${col}`,row,col,type:null,next:[],fixed:false};nodes.push(n);}
    return n;
  };
  const starts=[];
  for(let i=0;i<c.paths;i++){
    let col=rng.int(0,6);if(i===1)while(col===starts[0])col=rng.int(0,6);starts.push(col);
    let current=get(0,col);
    for(let row=1;row<c.rooms;row++){
      const col=rng.shuffle([-1,0,1]).map(d=>Math.max(0,Math.min(6,current.col+d))).find(col=>!nodes.some(n=>n.row===row-1&&n.col!==current.col&&n.next.some(id=>{const child=nodes.find(p=>p.id===id);return (n.col-current.col)*(child.col-col)<0;})));
      const child=get(row,col);if(!current.next.includes(child.id))current.next.push(child.id);current=child;
    }
  }
  const boss=get(c.rooms,3);boss.type='Boss';boss.fixed=true;
  for(const n of nodes){
    if(n.row===c.rooms-1){n.type='Rest';n.next=[boss.id];n.fixed=true;}
    else if(n.row===c.rooms-7){n.type='Treasure';n.fixed=true;}
    else if(n.row===0){n.type='Combat';n.fixed=true;}
  }
  const valid=(node,type)=>{
    if(['Rest','Elite'].includes(type)&&node.row<5)return false;
    if(type==='Rest'&&node.row>=c.rooms-3)return false;
    const parents=parentsOf(nodes,node),children=node.next.map(id=>nodes.find(n=>n.id===id));
    if(['Elite','Rest','Treasure','Shop'].includes(type)&&[...parents,...children].some(n=>n.type===type))return false;
    const siblings=parents.flatMap(p=>p.next).filter(id=>id!==node.id);
    return !siblings.some(id=>nodes.find(n=>n.id===id)?.type===type);
  };
  const queue=Object.entries(requested).flatMap(([type,count])=>Array(count).fill(type));
  for(let pass=0;pass<3&&queue.length;pass++)for(const n of rng.shuffle(nodes.filter(n=>!n.type).sort((a,b)=>a.col-b.col||a.row-b.row))){
    for(let i=queue.length;i>0;i--){const type=queue.shift();if(valid(n,type)){n.type=type;break;}queue.push(type);}
  }
  for(const n of nodes)n.type??='Combat';
  let pruned=0;
  if(c.prune)for(let pass=0;pass<3;pass++){
    pruned+=pruneDuplicateSegments(nodes,rng);let repaired=false;
    for(const type of ['Shop','Elite','Rest','Unknown']){
      let missing=requested[type]-nodes.filter(n=>n.type===type).length;
      for(const n of rng.shuffle(nodes.filter(n=>!n.fixed&&n.type==='Combat'))){if(missing<=0)break;if(valid(n,type)){n.type=type;missing--;repaired=true;}}
    }
    if(!repaired)break;
  }
  layoutMap(nodes,c.columns,c.rooms);
  nodes.sort((a,b)=>a.row-b.row||a.col-b.col);
  return {version:2,seed:String(seed),floors:c.rooms+1,rooms:c.rooms,columns:c.columns,requested,pruned,nodes};
}
export function availableNodes(map,currentId,visited=[]){
  if(!currentId)return map.nodes.filter(n=>n.row===0);
  const current=map.nodes.find(n=>n.id===currentId);
  return map.nodes.filter(n=>current?.next.includes(n.id)&&!visited.includes(n.id));
}
