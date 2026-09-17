import { cards as legacyCards } from './legacy-cards.js';
import { clerkCards, starterCards } from './clerk-cards.js';
// Legacy definitions are retained solely to keep pre-card-table saves playable.
export const cards = {
  ...Object.fromEntries(Object.entries(legacyCards).map(([id,card]) => [id,{...card,legacy:true,poolEligible:false}])),
  ...clerkCards,
  ...starterCards,
};
export const activeCards = {...clerkCards,...starterCards};
