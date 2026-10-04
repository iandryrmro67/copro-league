'use client';
import {createContext,useCallback,useContext,useRef,useState,type ReactNode} from 'react';
import type {League} from '@/lib/model';
import {createSingleFlight,type BootTasks} from '@/lib/animation-state';
import {BootScreen} from './BootScreen';
type LeagueState={data:League|null;error:string;refresh:()=>Promise<League>};
const Context=createContext<LeagueState|null>(null);
export function useLeagueData(){const value=useContext(Context);if(!value)throw Error('LeagueDataProvider required');return value;}
/** Browser-memory league state, scoped to this layout; nothing is persisted or shared server-side. */
export function LeagueDataProvider({children}:{children:ReactNode}){
 const [data,setData]=useState<League|null>(null),[error,setError]=useState(''),[boot,setBoot]=useState(false),[tasks,setTasks]=useState<BootTasks>({fonts:false,image:false,data:false});
 const initialized=useRef(false),controller=useRef<AbortController|null>(null);
 const [load]=useState(()=>createSingleFlight(async()=>{const abort=new AbortController();controller.current=abort;const timer=setTimeout(()=>abort.abort(),10000);try{const r=await fetch('/api/league',{cache:'no-store',signal:abort.signal});if(!r.ok)throw Error('La base de données est momentanément indisponible.');const league=await r.json() as League;setData(league);setError('');setTasks(p=>({...p,data:true}));return league;}catch(e){const message=e instanceof Error&&e.name!=='AbortError'?e.message:'Chargement interrompu. Réessayez.';setError(message);throw Error(message);}finally{clearTimeout(timer);controller.current=null;}}));
 
 const closeBoot=useCallback(()=>{setBoot(false);try{sessionStorage.setItem('copro:boot:v1','seen');}catch{/* Optional storage. */}},[]);
 const initialize=useCallback(()=>{
  if(initialized.current)return;initialized.current=true;
  try{if(sessionStorage.getItem('copro:boot:v1')!=='seen')setBoot(true);}catch{setBoot(true);}
  let alive=true;
  void Promise.all(['800 24px "Big Shoulders Display"','500 12px "JetBrains Mono"','400 16px "Archivo"'].map(font=>document.fonts.load(font))).then(()=>{if(alive)setTasks(p=>({...p,fonts:true}));}).catch(closeBoot);
  const image=new Image();image.src='/brand/logo.svg';void image.decode().then(()=>{if(alive)setTasks(p=>({...p,image:true}));}).catch(closeBoot);
  return ()=>{alive=false;};
 },[closeBoot]);
 // LeagueApp explicitly requests initialization; the lab and auth never fetch league data.
 const refresh=useCallback(()=>{initialize();return load();},[initialize,load]);

 return <Context.Provider value={{data,error,refresh}}>{children}{boot&&<BootScreen tasks={tasks} error={error} seasonName={data?.seasons.find(s=>s.status==='active'&&!s.demo)?.name??'LA LIGUE'} playerCount={data?.players.filter(p=>!p.demo).length} matchCount={data?.matches.filter(m=>!data.seasons.find(s=>s.id===m.seasonId)?.demo).length} onClose={closeBoot}/>}</Context.Provider>;
}
