import { installClerkEffects } from './clerk-effects.js';
import { installWorkflows } from './clerk-workflows.js';
export const clerkExtension={
  id:'clerk',
  createState:()=>({pending:[],workflows:[],nextWorkflowId:1}),
  getCards:engine=>{const s=engine.state.extensions.clerk;return [...s.pending,...s.workflows.flatMap(f=>f.items)];},
  choiceWorkflows:(engine,effect,context)=>engine.state.extensions.clerk.workflows.filter(f=>!effect.then?.some(e=>e.type==='workflow:execute') || !context.activeWorkflowIds?.includes(f.id)).map(f=>({id:String(f.id),workflow:structuredClone(f)})),
  setup(engine){installClerkEffects(engine);installWorkflows(engine);},
};
