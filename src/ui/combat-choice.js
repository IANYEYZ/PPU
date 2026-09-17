import { esc,modifierText } from './text.js';
export const isHandChoice=choice=>!!choice&&!choice.effect.kind&&(!choice.effect.zone||choice.effect.zone==='hand');
export function renderHand(engine,cardHtml,selected){
  const choice=engine.state.choice,active=isHandChoice(choice);
  const hand=engine.state.hand.map(card=>{
    if(!active)return cardHtml(card,{action:'hand'});
    const valid=choice.options.some(o=>o.id===card.id),order=selected.indexOf(card.id);
    return `<div class="hand-choice-card ${valid?'eligible':'ineligible'} ${order>=0?'chosen':''}">${cardHtml(card,{action:'choice-item',disabled:!valid})}${valid?`<span class="choice-order">${order>=0?order+1:'○'}</span>`:''}</div>`;
  }).join('')||'<div class="empty-hand">手里没有文件了。结束回合以继续。</div>';
  const controls=active?`<section class="hand-choice-controls" aria-label="手牌选择"><div><span class="section-label">请直接选择手牌</span><h2>${esc(choice.effect.prompt)}</h2><p>已选 ${selected.length} / ${choice.max}${choice.max>1?' · 按点击顺序结算':''}</p></div><div class="hand-choice-actions">${choice.min===0?'<button class="secondary" data-action="choice-skip">跳过</button>':''}<button class="primary" data-action="choice-confirm" ${selected.length<choice.min||selected.length>choice.max?'disabled':''}>确认选择 →</button></div></section>`:'';
  return `<div class="hand-zone ${active?'selecting-hand':''}">${controls}<div class="hand" aria-label="手牌">${hand}</div></div>`;
}
export function renderCombatChoice(engine,cardHtml,selected) {
  const choice=engine.state.choice;if(!choice)return '';
  if(isHandChoice(choice))return '<div class="hand-choice-veil" aria-hidden="true"></div>';
  const kind=choice.effect.kind,valid=selected.length>=choice.min && selected.length<=choice.max;
  const options=choice.options.map(option=>{
    const order=selected.indexOf(option.id),chosen=order>=0;
    let html;
    if(option.card)html=cardHtml(option.card,{action:'choice-item'});
    else if(kind==='annotation')html=`<button class="annotation-option" data-action="choice-item" data-id="${esc(option.id)}"><b>✒ ${esc(option.modifier.label)}</b><p>${esc(modifierText(option.modifier))}</p></button>`;
    else {const f=option.workflow;html=`<button class="workflow-option" data-action="choice-item" data-id="${f.id}"><b>流程 ${String(f.id).padStart(2,'0')}</b>${f.items.map((c,i)=>`<p class="${i===f.cursor?'next':''}">${i+1} · ${esc(engine.resolve(c).name)} ${i===f.cursor?'← 当前项':''}</p>`).join('')}</button>`;}
    return `<div class="choice-option ${chosen?'chosen':''}">${html}<span class="choice-order">${chosen?order+1:'○'}</span></div>`;
  }).join('');
  return `<div class="combat-choice-backdrop"><section class="combat-choice" role="dialog" aria-modal="true" aria-label="${esc(choice.effect.prompt)}"><div class="choice-heading"><div class="section-label">待完成的操作</div><h2>${esc(choice.effect.prompt)}</h2><p>已选择 ${selected.length} / ${choice.max} 项${choice.min===0?' · 可以跳过此项操作':''}。${choice.max>1?'按点击顺序结算。':''}</p></div><div class="choice-options ${kind==='workflow'?'workflow-options':''}">${options}</div><div class="choice-footer">${choice.min===0?'<button class="secondary" data-action="choice-skip">跳过</button>':''}<button class="primary" data-action="choice-confirm" ${valid?'':'disabled'}>确认选择 →</button></div></section></div>`;
}
