export function registerLeagueTools(options:{read:()=>unknown;filter:(seasonId:string,period:string)=>void;seasons:string[]}){
 const context=(document as Document&{modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>unknown}}).modelContext;
 if(!context?.registerTool)return()=>{};
 const lifecycle=new AbortController();
 for(const tool of [
 {name:'read_league_summary',description:'Lire les matchs et joueurs de la saison affichée.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>options.read()},
 {name:'set_league_filters',description:'Changer la saison et la période affichées, sans modifier les données enregistrées.',inputSchema:{type:'object',properties:{seasonId:{type:'string'},period:{type:'string',enum:['all','5','10']}},required:['seasonId','period'],additionalProperties:false},annotations:{readOnlyHint:false},execute:(input:unknown)=>{const v=input as {seasonId?:unknown;period?:unknown};if(!v||typeof v.seasonId!=='string'||!options.seasons.includes(v.seasonId)||typeof v.period!=='string'||!['all','5','10'].includes(v.period))throw Error('Saison ou période invalide');options.filter(v.seasonId,v.period);return {seasonId:v.seasonId,period:v.period}}}
 ]){try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}
 return()=>lifecycle.abort();
}
