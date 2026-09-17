import { clerkSource } from './clerk-source.js';

// All card mechanics are compositions. Names are used only to match spreadsheet rows.
const damage = (amount, target = 'enemy', hits = 1) => ({ type:'damage',amount,target,hits });
const block = amount => ({type:'block',amount});
const draw = amount => ({type:'draw',amount});
const copy = (amount,source='selected',extra={}) => ({type:'copy',amount,source,...extra});
const annotate = modifier => ({type:'annotate',source:'selected',modifier});
const note = (effect,label) => ({label:label || (effect.type==='damage'?'伤害批注':effect.type==='block'?'格挡批注':'抽牌批注'),effects:[effect]});
const pick = (prompt,then,options={}) => ({type:'choose',prompt,zone:'hand',min:1,max:1,then,...options});
const filing = (optional=false,extra={}) => pick('选择计入流程的手牌',[{type:'workflow:add',source:'selected'}],{min:optional?0:1,...extra});
const bottom = (count=1) => pick(`选择 ${count} 张手牌置于抽牌堆底`,[{type:'moveCard',to:'draw',position:'bottom'}],{min:count,max:count});
const top = () => pick('选择1张手牌置于抽牌堆顶',[{type:'moveCard',to:'draw',position:'top'}]);
const mark = (effect,options={}) => pick('选择要批注的手牌',[annotate(note(effect))],options);
const flowPick = (operation,options={}) => pick(operation==='copy'?'选择复制的流程':'选择执行并推进的流程',[{type:`workflow:${operation}`}],{kind:'workflow',...options});
const power = (id,amount) => ({type:'power',power:id,amount});
const whenFlow = (yes,no=[]) => ({type:'if',condition:{fromWorkflow:true},then:yes,else:no});
const search = (then=[]) => pick('从抽牌堆选择一张牌',[{type:'moveCard',to:'hand'},...then],{zone:'draw'});
const transferNote = (max,all=false) => pick('选择提供批注的手牌',[
  pick('选择一条批注',all ? [{type:'annotation:broadcast'}] : [pick('选择接收这条批注的其他手牌',[{type:'annotation:transfer'}],{excludeAnnotationSource:true,min:1,max})],{kind:'annotation'}),
],{filter:'annotated'});
const semantic = {};
const card = (name,effects,upgradedEffects=effects,options={}) => {semantic[name]={effects,...options,upgrade:{effects:upgradedEffects,...options.upgrade}};};

