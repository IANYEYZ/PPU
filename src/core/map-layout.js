// Rule-based implementation of STS2 segment matching and prune/repair.
export const parentsOf=(nodes,node)=>nodes.filter(n=>n.next.includes(node.id));
export function pruneDuplicateSegments(nodes,rng){
  // The virtual entrance participates in pruning but is never a playable room.
  const entrance={id:'entrance',row:-1,col:3,type:'Entrance',next:nodes.filter(n=>n.row===0).map(n=>n.id)};
  const all=()=>[entrance,...nodes],get=id=>id===entrance.id?entrance:nodes.find(n=>n.id===id);
  const parents=n=>parentsOf(all(),n);let removed=0;
  const remove=n=>{for(const p of parents(n))p.next=p.next.filter(id=>id!==n.id);nodes.splice(nodes.indexOf(n),1);removed++;};
  for(let pass=0;pass<50;pass++){
    const groups=new Map();
    // Enumerate each branch-to-merge segment once instead of whole-run paths.
    for(const start of all().filter(n=>n.next.length>1||n===entrance)){
      const visit=path=>{
        const end=path.at(-1);
        if(path.length>=3&&parents(end).length>=2){
          const key=`${start.id}:${end.id}:${path.map(n=>n.type).join('/')}`,matches=groups.get(key)||[];
          if(!matches.some(other=>path.slice(1,-1).some((n,i)=>n===other[i+1])))matches.push(path);
          groups.set(key,matches);
        }
        for(const id of end.next)visit([...path,get(id)]);
      };
      visit([start]);
    }
    let changed=false;
    for(const group of groups.values()){
      if(group.length<2)continue;const matches=rng.shuffle(group);let prunedSegments=0;
      for(const path of matches){
        if(prunedSegments>=matches.length-1)break;
        let didPrune=false;
        for(let i=0;i<path.length-1;i++){
          const n=path[i];if(n===entrance)continue;if(!nodes.includes(n)){didPrune=true;break;}
          if(n.next.length>1||parents(n).length>1||parents(n).some(p=>p.next.length===1))continue;
          const suffix=path.slice(i);
          if(suffix.some(p=>p.next.length>1&&parents(p).length===1))continue;
          if(parents(path.at(-1)).length<=1)break;
          if(n.next.map(get).some(child=>!path.includes(child)&&parents(child).length===1))continue;
          remove(n);didPrune=true;
        }
        if(didPrune)prunedSegments++;
      }
      if(prunedSegments){changed=true;break;}
      for(const path of matches){
        for(let i=0;i<path.length-1;i++){
          const n=path[i],child=path[i+1];
          if(n.next.length>=2&&parents(child).length>1&&n.next.includes(child.id)){n.next=n.next.filter(id=>id!==child.id);changed=true;}
        }
        if(changed)break;
      }
      if(changed)break;
    }
    if(!changed)return removed;
  }
  throw new Error('Map pruning failed to converge');
}
export function layoutMap(nodes,columns,rooms){
  const points=nodes.filter(n=>n.row<rooms),used=new Set(points.map(n=>n.col));
  const leftEmpty=!used.has(0)&&!used.has(1),rightEmpty=!used.has(columns-1)&&!used.has(columns-2);
  if(leftEmpty!==rightEmpty)for(const n of points)n.col+=leftEmpty?-1:1;
  const neighbors=n=>[...parentsOf(nodes,n),...n.next.map(id=>nodes.find(p=>p.id===id))].filter(p=>p.row<rooms);
  const canMove=(n,col)=>col>=0&&col<columns&&!points.some(p=>p!==n&&p.row===n.row&&p.col===col)&&neighbors(n).every(p=>Math.abs(p.col-col)<=1);
  for(let row=0;row<rooms;row++){
    const layer=points.filter(n=>n.row===row).sort((a,b)=>a.col-b.col);
    for(let pass=0;pass<columns;pass++){
      let changed=false;
      for(const n of layer){
        const gap=col=>Math.min(...layer.filter(p=>p!==n).map(p=>Math.abs(p.col-col)));
        let best=n.col;
        for(let col=0;col<columns;col++){
          // Retain left-to-right ordering, which also prevents new crossings.
          if(!canMove(n,col)||layer.some(p=>p!==n&&(p.col-n.col)*(p.col-col)<=0))continue;
          if(gap(col)>gap(best))best=col;
        }
        if(best!==n.col){n.col=best;changed=true;}
      }
      if(!changed)break;
    }
    for(const n of layer){
      const parents=parentsOf(nodes,n),children=n.next.map(id=>nodes.find(p=>p.id===id));
      if(parents.length!==1||children.length!==1)continue;
      const dir=Math.sign(parents[0].col-n.col);
      if(dir&&dir===Math.sign(children[0].col-n.col)&&canMove(n,n.col+dir))n.col+=dir;
    }
  }
  for(const n of nodes)n.x=(n.col+.5)/columns;
}
