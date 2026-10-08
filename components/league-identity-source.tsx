'use client';
import type {ReactNode} from 'react';
import type {RecognitionData} from '@/lib/recognition-repository';
import type {BadgeResult} from '@/lib/recognition';
import {SourceTemplate,hudTemplates,sourceAt} from './hud-source-template';
import {SourceRecognitionGlyph} from './source-recognition-glyph';
import {fmt} from './league-ui';
const categories=['Status','Finishing','Creation / Technique','Control','Volume','Defensive','Allegations'];
export function SourceIdentity({recognition,playerId}:{recognition:RecognitionData;playerId:string}){
 const row=recognition.players.find(p=>p.playerId===playerId),source=hudTemplates.identityBoard;
 const main=sourceAt(source,'0.0.1.0'),cell=sourceAt(source,'0.1.2.0');
 const glyph=(badge:BadgeResult,size:number)=><span className="source-identity-glyph" style={{width:size,height:size}}><SourceRecognitionGlyph name={badge.name} icon={badge.icon}/></span>;
 const slots:Record<string,ReactNode>={
  '0.0.0.1':`${recognition.badgeSeasonName} · LES MEILLEURS SCORES`,
  '0.0.1':row?.main.length?row.main.map(b=><SourceTemplate node={main} key={b.id} slots={{'0':glyph(b,76),'1':b.name,'2':`SCORE ${b.score}`}} props={{'3.0':{style:{width:`${b.score}%`}},'':{style:{background:b.category==='Allegations'?'#1E1111':'#0F1A0E'}}}}/>):<p className="muted">Aucun badge principal actif pour le moment.</p>,
  '0.0.2.0':`${row?.activeCount??0} BADGES ACTIFS`,
  '0.0.2.1':<a href="#badge-collection">VOIR LA COLLECTION ↓</a>,
  '0.1.0.1':`${row?.activeCount??0} ACTIFS · ${(row?.badges.length??35)-(row?.activeCount??0)} INACTIFS`,
 };
 categories.forEach((category,i)=>{
  const badges=row?.badges.filter(b=>b.category===category)??[];
  slots[`0.1.${i+2}`]=badges.map(b=>{
   const passed=b.checks.filter(c=>c.passed).length,progress=b.active?b.score:b.checks.length?passed/b.checks.length*100:0;
   return <SourceTemplate node={cell} key={b.id} slots={{'0':glyph(b,44),'1.0.0':b.name,'1.0.1':b.active?'ACTIF ✓':'INACTIF','1.1':<details><summary>{b.description}</summary>{b.checks.map((c,i)=><SourceTemplate node={sourceAt(cell,'1.1.0')} key={c.key+c.label+i} slots={{'':`${c.passed?'✓':'○'} ${c.label} · ${c.actual==null?'Non observé':fmt(c.actual,2)} / ${fmt(c.target,2)}`}} props={{'':{style:{color:c.passed?'#8BE36B':'#8E978C'}}}}/>)}</details>,'2.0':b.active?`SCORE ${b.score}`:`${passed} / ${b.checks.length}`}} props={{'':{className:'source-badge-row',style:{opacity:b.active?1:.8}},'1.0.1':{style:{color:b.active?'#8BE36B':'#8E978C'}},'2.1.0':{style:{width:`${progress}%`,background:b.active?'#56B947':'#4A524A'}}}}/>;
  });
 });
 const won=recognition.seasons.filter(s=>s.finalized).map(s=>({...s,awards:s.awards.filter(a=>a.winner?.playerIds.includes(playerId))})).filter(s=>s.awards.length);
 const palmares=sourceAt(source,'1.0'),season=sourceAt(palmares,'1'),award=sourceAt(season,'1.0');
 slots['1']=<SourceTemplate node={palmares} slots={{'':<><SourceTemplate node={sourceAt(palmares,'0')}/>{won.map(s=><SourceTemplate node={season} key={s.seasonId} slots={{'0':s.seasonName,'1':s.awards.map(a=><SourceTemplate node={{...award,tag:'a'}} key={a.id} slots={{'0':<span className="source-identity-glyph" style={{width:44,height:44}}><SourceRecognitionGlyph name={a.name} icon={a.icon}/></span>,'1.0':a.name,'1.1':`${s.seasonName} · SCORE ${fmt(a.score,1)}${a.winner!.playerIds.length>1?' · '+a.winner!.name:''}`}} props={{'':{href:'/awards'}}}/>)}}/>)}{!won.length&&<p className="muted">Les trophées de saisons clôturées apparaîtront ici.</p>}<SourceTemplate node={sourceAt(palmares,'3')}/></>}}/>;
 return <section className="source-identity"><SourceTemplate name="identityBoard" slots={slots} props={{'0.1':{id:'badge-collection'}}}/><p className="muted">La collection suit les règles enregistrées : présence minimale et percentiles de la saison. Au maximum une Allegation parmi les trois badges principaux.</p></section>;
}