card('处理',[damage(6)],[damage(9)]);
card('防备',[block(5)],[block(8)]);
card('翻阅',[draw(3)],[draw(4)]);
card('草拟',[draw(1),pick('选择一张手牌消耗',[{type:'exhaust'}])],[draw(2),pick('选择一张手牌消耗',[{type:'exhaust'}])]);
card('速记',[damage(7),draw(1)],[damage(9),draw(2)]);
card('应付一下',[block(7),draw(1)],[block(9),draw(1)]);
card('补充说明',[mark(damage(4))],[mark(damage(6))]);
card('防护条款',[mark(block(4))],[mark(block(6))]);
card('复印',[pick('选择要复印的手牌',[copy(1)])],undefined,{upgrade:{cost:0}});
card('一式两份',[copy(2,'previous')],undefined,{keywords:['Exhaust'],upgrade:{keywords:[]}});
card('例行办理',[damage(9)],[damage(12)],{workflow:true});
card('手续齐全',[block(8)],[block(11)],{workflow:true});
card('退回修改',[draw(2),pick('选择一张手牌置于抽牌堆顶',[{type:'moveCard',to:'draw',position:'top'}])],[draw(3),pick('选择一张手牌置于抽牌堆顶',[{type:'moveCard',to:'draw',position:'top'}])]);
card('作废',[pick('选择一张手牌消耗',[{type:'exhaust'}]),draw(2)],[pick('选择一张手牌消耗',[{type:'exhaust'}]),draw(3)],{keywords:['Exhaust']});
card('会签',[block(6),mark(block(2))],[block(8),mark(block(3))]);
card('批转',[damage(7),filing(true)],[damage(10),filing(true)]);
card('留待明日',[block(7),pick('选择获得保留的手牌',[annotate({label:'保留',keywords:['Retain']})])],[block(10),pick('选择获得保留的手牌',[annotate({label:'保留',keywords:['Retain']})])]);
card('会议纪要',[block(8),whenFlow([draw(1)])],[block(11),whenFlow([draw(1)])]);
card('联合办理',[damage(8,'allEnemies'),filing(true)],[damage(10,'allEnemies'),filing(true)]);
card('分送',[draw(2),mark(damage(3),{onlyDrawn:true,min:0})],[draw(2),mark(damage(5),{onlyDrawn:true,min:0})]);
card('积案清理',[damage({deckScale:true,base:10,every:3,perGroup:5})],[damage({deckScale:true,base:10,every:3,perGroup:6})]);
card('情况说明',[{type:'if',condition:{metric:'drawn',gte:4},then:[block(13)],else:[block(9)]}],[{type:'if',condition:{metric:'drawn',gte:4},then:[block(16)],else:[block(11)]}]);
card('直接转办',[filing(),draw(1)],[filing(),draw(2)]);
card('群发通知',[damage(8,'allEnemies')],[damage(11,'allEnemies')]);
card('当面催办',[damage(9),{type:'status',status:'weak',amount:1,target:'enemy'}],[damage(12),{type:'status',status:'weak',amount:2,target:'enemy'}]);
card('集中答复',[block(16)],[block(20)],{keywords:['Retain']});
card('加急处理',[pick('消耗另一张手牌，获得等同其当前费用的能量',[{type:'exhaust'},{type:'energy',amount:'$selectedCost'}])],undefined,{upgrade:{cost:1}});
card('集中办公',[{type:'energy',amount:2}],[{type:'energy',amount:3}],{keywords:['Exhaust']});
card('详阅',[draw(4),top()],[draw(5),top()]);
card('内部传阅',[draw(2),top()],[draw(3),top()]);
card('查找原件',[search()],[search([{type:'modifyCard',modifier:{label:'原件调阅',costSet:0},untilPlayed:true}])],{keywords:['Exhaust']});
card('补充附件',[mark(draw(1))],undefined,{upgrade:{cost:0}});
card('减免手续',[pick('选择减费的手牌',[annotate({label:'耗能减免',costDelta:-1})])],undefined,{keywords:['Exhaust'],upgrade:{cost:1}});
card('统一格式',[transferNote(1)],[transferNote(2)]);
card('批量复印',[pick('选择要批量复印的手牌',[copy(3)])],undefined,{upgrade:{cost:1}});
card('留存副本',[pick('选择失去虚无的副本',[{type:'copy:stabilize'}],{filter:'copy'})],[{type:'copy:stabilize',all:true}]);
card('复印错误',[copy(1,'random',{modifier:{label:'复印错误',costSet:0},untilTurnEnd:true})],[copy(2,'random',{modifier:{label:'复印错误',costSet:0},untilTurnEnd:true})]);
card('模板文件',[damage(8),copy(1,'self')],[damage(11),copy(1,'self')]);
card('自动回复',[block(7),copy(1,'self')],[block(10),copy(1,'self')]);
card('纳入流程',[block(5),filing()],[block(8),filing()]);
card('流程优化',[flowPick('execute')],undefined,{upgrade:{cost:0}});
card('统一部署',[filing(true,{min:0,max:3})],undefined,{keywords:['Exhaust'],upgrade:{keywords:[]}});
card('标准模板',[whenFlow([block(10)],[block(6)])],[whenFlow([block(13)],[block(8)])]);
card('重复劳动',[whenFlow([damage(5,'enemy',5)],[damage(5,'enemy',3)])],[whenFlow([damage(6,'enemy',5)],[damage(6,'enemy',3)])],{target:'enemy'});
card('复印耗材',[power('copySupplies',3)],[power('copySupplies',4)]);
card('规范用语',[power('standardLanguage',3)],[power('standardLanguage',4)]);
card('自动流转',[power('autoCirculation',3)],[power('autoCirculation',4)]);
card('埋头苦干',[power('diligence',3)],[power('diligence',4)]);
card('熟能生巧',[power('practice',4)],[power('practice',6)]);
card('内部消化',[power('digestion',1)],[power('digestion',2)]);
card('特事特办',[{type:'nextCard',modifier:{label:'特事特办',costSet:0,keywords:['Ethereal']}}],undefined,{keywords:['Exhaust'],upgrade:{keywords:['Exhaust','Retain']}});
card('内部借调',[search([copy(1)])],[search([copy(2)])],{keywords:['Exhaust']});
card('追加意见',[pick('选择添加意见的手牌',[annotate(note(draw(1))),{type:'if',condition:{field:'hadAnnotations',truthy:true},then:[annotate(note(block(3)))]}])],[pick('选择添加意见的手牌',[annotate(note(draw(1))),{type:'if',condition:{field:'hadAnnotations',truthy:true},then:[annotate(note(block(5)))]}])]);
card('交叉批注',[pick('依次选择伤害批注、格挡批注的手牌',[{type:'if',condition:{field:'selectionIndex',eq:0},then:[annotate(note(damage(5)))],else:[annotate(note(block(5)))]}],{min:2,max:2})],[pick('依次选择伤害批注、格挡批注的手牌',[{type:'if',condition:{field:'selectionIndex',eq:0},then:[annotate(note(damage(7)))],else:[annotate(note(block(7)))]}],{min:2,max:2})],{keywords:['Exhaust']});
card('紧急纳入',[filing()],[filing(),draw(1)],{keywords:['Exhaust']});
card('流程复核',[flowPick('advance')],[{type:'workflow:all',operation:'advance'}]);
card('流程监督',[power('workflowSupervision',2)],[power('workflowSupervision',3)]);
card('校对规范',[power('proofreading',3)],[power('proofreading',4)]);
card('周期考核',[power('cycleReview',7)],[power('cycleReview',10)]);
card('超额工作',[power('overtime',2)],[power('overtime',3)]);
card('销毁记录',[power('destruction',4)],[power('destruction',6)]);
card('批注存档',[power('annotatedArchive',2)],undefined,{upgrade:{cost:1}});
card('并入日程',[damage(8),filing()],[damage(11),filing()]);
card('统一通知',[damage(15,'allEnemies')],[damage(20,'allEnemies')]);
card('全面整改',[{type:'status',status:'weak',amount:2,target:'allEnemies'},block(10)],[{type:'status',status:'weak',amount:3,target:'allEnemies'},block(10)]);
card('限期办结',[damage(22),{type:'status',status:'vulnerable',amount:1,target:'enemy'}],[damage(28),{type:'status',status:'vulnerable',amount:1,target:'enemy'}]);
card('正式函告',[damage(10),{type:'status',status:'vulnerable',amount:1,target:'enemy'}],[damage(13),{type:'status',status:'vulnerable',amount:2,target:'enemy'}]);
card('闭门整理',[block(19),top()],[block(24),top()]);
card('复印中心',[power('copyCenter',1)],undefined,{upgrade:{cost:1}});
card('统一批示',[transferNote(1,true)],undefined,{keywords:['Exhaust'],upgrade:{cost:1}});
card('逐字落实',[power('literalImplementation',1)],undefined,{upgrade:{cost:1}});
card('成熟流程',[power('matureWorkflow',1)],undefined,{upgrade:{cost:1}});
card('并行办公',[flowPick('advance',{min:0,max:2}),draw(1)],[flowPick('advance',{min:0,max:'all'}),draw(1)],{keywords:['Exhaust']});
card('流程再造',[flowPick('copy')],undefined,{keywords:['Exhaust'],upgrade:{keywords:[]}});
card('批量处理',[copy(1,'allOther')],undefined,{keywords:['Exhaust'],upgrade:{cost:1}});
card('最终定稿',[pick('选择将数值批注翻倍的手牌',[{type:'annotation:double'}])],undefined,{keywords:['Exhaust'],upgrade:{cost:1}});
card('集中整改',[pick('选择任意数量的手牌消耗',[{type:'exhaust'},block(7)],{min:0,max:'all'})],[pick('选择任意数量的手牌消耗',[{type:'exhaust'},block(9)],{min:0,max:'all'})]);
card('临时授权',[power('temporaryAuthorization',1)],undefined,{upgrade:{cost:1}});
card('层层审批',[draw(5),{type:'noDraw'}],[draw(7),{type:'noDraw'}],{keywords:['Exhaust']});
card('无休止会议',[{type:'shuffleDiscard'},draw(4)],[{type:'shuffleDiscard'},draw(6)],{keywords:['Exhaust']});
card('请示上级',[{type:'discover',upgraded:false}],[{type:'discover',upgraded:true}],{keywords:['Exhaust']});
card('制度化',[power('institutionalization',1)],undefined,{upgrade:{cost:1}});
card('总则',[power('generalPrinciples',2)],[power('generalPrinciples',3)]);
card('自动批办',[power('autoApproval',1)],[power('autoApproval',2)]);

