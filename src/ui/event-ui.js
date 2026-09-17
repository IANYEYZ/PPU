import {events} from '../data/events.js';
import {eventOptionAvailability} from '../core/event.js';
import {esc} from './text.js';
const prompts={UpgradeCard:'选择要升级的牌',DowngradeCard:'选择要降级的牌',RemoveCard:'选择要移除的牌',TransformCard:'选择要转化的牌',DuplicateCard:'选择要复制的牌',CardReward:'选择一张牌加入牌组'};
export function renderEvent(game,cardHtml){
  const n=game.run.nodeState,event=events[n.eventId];
  if(!event)return `<span class="node-large-icon">?</span><h1>平静的走廊</h1><p class="event-story">${esc(n.result)}</p>`;
  const heading=`<span class="node-large-icon">?</span><span class="section-label">${esc(event.subtitle)}</span><h1>${esc(event.title)}</h1><p class="event-story">${esc(event.text)}</p>`;
  if(n.eventSelection){const s=n.eventSelection;return `${heading}<section class="event-selection"><h2>${prompts[s.effect.type]}</h2><p class="muted small">${s.effect.type==='DuplicateCard'?'复制品永久加入牌组，保留原牌。':s.effect.type==='TransformCard'?'转化为同稀有度的另一张随机牌。':s.effect.type==='CardReward'?'从下列卡牌中选择一张带走。':'本次选择改变永久牌组。'}${s.effect.upgrade?'复制品会升级。':''}</p><div class="card-grid">${s.options.map(o=>`<div>${cardHtml(o.card,{action:'inspect'})}<button class="secondary event-card-pick" data-action="event-card" data-id="${esc(o.id)}">${s.kind==='reward'?'获得此牌':'选择此牌'} →</button></div>`).join('')}</div></section>${n.eventLog?.length?`<div class="event-log-summary">${n.eventLog.map(t=>`<p>${esc(t)}</p>`).join('')}</div>`:''}`;}
  if(n.resolved)return `${heading}<div class="node-result">✓ ${esc(n.result)}${(n.eventLog||[]).map(t=>`<p>${esc(t)}</p>`).join('')}</div>`;
  return `${heading}<div class="event-choices">${event.choices.map((choice,i)=>{const a=eventOptionAvailability(game,choice);return `<button data-action="event-choice" data-id="${i}" ${a.allowed?'':'disabled'}><span><b>${esc(choice.label)}</b><small>${esc(choice.detail)}${a.allowed?'':` · ${esc(a.reason)}`}</small></span><i>→</i></button>`;}).join('')}</div>`;
}
