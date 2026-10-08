import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SourceField} from '../components/league-kit.tsx';

test('source field retains the real form control and its edited value',()=>{
 const control=createElement('input',{type:'number',name:'duration',value:120,onChange:()=>{}});
 const fieldProps={label:'Durée du match',children:control};
 const html=renderToStaticMarkup(createElement(SourceField,fieldProps));
 assert.match(html,/Durée du match/);
 assert.match(html,/<input[^>]*name="duration"[^>]*value="120"/);
 assert.equal((html.match(/<input\b/g)??[]).length,1);
});
