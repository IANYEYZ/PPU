export function createCard(definitionId, id, options = {}) {
  return { id, definitionId, upgrade: 0, annotations: [], modifiers: [], isCopy: false, sourceId: null, rootSourceId: null, ...structuredClone(options) };
}
export function resolvedCard(card, definitions) {
  const def = definitions[card.definitionId];
  if (!def) throw new Error(`Unknown card: ${card.definitionId}`);
  const result = { ...structuredClone(def), definitionId: card.definitionId, upgrade: card.upgrade };
  if (card.upgrade && def.upgrade) Object.assign(result, structuredClone(def.upgrade));
  result.keywords = [...(result.keywords || [])];
  result.effects = [...(result.effects || [])];
  for (const mod of [...(card.modifiers || []), ...(card.annotations || [])]) {
    result.cost = Math.max(0, result.cost + (mod.costDelta || 0));
    result.effects.push(...structuredClone(mod.effects || []));
    result.keywords.push(...(mod.keywords || []));
    if (mod.effectAdjustments) for (const effect of result.effects) for (const rule of mod.effectAdjustments) if (effect.type === rule.type) effect.amount = Math.max(0, (effect.amount || 0) + rule.amountDelta);
  }
  if (card.isCopy) result.keywords.push('Ethereal');
  result.keywords = [...new Set(result.keywords)];
  result.name = def.name + (card.upgrade ? '+' : '');
  return result;
}
export function upgradeCard(card) { card.upgrade = 1; return card; }
export function copyCard(source, id) {
  const result = structuredClone(source);
  result.id = id; result.isCopy = true; result.sourceId = source.id; result.rootSourceId = source.rootSourceId || source.id;
  result.modifiers = result.modifiers.filter(mod => mod.copyable !== false);
  return result;
}
