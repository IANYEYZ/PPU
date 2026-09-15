import { relics } from '../data/relics.js';
export function bindRelic(engine, relicId) {
  for (const trigger of relics[relicId]?.triggers || []) engine.bus.on(trigger.event, payload => {
    if (trigger.when && trigger.when !== payload.outcome) return;
    engine.effects.execute(trigger.effects, {});
  });
}
