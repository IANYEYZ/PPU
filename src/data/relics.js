export const relics = {
  redPen: { name: '红色钢笔', icon: '✒', description: '每次添加批注，获得 2 点格挡。', triggers: [{ event: 'annotation:added', effects: [{ type: 'block', amount: 2 }] }] },
  carbonPaper: { name: '复写纸', icon: '▱', description: '每制造一张副本，获得 2 点格挡。', triggers: [{ event: 'card:copied', effects: [{ type: 'block', amount: 2 }] }] },
  binder: { name: '活页夹', icon: '▤', description: '每打包一个流程，抽 1 张牌并获得 1 点能量。', triggers: [{ event: 'workflow:packed', effects: [{ type: 'draw', amount: 1 }, { type: 'energy', amount: 1 }] }] },
  badge: { name: '旧工牌', icon: '◇', description: '战斗开始获得 8 点格挡。', triggers: [{ event: 'combat:start', effects: [{ type: 'block', amount: 8 }] }] },
  thermos: { name: '保温杯', icon: '♧', description: '战斗胜利回复 4 点生命。', triggers: [{ event: 'combat:end', when: 'victory', effects: [{ type: 'heal', amount: 4 }] }] },
  stamp: { name: '加急印章', icon: '▣', description: '战斗开始获得 1 点力量。', triggers: [{ event: 'combat:start', effects: [{ type: 'status', status: 'strength', amount: 1 }] }] },
};
