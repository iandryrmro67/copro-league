// Scope the imported rules and apply the owner's board 44 spacing system.
import fs from 'node:fs';
import postcss from 'postcss';
const scale=[4,8,16,24,32,48,64,96],tokens={4:'--sp-1',8:'--sp-2',16:'--sp-4',24:'--sp-6',32:'--sp-8',48:'--sp-12',64:'--sp-16',96:'--sp-24'};
const spacing=/^(margin|padding)(-(top|right|bottom|left|inline(-start|-end)?|block(-start|-end)?))?$|^(gap|column-gap|row-gap)$/;
const map=(prop,value)=>value.replace(/(?<![\w-])(-?\d*\.?\d+)(px|rem|em)\b/g,(m,n,u)=>{const v=+n*(u==='px'?1:16);if(v<=0)return'0';if(v>96)return m;if(v===20&&prop.includes('gap'))return'var(--grid-gap)';const near=scale.reduce((a,b)=>Math.abs(v-b)<=Math.abs(v-a)?b:a);return`var(${tokens[near]})`;});
const imports=JSON.parse(fs.readFileSync('/tmp/copro-hud-import-styles.json','utf8'));const seen=new Set(),output=[];
for(const {scope,css,board} of imports){const key=scope+css;if(seen.has(key))continue;seen.add(key);const tree=postcss.parse(css);const animations=new Map();tree.walkAtRules('keyframes',r=>{animations.set(r.params,scope.replaceAll('-','_')+'_'+r.params);r.params=animations.get(r.params)});tree.walkRules(r=>{if(r.parent.type==='atrule'&&r.parent.name==='keyframes')return;r.selectors=r.selectors.map(s=>s==='body'?'.'+scope:'.'+scope+' '+s)});tree.walkDecls(d=>{if(spacing.test(d.prop))d.value=map(d.prop,d.value);if(/^animation/.test(d.prop))for(const [a,b]of animations)d.value=d.value.replace(new RegExp('\\b'+a+'\\b','g'),b)});output.push('/* Original board '+board+' */\n'+tree.toString());}
fs.writeFileSync('app/hud-components.css',output.join('\n'));
const file='components/hud-source-templates.json',templates=JSON.parse(fs.readFileSync(file,'utf8'));const imported=new Set(['kit','compare','duo','players','matchTop','matchTimeline','matchSummary','matchLeaders','matchHeatmap','matchTable','matchDetails','statsOverview','identityBoard','mobileRanking','wizard','homeProgress','homeScrollHint','homeScrollNav']);
function visit(n){if(typeof n==='string')return;if(n.attrs.style){const tree=postcss.parse('n{'+n.attrs.style+'}');tree.walkDecls(d=>{if(spacing.test(d.prop))d.value=map(d.prop,d.value)});n.attrs.style=tree.first.nodes.map(d=>d.toString()).join(';');}n.children.forEach(visit)}
for(const [k,n]of Object.entries(templates))if([...imported].some(p=>k.startsWith(p)))visit(n);
fs.writeFileSync(file,JSON.stringify(templates));
