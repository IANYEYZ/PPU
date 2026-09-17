export function installWorkflows(engine) {
  const state=engine.state.extensions.clerk;
  const pack=()=>{
    if(state.pending.length!==3)throw new Error('一个完整流程需要三张牌。');
    const flow={id:state.nextWorkflowId++,items:state.pending,cursor:0,executions:0};
    state.pending=[];state.workflows.push(flow);
    engine.bus.emit('workflow:packed',{workflowId:flow.id,cardIds:flow.items.map(c=>c.id)});
  };
  const store=(card,context={})=>{
    const removed=engine.deck.remove(card.id);if(!removed)return;
    removed.workflowTargets={enemyId:context.enemyId || null};state.pending.push(removed);
    engine.bus.emit('workflow:added',{cardId:card.id,annotationCount:card.annotations.length});
    if(state.pending.length===3)pack();
  };
  engine.effects.register('workflow:add',(effect,context)=>{const card=engine.findCard(context.cardId);if(card)store(card,context);});
  engine.effects.register('workflow:store',(effect,context)=>{const card=engine.findCard(effect.cardId);if(card)store(card,context);});
  engine.actions.set('workflow:add',({cardId,free=false})=>{
    const card=engine.state.hand.find(c=>c.id===cardId);if(!card)throw new Error('请选择手牌。');
    if(!free && !engine.resolve(card).keywords.includes('AutoWorkflow'))throw new Error('请通过转办等卡牌效果计入流程。');
    if(!free){engine.prepareCard(card);engine.spendEnergy(engine.resolve(card).cost);card.modifiers=card.modifiers.filter(m=>!m.untilPlayed);}
    engine.effects.execute([{type:'workflow:store',cardId}]);
  });
  engine.actions.set('workflow:pack',pack);
  engine.effects.register('workflow:execute',(effect,context)=>{
    const flow=state.workflows.find(f=>f.id===(effect.workflowId ?? context.workflowId));
    if(!flow || engine.state.enemies.every(e=>e.hp<=0))return;
    // A stored card may execute workflows itself. Exclude its ancestors to avoid
    // recursive same-tick loops; subsequent turns remain unrestricted.
    if(context.activeWorkflowIds?.includes(flow.id)){engine.bus.emit('workflow:recursive-skipped',{workflowId:flow.id});return;}
    const index=flow.cursor,card=flow.items[index];flow.cursor=(index+1)%3;flow.executions++;
    const nextContext={...context,sourceId:card.id,enemyId:engine.state.enemies.find(e=>e.hp>0)?.id,cardId:engine.state.hand[0]?.id,fromWorkflow:true,activeWorkflowIds:[...(context.activeWorkflowIds || []),flow.id],workflowId:flow.id,index};
    engine.effects.execute([...engine.resolve(card).effects,{type:'workflow:finished',workflowId:flow.id,cardId:card.id,index}],nextContext);
  });
  engine.effects.register('workflow:finished',(effect,context)=>{
    const card=engine.findCard(effect.cardId);
    engine.bus.emit('workflow:item-executed',{workflowId:effect.workflowId,cardId:effect.cardId,index:effect.index,annotationCount:card?.annotations.length || 0,fromWorkflow:true,activeWorkflowIds:context.activeWorkflowIds});
  });
  engine.effects.register('workflow:advance',(effect,context)=>
    engine.effects.execute([{...effect,type:'workflow:execute'}],context));
  engine.effects.register('workflow:copy',(effect,context)=>{
    const source=state.workflows.find(f=>f.id===(effect.workflowId ?? context.workflowId));if(!source)return;
    const flow=structuredClone(source);flow.id=state.nextWorkflowId++;flow.sourceWorkflowId=source.id;flow.executions=0;
    for(const card of flow.items){card.workflowSourceId=card.id;card.id=engine.nextId();}
    state.workflows.push(flow);engine.bus.emit('workflow:copied',{workflowId:flow.id,sourceWorkflowId:source.id});
  });
  engine.effects.register('workflow:all',(effect,context)=>engine.effects.execute(state.workflows.map(f=>({type:`workflow:${effect.operation}`,workflowId:f.id})),context));
  engine.effects.register('workflow:random-execute',(effect,context)=>{
    const count=effect.amount==='$stacks'?context.stacks:effect.amount;
    engine.effects.execute(engine.rng.shuffle(state.workflows).slice(0,count).map(f=>({type:'workflow:execute',workflowId:f.id})),context);
  });
  engine.effects.register('workflow:turn-complete',()=>engine.bus.emit('workflow:turn-complete',{}));
  engine.bus.on('turn:start',()=>{
    const existing=state.workflows.map(f=>({type:'workflow:execute',workflowId:f.id}));
    engine.effects.execute([...existing,{type:'workflow:turn-complete'}]);
  },100);
}
