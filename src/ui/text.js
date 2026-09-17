import { powers, statuses } from '../data/statuses.js';
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const typeNames = { Attack: '攻击', Skill: '技能', Power: '能力' };
export const keywordNames = { Exhaust: '消耗', Ethereal: '虚无', Retain: '保留', AutoWorkflow:'打出时计入流程' };
export const rarityNames = {basic:'基础',starter:'初始专属',common:'白卡',uncommon:'蓝卡',rare:'金卡'};
export function effectText(effect) {
  const amount = effect.amount;
  switch (effect.type) {
    case 'damage': return typeof amount==='object'?`造成 ${amount.base} 点伤害，抽牌堆、手牌、弃牌堆、消耗堆合计每 ${amount.every} 张牌额外造成 ${amount.perGroup} 点伤害（不含流程牌）`:`对${effect.target === 'allEnemies' ? '所有敌人' : effect.target==='randomEnemy'?'随机敌人':'目标'}造成 ${amount} 点伤害${effect.hits>1?`，共 ${effect.hits} 次`:''}`;
    case 'block': return `获得 ${amount} 点格挡`;
    case 'draw': return `抽 ${amount} 张牌`;
    case 'energy': return amount==='$selectedCost'?'获得等同所选牌当前费用的能量':`获得 ${amount} 点能量`;
    case 'heal': return `回复 ${amount} 点生命`;
    case 'status': return `给予${effect.target === 'enemy' ? '目标' : effect.target==='allEnemies'?'所有敌人':'自身'} ${amount} 层${statuses[effect.status]?.name || effect.status}`;
    case 'power': return `获得「${powers[effect.power]?.name}」：${powers[effect.power]?.description.replaceAll('层数',String(amount)).replace(/。$/,'')}`;
    case 'annotate': return `为另一张手牌添加「${effect.modifier.label}」：${modifierText(effect.modifier)}`;
    case 'copy': return `制造${{self:'此牌',previous:'上一张打出的牌',random:'随机手牌',allOther:'每张其他手牌'}[effect.source] || '所选手牌'}的 ${amount} 张副本${effect.untilTurnEnd?'，副本本回合费用为0':''}`;
    case 'workflow:add': return '将另一张手牌计入流程，不执行其效果（由本牌支付费用）';
    case 'exhaust': return '消耗另一张手牌';
    case 'move': return `将弃牌堆顶部 ${amount} 张牌移到抽牌堆顶部`;
    case 'choose': return `${effect.prompt}${effect.max==='all'?'（任意数量）':effect.max>1?`（${effect.min===effect.max?'共':'最多'} ${effect.max} 项）`:''}${effect.min===0?'（可跳过）':''}：${(effect.then || []).map(effectText).join('；')}`;
    case 'moveCard': return `将所选牌${effect.to==='hand'?'加入手牌':`置于抽牌堆${effect.position==='bottom'?'底':'顶'}`}`;
    case 'modifyCard': return `${modifierText(effect.modifier)}${effect.untilTurnEnd?'（本回合）':effect.untilPlayed?'（直到下一次打出）':''}`;
    case 'nextCard': return '本回合下一张牌费用变为0并获得虚无';
    case 'noDraw': return '本回合不能再抽牌';
    case 'shuffleDiscard': return '将弃牌堆洗入抽牌堆';
    case 'copy:stabilize': return effect.all?'手中所有副本失去虚无':'所选副本失去虚无';
    case 'workflow:execute': return '立即执行所选流程的当前项并推进';
    case 'workflow:advance': return '执行所选流程当前项的效果，然后推进一项';
    case 'workflow:copy': return '复制所选流程，独立保留当前推进位置';
    case 'workflow:all': return '所有已打包流程各执行当前项的效果，然后推进一项';
    case 'annotation:transfer': return '添加刚才选中的批注';
    case 'annotation:broadcast': return '将此批注添加给所有其他手牌';
    case 'annotation:double': return '本场战斗将该牌数值批注的效果翻倍（不改变费用和关键词）';
    case 'discover': return `从3张随机${effect.upgraded?'升级后的':''}非能力金卡中选择1张加入手牌；其费用为0，打出时直接计入流程`;
    case 'if': {
      const rule=effect.condition;
      const label=rule.fromWorkflow?'由流程执行时':rule.metric==='drawn'?`本回合已抽至少${rule.gte}张牌时`:rule.field==='hadAnnotations'?'该牌原本已有批注时':rule.field==='selectionIndex'?'第1张所选牌':'满足条件时';
      return `${label}：${(effect.then || []).map(effectText).join('；')}${effect.else?.length?`；否则：${effect.else.map(effectText).join('；')}`:''}`;
    }
    default: return effect.type;
  }
}
export function modifierText(mod) { return [mod.untilPlayed ? '直到下一次打出' : '', mod.costSet !== undefined ? `费用设为 ${mod.costSet}` : '', mod.costFloor ? `减费最低 ${mod.costFloor}` : '', mod.costDelta ? `费用 ${mod.costDelta > 0 ? '+' : ''}${mod.costDelta}` : '', ...(mod.effects || []).map(effectText), ...(mod.keywords || []).map(k => keywordNames[k] || k), ...(mod.effectAdjustments || []).map(r => `${r.type} 数值 ${r.amountDelta > 0 ? '+' : ''}${r.amountDelta}`)].filter(Boolean).join('；'); }
export const eventNames = { 'turn:start': '回合开始', 'turn:end': '回合结束', 'card:drawn': '抽牌', 'card:played': '打出卡牌', 'card:exhausted': '卡牌消耗', 'card:copied': '制造副本', 'annotation:added': '添加批注', 'damage:dealt': '造成伤害', 'damage:taken': '承受伤害', 'block:gained': '获得格挡', 'energy:spent': '支付能量', 'workflow:packed': '流程已打包', 'workflow:item-executed': '流程执行', 'workflow:added': '计入流程', 'combat:start': '战斗开始', 'combat:end': '战斗结束', 'deck:shuffled': '洗牌', 'enemy:acted': '敌人行动', 'enemy:turn-end': '敌人回合结束', 'attack:calculate': '攻击数值修正' };
