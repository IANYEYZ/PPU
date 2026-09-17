const damage=amount=>({type:'damage',amount,target:'randomEnemy'});
const block=amount=>({type:'block',amount});
const draw=amount=>({type:'draw',amount});
const trigger=(event,effects,extra={})=>({event,effects,...extra});
export const clerkPowers={
  copySupplies:{name:'复印耗材',description:'每制造一张副本，获得层数点格挡。',triggers:[trigger('card:copied',[block('$stacks')])]},
  standardLanguage:{name:'规范用语',description:'每添加一条批注，对随机敌人造成层数点伤害。',triggers:[trigger('annotation:added',[damage('$stacks')])]},
  autoCirculation:{name:'自动流转',description:'流程每执行一项，获得层数点格挡。',triggers:[trigger('workflow:item-executed',[block('$stacks')])]},
  diligence:{name:'埋头苦干',description:'每回合第4张及之后的每张牌对随机敌人造成层数点伤害。',triggers:[trigger('card:played',[damage('$stacks')],{condition:{field:'played',gte:4}})]},
  practice:{name:'熟能生巧',description:'每回合同名牌第2次打出时对随机敌人造成层数点伤害。',triggers:[trigger('card:played',[damage('$stacks')],{condition:{field:'sameNameCount',eq:2}})]},
  digestion:{name:'内部消化',description:'每回合前层数次消耗各抽1张。',triggers:[trigger('card:exhausted',[draw(1)],{per:'turn',limit:'$stacks'})]},
  workflowSupervision:{name:'流程监督',description:'每打包流程，抽层数张牌。',triggers:[trigger('workflow:packed',[draw('$stacks')])]},
  proofreading:{name:'校对规范',description:'再次为有批注的牌添加批注，获得层数点格挡。',triggers:[trigger('annotation:added',[block('$stacks')],{condition:{field:'previousAnnotationCount',gte:1}})]},
  cycleReview:{name:'周期考核',description:'流程每执行第3项，对随机敌人造成层数点伤害。',triggers:[trigger('workflow:item-executed',[damage('$stacks')],{condition:{field:'index',eq:2}})]},
  overtime:{name:'超额工作',description:'每回合抽到第6张及之后每张牌时，获得层数点格挡。',triggers:[trigger('card:drawn',[block('$stacks')],{condition:{field:'drawn',gte:6}})]},
  destruction:{name:'销毁记录',description:'每消耗一张牌，对随机敌人造成层数点伤害。',triggers:[trigger('card:exhausted',[damage('$stacks')])]},
  annotatedArchive:{name:'批注存档',description:'每回合首次将有批注的牌计入流程，抽层数张牌。',triggers:[trigger('workflow:added',[draw('$stacks')],{condition:{field:'annotationCount',gte:1},per:'turn',limit:1})]},
  copyCenter:{name:'复印中心',description:'每次制造副本，额外制造层数张。',rules:{copyBonus:1},triggers:[]},
  literalImplementation:{name:'逐字落实',description:'每添加批注，随机另一张手牌获得相同批注。衍生批注不会再传播。',triggers:[trigger('annotation:added',[{type:'annotation:spread'}],{condition:{field:'propagated',falsy:true}})]},
  matureWorkflow:{name:'成熟流程',description:'新流程打包时，立即执行其第一项并推进。',triggers:[trigger('workflow:packed',[{type:'workflow:execute'}])]},
  temporaryAuthorization:{name:'临时授权',description:'每回合第一张新制造的副本失去虚无。',triggers:[trigger('card:copied',[{type:'copy:stabilize'}],{per:'turn',limit:1})]},
  institutionalization:{name:'制度化',description:'流程执行有批注的牌时，再执行第一条批注。',triggers:[trigger('workflow:item-executed',[{type:'annotation:replay'}],{condition:{field:'annotationCount',gte:1}})]},
  generalPrinciples:{name:'总则',description:'每当一张牌添加第3条批注时，抽层数张牌。',triggers:[trigger('annotation:added',[draw('$stacks')],{condition:{field:'annotationCount',eq:3}})]},
  autoApproval:{name:'自动批办',description:'每回合所有流程正常执行后，随机选择层数个不同流程额外执行并推进。',triggers:[trigger('workflow:turn-complete',[{type:'workflow:random-execute',amount:'$stacks'}])]},
};
