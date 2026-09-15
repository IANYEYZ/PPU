# 引擎与扩展说明

## 状态边界

`Game.run` 拥有永久牌组、生命上限、金币、遗物、seed、Act、地图与已访问路径、当前节点、奖励和结算状态。`Game.combat` 拥有本场牌堆、手牌、能量、生命、格挡、状态、能力、角色扩展状态。

进入战斗时深复制永久牌组。战斗的升级/临时修改/批注/副本不会写回永久牌组。永久牌实例预留相同的扩展字段，已有永久修改会随实例带入战斗。战斗结束将剩余生命写回 Run。

Card Definition 是 `src/data/cards.js` 中的模板；Card Instance 包含独立 `id`、`definitionId`、`upgrade`、`annotations`、`modifiers`、`isCopy`、`sourceId`、`rootSourceId`。`resolvedCard()` 每次从 Definition 与实例组合最终效果，不改动定义。

解析顺序：基础定义 → 升级覆盖 → 普通 modifiers → 所有 annotations → 副本虚无关键词去重。Modifier 可包含 `effects`、`costDelta`、`keywords`、`effectAdjustments`。批注没有固定枚举，直接携带组合效果。普通 modifier 的 `copyable: false` 可阻止它被复制；默认可复制。

## 结算时序

### 普通出牌

1. 验证玩家阶段、手牌、动态目标和能量。
2. 支付能量，发出 `energy:spent`。
3. 从手牌移至 resolving 临时区域。
4. 按列表执行最终效果（包含批注效果）。
5. 未被效果移动的卡，依关键词进入消耗/能力/弃牌区域。
6. 发出 `card:played`，检测胜负并发出一次 `combat:end`。

resolving 防止卡牌在自身抽牌效果中被洗回并重抽。出牌事件在卡牌效果与去向结算后发出，遗物/能力应按这一约定设计。

### 回合

玩家回合结束：`turn:end`（状态监听在此减层）→ 虚无优先消耗/保留/弃牌 → 每个存活敌人清空自己的格挡、按 Intent 行动 → `enemy:turn-end`（敌人状态衰减）/应用强化 → 下一玩家回合。

玩家回合开始：回合数 +1 → 清除玩家格挡 → 使用角色规则生成能量 → 使用角色规则抽牌 → `turn:start` → 胜负检查。战斗首次开始，在第一回合准备后发出 `combat:start`，因此战斗开始获得的格挡不会立刻被清掉。

EventBus 的监听优先级：遗物 0、能力 10、角色自动流程 100（数值越小越先执行）。同优先级保持注册顺序；能力按其获得顺序保存。稳定的层级保证动态获得能力后存档/读档不会改变它与流程的先后顺序。事件触发时使用监听列表快照，新注册监听从下一次事件生效。

所有伤害发出 `damage:dealt` 和 `damage:taken`，携带来源、目标、实际生命损失、格挡吸收量；监听者可按目标区分玩家/敌人。攻击计算发出 `attack:calculate`，状态系统以 -100 优先级修正其结果：虚弱按攻击来源折算伤害，力量对每个 damage 效果增伤。状态数值展示于双方卡面下方。

### 流程

办事员扩展拥有 `pending`、任意数量的 `workflows`、独立流程 ID。加入时把原始 Card Instance 移出普通区域并保存当时状态。三项自动打包：移动 pending 数组至新流程，cursor=0，创建新的空 pending，发出 `workflow:packed`。

`turn:start` 时对已有流程列表取快照，依次执行每个流程 cursor 对应实例的最终效果，cursor=(cursor+1)%3，发出 `workflow:item-executed`。没有支付能量、普通出牌或卡牌去向步骤，因此虚无/消耗不会移除流程项目。新流程从下一个 turn:start 开始执行。

流程需要敌人或手牌目标时，选首个存活敌人/首张手牌；没有所需目标的对应效果不执行，其余效果照常。当前 UI 明确说明此自动选择约定。未来可在扩展内替换目标策略，不改 CombatEngine。

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

地图是逐层 DAG，边只指向下一层。每个来源至少一个出口，每个目的地至少一个入口；终层单 Boss。节点横坐标轻微扰动、每层数量变化、可选邻近分叉，避免固定网格。强制早期分叉和汇合确保不论额外分叉配置如何，都有多条有效路线。

地图 RNG 与 Run/Combat RNG 独立；seed 使用字符串哈希和固定的 32 位随机算法。完整保存战斗及 Run RNG state，恢复洗牌/奖励序列。Act 定义使用数组；Boss 奖励后按数组长度进入下个 Act 或结束。未来第四区域可加入 Act 数据或扩展 Act 选择器。

## 存档与测试

存档只存数据，不序列化监听函数。读档重建 Effects、DeckManager、EventBus 和所有监听；不重发 combat:start/turn:start，不重领节点奖励，保留待办和正在运行的每个流程游标。

测试覆盖关键词、牌堆守恒、深复制隔离、递归副本、目标验证、批注叠加、Power、遗物、多敌人 Intent、伤害/死亡、无角色扩展战斗、并行流程、保存前后相同行动完全相同的快照、地图约束、商店/事件/奖励防重复、完整 Run 状态流以及使用真实出牌与敌人回合击败 Boss。
