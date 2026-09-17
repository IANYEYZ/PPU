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
// Replace these profiles when the designed Act 2/3 enemy lists arrive.
for(const [act,hpScale,damageScale] of [[2,1.4,1.2],[3,1.8,1.4]]){
  for(const id of ['queue','paper','phone','audit','director']){
    const source=enemies[id];enemies[`${id}${act}`]={...structuredClone(source),name:id==='director'?`${act===2?'协调':'总务'}主管`:`${source.name} · ${act}层`,title:`第${act}幕 · 占位敌人`,hp:Math.round(source.hp*hpScale),pattern:source.pattern.map(move=>({...move,...(['attack','block'].includes(move.kind)?{amount:Math.round(move.amount*damageScale)}:{})}))};
  }
  for(const id of ['queue','backlog','calls','audit','director']){const source=encounters[id];encounters[`${id}${act}`]={...source,name:`第${act}幕 · ${source.name}`,enemies:source.enemies.map(enemy=>`${enemy}${act}`)};}
}
