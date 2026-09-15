import { cards } from '../data/cards.js';
import { relics } from '../data/relics.js';
export function cardOffers(rng, character, count = 3) { return rng.shuffle(character.cardPool.filter(id => cards[id]?.rarity !== 'basic')).slice(0, count); }
export function relicOffer(rng, owned) { return rng.pick(Object.keys(relics).filter(id => !owned.includes(id))) || null; }
export function combatReward(rng, character, owned, encounter) { return { cards: cardOffers(rng, character), gold: encounter.boss ? 80 : encounter.elite ? 40 : rng.int(18, 27), relic: encounter.elite || encounter.boss ? relicOffer(rng, owned) : null, claimed: false }; }
