// Opt-in integration test: a configured running application and owner credentials are required.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {db} from '../lib/server/database.ts';
const origin=process.env.TEST_ORIGIN??'http://localhost:5174';
const email=process.env.TEST_ADMIN_EMAIL,password=process.env.TEST_ADMIN_PASSWORD;
if(!email||!password)throw Error('TEST_ADMIN_EMAIL and TEST_ADMIN_PASSWORD required.');
const login=await fetch(origin+'/auth/login',{method:'POST',redirect:'manual',headers:{Origin:origin},body:new URLSearchParams({email,password,return_to:'/admin'})});
assert.equal(login.status,303);assert.equal(login.headers.get('location'),origin+'/admin');
const cookie=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');assert.ok(cookie);
const league=await fetch(origin+'/api/league',{headers:{cookie}});assert.equal(league.status,200);const data=await league.json();assert.equal(data.admin,true);assert.equal(data.players.length,22);assert.equal(data.matches.length,6);assert.equal(data.matches.find(m=>m.id==='s2-match-6').version,3);
const recognition=await fetch(origin+'/api/recognition',{headers:{cookie}});assert.equal(recognition.status,200);assert.equal((await recognition.json()).players.length,22);
const anon=await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL+'/rest/v1/players?select=id',{headers:{apikey:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}});assert.ok([401,403].includes(anon.status));
const post=(path,body)=>fetch(origin+'/api/'+path,{method:'POST',headers:{Origin:origin,cookie,'Content-Type':'application/json'},body:JSON.stringify(body)});
const file=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64');
const ticketResponse=await post('photos/ticket',{name:'qa.png',type:'image/png',size:file.length});assert.equal(ticketResponse.status,200);const ticket=await ticketResponse.json();
try{
 const upload=await fetch(ticket.signedUrl,{method:'PUT',headers:{'Content-Type':'image/png'},body:file});assert.ok(upload.ok,'direct signed upload');
 const complete=await post('photos/complete',{id:ticket.id});assert.equal(complete.status,200);const {url}=await complete.json();
 assert.equal((await fetch(origin+url,{redirect:'manual'})).status,401);
 const read=await fetch(origin+url,{headers:{cookie},redirect:'manual'});assert.equal(read.status,307);
 const image=await fetch(read.headers.get('location'));assert.equal(image.status,200);assert.deepEqual(Buffer.from(await image.arrayBuffer()),file);
 console.log('Supabase live: login, administrator role, 22 players, 6 matches, badges, private tables and signed media verified.');
}finally{
 const storage=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}}).storage;
 const {error}=await storage.from('league-media').remove(['photos/'+ticket.id]);if(error)throw error;
 await db().prepare('DELETE FROM media_uploads WHERE id=?').bind(ticket.id).run();
 await fetch(origin+'/auth/logout',{method:'POST',headers:{Origin:origin,cookie},redirect:'manual'});
}
process.exit(0);
