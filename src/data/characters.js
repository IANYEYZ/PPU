import { clerkCards } from './clerk-cards.js';
export const characterClasses = {
  clerk: { id:'clerk',name:'办事员',subtitle:'THE CLERK',description:'笔尖、复印机，与永远走不完的流程。',cardPool:Object.keys(clerkCards),extension:'clerk',maxHp:76,energyPerTurn:3,drawPerTurn:5 },
};
const basicDeck = ['clerk_001','clerk_001','clerk_001','clerk_001','clerk_002','clerk_002','clerk_002','clerk_002'];
// Stable slot IDs preserve existing saves; new runs use the user-supplied setups.
export const characterVariants = [
  {id:'red',classId:'clerk',name:'文书员',role:'校阅 / 批注',number:'01',description:'校阅文件，附上批注。开场多抽三张牌，再把一份文件留到最后。',relic:'fileTray',deck:[...basicDeck,'starter_review','starter_tag'],accent:'#a44432'},
  {id:'carbon',classId:'clerk',name:'收发员',role:'传阅 / 复写',number:'02',description:'传递文件，保留复写件。每场战斗首次在同一回合打出第四张牌时，获得额外能量。',relic:'receiptStamp',deck:[...basicDeck,'starter_circulate','starter_carbon'],accent:'#4f6d72'},
  {id:'archive',classId:'clerk',name:'调度员',role:'转办 / 保留',number:'03',description:'把合适的文件转入流程。便签日历会在回合结束时留下最左边的一张手牌。',relic:'stickyCalendar',deck:[...basicDeck,'starter_transfer','starter_defer'],accent:'#70704b'},
];
