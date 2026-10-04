'use client';
import {useEffect,useEffectEvent,useRef} from 'react';
import * as m from 'motion/react-m';
import {RecognitionIcon} from '../recognition-icon';
import type {ViewerBadge} from './BadgeViewer';
import {useAnimations} from './AnimationProvider';
import {eases} from '@/lib/motion';
/** Explicit unlock event only; the parent owns deduplication and historical baselines. */
export function BadgeUnlock({badge,onClose}:{badge:ViewerBadge;onClose:()=>void}){
 const {reduced,setLayer,play}=useAnimations(),dialog=useRef<HTMLDialogElement>(null),close=useEffectEvent(onClose);
 useEffect(()=>{dialog.current?.showModal();setLayer('unlock',true);play('select');const timer=setTimeout(()=>close(),3000);return()=>{clearTimeout(timer);setLayer('unlock',false);};},[setLayer,play]);
 return <dialog className="badge-unlock" ref={dialog} aria-labelledby="unlock-title" onCancel={e=>{e.preventDefault();onClose();}} onClick={onClose}><m.div className="unlock-banner" initial={reduced?{opacity:0}:{opacity:0,y:-24}} animate={{opacity:1,y:0}} transition={{duration:reduced?.15:.35,ease:eases.enter}}>BADGE DÉBLOQUÉ</m.div><div className="unlock-symbol">{!reduced&&<><m.i className="unlock-flash" aria-hidden="true" initial={{opacity:.25}} animate={{opacity:0}} transition={{duration:.1}}/><m.i className="unlock-ring" aria-hidden="true" initial={{opacity:.6,scale:1}} animate={{opacity:0,scale:2.4}} transition={{duration:1,ease:eases.exit}}/>{Array.from({length:10},(_,i)=><m.i className="unlock-particle" key={i} aria-hidden="true" initial={{opacity:1,x:0,y:0}} animate={{opacity:0,x:Math.cos(i*Math.PI/5)*140,y:Math.sin(i*Math.PI/5)*140}} transition={{duration:.8,ease:eases.exit}}/>)}</>}<m.div initial={{opacity:0,scale:reduced?1:.6}} animate={{opacity:1,scale:1}} transition={{duration:reduced?.15:.5,ease:eases.enter}}><RecognitionIcon icon={badge.icon}/></m.div></div><h2 id="unlock-title">{badge.name}</h2><p>{badge.description}</p><button className="button" type="button" onClick={e=>{e.stopPropagation();onClose();}}>Fermer</button></dialog>;
}
