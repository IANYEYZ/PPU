export function choiceCandidates(engine, effect, context) {
  if (effect.kind === 'annotation') {
    const card = engine.findCard(context.cardId);
    return (card?.annotations || []).map((modifier, index) => ({ id: String(index), modifier: structuredClone(modifier), cardId: card.id }));
  }
  if (effect.kind === 'generated') return context.generatedOptions || [];
  if (effect.kind === 'workflow') return engine.extension?.choiceWorkflows?.(engine, effect, context) || [];
  let list = [...(engine.state[effect.zone || 'hand'] || [])].filter(card => card.id !== context.sourceId);
  if (effect.onlyDrawn) list = list.filter(card => context.lastDrawn?.includes(card.id));
  if (effect.filter === 'copy') list = list.filter(card => card.isCopy);
  if (effect.filter === 'annotated') list = list.filter(card => card.annotations.length);
  if (effect.excludeAnnotationSource) list = list.filter(card => card.id !== context.annotationSourceId);
  return list.map(card => ({ id: card.id, card: structuredClone(card) }));
}
export function openChoice(engine, effect, context) {
  const options = choiceCandidates(engine, effect, context);
  if (!options.length || engine.state.enemies.every(e => e.hp <= 0)) return;
  const max = Math.min(options.length, effect.max === 'all' ? options.length : effect.max ?? 1);
  const min = Math.min(max, effect.min ?? max);
  engine.state.nextChoiceId=(engine.state.nextChoiceId || 0)+1;
  const choice = { id:engine.state.nextChoiceId,effect: structuredClone(effect), context: structuredClone(context), options, min, max };
  if (context.fromWorkflow) completeChoice(engine, choice, options.slice(0, max).map(o => o.id));
  else engine.state.choice = choice;
}
export function completeChoice(engine, choice, ids) {
  if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.length < choice.min || ids.length > choice.max || ids.some(id => !choice.options.some(o => o.id === id))) throw new Error(`请选择 ${choice.min === choice.max ? choice.min : `${choice.min}–${choice.max}`} 项。`);
  const { effect, context } = choice;
  if (!ids.length) return;
  if (effect.kind === 'annotation') {
    const selected = choice.options.find(o => o.id === ids[0]);
    engine.effects.execute(effect.then, { ...context, selectedAnnotation: selected.modifier, annotationSourceId: selected.cardId });
  } else if (effect.kind === 'workflow') {
    for (const workflowId of ids) engine.effects.execute(effect.then, { ...context, workflowId: Number(workflowId) });
  } else {
    for (const [selectionIndex, id] of ids.entries()) {
      const selected = choice.options.find(o => o.id === id);
      const card = engine.findCard(id) || selected.card;
      engine.effects.execute(effect.then, { ...context, cardId: id, selectedCard: card, selectedCost: card ? engine.resolve(card).cost : 0, hadAnnotations: !!card?.annotations.length, selectionIndex, selectionCount: ids.length });
    }
  }
}
