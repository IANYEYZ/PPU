export const characterClasses = {
  clerk: { id: 'clerk', name: '办事员', subtitle: 'THE CLERK', description: '笔尖、复印机，与永远走不完的流程。', cardPool: Object.keys({ strike:1, defend:1, read:1, coffee:1, annotate:1, margin:1, expedite:1, copy:1, duplicate:1, file:1, routine:1, staple:1, circulate:1, weaken:1, retain:1, shred:1, recover:1, power:1, auto:1, haze:1 }), extension: 'clerk', maxHp: 76, energyPerTurn: 3, drawPerTurn: 5 },
};
export const characterVariants = [
  { id: 'red', classId: 'clerk', name: '红笔办事员', role: '批注 / 灵活应变', number: '01', description: '每一页都有改进的余地。为手牌叠加批注，让普通文件也能成为利器。', relic: 'redPen', deck: ['strike','strike','strike','defend','defend','defend','annotate','margin','copy','read'], accent: '#a44432' },
  { id: 'carbon', classId: 'clerk', name: '复印室专员', role: '副本 / 重复利用', number: '02', description: '原件请妥善保管。复制已经批注的卡牌，再复制它的副本。', relic: 'carbonPaper', deck: ['strike','strike','strike','defend','defend','defend','copy','copy','annotate','coffee'], accent: '#4f6d72' },
  { id: 'archive', classId: 'clerk', name: '档案管理员', role: '流程 / 循环执行', number: '03', description: '好的工作，只需要安排一次。将三份文件打包，让流程持续替你办事。', relic: 'binder', deck: ['strike','strike','defend','defend','defend','routine','routine','file','coffee','read'], accent: '#70704b' },
];
