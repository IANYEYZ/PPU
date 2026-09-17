import { copyCard, createCard } from '../core/card.js';
export function installClerkEffects(engine) {
  function addAnnotation(card,modifier,context={}) {
    const previousAnnotationCount=card.annotations.length;
    const added=structuredClone(modifier);card.annotations.push(added);
    engine.bus.emit('annotation:added',{cardId:card.id,label:added.label,modifier:added,previousAnnotationCount,annotationCount:card.annotations.length,propagated:!!context.propagated});
  }
  engine.effects.register('annotate',(effect,context)=>{const card=engine.findCard(context.cardId);if(card)addAnnotation(card,effect.modifier,context);});
  engine.effects.register('annotation:transfer',(effect,context)=>{const card=engine.findCard(context.cardId);if(card && context.selectedAnnotation)addAnnotation(card,context.selectedAnnotation);});
  engine.effects.register('annotation:broadcast',(effect,context)=>{
    for(const card of [...engine.state.hand])if(card.id!==context.annotationSourceId && card.id!==context.sourceId)addAnnotation(card,context.selectedAnnotation);
  });
  engine.effects.register('annotation:spread',(effect,context)=>{
    if(context.propagated)return;
    const choices=engine.state.hand.filter(card=>card.id!==context.cardId);
    const card=engine.rng.pick(choices);if(card)addAnnotation(card,context.modifier,{propagated:true});
  });
  engine.effects.register('annotation:double',(effect,context)=>{
    const card=engine.findCard(context.cardId);if(!card)return;
    const doubleEffects=effects=>{for(const e of effects || []){if(typeof e.amount==='number' && e.amount>0)e.amount*=2;doubleEffects(e.then);doubleEffects(e.else);}};
    for(const modifier of card.annotations){doubleEffects(modifier.effects);if(modifier.effectAdjustments)for(const rule of modifier.effectAdjustments)rule.amountDelta*=2;}
    engine.bus.emit('annotation:modified',{cardId:card.id});
  });
  engine.effects.register('annotation:replay',(effect,context)=>{
    const card=engine.findCard(context.cardId),modifier=card?.annotations[0];
    if(modifier)engine.effects.execute(modifier.effects || [],{...context,sourceId:card.id,cardId:engine.state.hand[0]?.id,enemyId:engine.state.enemies.find(e=>e.hp>0)?.id,fromWorkflow:true});
  });
  engine.effects.register('copy',(effect,context)=>{
    let sources=[];
    if(effect.source==='self')sources=[engine.findCard(context.sourceId)];
    else if(effect.source==='previous')sources=[context.previousCard || engine.state.lastPlayed];
    else if(effect.source==='random')sources=[engine.rng.pick(engine.state.hand.filter(c=>c.id!==context.sourceId))];
    else if(effect.source==='allOther')sources=[...engine.state.hand].filter(c=>c.id!==context.sourceId);
    else sources=[engine.findCard(context.cardId)];
    for(const source of sources.filter(Boolean)) {
      // Bonus applies once per copy operation/source, never recursively per clone.
      const count=effect.amount+engine.rule('copyBonus');
      for(let i=0;i<count;i++){
        const card=copyCard(source,engine.nextId());
        if(effect.modifier)card.modifiers.push({...structuredClone(effect.modifier),...(effect.untilTurnEnd?{expiresTurn:engine.state.turn}:{})});
        engine.deck.put(card);
        engine.bus.emit('card:copied',{cardId:card.id,sourceId:source.id,operationIndex:i});
      }
    }
  });
  engine.effects.register('copy:stabilize',(effect,context)=>{
    const targets=effect.all?engine.state.hand:[engine.findCard(context.cardId)];
    for(const card of targets)if(card?.isCopy){card.copyEtherealRemoved=true;engine.bus.emit('copy:stabilized',{cardId:card.id});}
  });
  engine.effects.register('discover',(effect,context)=>{
    const pool=Object.entries(engine.cardDefinitions).filter(([,card])=>card.classId===engine.character.id && card.rarity==='rare' && card.type!=='Power' && card.poolEligible);
    const options=engine.rng.shuffle(pool).slice(0,3).map(([id])=>{
      const card=createCard(id,engine.nextId(),{upgrade:effect.upgraded?1:0,modifiers:[{label:'上级批示',costSet:0,keywords:['AutoWorkflow']}]});return {id:card.id,card};
    });
    engine.effects.execute([{type:'choose',kind:'generated',prompt:'请示上级：选择一张金卡加入手牌',min:1,max:1,then:[{type:'addGenerated'}]}],{...context,generatedOptions:options});
  });
  engine.effects.register('addGenerated',(effect,context)=>{if(context.selectedCard)engine.deck.put(structuredClone(context.selectedCard));});
}
