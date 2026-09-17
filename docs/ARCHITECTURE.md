# 引擎与扩展说明

## 状态边界

`Game.run` 拥有永久牌组、生命上限、金币、遗物、seed、Act、地图与已访问路径、当前节点、奖励和结算状态。`Game.combat` 拥有本场牌堆、手牌、能量、生命、格挡、状态、能力、角色扩展状态。

进入战斗时深复制永久牌组。战斗的升级/临时修改/批注/副本不会写回永久牌组。永久牌实例预留相同的扩展字段，已有永久修改会随实例带入战斗。战斗结束将剩余生命写回 Run。

Card Definition 是 `src/data/cards.js` 中的模板；Card Instance 包含独立 `id`、`definitionId`、`upgrade`、`annotations`、`modifiers`、`isCopy`、`sourceId`、`rootSourceId`。`resolvedCard()` 每次从 Definition 与实例组合最终效果，不改动定义。

解析顺序：基础定义 → 升级覆盖 → 普通 modifiers → 所有 annotations → 副本虚无关键词去重。Modifier 可包含 `effects`、`costDelta`、`costSet`、`costFloor`、`keywords`、`removeKeywords`、`effectAdjustments`。批注没有固定枚举，直接携带组合效果。普通 modifier 的 `copyable: false` 可阻止它被复制；默认可复制。带回合期限的修改在下一回合开始前从所有区域移除。

当前数据入口聚合 84 张表内牌、6 张初始专属牌和只为旧存档保留的旧定义。`activeCards` 排除旧定义，角色 `cardPool` 限定共享卡池；奖励系统再按 `poolEligible` 排除基础/专属牌。卡表原文在 `clerk-source.js`，规则组合在 `clerk-cards.js`，能力在 `clerk-powers.js`。导入与规则约定见 [CARD_TABLE.md](CARD_TABLE.md)。

## 结算时序

### 普通出牌

1. 验证玩家阶段、手牌、动态目标和能量。
2. 支付能量，发出 `energy:spent`。
3. 从手牌移至 resolving 临时区域。
4. 按列表执行最终效果（包含批注效果）。
5. 未被效果移动的卡，依关键词进入消耗/能力/弃牌区域。
6. 发出 `card:played`，检测胜负并发出一次 `combat:end`。

resolving 防止卡牌在自身抽牌效果中被洗回并重抽。出牌事件在卡牌效果与去向结算后发出，遗物/能力应按这一约定设计。

### 可暂停的结算与选牌

`EffectSystem` 使用 `state.frames` 保存效果列表、当前位置与上下文，按编写顺序结算。效果触发的新效果先于父列表的下一项执行，同一次触发保持监听顺序。生命周期也以内部效果入队，因此「先抽牌，再选择新手牌，再继续后续效果」可以暂停和续算。

`choose` 通过 `core/choices.js` 创建 `state.choice`：包含提示、候选快照、最少/最多数量及后续效果。`engine.choose(ids)` 验证合法性，按选择顺序生成上下文并恢复队列。待选时禁止普通出牌和结束回合。普通手牌不能通过主动操作归档，只能由卡牌效果归档。多步选择继承批注来源、所选批注、选牌序号与牌的当前费用等上下文。

队列、选择以及触发次数都是普通 JSON 数据。读档重建监听，不重发开始事件；完成选择后继续原来的出牌或回合进程。攻击获胜时仍先处理已入队效果及选牌，最后统一结算胜利。

`conditions.js` 统一解析回合计数、事件字段和动态数值。`triggers.js` 为能力/遗物绑定条件监听，并保存每回合/每战次数限制，避免刷新后重复领能量等收益。

### 回合

玩家回合结束：`turn:end`（状态监听在此减层）→ 虚无优先消耗/保留/弃牌 → 每个存活敌人清空自己的格挡、按 Intent 行动 → `enemy:turn-end`（敌人状态衰减）/应用强化 → 下一玩家回合。

玩家回合开始：回合数 +1 → 清除玩家格挡 → 使用角色规则生成能量 → 使用角色规则抽牌 → `turn:start` → 胜负检查。战斗首次开始，在第一回合准备后发出 `combat:start`，因此战斗开始获得的格挡不会立刻被清掉。

EventBus 的监听优先级：回合指标计数 -200、遗物 0、能力 10、角色自动流程 100（数值越小越先执行）。同优先级保持注册顺序；能力按其获得顺序保存。稳定的层级保证动态获得能力后存档/读档不会改变它与流程的先后顺序。事件触发时使用监听列表快照，新注册监听从下一次事件生效。

所有伤害发出 `damage:dealt` 和 `damage:taken`，携带来源、目标、实际生命损失、格挡吸收量；监听者可按目标区分玩家/敌人。攻击计算发出 `attack:calculate`，状态系统以 -100 优先级修正其结果：虚弱按攻击来源折算伤害，力量对每个 damage 效果增伤。状态数值展示于双方卡面下方。

### 流程

办事员扩展拥有 `pending`、任意数量的 `workflows`、独立流程 ID。加入时把原始 Card Instance 移出普通区域并保存当时状态。三项自动打包：移动 pending 数组至新流程，cursor=0，创建新的空 pending，发出 `workflow:packed`。

