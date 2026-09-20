/** Restricted compatibility layer for the league's parameterized SQLite queries. */
export interface SQLConnection {
 query(sql:string,args:unknown[]):Promise<{rows:Record<string,any>[];count:number}>;
 transaction<T>(fn:(connection:SQLConnection)=>Promise<T>):Promise<T>;
}
export function postgresQuery(input:string):string {
 const ignore=/^INSERT OR IGNORE\b/i.test(input);
 let i=0;
 const sql=input.replace(/^INSERT OR IGNORE\b/i,'INSERT').replace(/'(?:''|[^'])*'|"(?:""|[^"])*"|\?|\bend\b/gi,token=>token==='?'?`$${++i}`:token.toLowerCase()==='end'?'"end"':token);
 return ignore?sql.replace(/;?$/,' ON CONFLICT DO NOTHING'):sql;
}
class Statement {
 constructor(readonly connection:SQLConnection,readonly sql:string,readonly args:unknown[]=[]){ }
 bind(...args:unknown[]){return new Statement(this.connection,this.sql,args)}
 async execute(connection=this.connection){const r=await connection.query(postgresQuery(this.sql),this.args);return {results:r.rows,meta:{changes:r.count},success:true}}
 all(){return this.execute()}
 run(){return this.execute()}
 async first<T=Record<string,unknown>>():Promise<T|null>{return (await this.execute()).results[0] as T??null}
}
export function createDatabase(connection:SQLConnection){return {
 prepare:(sql:string)=>new Statement(connection,sql),
 batch:(statements:Statement[])=>connection.transaction(async tx=>{const results=[];for(const statement of statements)results.push(await statement.execute(tx));return results}),
}}
