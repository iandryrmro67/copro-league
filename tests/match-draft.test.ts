import type {Match} from '../lib/model.ts';
import test from 'node:test';import assert from 'node:assert/strict';
const match:Match={id:'m',seasonId:'s',number:1,date:'',duration:60,location:'',status:'scheduled',scoreA:null,scoreB:null,mvpId:null,level:3,video:'',version:2,trackedKeys:[],participants:[],events:[]};
test('recovery retains an incomplete new match and the saved sequence/time',async()=>{
 const {writeDraft,readDraft}=await import('../lib/match-draft.ts');
 const values=new Map<string,string>();const storage={setItem:(k:string,v:string)=>values.set(k,v),getItem:(k:string)=>values.get(k)??null,removeItem:(k:string)=>values.delete(k)};
 const m:Match={...match,analysis:{schemaVersion:1,status:'in_progress',mode:'highlights',completeKeys:[],ranges:[],session:{sequenceId:'same-sequence',videoTime:125,offset:30}}};
 assert.equal(writeDraft(storage,'owner',m).ok,true);
 const recovered=readDraft(storage,'owner',match)!;
 assert.equal(recovered.match.analysis!.session.sequenceId,'same-sequence');assert.equal(recovered.match.analysis!.session.videoTime,125);
 assert.equal(recovered.conflict,false);assert.equal(readDraft(storage,'other-owner',match),null);
 assert.equal(readDraft(storage,'owner',{...match,version:3})!.conflict,true);
});
test('malformed storage and storage denial cannot crash the editor',async()=>{
 const {writeDraft,readDraft}=await import('../lib/match-draft.ts');
 const denied={setItem:()=>{throw Error('quota')},getItem:()=>'{broken',removeItem:()=>{}};
 assert.equal(writeDraft(denied,'u',match).ok,false);assert.equal(readDraft(denied,'u',match),null);
});
test('intermediate manual corrections survive recovery before counts are reconciled',async()=>{
 const {writeDraft,readDraft}=await import('../lib/match-draft.ts');
 const values=new Map<string,string>();const storage={setItem:(k:string,v:string)=>values.set(k,v),getItem:(k:string)=>values.get(k)??null,removeItem:(k:string)=>values.delete(k)};
 const m:Match={...match,analysis:{schemaVersion:1,status:'in_progress',mode:'highlights',completeKeys:[],ranges:[],manualStats:{a:{passesCompleted:10,passesAttempted:5}},session:{sequenceId:'s',videoTime:0,offset:0}}};
 writeDraft(storage,'u',m);assert.ok(readDraft(storage,'u',match));
});
test('a blocked localStorage property is handled as unavailable storage without throwing',async()=>{
 const {browserDraftStorage,writeDraft,readDraft,listDrafts}=await import('../lib/match-draft.ts');
 assert.ok(browserDraftStorage,'browser storage adapter is available');
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
 const fake=Object.defineProperty({},'localStorage',{get:()=>{throw Error('SecurityError')}});
 Object.defineProperty(globalThis,'window',{configurable:true,value:fake});
 try{assert.equal(writeDraft(browserDraftStorage,'u',match).ok,false);assert.equal(readDraft(browserDraftStorage,'u',match),null);assert.deepEqual(listDrafts(browserDraftStorage,'u'),[]);}finally{if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');}
});
