'use client';
import {createContext,useContext,useEffect,useRef,useState,useCallback,type ReactNode} from 'react';
import {LazyMotion,MotionConfig,useReducedMotion} from 'motion/react';
import * as m from 'motion/react-m';
import {useRouter,usePathname} from 'next/navigation';
import {shouldAnimateNavigation} from '@/lib/animated-navigation';
import {eases} from '@/lib/motion';
const loadFeatures=()=>import('./features').then(module=>module.default);
type Animations={reduced:boolean;sound:boolean;setSound:(v:boolean)=>void;busy:boolean;navigate:(url:string)=>Promise<boolean>;play:(kind:'snap'|'select'|'open')=>void;setLayer:(id:string,active:boolean)=>void};
const Context=createContext<Animations>({reduced:false,sound:false,setSound:()=>{},busy:false,navigate:async()=>false,play:()=>{},setLayer:()=>{}});
export const useAnimations=()=>useContext(Context);
/** Makes demo motion preferences local without changing the user's system setting. */
export function AnimationPreview({reduced,children}:{reduced:boolean;children:ReactNode}){const settings=useAnimations();return <Context.Provider value={{...settings,reduced:reduced||settings.reduced}}><MotionConfig reducedMotion={reduced?'always':'user'}>{children}</MotionConfig></Context.Provider>;}
/** Persistent navigation curtains, motion preference and opt-in local UI sounds. */
export function AnimationProvider({children}:{children:ReactNode}){
 const router=useRouter(),path=usePathname(),reduced=!!useReducedMotion();
 const [sound,setSound]=useState(false),[phase,setPhase]=useState<'idle'|'cover'|'reveal'>('idle'),[layers,setLayers]=useState<string[]>([]);
 const lock=useRef(false),timers=useRef<ReturnType<typeof setTimeout>[]>([]),audio=useRef<AudioContext|null>(null);
 const setLayer=useCallback((id:string,active:boolean)=>setLayers(prev=>active?[...new Set([...prev,id])]:prev.filter(x=>x!==id)),[]);
 const pause=useCallback((ms:number)=>new Promise<void>(resolve=>{timers.current.push(setTimeout(resolve,ms));}),[]);
 const play=useCallback((kind:'snap'|'select'|'open')=>{if(!sound)return;try{audio.current??=new AudioContext();const ctx=audio.current;void ctx.resume().catch(()=>{});const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.frequency.value=kind==='select'?660:kind==='open'?440:330;gain.gain.setValueAtTime(.025,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.1);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start();oscillator.stop(ctx.currentTime+.12);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};}catch{/* Unsupported audio never blocks an action. */}},[sound]);
 const navigate=useCallback(async(href:string)=>{
  if(lock.current)return false;
  const guard=new CustomEvent('copro:before-navigate',{cancelable:true,detail:{href}});
  if(!window.dispatchEvent(guard))return false;
  lock.current=true;setPhase('cover');play('open');
  const failsafe=setTimeout(()=>{lock.current=false;setPhase('idle');},1800);timers.current.push(failsafe);
  try{await pause(reduced?75:300);const destination=new URL(href,location.origin);
   if(destination.pathname===location.pathname){location.assign(href);}else router.push(href);
   await pause(reduced?25:80);setPhase('reveal');await pause(reduced?75:220);return true;
  }finally{clearTimeout(failsafe);lock.current=false;setPhase('idle');}
 },[router,pause,reduced,play]);
 useEffect(()=>{const click=(event:MouseEvent)=>{if(event.defaultPrevented||path.startsWith('/dev/'))return;const link=(event.target as Element)?.closest<HTMLAnchorElement>('a[href]');if(!link||!shouldAnimateNavigation(event,link.href,location.origin,link.target,link.hasAttribute('download')))return;const url=new URL(link.href);if(url.pathname===location.pathname&&url.search===location.search)return;event.preventDefault();void navigate(url.pathname+url.search+url.hash);};document.addEventListener('click',click);return()=>document.removeEventListener('click',click);},[navigate,path]);
 useEffect(()=>()=>{timers.current.forEach(clearTimeout);void audio.current?.close();},[]);
 return <LazyMotion features={loadFeatures}><MotionConfig reducedMotion="user"><Context.Provider value={{reduced,sound,setSound,busy:phase!=='idle'||layers.length>0,navigate,play,setLayer}}>{children}{phase!=='idle'&&<div className="route-curtain" aria-hidden="true">{Array.from({length:reduced?1:5},(_,i)=><m.div key={i} initial={reduced?{opacity:0}:{y:'100%'}} animate={reduced?{opacity:phase==='cover'?1:0}:{y:phase==='cover'?0:'-100%'}} transition={{duration:reduced?.075:.14,delay:reduced?0:i*.04,ease:phase==='cover'?eases.enter:eases.exit}}/>)}</div>}</Context.Provider></MotionConfig></LazyMotion>;
}
