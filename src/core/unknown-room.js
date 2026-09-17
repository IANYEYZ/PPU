export const UNKNOWN_BASE={Combat:.10,Treasure:.02,Shop:.03};
export const createUnknownOdds=()=>({...UNKNOWN_BASE});
export function rollUnknownRoom(rng,odds,blacklist=[]){
  const roll=rng.next();let cumulative=0,result='Event';
  for(const [type,value] of Object.entries(odds))if(!blacklist.includes(type)&&value>0){cumulative+=value;if(roll<cumulative){result=type;break;}}
  for(const [type,base] of Object.entries(UNKNOWN_BASE))if(!blacklist.includes(type))odds[type]=type===result?base:odds[type]+base;
  return result;
}
