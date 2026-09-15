export const nodeTypes = {
  Combat: { name: '交涉', icon: '⚔', description: '处理日常阻碍，获得金币与卡牌。' },
  Elite: { name: '审查', icon: '◆', description: '更强的对手，额外获得遗物。' },
  Event: { name: '偶遇', icon: '?', description: '办公室之外，总有意料外的事。' },
  Shop: { name: '补给', icon: '▱', description: '购买卡牌、遗物，或删除卡牌。' },
  Rest: { name: '休整', icon: '♧', description: '回复生命，或升级一张牌。' },
  Treasure: { name: '遗失物', icon: '▣', description: '一件遗物与一些零钱。' },
  Boss: { name: '主管', icon: '♜', description: '通过最终审批，完成本轮登楼。' },
};
export const mapConfig = { floors: 10, minNodes: 2, maxNodes: 4, branching: .42, weights: { Combat: 40, Elite: 10, Event: 21, Shop: 10, Rest: 12, Treasure: 7 }, densities: { Elite: 1, Shop: 1, Rest: 1 }, bossBefore: 'Rest' };
export const acts = [{ id: 'office', name: '第一处室', subtitle: '例行事务层', mapConfig, encounters: ['queue','backlog','calls'], elite: 'audit', boss: 'director' }];
