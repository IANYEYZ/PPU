import { cards } from '../data/cards.js';
import { relics } from '../data/relics.js';
export const RARITY_BASE={Combat:{common:.60,uncommon:.37,rare:.03},Elite:{common:.50,uncommon:.40,rare:.10},Boss:{common:0,uncommon:0,rare:1},Shop:{common:.54,uncommon:.37,rare:.09}};
export const createRarityOdds=()=>({offset:-.05});
export function rollCardRarity(rng,context='Combat',odds=createRarityOdds()){
  const base=RARITY_BASE[context];if(!base)throw new Error('Unknown reward context');
  const threshold=base.rare+(['Shop','Boss'].includes(context)?0:odds.offset),roll=rng.next();
  const rarity=roll<threshold?'rare':roll<threshold+base.uncommon?'uncommon':'common';
  if(context!=='Shop')odds.offset=rarity==='rare'?-.05:Math.min(.4,Math.round((odds.offset+.01)*100)/100);
  return rarity;
}
export function eligibleCardPool(character,rarity){return character.cardPool.filter(id=>cards[id]?.rarity!=='basic'&&cards[id]?.poolEligible!==false&&(!rarity||cards[id].rarity===rarity));}
export function cardOffers(rng, character, count = 3, {context='Combat',odds=createRarityOdds(),rarity=null,uniform=false}={}) {
  const remaining=eligibleCardPool(character,rarity);
  const result=[];
  while(result.length<count && remaining.length){
    const rolled=rarity || (uniform?null:rollCardRarity(rng,context,odds));
    const candidates=rolled?remaining.filter(id=>cards[id].rarity===rolled):remaining;
    const id=rng.pick(candidates.length?candidates:remaining);result.push(id);remaining.splice(remaining.indexOf(id),1);
  }
  return result;
}
export function relicOffer(rng, owned, rarity=null) { return rng.pick(Object.keys(relics).filter(id => !owned.includes(id) && !relics[id].starter && !relics[id].legacy && (!rarity || (relics[id].rarity || 'common')===rarity))) || null; }
export function combatReward(rng, character, owned, encounter,odds=createRarityOdds()) { return { cards: cardOffers(rng, character,3,{context:encounter.boss?'Boss':encounter.elite?'Elite':'Combat',odds}), gold: encounter.boss ? 80 : encounter.elite ? 40 : rng.int(18, 27), relic: encounter.elite || encounter.boss ? relicOffer(rng, owned) : null, claimed: false }; }
