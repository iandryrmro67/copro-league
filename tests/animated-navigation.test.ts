import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldAnimateNavigation,saveDraftForNavigation} from '../lib/animated-navigation.ts';
import type {Match} from '../lib/model.ts';
import {readDraft} from '../lib/match-draft.ts';
const click={button:0,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false};
test('native navigation semantics survive the game menu',()=>{
 const origin='https://copro-league.vercel.app';
 for(const url of ['/connexion?return_to=/admin','/auth/logout','/api/export','#main-content','https://example.com'])assert.equal(shouldAnimateNavigation(click,url,origin),false,url);
 assert.equal(shouldAnimateNavigation({...click,metaKey:true},'/stats',origin),false);
 assert.equal(shouldAnimateNavigation(click,'/stats',origin,'_blank'),false);
 assert.equal(shouldAnimateNavigation(click,'/stats',origin,'',true),false);
 assert.equal(shouldAnimateNavigation(click,'/matchs/m?tab=video',origin),true);
});
test('navigation saves the latest draft immediately and refuses storage failures',()=>{
 const match:Match={id:'m',seasonId:'s',number:1,date:'2026-10-04T12:00:00Z',duration:60,location:'Test',status:'scheduled',scoreA:null,scoreB:null,mvpId:null,level:1,video:'',participants:[],events:[],trackedKeys:[],version:1};
 const memory=new Map<string,string>();const storage={getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>{memory.set(k,v)},removeItem:(k:string)=>{memory.delete(k)}};
 const changed={...match,location:'Dernière modification'};
 assert.equal(saveDraftForNavigation(storage,'owner',changed,JSON.stringify(match),false),true);
 assert.equal(readDraft(storage,'owner',match)?.match.location,'Dernière modification');
 assert.equal(readDraft(storage,'other-owner',match),null);
 assert.equal(saveDraftForNavigation({...storage,setItem:()=>{throw Error('quota')}},'owner',changed,JSON.stringify(match),false),false);
 assert.equal(saveDraftForNavigation(storage,'owner',changed,JSON.stringify(match),true),false);
 assert.equal(readDraft(storage,'owner',match)?.match.location,'Dernière modification');
});
