const fx=(type,extra={})=>({type,...extra});
const gold=amount=>fx(amount>=0?'GainGold':'LoseGold',{amount:Math.abs(amount)});
const hp=amount=>fx('LoseHP',{amount});
const heal=amount=>fx('Heal',{amount});
const upgrade=(count=1,random=false)=>fx('UpgradeCard',{count,random});
const remove=()=>fx('RemoveCard');
const reward=(rarity)=>fx('CardReward',{count:3,...(rarity?{rarity}:{})});
const relic=()=>fx('GainRelic',{rarity:'common'});
const next=modifier=>fx('AddNextCombatModifier',{modifier});
const roll=(a,b)=>fx('RandomChoice',{branches:[{weight:1,effects:a},{weight:1,effects:b}]});
const choice=(label,detail,effects=[],conditions={})=>({label,detail,effects,conditions});
const leave=()=>choice('离开','继续上楼。');
const definition=(title,text,choices)=>({title,subtitle:'第一幕 · 办事途中',text,choices});
export const act1Events={
  ticket:definition('取号机','显示屏停在一个很久没有变化的数字。出纸口里传来细小的响声。',[
    choice('正常取号','回复8生命。',[heal(8)]),choice('连按几次','获得50金币；失去6生命。',[gold(50),hp(6)]),leave()]),
  wrongWindow:definition('错误窗口','窗口里的人指了指墙上的告示。你已经在这里排了很久。',[
    choice('来都来了','失去5生命；随机升级1张牌。',[hp(5),upgrade(1,true)],{upgradableCardsAtLeast:1}),choice('那我去哪办？','获得35金币。',[gold(35)]),leave()]),
  lunch:definition('午休时间','玻璃窗后挂着“午休”的牌子。饭菜的香气从门缝里钻出来。',[
    choice('等待','回复20%最大生命。',[fx('Heal',{percent:.2})]),choice('敲门','获得70金币；失去10%最大生命。',[gold(70),fx('LoseHP',{percent:.1})]),leave()]),
  copyShop:definition('复印店','机器还有余温。店主问你，要几份，是否需要装订。',[
    choice('复制一份','支付40金币；选择并复制牌组中的1张牌。',[gold(-40),fx('DuplicateCard')],{goldAtLeast:40,deckAtLeast:1}),
    choice('复制并修订','支付75金币；选择并复制1张牌，升级复制品。',[gold(-75),fx('DuplicateCard',{upgrade:true})],{goldAtLeast:75,deckAtLeast:1}),leave()]),
  suggestionBox:definition('意见箱','箱子上贴着“每一条意见都会被认真对待”。里面十分安静。',[
    choice('投入一张牌','从牌组中移除1张牌。',[remove()],{removableCardsAtLeast:1}),choice('投入50金币','获得1个随机普通遗物。',[gold(-50),relic()],{goldAtLeast:50,relicAvailable:'common'}),leave()]),
  jam:definition('打印机卡纸','一角纸张卡在齿轮之间。屏幕建议你联系管理员。',[
    choice('徒手处理','失去7生命；获得75金币。',[hp(7),gold(75)]),choice('拆开机器','移除1张牌；失去4生命。',[remove(),hp(4)],{removableCardsAtLeast:1}),choice('假装没看见','离开。')]),
  forms:definition('年度表格更新','新表格只比旧表格多了一条横线。旧版依然摆在柜台旁。',[
    choice('更新格式','选择1张牌，转化为同稀有度的随机牌。',[fx('TransformCard',{sameRarity:true})],{transformableCardsAtLeast:1}),choice('认真填写','选择升级1张牌。',[upgrade()],{upgradableCardsAtLeast:1}),choice('使用旧版','离开。')]),
  unclaimed:definition('无人认领的文件','没有收件人，也没有寄件人。封口已经松开了。',[
    choice('打开','50%获得90金币；50%失去10生命。',[roll([gold(90)],[hp(10)])]),choice('上交','获得35金币。',[gold(35)]),choice('扔回原处','离开。')]),
  training:definition('临时培训','投影仪打在墙上。讲师说：“最后再讲两点。”',[
    choice('认真听讲','升级1张牌；下一战首回合少抽2张牌。',[upgrade(),next({label:'培训疲劳',firstTurnDrawDelta:-2})],{upgradableCardsAtLeast:1}),choice('领取教材','从3张随机蓝卡中选择1张获得。',[reward('uncommon')]),choice('翘掉','离开。')]),
  oldCabinet:definition('过期文件柜','柜门后挤着多年的纸张。有些还用旧式打字机写成。',[
    choice('翻找','从3张随机职业牌中选择1张获得。',[reward()]),choice('清理','移除1张牌；失去5生命。',[remove(),hp(5)],{removableCardsAtLeast:1}),choice('当废纸卖掉','获得45金币。',[gold(45)])]),
  inspection:definition('临时检查','几个人拦住走廊。他们看上去也不太清楚要检查什么。',[
    choice('配合检查','下一战开始时获得12格挡；获得40金币。',[next({label:'检查通行证',startBlock:12}),gold(40)]),choice('拒绝检查','失去7生命；获得75金币。',[hp(7),gold(75)]),choice('绕开检查组','离开。')]),
  wrongStamp:definition('盖错的章','鲜红的章落在了错误的位置。墨迹还没有干。',[
    choice('将错就错','随机升级2张牌，再随机降级1张已升级的牌。',[upgrade(2,true),fx('DowngradeCard',{count:1,random:true})],{upgradableCardsAtLeast:2}),choice('重新盖章','支付45金币；选择升级1张牌。',[gold(-45),upgrade()],{goldAtLeast:45,upgradableCardsAtLeast:1}),choice('撕掉重填','移除1张牌；失去8生命。',[remove(),hp(8)],{removableCardsAtLeast:1})]),
  vendingMachine:definition('自动售货机','咖啡在玻璃后排成整齐的一行。最下面一排写着“特浓”。',[
    choice('购买咖啡','支付30金币；回复12生命。',[gold(-30),heal(12)],{goldAtLeast:30}),choice('购买特浓咖啡','支付50金币；下一战第一回合获得2能量。',[gold(-50),next({label:'特浓咖啡',firstTurnEnergy:2})],{goldAtLeast:50}),choice('踹一下机器','50%获得40金币；50%失去6生命。',[roll([gold(40)],[hp(6)])]),leave()]),
  overtimeForm:definition('加班申请','申请表的姓名一栏已经替你填好了。只差一个签名。',[
    choice('自愿加班','失去10生命；从3张随机蓝卡中选择1张获得。',[hp(10),reward('uncommon')]),choice('通宵加班','失去18生命；获得1个随机普通遗物。',[hp(18),relic()],{relicAvailable:'common'}),choice('拒绝签字','离开。')]),
  mediation:definition('内部调解','双方各递来一份方案。你在最下面看到了自己的名字。',[
    choice('接受方案A','获得80金币；随机加入1张职业白卡。',[gold(80),fx('AddRandomCard',{rarity:'common'})]),choice('接受方案B','回复15生命；随机升级1张牌。',[heal(15),upgrade(1,true)],{upgradableCardsAtLeast:1}),choice('拒绝调解','获得25金币。',[gold(25)])]),
};
// Later acts deliberately use their own placeholder pools, ready for replacement.
export const laterEvents=Object.fromEntries([2,3].flatMap(act=>[
  [`act${act}Break`,{title:'走廊长椅',subtitle:`第${act}幕 · 占位事件`,text:'下一道门还很远。这里恰好有一个空位。',choices:[choice('休息片刻','回复12生命。',[heal(12)]),leave()]}],
  [`act${act}Supply`,{title:'临时补给台',subtitle:`第${act}幕 · 占位事件`,text:'柜台上摆着没人领取的办公补贴。',choices:[choice('领取补贴','获得45金币。',[gold(45)]),leave()]}],
  [`act${act}Practice`,{title:'经验交流',subtitle:`第${act}幕 · 占位事件`,text:'同事愿意替你看一眼手中的材料。',choices:[choice('交流经验','选择升级1张牌。',[upgrade()],{upgradableCardsAtLeast:1}),leave()]}],
]));
export const eventPools={act1:Object.keys(act1Events),act2:Object.keys(laterEvents).filter(id=>id.startsWith('act2')),act3:Object.keys(laterEvents).filter(id=>id.startsWith('act3'))};
