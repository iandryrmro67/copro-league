'use client';
import {ArrowLeft,ArrowRight,ArrowRightLeft,ArrowUpRight,Check,ChevronRight,CircleDot,CircleMinus,CornerUpRight,Plus,ShieldCheck,Target,Waypoints} from 'lucide-react';
import type {League,Match} from '@/lib/model';
import {teamName} from '@/lib/model';
import {quickActions,type QuickAction} from '@/lib/annotation-controls';

const icons={goal:CircleDot,'on-target':Target,'off-target':ArrowUpRight,'failed-pass':ArrowRightLeft,recovery:ShieldCheck,interception:Waypoints,turnover:CircleMinus,clearance:CornerUpRight};
const actions:(keyof typeof icons)[]=['goal','on-target','off-target','recovery','interception','clearance','failed-pass','turnover'];
type Props={match:Match;data:League;actor:string;chain:boolean;busy?:boolean;editing:boolean;detailsOpen:boolean;time:string;onTimeChange:(value:string)=>void;onPlayer:(id:string)=>void;onRecord:(action:QuickAction)=>void;onChain:()=>void;onDetails:()=>void;onNewSequence:()=>void;onCancelEdit:()=>void};

export function AnnotationCapture({match:m,data,actor,chain,busy,editing,detailsOpen,time,onTimeChange,onPlayer,onRecord,onChain,onDetails,onNewSequence,onCancelEdit}:Props){
 const current=m.participants.find(p=>p.playerId===actor);
 const name=(id:string)=>data.players.find(p=>p.id===id)?.name??id;
 return <section className="annotation-capture" aria-label="Saisir une action">
  <div className="capture-heading"><h3>{editing?'Corriger l’action':'Ajouter une action'}</h3><label>À<input aria-label="Temps de l’action" value={time} onChange={e=>onTimeChange(e.target.value)} disabled={busy}/></label></div>
  <div className="capture-step"><span>1</span><h4>{chain?'Destinataire':'Joueur'}</h4><span className="capture-selected">{name(actor)}</span></div>
  <div className="capture-teams">
   {(['A','B'] as const).map(side=><div key={side} className={'capture-team team-'+side.toLowerCase()}>
    <div className="capture-team-label"><span>{side}</span>{teamName(m,side)}<i aria-hidden="true"/></div>
    <div className="capture-player-grid">{m.participants.filter(p=>p.team===side).map(p=>{
     const player=data.players.find(x=>x.id===p.playerId),active=actor===p.playerId,recipient=chain&&p.team===current?.team&&!active;
     return <button type="button" key={p.playerId} aria-label={recipient?'Passer à '+name(p.playerId):'Choisir '+name(p.playerId)} aria-pressed={active} title={name(p.playerId)} disabled={busy} className={'capture-player-button '+(active?'active':'')} onClick={()=>onPlayer(p.playerId)}>
      <span className="capture-avatar">{player?.photo?<img src={player.photo} width={40} height={40} loading="lazy" alt=""/>:name(p.playerId).slice(0,2).toUpperCase()}</span>
      <span>{name(p.playerId)}</span>{active&&<Check size={12} aria-hidden="true"/>}
     </button>;
    })}</div>
   </div>)}
  </div>
  {editing?<div className="capture-edit-notice"><span>Corrigez l’action ci-dessous.</span><button type="button" className="textbutton" onClick={onCancelEdit}><ArrowLeft size={14} aria-hidden="true"/>Annuler</button></div>:<>
   {!detailsOpen&&<>
    <div className="capture-step"><span>2</span><h4>Action</h4><small>Clic pour enregistrer</small></div>
    <div className="capture-action-grid">{actions.map(key=>{const Icon=icons[key];return <button type="button" key={key} disabled={busy||!current?.team} className={key==='goal'?'capture-action goal':'capture-action'} onClick={()=>onRecord(key)}><Icon size={16} strokeWidth={1.5} aria-hidden="true"/><span>{quickActions[key].label}</span></button>;})}<button type="button" className="capture-action capture-action-more" aria-expanded={false} aria-label="Ouvrir les actions détaillées" onClick={onDetails}><Plus size={16} aria-hidden="true"/><span>Autres actions</span></button></div>
    <div className="capture-possession">
     <button type="button" role="switch" aria-checked={chain} className={'capture-chain '+(chain?'active':'')} disabled={busy} onClick={onChain}><Waypoints size={16} aria-hidden="true"/><span>Passes en chaîne</span><i aria-hidden="true"/></button>
     <button type="button" className="textbutton" onClick={onNewSequence}>Nouvelle possession<ArrowRight size={13} aria-hidden="true"/></button>
    </div>
    {chain&&<p className="capture-help">{name(actor)} porte le ballon. Cliquez un partenaire pour enregistrer sa passe.</p>}
   </>}
   {detailsOpen&&<button type="button" className="capture-more" aria-expanded={detailsOpen} aria-label={detailsOpen?'Masquer les actions détaillées':'Ouvrir les actions détaillées'} onClick={onDetails}>{detailsOpen?<ArrowLeft size={15} aria-hidden="true"/>:<Plus size={15} aria-hidden="true"/>}{detailsOpen?'Retour aux actions rapides':'Autres actions / détails'}<ChevronRight size={15} aria-hidden="true"/></button>}
  </>}
 </section>;
}
