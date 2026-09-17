export const relics = {
  fileTray:{name:'文件托盘',icon:'▤',starter:true,description:'每场战斗开始时，额外抽3张牌，然后选择1张手牌置于抽牌堆底。',triggers:[{event:'combat:start',effects:[{type:'draw',amount:3},{type:'choose',prompt:'文件托盘：选择1张手牌置于抽牌堆底',zone:'hand',min:1,max:1,then:[{type:'moveCard',to:'draw',position:'bottom'}]}]}]},
  receiptStamp:{name:'收件章',icon:'▣',starter:true,description:'每场战斗中，你第一次在同一回合内打出第4张牌时，获得1能量。',triggers:[{event:'card:played',condition:{field:'played',eq:4},per:'combat',limit:1,effects:[{type:'energy',amount:1}]}]},
  stickyCalendar:{name:'便签日历',icon:'▦',starter:true,description:'每回合结束时，保留最左边的一张手牌。虚无仍优先结算。',triggers:[{event:'turn:end',effects:[{type:'retainLeftmost'}]}]},
  redPen: { legacy:true, name: '红色钢笔', icon: '✒', description: '每次添加批注，获得 2 点格挡。', triggers: [{ event: 'annotation:added', effects: [{ type: 'block', amount: 2 }] }] },
  carbonPaper: { legacy:true, name: '复写纸', icon: '▱', description: '每制造一张副本，获得 2 点格挡。', triggers: [{ event: 'card:copied', effects: [{ type: 'block', amount: 2 }] }] },
  binder: { legacy:true, name: '活页夹', icon: '▤', description: '每打包一个流程，抽 1 张牌并获得 1 点能量。', triggers: [{ event: 'workflow:packed', effects: [{ type: 'draw', amount: 1 }, { type: 'energy', amount: 1 }] }] },
  badge: { name: '旧工牌', icon: '◇', description: '战斗开始获得 8 点格挡。', triggers: [{ event: 'combat:start', effects: [{ type: 'block', amount: 8 }] }] },
  thermos: { name: '保温杯', icon: '♧', description: '战斗胜利回复 4 点生命。', triggers: [{ event: 'combat:end', when: 'victory', effects: [{ type: 'heal', amount: 4 }] }] },
  stamp: { name: '加急印章', icon: '▣', description: '战斗开始获得 1 点力量。', triggers: [{ event: 'combat:start', effects: [{ type: 'status', status: 'strength', amount: 1 }] }] },
};
