'use client';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {SourceTemplate, hudTemplates, sourceAt} from './hud-source-template';
export function SourceField({label,children}:{label:string;children:ReactNode}) {
 return <SourceTemplate node={{...hudTemplates.kitField,tag:'label'}} slots={{'':<><SourceTemplate node={sourceAt(hudTemplates.kitField,'0')} slots={{'':label}}/>{children}<SourceTemplate node={sourceAt(hudTemplates.kitField,'2')} slots={{'':''}}/></>}} props={{'':{className:'hud-kit fl field'}}}/>;
}
export function SourceFeedback({title,children,tone='success',onDismiss}:{title:string;children:ReactNode;tone?:'success'|'error'|'warning'|'info';onDismiss?:()=>void}) {
 const n=sourceAt(hudTemplates.kitAlerts,String({success:0,error:1,warning:2,info:3}[tone]));
 return <div className="hud-kit"><SourceTemplate node={n} slots={{'1.0':title,'1.1':children,'2':onDismiss?'✕':''}} props={{'':{role:tone==='error'?'alert':'status'},'2':onDismiss?{role:'button',tabIndex:0,onClick:onDismiss,onKeyDown:(e:React.KeyboardEvent)=>{if(e.key==='Enter'||e.key===' ')onDismiss()},'aria-label':'Fermer la notification'}:{style:{display:'none'}}}}/></div>;
}
export function SourceCheckbox({checked,onCheckedChange,disabled=false,id}:{checked:boolean;onCheckedChange:(checked:boolean)=>void;disabled?:boolean;id?:string}){
 return <span className="hud-kit"><SourceTemplate node={{...hudTemplates.kitCheckbox,tag:'span'}} slots={{'':<><SourceTemplate node={sourceAt(hudTemplates.kitCheckbox,'0')} props={{'':{checked,defaultChecked:undefined,disabled,id,onChange:(e:React.ChangeEvent<HTMLInputElement>)=>onCheckedChange(e.target.checked)}}}/><SourceTemplate node={sourceAt(hudTemplates.kitCheckbox,'1')}/></>}}/></span>;
}
export function SourceToast({title,children,tone='success',onDismiss}:{title:string;children:ReactNode;tone?:'success'|'error';onDismiss:()=>void}){
 return <div className="hud-kit source-toast"><SourceTemplate node={sourceAt(hudTemplates.kitToast,tone==='success'?'0':'1')} slots={{'1.0':title,'1.1':children,'2':'FERMER'}} props={{'':{role:tone==='error'?'alert':'status'},'2':{type:'button',onClick:onDismiss,'aria-label':'Fermer la notification'}}}/></div>;
}
export function SourceFooter(){const links=[['1.1','Classement','/stats'],['1.2','Matchs','/matchs'],['1.3','Awards','/awards'],['2.1','Annuaire','/joueurs'],['2.2','Draft','/draft'],['2.3','Profils & badges','/joueurs'],['3.1','Comprendre les stats','/glossaire'],['3.2','Connexion','/connexion'],['3.3','Saisons','/saisons']];const slots:Record<string,ReactNode>={};for(const [path,label,href]of links)slots[path]=<Link href={href}>{label}</Link>;return <footer className="hud-kit source-footer"><SourceTemplate name="kitFooter" slots={slots}/></footer>}
