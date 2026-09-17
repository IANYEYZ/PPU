export function conditionMatches(engine, rule, context = {}) {
  if (!rule) return true;
  if (Array.isArray(rule)) return rule.every(r => conditionMatches(engine, r, context));
  if (rule.fromWorkflow !== undefined && !!context.fromWorkflow !== rule.fromWorkflow) return false;
  const value = rule.metric ? engine.state.metrics[rule.metric] || 0 : rule.field ? context[rule.field] : undefined;
  if (rule.gte !== undefined && !(value >= rule.gte)) return false;
  if (rule.eq !== undefined && value !== rule.eq) return false;
  if (rule.truthy && !value) return false;
  if (rule.falsy && value) return false;
  return true;
}
export function resolveValue(engine, value, context = {}) {
  if (typeof value === 'number') return value;
  if (value === '$stacks') return context.stacks || 0;
  if (value === '$selectedCost') return context.selectedCost || 0;
  if (value?.metric) return engine.state.metrics[value.metric] || 0;
  if (value?.deckScale) {
    const size = ['draw','hand','discard','exhaust'].reduce((total,zone)=>total+engine.state[zone].length,0);
    return value.base + Math.floor(size / value.every) * value.perGroup;
  }
  return 0;
}
