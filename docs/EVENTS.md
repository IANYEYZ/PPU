# 事件系统 v0.1

## 内容与进入规则

第一幕提供用户指定的15个事件、46个选项，定义集中于 `src/data/act-events.js`。第二、三幕各有独立的三个占位事件，等待后续正式内容。旧版三个事件只为旧存档保留，不进入新事件池。

问号房先由动态概率决定房间结果；结果为 Event 时才从 `acts[run.act].eventPool` 中抽取未出现事件。事件在首次进入时加入 `seenEvents`，同一局不重复。该幕池耗尽后显示可离开的平静走廊，不重抽旧事件。地图节点、连线及显示类型均不被事件修改。没有 Documents / 文件系统。

所有随机行为使用 Run seed 派生的 events 序列，包含事件抽取、升级对象、降级对象、转化目标、复制之外的随机加牌、奖励、遗物和随机分支。选择与随机结果都保存，刷新不能重新掷骰或重复收费。

## 选项和条件

定义格式为 `{title, subtitle, text, choices:[{label, detail, conditions, effects}]}`。每个 Act 仅引用事件池 ID。

支持条件：金币下限、牌组数量、未升级牌数量、可移除牌、同稀有度可转化牌、指定稀有度可获得遗物。界面显示不可选原因，执行器再校验。金币不足不扣钱、不消耗随机序列。

规则约定：百分比生命变化向上取整；治疗不超过最大生命。直接失去生命可以致死，致死后中止余下效果。永久牌组至少保留一张牌；没有合适卡牌的效果跳过，有明确前置条件的选项会预先禁用。盖错的章按先随机升级两张不同的牌、再随机降级一张已升级牌执行，刚升级的牌也可被降级。

## EventEffect 注册表

| 效果 | 数据 | 行为 |
| --- | --- | --- |
| GainGold / LoseGold | amount | 获得/支付金币 |
| Heal / LoseHP | amount 或 percent | 固定值或最大生命比例 |
| UpgradeCard / DowngradeCard | count，random | 筛选符合条件的永久牌；随机或选择 |
| RemoveCard | count | 选择并移除永久牌 |
| TransformCard | sameRarity | 选择原牌，替换为不同定义、同稀有度职业牌；新ID、未升级 |
| DuplicateCard | upgrade | 选择原牌，保留原牌并新增永久复制品；可仅升级复制品 |
| AddRandomCard | rarity | 随机加入一张指定稀有度可掉落职业牌 |
| CardReward | count，rarity | 生成不重复候选，选一张加入永久牌组 |
| GainRelic | rarity | 随机获得尚未持有的对应遗物，排除初始遗物 |
| AddNextCombatModifier | modifier | 将一次性的下一战修正写入Run |
| RandomChoice | branches:[{weight,effects}] | 按权重抽一个分支，将效果压入当前结算队列 |

下一战修正支持 `firstTurnDrawDelta`、`firstTurnEnergy`、`startBlock`，可以叠加。修正穿过普通地图节点继续保留，进入下一场战斗后从Run移除，只在该战首回合应用。与初始遗物正常组合。

CardReward 限定蓝卡时从蓝卡池均匀取三张；未限定时从82张可掉落职业牌均匀取三张。事件不会修改战斗金卡概率修正。随机白卡同样排除基础/初始专属/旧占位牌。普通遗物池当前仅有3件，全部持有后相关付费选项禁用。

## 持久化和扩展

`nodeState` 保存 `eventId`、`choiceIndex`、`eventQueue`、`eventSelection`、`eventLog`、`resolved`。进入选牌前已经发生的费用不回滚；选牌页面没有取消或离开按钮。`selectEventCards` 校验候选ID后应用效果并继续队列，完成后允许离开。

新增事件只需添加定义和事件池归属；新增效果需在 `EVENT_EFFECTS` 注册处理器。事件定义不允许任意脚本执行。`tests/events.test.js` 对全部46个选项逐项验证结算结果、JSON续接和地图不变，并补充条件、随机分支和一次性战斗修正回归。
