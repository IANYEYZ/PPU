export const events = {
  vending: { title: '走廊尽头的售货机', subtitle: '无人值守的片刻安静', text: '机器的灯还亮着。玻璃后面摆着一瓶温水和一本卷了边的《办事指南》。你听见楼上传来拖动椅子的声音。', choices: [{ label: '买瓶温水', detail: '花费 15 金币，回复 20 生命', goldCost: 15, effects: [{ type: 'heal', amount: 20 }] }, { label: '读一页指南', detail: '失去 5 生命，升级一张牌', hpCost: 5, effects: [{ type: 'upgradeChoice' }] }, { label: '继续上楼', detail: '什么也不发生', effects: [] }] },
  lost: { title: '失物招领处', subtitle: '不是每份文件都有主人', text: '一枚无人认领的旧印章躺在柜台上。旁边压着一张便条：「如需领用，请缴纳材料费。」', choices: [{ label: '领走印章', detail: '花费 30 金币，获得一件遗物', goldCost: 30, effects: [{ type: 'relic' }] }, { label: '整理柜台', detail: '获得 25 金币', effects: [{ type: 'gold', amount: 25 }] }] },
  window: { title: '一扇没关的窗', subtitle: '风把材料吹散了', text: '楼梯间里，几页过期的文件翻飞。你忽然觉得，有些东西也许不必一直带着。', choices: [{ label: '丢掉一份旧文件', detail: '从永久牌组删除一张牌', effects: [{ type: 'removeChoice' }] }, { label: '靠窗休息一下', detail: '回复 12 生命', effects: [{ type: 'heal', amount: 12 }] }] },
};
