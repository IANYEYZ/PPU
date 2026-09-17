import { relics } from '../data/relics.js';
import { bindTriggers } from './triggers.js';
export function bindRelic(engine, relicId) {
  bindTriggers(engine,`relic:${relicId}`,relics[relicId]?.triggers);
}