`turn:start` 时对已有流程列表取快照，依次执行每个流程 cursor 对应实例的最终效果，cursor=(cursor+1)%3，发出 `workflow:item-executed`。没有支付能量、普通出牌或卡牌去向步骤，因此虚无/消耗不会移除流程项目。新流程从下一个 turn:start 开始执行。

流程需要敌人或手牌目标时，选首个存活敌人/首张有效手牌；没有所需目标的对应效果不执行，其余效果照常。按用户修订，「推进」和「执行并推进」使用同一套执行逻辑，都结算当前项并推进。流程副本继承当前游标，发出 `workflow:copied` 而非 `workflow:packed`；嵌套执行记录祖先流程，避免同一结算链无限递归。所有正常自动流程完成后发出 `workflow:turn-complete`，供自动批办选择额外执行的流程。

专属实现分为 `clerk-definition.js`、`clerk-effects.js` 和 `clerk-workflows.js`，由 `clerk.js` 导出。UI 在 `combat-choice.js` 展示选牌、批注与流程候选，不参与规则计算。

## 添加普通卡

只修改卡牌数据并加入角色共享卡池。例如：

```js
memo: {
  name: '测试备忘', type: 'Skill', cost: 1,
  rarity: 'common', workflow: true,
  effects: [{ type: 'block', amount: 4 }, { type: 'draw', amount: 1 }],
  upgrade: { effects: [{ type: 'block', amount: 7 }, { type: 'draw', amount: 1 }] }
}
```

若需要新效果类型，通过 `engine.effects.register(type, handler)` 注册，再在 `src/ui/text.js` 增加显示规则。卡名不参与结算判断。特殊效果属于角色时在角色扩展中注册；通用效果加入 `core/effects.js`。

## 添加完全不同的大角色

1. 在 `characterClasses` 中创建类，声明共享 `cardPool`、生命和回合资源策略。`energyPerTurn`、`drawPerTurn` 可以是常数，也可以是接收 engine 的函数。
2. 在 `characterVariants` 中创建小角色，指定 classId、牌组、遗物。小角色不创建独立卡池。
3. 在 `src/characters/` 创建扩展，提供 `{ id, createState(), setup(engine) }`。在 registry 中注册。
4. 专属资源、战斗区域保存在 `engine.state.extensions[id]`，因此自动参与存档。通过效果注册表、`engine.actions`、EventBus 实现专属动作与回合规则。
5. 在 UI 的角色面板注册表加入渲染器。角色专属区域与核心牌堆互相独立。

CombatEngine 不导入办事员扩展，不创建流程区，不检查批注或副本卡名。没有扩展的类也能使用通用战斗系统（已有测试）。新增大角色时，可扩展 UI 的卡牌详情查找与开发工具，核心战斗无须重写。

## 地图与多 Act

地图是逐层有向无环图，7列、7条路径，下一行只走左上/正上/右上且禁止交叉。生成路径后放固定房间、分配数量池、剪除等价分支并补回特殊房间，再整理布局。三幕配置在 `map-config.js`；查询参数、来源和坐标转换在 `STS2_REFERENCE.md`。虚拟入口仅用于剪枝，不作为可玩房间。剪枝可能合并等价入口。

Run 的地图、问号、事件、卡牌奖励、商店、宝箱、遭遇使用独立 seed 派生随机序列。`streamStates` 保存已使用序列的状态。问号节点的显示类型始终是 Unknown；实际结果仅写入 `nodeState.type` / `roomHistory`。只有结果为 Event 时，才抽取当前 Act 未见过的事件。`unknownOdds` 换幕重置；`rarityOdds` 跨幕继续。

Boss 奖励领取后记录 `actHistory`、回复满生命并进入下一幕；第三幕 Boss 后胜利。三幕占位敌人定义独立，可替换而不修改地图生成器。

## 数据驱动事件

事件、选项、条件和效果列表位于 `data/act-events.js`，执行器在 `core/event.js`，UI 在 `ui/event-ui.js`。地图不认识任何具体事件 ID。`EVENT_EFFECTS` 注册表提供全部基础效果及永久复制牌，详情见 `EVENTS.md`。

每次选项先验证条件，再锁定 `choiceIndex`，将效果写入 `eventQueue` 依次结算。需要选牌时保存 `eventSelection` 并暂停；恢复后继续剩余效果，不能取消付费后续步骤或重复领收益。随机分支只掷一次，所选分支进入同一队列。下一战修正存于 Run，进入新战斗时一次性转移至 combat.openingModifiers；仅首回合应用，加载已有战斗不重触发。

## 存档与测试

存档只存数据，不序列化监听函数。读档重建 Effects、DeckManager、EventBus 和所有监听；不重发 combat:start/turn:start，不重领节点奖励，保留待办和正在运行的每个流程游标。

测试覆盖关键词、牌堆守恒、深复制隔离、递归副本、目标验证、批注叠加、Power、遗物、多敌人 Intent、伤害/死亡、无角色扩展战斗、并行流程、保存前后相同行动完全相同的快照、地图约束、商店/事件/奖励防重复、完整 Run 状态流以及使用真实出牌与敌人回合击败 Boss。
