export type BootTasks={fonts:boolean;image:boolean;data:boolean};
export type UnlockBadge={id:string;active:boolean};
export function bootProgress(tasks:BootTasks){return Number(tasks.fonts)*30+Number(tasks.image)*10+Number(tasks.data)*60;}
export function snapIndex(index:number,offset:number,velocity:number,step:number,count:number){
  if(count<=1||step<=0)return 0;
  return Math.max(0,Math.min(count-1,index-Math.round((offset+velocity*.18)/step)));
}
export function unlockedIds(before:UnlockBadge[]|null,after:UnlockBadge[],seen:ReadonlySet<string>){
  if(!before)return [];
  const previous=new Map(before.map(b=>[b.id,b.active]));
  return after.filter(b=>b.active&&previous.get(b.id)===false&&!seen.has(b.id)).map(b=>b.id);
}
/** Deduplicates concurrent reads only; never persists a response or caches an error. */
export function createSingleFlight<T>(load:()=>Promise<T>){
  let pending:Promise<T>|null=null;
  return ()=>{if(!pending)pending=load().finally(()=>{pending=null});return pending;};
}
