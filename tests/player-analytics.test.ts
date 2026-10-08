import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ratingContributions,profileValue,recentRatings} from '../lib/player-analytics.ts';
import type {Summary} from '../lib/engine.ts';
test('rating contributions retain the peak bonus and turnover penalty',()=>{
 const result=ratingContributions({goals:4,passesCompleted:20,turnovers:2},[{goals:2,passesCompleted:10},{goals:2,passesCompleted:10},{goals:2,passesCompleted:10}])!;
 assert.equal(result.rating,9.9);assert.equal(result.penalty,-.12);
 assert.deepEqual(result.values.map(v=>v.value),[2,2]);
});
test('negative families keep their actual weighted contributions',()=>{
 const result=ratingContributions({goals:0,passesCompleted:5},[{goals:2,passesCompleted:10},{goals:2,passesCompleted:10},{goals:2,passesCompleted:10}],{finition:3,passes:1})!;
 assert.deepEqual(result.values.map(v=>v.value),[-3,-.5]);assert.equal(result.rating,3);
 assert.equal(result.correction,.5);
});
test('unknown advanced measurements and a missing previous period stay unknown',()=>{
 const s={stats:{},form:[{participant:{stats:{rating:7}}}],appearances:1} as unknown as Summary;
 assert.equal(profileValue(s,'lineBreakingPasses'),null);assert.equal(profileValue(s,'ratingStd'),null);
 assert.deepEqual(recentRatings(s),{current:7,previous:null,delta:null});
 assert.equal(ratingContributions({goals:2},[{goals:1},{goals:1}]),null);
});
