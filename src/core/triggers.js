import { conditionMatches } from './conditions.js';
export function bindTriggers(engine, owner, triggers, stacks = () => 1, priority = 0) {
  for (const [index, trigger] of (triggers || []).entries()) {
    engine.bus.on(trigger.event, payload => {
      if (trigger.when && trigger.when !== payload.outcome) return;
      if (!conditionMatches(engine, trigger.condition, payload)) return;
      const key = `${owner}:${index}:${trigger.per === 'turn' ? engine.state.turn : 'combat'}`;
      const limit = trigger.limit === '$stacks' ? stacks() : trigger.limit;
      if (limit !== undefined && (engine.state.triggerUsage[key] || 0) >= limit) return;
      if (limit !== undefined) engine.state.triggerUsage[key] = (engine.state.triggerUsage[key] || 0) + 1;
      engine.effects.execute(trigger.effects || [], { ...structuredClone(payload), stacks: stacks(), triggerOwner: owner, fromTrigger: true });
    }, trigger.priority ?? priority);
  }
}
