import {draftMatchSchema} from './validation';
import type {Match} from './model';
export type DraftStorage=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
const key=(owner:string,id:string)=>`copro:match-draft:v1:${encodeURIComponent(owner)}:${id}`;
export function writeDraft(storage:DraftStorage,owner:string,match:Match){
 try{const savedAt=new Date().toISOString();storage.setItem(key(owner,match.id),JSON.stringify({schemaVersion:1,savedAt,match}));return {ok:true,savedAt}}
 catch{return {ok:false,savedAt:null}}
}
export function readDraft(storage:DraftStorage,owner:string,current:Match):{match:Match;savedAt:string;conflict:boolean}|null {
 try{const raw=storage.getItem(key(owner,current.id));if(!raw)return null;const envelope=JSON.parse(raw);if(envelope.schemaVersion!==1||typeof envelope.savedAt!=='string')return null;
 const parsed=draftMatchSchema.safeParse(envelope.match);if(!parsed.success||parsed.data.id!==current.id)return null;
 return {match:parsed.data as Match,savedAt:envelope.savedAt,conflict:parsed.data.version!==current.version};}catch{return null}
}
export function removeDraft(storage:DraftStorage,owner:string,id:string){try{storage.removeItem(key(owner,id));return true}catch{return false}}
export function listDrafts(storage:Storage,owner:string){
 const prefix=`copro:match-draft:v1:${encodeURIComponent(owner)}:`;const drafts:Match[]=[];
 try{for(let i=0;i<storage.length;i++){const k=storage.key(i);if(!k?.startsWith(prefix))continue;const raw=storage.getItem(k);if(!raw)continue;const envelope=JSON.parse(raw);const parsed=draftMatchSchema.safeParse(envelope.match);if(envelope.schemaVersion===1&&parsed.success)drafts.push(parsed.data as Match)}}catch{}
 return drafts;
}
