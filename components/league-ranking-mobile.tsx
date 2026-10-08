'use client';
import type {ReactNode} from 'react';
import {metric,type Summary} from '@/lib/engine';
import {SourceTemplate,hudTemplates,sourceAt} from './hud-source-template';
import {fmt} from './league-ui';
export function SourceMobileRanking({title,stat,summaries,perMatch=false}:{title:string;stat:string;summaries:Summary[];perMatch?:boolean}){
 const rows=summaries.filter(s=>metric(s,stat,perMatch)!=null).sort((a,b)=>metric(b,stat,perMatch)!-metric(a,stat,perMatch)!),source=hudTemplates.mobileRanking,slots:Record<string,ReactNode>={'0.0.1':title,'0.1':'CLASSEMENT','1.0':'PÉRIODE SÉLECTIONNÉE','1.1':title.toUpperCase(),'1.2':perMatch?'PAR MATCH':'TOTAL','3.3':title.toUpperCase(),'3.4':stat==='elo'?'±':'','4':rows.slice(3).map(s=><SourceTemplate node={{...sourceAt(source,'4.0'),tag:'a'}} key={s.player.id} slots={{'0':rows.filter(p=>metric(p,stat,perMatch)!>metric(s,stat,perMatch)!).length+1,'1.0':s.player.name.slice(0,2).toUpperCase(),'1.1':s.player.name,'2':s.appearances,'3':fmt(metric(s,stat,perMatch),stat==='rating'?2:1),'4':stat==='elo'&&s.history.at(-1)?`${s.history.at(-1)!.delta>0?'▲':'▼'}${Math.abs(s.history.at(-1)!.delta)}`:''}} props={{'':{href:'/joueurs/'+s.player.id},'4':{className:(s.history.at(-1)?.delta??0)<0?'down':'up'}}}/>)};
 const props:Record<string,Record<string,unknown>>={'':{style:{width:'100%',height:'auto',overflow:'hidden',background:'#0A0C0A'}},'0.0.0':{style:{display:'none'}},'5':{style:{display:'none'}},'6':{style:{display:'none'}}};
 [rows[1],rows[0],rows[2]].forEach((s,i)=>{const base=`2.${i}`;if(!s){props[base]={style:{visibility:'hidden'}};return;}props[base]={as:'a',href:'/joueurs/'+s.player.id};slots[base+'.0']=s.player.name.slice(0,2).toUpperCase();slots[base+'.1']=s.player.name;slots[base+'.2']=fmt(metric(s,stat,perMatch),stat==='rating'?2:1);slots[base+'.3']=rows.filter(p=>metric(p,stat,perMatch)!>metric(s,stat,perMatch)!).length+1;});
 return <section className="source-mobile-ranking"><SourceTemplate name="mobileRanking" slots={slots} props={props}/>{!rows.length&&<p className="muted">Pas encore assez de données.</p>}</section>;
}
