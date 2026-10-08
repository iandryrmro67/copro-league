'use client';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { SourceTemplate } from './hud-source-template';
export function HudLoading({mode='loading'}:{mode?:'loading'|'intro'|'transition'}) {
 const id=useId().replace(/:/g,'');
 return <div className={`ds-load-motion source-load-${mode}`} aria-hidden={mode!=='loading'} role={mode==='loading'?'status':undefined} aria-label={mode==='loading'?'Chargement de la ligue':undefined}><SourceTemplate name="loader" slots={{'1':''}} props={{'0.0.0.0':{id},'0.0.1':{clipPath:`url(#${id})`}}}/></div>;
}
export function LeagueMotion({children}:{children:ReactNode}) {
 const [intro,setIntro]=useState(true),[transition,setTransition]=useState(0);
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timer=window.setTimeout(()=>setIntro(false),reduced?0:8000);
  let end:ReturnType<typeof setTimeout>;
  const animate=()=>{if(reduced)return;setTransition(v=>v+1);clearTimeout(end);end=setTimeout(()=>setTransition(0),2160);};
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
