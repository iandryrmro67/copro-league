import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN??'http://localhost:5174';
for(const path of ['/','/admin','/awards']){
 const r=await fetch(origin+path,{redirect:'manual'});assert.equal(r.status,307);assert.match(r.headers.get('location'),/\/connexion\?/);
}
for(const path of ['/api/league','/api/recognition','/api/awards','/api/export','/api/photos/test','/api/videos/test']){
 const r=await fetch(origin+path,{headers:{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':'imramaro@gmail.com'}});assert.equal(r.status,401,path);
}
assert.equal((await fetch(origin+'/api/players',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:'{}'})).status,401);
assert.equal((await fetch(origin+'/api/players',{method:'POST',headers:{Origin:'https://other.example','Content-Type':'application/json'},body:'{}'})).status,403);
assert.equal((await fetch(origin+'/api/videos/test',{method:'HEAD'})).status,401);
assert.equal((await fetch(origin+'/auth/logout',{method:'POST',headers:{Origin:'https://other.example'},redirect:'manual'})).status,403);
console.log('13 HTTP access checks passed; forged ChatGPT headers rejected.');
