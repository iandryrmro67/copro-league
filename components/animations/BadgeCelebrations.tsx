'use client';
import {useEffect,useRef,useState} from 'react';
import type {BadgeResult} from '@/lib/recognition';
import {unlockedIds} from '@/lib/animation-state';
import {BadgeUnlock} from './BadgeUnlock';
import {useAnimations} from './AnimationProvider';
/** Observes successful responses for this visible profile; an initial read is never an unlock. */
export function BadgeCelebrations({scope,badges}:{scope:string;badges:BadgeResult[]}){
 const {busy,seenUnlocks:seen}=useAnimations(),reference=useRef<{scope:string;badges:BadgeResult[]}|null>(null),[queue,setQueue]=useState<BadgeResult[]>([]),[active,setActive]=useState<BadgeResult|null>(null);
 useEffect(()=>{const before=reference.current;if(!before||before.scope!==scope){reference.current={scope,badges};setQueue([]);setActive(null);return;}const scoped=new Set(badges.filter(b=>seen.has(scope+':'+b.id)).map(b=>b.id));const added=unlockedIds(before.badges,badges,scoped);reference.current={scope,badges};if(added.length){added.forEach(id=>seen.add(scope+':'+id));setQueue(q=>[...q,...badges.filter(b=>added.includes(b.id))].slice(0,3));}},[scope,badges,seen]);
 useEffect(()=>{if(active||busy||!queue.length)return;const timer=setTimeout(()=>{setActive(queue[0]);setQueue(q=>q.slice(1));},0);return()=>clearTimeout(timer);},[queue,busy,active]);
 return active?<BadgeUnlock badge={{...active,kind:'badge',status:'ACTIF'}} onClose={()=>setActive(null)}/>:null;
}
