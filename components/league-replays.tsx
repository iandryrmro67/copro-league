'use client';
import {HoverTile} from './animations/HoverTile';
import type {League,Match} from '@/lib/model';
import {Play,LockKeyhole} from 'lucide-react';
import {Heading,Empty,date} from './league-ui';
/** Uses existing match media and permission policies; never loads private video bytes. */
export function Replays({data,matches,filters}:{data:League;matches:Match[];filters:React.ReactNode}){
 const replays=matches.filter(match=>match.video);
 return <><Heading title="LES REPLAYS." kicker="VIDÉOS DES MATCHS">{filters}</Heading><p className="intro muted">Retrouve les vidéos disponibles et leurs actions depuis la feuille de match.</p><div className="replays-grid">{replays.map(match=><HoverTile key={match.id}><a className="panel replay-tile" href={`/matchs/${match.id}?tab=video`} key={match.id}><div className="replay-visual"><Play size={40} aria-hidden="true"/><span className="eyebrow">MATCH / {String(match.number).padStart(2,'0')}</span></div><p className="eyebrow">{date(match.date)} · {data.seasons.find(s=>s.id===match.seasonId)?.name}</p><h2>MATCH #{match.number}</h2><p>{match.scoreA??'—'} – {match.scoreB??'—'}</p>{!data.user&&match.video.startsWith('/api/videos/')&&<p className="muted"><LockKeyhole size={14} aria-hidden="true"/> Connexion requise pour cette vidéo</p>}<span className="textbutton">REGARDER LE REPLAY →</span></a></HoverTile>)}</div>{!replays.length&&<Empty>Aucune vidéo disponible sur cette période.</Empty>}</>;
}
