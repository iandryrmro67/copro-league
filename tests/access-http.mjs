import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN??'http://localhost:5174';
const forged={'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'imramaro@gmail.com'};
for(const path of ['/','/awards','/glossaire','/matchs']){
 const r=await fetch(origin+path,{redirect:'manual'});assert.equal(r.status,200,path);
}
const admin=await fetch(origin+'/admin',{redirect:'manual'});assert.equal(admin.status,307);assert.match(admin.headers.get('location'),/\/connexion\?/);
for(const path of ['/api/league','/api/recognition','/api/awards']){
 const r=await fetch(origin+path,{headers:forged});assert.equal(r.status,200,path);
 const data=await r.json();if(path==='/api/league'){assert.equal(data.admin,false);assert.equal(data.user,null);assert.ok(data.players.length>0);}
}
for(const [path,status] of [['/api/export',403],['/api/photos/test',404],['/api/videos/test',401]])assert.equal((await fetch(origin+path,{headers:forged})).status,status,path);
for(const path of ['players','matches','seasons','settings','awards','photos/ticket','videos/ticket','import'])assert.equal((await fetch(origin+'/api/'+path,{method:'POST',headers:{...forged,Origin:origin,'Content-Type':'application/json'},body:'{}'})).status,401,path);
assert.equal((await fetch(origin+'/api/players',{method:'POST',headers:{Origin:'https://other.example','Content-Type':'application/json'},body:'{}'})).status,403);
assert.equal((await fetch(origin+'/api/videos/test',{method:'HEAD'})).status,401);
assert.equal((await fetch(origin+'/auth/logout',{method:'POST',headers:{Origin:'https://other.example'},redirect:'manual'})).status,403);
console.log('Guest browsing works; administration, writes, exports and private videos remain protected.');
