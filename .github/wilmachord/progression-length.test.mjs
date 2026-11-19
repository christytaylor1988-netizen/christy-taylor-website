import assert from 'node:assert/strict';
import {current,writeResults} from './fixtures.mjs';
const tests=[],metrics=[];
const render=(e,frames)=>{const l=new Float32Array(128),r=new Float32Array(128);for(let i=0;i<frames;i+=128)e.process(l,r);};
for(const sr of [44100,48000]){
 const e=new current.Engine(sr);e.configure({...current.defaultState(),tempo:120,chordLength:1.2,arp:{...current.defaultState().arp,mode:'both',speed:3,length:.2}});e.message({type:'sequence',on:true});render(e,128);
 const chord=e.voices.filter(v=>v.origin==='seq'),arp=e.voices.find(v=>v.origin==='arp');assert.ok(chord.every(v=>Math.abs(v.offTick-115.2)<1e-9));assert.equal(arp.offTick,1.2000000000000002);
 const positions=[e.clock.tick,e.clock.phase,e.nextDrum,e.nextArp];e.configure({arp:{length:.9}});assert.ok(chord.every(v=>Math.abs(v.offTick-115.2)<1e-9));e.configure({tempo:177});assert.deepEqual([e.clock.tick,e.clock.phase,e.nextDrum,e.nextArp],positions);
 e.configure({tempo:120});render(e,sr*2);assert.ok(e.voices.some(v=>v.origin==='seq'&&v.chordTick===0&&v.gate!==0),'overlap retains preceding chord gate');assert.ok(e.voices.some(v=>v.origin==='seq'&&v.chordTick===96&&v.gate!==0));
 e.configure({chordLength:.1});render(e,128);assert.ok(e.voices.filter(v=>v.origin==='seq'&&v.chordTick===0).every(v=>v.gate===0));assert.equal(e.arp.length,.9);
 e.configure({chordLength:1.2});e.message({type:'pause'});render(e,sr*.2);const beat=e.clock.beat;e.message({type:'resume'});assert.equal(e.clock.beat,beat);assert.ok(e.voices.filter(v=>v.origin==='seq'&&v.gate!==0).every(v=>Math.abs(v.offTick-211.2)<1e-9));
 e.message({type:'stop'});render(e,sr*.5);assert.equal(e.freeVoices.length,40);metrics.push({sr,overlapTicks:19.2});tests.push(`${sr}: independent gates, genuine bounded overlap, tempo continuity and pause/resume`);
}
writeResults('progression-length',tests,{measurements:metrics});console.log('PASS',tests.join('\nPASS '));
