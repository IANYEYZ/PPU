export const enemies = {
  queue: { name: '漫长队伍', title: '等候中的怨念', hp: 25, art: 'queue', pattern: [{ kind: 'attack', amount: 6 }, { kind: 'block', amount: 5 }, { kind: 'attack', amount: 8 }] },
  paper: { name: '积压文件', title: '昨日未完成', hp: 22, art: 'paper', pattern: [{ kind: 'attack', amount: 5 }, { kind: 'buff', status: 'strength', amount: 2 }, { kind: 'attack', amount: 6 }] },
  phone: { name: '催办电话', title: '又响了', hp: 29, art: 'phone', pattern: [{ kind: 'attack', amount: 7 }, { kind: 'debuff', status: 'weak', amount: 2 }, { kind: 'attack', amount: 9 }] },
  audit: { name: '突击审查', title: '精英 · 请出示全部材料', hp: 65, art: 'audit', pattern: [{ kind: 'attack', amount: 12 }, { kind: 'block', amount: 12 }, { kind: 'attack', amount: 16 }, { kind: 'buff', status: 'strength', amount: 3 }] },
  director: { name: '楼层主管', title: '第一处室 · 最终审批', hp: 120, art: 'director', pattern: [{ kind: 'attack', amount: 12 }, { kind: 'attack', amount: 7, hits: 2 }, { kind: 'block', amount: 15 }, { kind: 'buff', status: 'strength', amount: 3 }, { kind: 'attack', amount: 18 }] },
};
export const encounters = {
  queue: { name: '请取号等候', enemies: ['queue'] },
  backlog: { name: '堆积如山', enemies: ['paper','paper'] },
  calls: { name: '办公室日常', enemies: ['phone','paper'] },
  audit: { name: '突击审查', enemies: ['audit'], elite: true },
  director: { name: '最终审批', enemies: ['director'], boss: true },
};
