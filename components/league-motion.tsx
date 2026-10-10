'use client';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { PauseCircle, PlayCircle } from 'lucide-react';
import { SourceTemplate } from './hud-source-template';
export function HudLoading({mode='loading'}:{mode?:'loading'|'intro'|'transition'}) {
 const id=useId().replace(/:/g,'');
 return <div className={`ds-load-motion source-load-${mode}`} aria-hidden={mode!=='loading'} role={mode==='loading'?'status':undefined} aria-label={mode==='loading'?'Chargement de la ligue':undefined}><SourceTemplate name="loader" slots={{'1':''}} props={{'0.0.0.0':{id},'0.0.1':{clipPath:`url(#${id})`}}}/></div>;
}
// Windows and other systems can turn animation effects off, which browsers report
// as prefers-reduced-motion. The visitor may override it here: 'on' plays every
// animation, 'off' stops them, no choice follows the system setting.
type MotionChoice='on'|'off'|null;
const MOTION_KEY='copro-motion',MOTION_EVENT='copro-motion-change';
const systemReduced=()=>typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
function readChoice():MotionChoice{try{const v=localStorage.getItem(MOTION_KEY);return v==='on'||v==='off'?v:null}catch{return null}}
export function prefersReducedMotion(){const choice=readChoice();return choice?choice==='off':systemReduced()}
// Rewrites the reduced-motion media queries of the loaded stylesheets in place.
const originalMedia=new WeakMap<MediaList,string>();
function applyMotionChoice(choice:MotionChoice){
 const visit=(rules:CSSRuleList)=>{for(const rule of Array.from(rules)){
  if(rule instanceof CSSMediaRule){const list=rule.media,original=originalMedia.get(list)??list.mediaText;
   if(/prefers-reduced-motion\s*:\s*reduce/.test(original)){originalMedia.set(list,original);const next=choice==='on'?'not all':choice==='off'?'all':original;if(list.mediaText!==next)list.mediaText=next}}
  if('cssRules' in rule)try{visit((rule as CSSGroupingRule).cssRules)}catch{}
 }};
 for(const sheet of Array.from(document.styleSheets))try{visit(sheet.cssRules)}catch{}
 document.documentElement.dataset.motion=choice??'system';
}
export function MotionToggle(){
 const [reduced,setReduced]=useState<boolean|null>(null);
 useEffect(()=>{const sync=()=>setReduced(prefersReducedMotion());sync();window.addEventListener(MOTION_EVENT,sync);return()=>window.removeEventListener(MOTION_EVENT,sync)},[]);
 if(reduced==null)return null;
 const toggle=()=>{const next:MotionChoice=reduced?'on':'off',choice=(next==='off')===systemReduced()?null:next;try{if(choice)localStorage.setItem(MOTION_KEY,choice);else localStorage.removeItem(MOTION_KEY)}catch{}applyMotionChoice(choice);window.dispatchEvent(new Event(MOTION_EVENT))};
 return <button type="button" className="button motion-toggle" aria-pressed={!reduced} onClick={toggle} title={reduced?'Activer les animations':'Couper les animations'}>{reduced?<PlayCircle size={16} aria-hidden="true"/>:<PauseCircle size={16} aria-hidden="true"/>}<span>Animations {reduced?'off':'on'}</span></button>;
}
export function LeagueMotion({children}:{children:ReactNode}) {
 const [intro,setIntro]=useState(true),[transition,setTransition]=useState(0);
 useEffect(()=>{
  const apply=()=>applyMotionChoice(readChoice());apply();
  const sheets=new MutationObserver(records=>{apply();for(const r of records)r.addedNodes.forEach(n=>{if(n instanceof HTMLLinkElement)n.addEventListener('load',apply,{once:true})})});sheets.observe(document.head,{childList:true});
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');media.addEventListener('change',apply);
  return()=>{sheets.disconnect();media.removeEventListener('change',apply)};
 },[]);
 useEffect(()=>{
  const reduced=prefersReducedMotion();
  const timer=window.setTimeout(()=>setIntro(false),reduced?0:8000);
  let end:ReturnType<typeof setTimeout>;
  const animate=()=>{if(prefersReducedMotion())return;setTransition(v=>v+1);clearTimeout(end);end=setTimeout(()=>setTransition(0),2160);};
  const click=(event:MouseEvent)=>{
   if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey)return;
   const anchor=(event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement|null;
   if(!anchor||anchor.target||anchor.download||anchor.hasAttribute('data-no-transition'))return;
   const url=new URL(anchor.href,window.location.href);
   if(url.origin===location.origin&&url.pathname!==location.pathname)animate();
  };
  document.addEventListener('click',click,true);window.addEventListener('popstate',animate);
  return()=>{clearTimeout(timer);clearTimeout(end);document.removeEventListener('click',click,true);window.removeEventListener('popstate',animate);};
 },[]);
 return <>{children}{intro&&<HudLoading mode="intro"/>}{transition>0&&<HudLoading key={transition} mode="transition"/>}</>;
}
