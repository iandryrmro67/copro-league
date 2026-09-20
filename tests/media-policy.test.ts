import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mediaSpec,validMediaHeader,validMediaId} from '../lib/media-policy.ts';
test('uploads reject oversized files and MIME mismatches',()=>{
 assert.equal(mediaSpec('videos',{name:'match.mp4',type:'video/mp4',size:100})?.type,'video/mp4');
 assert.equal(mediaSpec('videos',{name:'match.mp4',type:'text/html',size:100}),null);
 assert.equal(mediaSpec('videos',{name:'match.mp4',type:'video/mp4',size:51*1024*1024}),null);
 assert.equal(mediaSpec('photos',{name:'face.svg',type:'image/svg+xml',size:100}),null);
});
test('media validation checks actual signatures and traversal-free ids',()=>{
 assert.equal(validMediaHeader('image/png',new Uint8Array([137,80,78,71,13,10,26,10])),true);
 assert.equal(validMediaHeader('image/png',new TextEncoder().encode('<html>fake image')),false);
 assert.equal(validMediaHeader('image/webp',new TextEncoder().encode('RIFF0000WEBP')),true);
 assert.equal(validMediaHeader('video/mp4',new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109])),true);
 assert.equal(validMediaId('videos','../../secret'),false);
 assert.equal(validMediaId('videos','43d7bdfc-c87f-4afd-a933-2a62a8393e54.mp4'),true);
 assert.equal(validMediaId('photos','43d7bdfc-c87f-4afd-a933-2a62a8393e54'),true);
});
