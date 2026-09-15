import { copyCard } from '../core/card.js';
// All clerk-only zones, effects, actions and turn behavior live in this extension.
export const clerkExtension = {
  id: 'clerk',
  createState: () => ({ pending: [], workflows: [], nextWorkflowId: 1 }),
  setup(engine) {
    const state = engine.state.extensions.clerk;
    const getTarget = context => engine.findCard(context.cardId);
    engine.effects.register('annotate', (effect, context) => { const card = getTarget(context); if (card) { card.annotations.push(structuredClone(effect.modifier)); engine.bus.emit('annotation:added', { cardId: card.id, label: effect.modifier.label }); } });
    engine.effects.register('copy', (effect, context) => {
      const source = getTarget(context); if (!source) return;
      for (let i = 0; i < effect.amount; i++) { const card = copyCard(source, engine.nextId()); engine.state.hand.length < 12 ? engine.state.hand.push(card) : engine.state.discard.push(card); engine.bus.emit('card:copied', { cardId: card.id, sourceId: source.id }); }
    });
    const pack = () => {
      if (state.pending.length !== 3) throw new Error('一个完整流程需要三张牌。');
      const workflow = { id: state.nextWorkflowId++, items: state.pending, cursor: 0, executions: 0 };
      state.pending = []; state.workflows.push(workflow);
      engine.bus.emit('workflow:packed', { workflowId: workflow.id, cardIds: workflow.items.map(c => c.id) });
    };
    const add = (card, targets = {}) => {
      const removed = engine.deck.remove(card.id); if (!removed) return;
      removed.workflowTargets = structuredClone(targets); state.pending.push(removed);
      engine.bus.emit('workflow:added', { cardId: card.id });
      if (state.pending.length === 3) pack();
    };
    engine.effects.register('workflow:add', (effect, context) => { const card = getTarget(context); if (card) add(card, context); });
    engine.actions.set('workflow:add', ({ cardId, free = false }) => {
      const card = engine.state.hand.find(c => c.id === cardId); if (!card) throw new Error('请选择手牌。');
      if (!free && !engine.resolve(card).workflow) throw new Error('这张牌不能直接计入流程；可以用「归档」加入。');
      if (!free) engine.spendEnergy(engine.resolve(card).cost);
      add(card);
    });
    engine.actions.set('workflow:pack', pack);
    engine.bus.on('turn:start', () => {
      // Snapshot the workflow list: newly packed workflows begin next turn.
      for (const flow of [...state.workflows]) {
        if (engine.state.outcome) break;
        const card = flow.items[flow.cursor];
        const context = { ...card.workflowTargets, sourceId: card.id, enemyId: engine.state.enemies.find(e => e.hp > 0)?.id, cardId: engine.state.hand[0]?.id, fromWorkflow: true };
        engine.effects.execute(engine.resolve(card).effects, context);
        const executedIndex = flow.cursor; flow.cursor = (flow.cursor + 1) % 3; flow.executions++;
        engine.bus.emit('workflow:item-executed', { workflowId: flow.id, cardId: card.id, index: executedIndex });
        engine.checkOutcome();
      }
    }, 100);
  },
};
