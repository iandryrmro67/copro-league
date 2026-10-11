'use client';
import type {Match,MatchEvent} from '@/lib/model';
import {unrankedReasons} from '@/lib/model';

const minute=(e:MatchEvent)=>e.timestamp==null?'':`${Math.floor(e.timestamp/60)}'`;
export const InjuryMark=()=><span className="injury-mark" aria-hidden="true">+</span>;

/** Outside the ranking: the match keeps its own stats but feeds no ELO, record or total. */
export function UnrankedControl({match:m,onChange}:{match:Match;onChange:(m:Match)=>void}){
 const on=!!m.unranked;
 const toggle=()=>onChange({...m,unranked:!on,unrankedReason:!on&&!m.unrankedReason?(m.events.some(e=>e.type==='INJURY')?'Blessure':unrankedReasons[0]):m.unrankedReason});
 return <div className={'unranked-card'+(on?' on':'')}>
  <button type="button" role="switch" aria-checked={on} aria-label="Match hors classement" className="unranked-switch" onClick={toggle}/>
  <div>
   <h3>Match hors classement</h3>
   <p className="muted">Les stats du match restent calculées et consultables sur sa page, mais ne comptent dans aucun total : ni ELO, ni bilan, ni stats cumulées, ni classements.</p>
   {on&&<div className="unranked-detail">
    <p className="eyebrow">MOTIF · AFFICHÉ SUR LA PAGE DU MATCH</p>
    <div className="unranked-chips">{unrankedReasons.map(r=><button type="button" key={r} className={m.unrankedReason===r?'on':''} aria-pressed={m.unrankedReason===r} onClick={()=>onChange({...m,unrankedReason:r})}>{r}</button>)}</div>
    <input aria-label="Précision du motif" maxLength={300} placeholder="Précision facultative" value={m.unrankedNote??''} onChange={e=>onChange({...m,unrankedNote:e.target.value})}/>
    <div className="unranked-impact"><span className="yes">Stats visibles sur la page du match</span><span className="yes">Timeline et vidéo</span><span className="no">ELO</span><span className="no">Bilan V / N / D</span><span className="no">Totaux &amp; moyennes joueur</span><span className="no">Classements, records, duos</span><span className="no">Récompenses / MVP de saison</span></div>
   </div>}
  </div>
 </div>;
}

export function UnrankedBanner({match:m}:{match:Match}){
 if(!m.unranked)return null;
 return <div className="unranked-banner" role="note"><span className="unranked-code">HC</span><div><strong>Match hors classement{m.unrankedReason?' · '+m.unrankedReason:''}</strong><p>{m.unrankedNote?m.unrankedNote+' ':''}Les stats de ce match ne comptent ni dans l’ELO ni dans les totaux de la saison.</p></div></div>;
}

export function InjuryTag({event}:{event:MatchEvent}){return <span className="injury-tag"><InjuryMark/>Sorti {minute(event)||'blessé'}</span>}