export const clerkCards = Object.fromEntries(clerkSource.map(source => {
  if(!semantic[source.name])throw new Error(`卡表规则尚未配置：${source.name}`);
  return [source.id,{...source,...semantic[source.name],classId:'clerk',poolEligible:source.rarity!=='basic'}];
}));
export const clerkCardId = name => clerkSource.find(c=>c.name===name)?.id;
export const starterCards = {
  starter_review:{name:'校阅',cost:1,type:'Attack',rarity:'starter',classId:'clerk',poolEligible:false,effects:[damage(8),draw(1)],upgrade:{effects:[damage(11),draw(1)]}},
  starter_tag:{name:'附签',cost:1,type:'Skill',rarity:'starter',classId:'clerk',poolEligible:false,effects:[block(5),mark(block(3))],upgrade:{effects:[block(7),mark(block(4))]}},
  starter_circulate:{name:'传阅',cost:0,type:'Skill',rarity:'starter',classId:'clerk',poolEligible:false,keywords:['Exhaust'],effects:[draw(2),bottom()],upgrade:{effects:[draw(3),bottom()]}},
  starter_carbon:{name:'复写件',cost:1,type:'Attack',rarity:'starter',classId:'clerk',poolEligible:false,effects:[damage(7),copy(1,'self')],upgrade:{effects:[damage(10),copy(1,'self')]}},
  starter_transfer:{name:'转办',cost:1,type:'Attack',rarity:'starter',classId:'clerk',poolEligible:false,effects:[damage(7),filing(true)],upgrade:{effects:[damage(10),filing(true)]}},
  starter_defer:{name:'暂缓',cost:1,type:'Skill',rarity:'starter',classId:'clerk',poolEligible:false,keywords:['Retain'],effects:[block(8)],upgrade:{effects:[block(11)]}},
};
