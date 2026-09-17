export const nodeTypes = {
  Combat: { name: '交涉', icon: '⚔', description: '处理日常阻碍，获得金币与卡牌。' },
  Elite: { name: '审查', icon: '◆', description: '更强的对手，额外获得遗物。' },
  Unknown: { name: '未知', icon: '?', description: '进入后可能遇到事件、交涉、商店或宝箱。' },
  Event: { name: '偶遇', icon: '?', description: '办公室之外，总有意料外的事。' },
  Shop: { name: '补给', icon: '▱', description: '购买卡牌、遗物，或删除卡牌。' },
  Rest: { name: '休整', icon: '♧', description: '回复生命，或升级一张牌。' },
  Treasure: { name: '遗失物', icon: '▣', description: '一件遗物与一些零钱。' },
  Boss: { name: '主管', icon: '♜', description: '击败本幕主管；通过三幕后完成登楼。' },
};
export const mapConfig = { rooms:15, columns:7, paths:7, elites:5, shops:3, unknowns:{mean:12,min:10,max:14}, rests:{mean:7,min:6,max:7}, prune:true };
export const acts = [
  {id:'office',name:'第一处室',subtitle:'例行事务层',mapConfig,encounters:['queue','backlog','calls'],elite:'audit',boss:'director',eventPool:'act1',difficulty:1},
  {id:'coordination',name:'第二处室',subtitle:'跨部门协调层',mapConfig:{...mapConfig,rooms:14,unknowns:{mean:11,min:9,max:13},rests:{mean:6,min:6,max:7}},encounters:['queue2','backlog2','calls2'],elite:'audit2',boss:'director2',eventPool:'act2',difficulty:2},
  {id:'executive',name:'第三处室',subtitle:'最终审批层',mapConfig:{...mapConfig,rooms:13,unknowns:{mean:11,min:9,max:13},rests:{uniform:true,min:5,max:6}},encounters:['queue3','backlog3','calls3'],elite:'audit3',boss:'director3',eventPool:'act3',difficulty:3},
];
