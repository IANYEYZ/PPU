import { clerkPowers } from './clerk-powers.js';
export const statuses = {
  vulnerable: {name:'易伤',description:'受到的伤害增加50%。自身行动结束后减少1层。',damageTakenMultiplier:1.5,decay:true},
  weak: { name: '虚弱', description: '攻击伤害降低 25%。自身行动结束后减少 1 层。', damageMultiplier: .75, decay: true },
  strength: { name: '力量', description: '每次攻击增加等量伤害。', damageAdd: 1 },
};
export const powers = {
  ...clerkPowers,
  steady: { name: '熟练工', description: '回合开始获得层数点格挡。', triggers: [{ event: 'turn:start', effects: [{ type: 'block', amount: '$stacks' }] }] },
  automation: { name: '自动化办公', description: '流程每执行一项，获得层数点格挡。', triggers: [{ event: 'workflow:item-executed', effects: [{ type: 'block', amount: '$stacks' }] }] },
};
