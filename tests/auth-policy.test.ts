import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accessFor,safeReturnPath} from '../lib/auth-policy.ts';
test('private league requires confirmed allowlisted email; only configured admins administer',()=>{
 const config={admins:'OWNER@example.com',members:'player@example.com'};
 assert.deepEqual(accessFor({email:'owner@example.com',email_confirmed_at:'now'},config),{allowed:true,admin:true});
 assert.deepEqual(accessFor({email:'player@example.com',email_confirmed_at:'now'},config),{allowed:true,admin:false});
 assert.equal(accessFor({email:'owner@example.com'},config).allowed,false);
 assert.equal(accessFor({email:'stranger@example.com',email_confirmed_at:'now'},config).allowed,false);
 assert.equal(accessFor(null,config).admin,false);
 assert.equal(accessFor({email:'owner@example.com',email_confirmed_at:'now'},{admins:'',members:''}).allowed,false);
});
test('login cannot redirect outside the site or loop back into auth',()=>{
 for(const path of ['https://evil.test','//evil.test','/\\evil.test','/connexion','/auth/logout','/auth/callback?next=//evil.test'])assert.equal(safeReturnPath(path),'/');
 assert.equal(safeReturnPath('/admin?match=s2-match-5'),'/admin?match=s2-match-5');
});
