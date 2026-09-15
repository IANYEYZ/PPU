import { powers, statuses } from '../data/statuses.js';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const typeNames = { Attack: '攻击', Skill: '技能', Power: '能力' };
export const keywordNames = { Exhaust: '消耗', Ethereal: '虚无', Retain: '保留' };
export function effectText(effect) {
  const amount = effect.amount;
  switch (effect.type) {
    case 'damage': return `对${effect.target === 'allEnemies' ? '所有敌人' : '目标'}造成 ${amount} 点伤害`;
    case 'block': return `获得 ${amount} 点格挡`;
    case 'draw': return `抽 ${amount} 张牌`;
    case 'energy': return `获得 ${amount} 点能量`;
    case 'heal': return `回复 ${amount} 点生命`;
    case 'status': return `给予${effect.target === 'enemy' ? '目标' : '自身'} ${amount} 层${statuses[effect.status]?.name || effect.status}`;
    case 'power': return `获得 ${amount} 层「${powers[effect.power]?.name}」：${powers[effect.power]?.description}`;
    case 'annotate': return `为另一张手牌添加「${effect.modifier.label}」：${modifierText(effect.modifier)}`;
    case 'copy': return `制造另一张手牌的 ${amount} 张副本，保留升级与批注；副本具有虚无`;
    case 'workflow:add': return '将另一张手牌计入流程，不执行其效果（由本牌支付费用）';
    case 'exhaust': return '消耗另一张手牌';
    case 'move': return `将弃牌堆顶部 ${amount} 张牌移到抽牌堆顶部`;
    default: return effect.type;
  }
}
export function modifierText(mod) { return [mod.costDelta ? `费用 ${mod.costDelta > 0 ? '+' : ''}${mod.costDelta}` : '', ...(mod.effects || []).map(effectText), ...(mod.keywords || []).map(k => keywordNames[k] || k), ...(mod.effectAdjustments || []).map(r => `${r.type} 数值 ${r.amountDelta > 0 ? '+' : ''}${r.amountDelta}`)].filter(Boolean).join('；'); }
export const eventNames = { 'turn:start': '回合开始', 'turn:end': '回合结束', 'card:drawn': '抽牌', 'card:played': '打出卡牌', 'card:exhausted': '卡牌消耗', 'card:copied': '制造副本', 'annotation:added': '添加批注', 'damage:dealt': '造成伤害', 'damage:taken': '承受伤害', 'block:gained': '获得格挡', 'energy:spent': '支付能量', 'workflow:packed': '流程已打包', 'workflow:item-executed': '流程执行', 'workflow:added': '计入流程', 'combat:start': '战斗开始', 'combat:end': '战斗结束', 'deck:shuffled': '洗牌', 'enemy:acted': '敌人行动', 'enemy:turn-end': '敌人回合结束', 'attack:calculate': '攻击数值修正' };
