import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createDatabase,postgresQuery,type SQLConnection} from '../lib/server/sql.ts';

test('PostgreSQL preserves atomic edits, versions and frozen awards',async()=>{
 const pg=new PGlite();
 const connection=(client:any):SQLConnection=>({query:async(sql,args)=>{const r=await client.query(sql,args);return {rows:r.rows,count:r.affectedRows??r.rows.length}},transaction:fn=>client.transaction((tx:any)=>fn(connection(tx)))});
 await pg.exec(await readFile(new URL('../supabase/migrations/202609200001_league.sql',import.meta.url),'utf8'));
 const db=createDatabase(connection(pg));
 await db.prepare('INSERT INTO players(id,name) VALUES(?,?)').bind('mathis','Mathis').run();
 await db.prepare('INSERT INTO seasons(id,name,start,end,status) VALUES(?,?,?,?,?)').bind('s2','Saison 2','','','finished').run();
 await assert.rejects(db.batch([
  db.prepare('UPDATE players SET name=? WHERE id=?').bind('Changed','mathis'),
  db.prepare('INSERT INTO player_attributes(player_id,data) VALUES(?,?)').bind('missing','{}'),
 ]));
 assert.equal((await db.prepare('SELECT name FROM players WHERE id=?').bind('mathis').first<any>())?.name,'Mathis');
 const results=await db.batch([
  db.prepare('UPDATE players SET version=version+1,edit_token=? WHERE id=? AND version=? RETURNING version').bind('first','mathis',1),
  db.prepare('INSERT INTO player_attributes(player_id,data) SELECT ?,? WHERE EXISTS(SELECT 1 FROM players WHERE id=? AND edit_token=?) ON CONFLICT(player_id) DO UPDATE SET data=excluded.data').bind('mathis','{"overall":80}','mathis','first')
 ]);
 assert.equal(results[0].results[0].version,2);
 const stale=await db.batch([
  db.prepare('UPDATE players SET version=version+1,edit_token=? WHERE id=? AND version=? RETURNING version').bind('stale','mathis',1),
  db.prepare('INSERT INTO player_attributes(player_id,data) SELECT ?,? WHERE EXISTS(SELECT 1 FROM players WHERE id=? AND edit_token=?) ON CONFLICT(player_id) DO UPDATE SET data=excluded.data').bind('mathis','{"overall":10}','mathis','stale')
 ]);
 assert.equal(stale[0].results.length,0);
 assert.equal((await db.prepare('SELECT data FROM player_attributes').first<any>())?.data,'{"overall":80}');
 for(const data of ['original','replacement'])await db.prepare('INSERT OR IGNORE INTO recognition_seasons(season_id,data,finalized_at) VALUES(?,?,?)').bind('s2',data,'date').run();
 assert.equal((await db.prepare('SELECT data FROM recognition_seasons').first<any>())?.data,'original');
 await pg.close();
});
test('SQL values stay bound and quoted strings retain question marks and end',()=>{
 assert.equal(postgresQuery("SELECT '?' AS marker, end FROM seasons WHERE name=? AND status='end'"),"SELECT '?' AS marker, \"end\" FROM seasons WHERE name=$1 AND status='end'");
});
