import assert from 'node:assert/strict';
import fs from 'node:fs';import {performance} from 'node:perf_hooks';
import vm from 'node:vm';
import {worklet,html,samples,current,out} from './fixtures.mjs';
const {Engine,PerformanceFX,factoryGrid,drumTimeline,paintDrumCell,decodeSamples,PRESETS,percussionStep,patternSteps,patternStepTime,defaultState,VERSION}=current;
assert.equal(VERSION,'0.4.2');assert.equal(PRESETS.length,12);assert.equal(decodeSamples().length,38);
const zones=decodeSamples(),results=[],metrics={},rate=48000;
function test(name,fn){const start=performance.now();fn();results.push({name,pass:true,ms:Math.round(performance.now()-start)});console.log('PASS',name);}
function engine(config={}){const e=new Engine(rate);e.message({type:'samples',zones});e.configure({...defaultState(),...config});return e;}
function render(e,seconds){let sum=0,peak=0,delta=0,previous=0;const frames=Math.round(seconds*e.sr),l=new Float32Array(128),r=new Float32Array(128);for(let n=0;n<frames;n+=128){const a=l.subarray(0,Math.min(128,frames-n)),b=r.subarray(0,a.length);e.process(a,b);for(let j=0;j<a.length;j++){const v=(a[j]+b[j])*.5;assert.ok(Number.isFinite(v));sum+=v*v;peak=Math.max(peak,Math.abs(a[j]),Math.abs(b[j]));delta=Math.max(delta,Math.abs(v-previous));previous=v;}}assert.ok(peak<.881);return {rms:Math.sqrt(sum/frames),peak,delta};}
function sequence(e){e.message({type:'sequence',on:true});}
function advance(e,seconds){const total=Math.round(seconds*e.sr);for(let n=0;n<total;n++){e.schedule();e.clock.advance(e.tempo);e.frame++;if(e.voices.length>100)e.voices=[];}}
test('CHORD + ARP starts both voices on the drum clock, transitions at bar edges without restart',()=>{
 const e=engine({tempo:120,arp:{...defaultState().arp,mode:'both',speed:3}}),trace=[];e.trace=x=>trace.push(x);sequence(e);render(e,.05);
 assert.ok(e.voices.some(v=>v.origin==='seq'));assert.ok(e.voices.some(v=>v.origin==='arp'));assert.equal(trace.find(x=>x.kind==='arp').frame,trace.find(x=>x.kind==='drum').frame);
 for(const mode of ['chord','arp','both']){const tick=e.clock.tick;e.configure({arp:{mode}});assert.equal(e.clock.tick,tick);render(e,2.01);assert.equal(e.arp.mode,mode);if(mode==='arp')assert.ok(!e.voices.some(v=>v.origin==='seq'&&v.gate!==0));if(mode==='chord')assert.ok(!e.voices.some(v=>v.origin==='arp'&&v.gate!==0));}
 e.message({type:'stop'});render(e,.4);assert.equal(e.voices.length,0);assert.equal(e.strumPointers.size,0);
});
test('Balance endpoints select chord / arp and centre blends with finite bounded output',()=>{
 const levels=[];for(const balance of [0,.5,1]){const e=engine({balance,drumVolume:0,arp:{...defaultState().arp,mode:'both'}});sequence(e);render(e,.05);const out=render(e,1);levels.push(out);if(balance===0)assert.ok(e.arpGain<1e-8);if(balance===1)assert.ok(e.chordGain<1e-8);assert.ok(out.rms>.001);}metrics.balance=levels;
});
test('CRUSH retains drive / degradation with compensated RMS across all 12 sounds and combined playback',()=>{
 metrics.crush=[];
 for(const preset of PRESETS){const levels=[];for(const crush of [0,.25,.5,.75,1]){const e=engine({preset:preset.id,drumVolume:0,arp:{...defaultState().arp,mode:'both'},fx:{...preset,reverb:0,wooze:0,crush}});sequence(e);render(e,.4);levels.push(render(e,2.5));}
 const dry=levels[0].rms,db=levels.map(x=>20*Math.log10(x.rms/dry));metrics.crush.push({preset:preset.id,db,peaks:levels.map(x=>x.peak)});assert.ok(Math.max(...db)<2.5,JSON.stringify(metrics.crush.at(-1)));assert.ok(levels.at(-1).rms>dry*.4,preset.id+' retained level');}
});
test('Fast CRUSH sweeps and combined extreme effects have bounded finite output and clean stop',()=>{
 metrics.stress=[];for(const p of PRESETS){const e=engine({preset:p.id,glitch:1,tone:1,drumVolume:1,arp:{...defaultState().arp,mode:'both',speed:5,octaves:3},fx:{attack:.002,release:4,reverb:1,wooze:1,crush:0}});sequence(e);const start=performance.now();let peak=0;for(let n=0;n<16;n++){e.configure({fx:{crush:n%2},tone:n%2?1:-1,glitchTarget:['chord','arp','drums','all'][n%4]});e.message({type:'glitch-hold',on:n%2===0});peak=Math.max(peak,render(e,.125).peak);}metrics.stress.push({preset:p.id,peak,realtimeFactor:2000/(performance.now()-start)});e.message({type:'stop'});render(e,.4);assert.equal(e.voices.length,0);assert.equal(e.glitchHold,false);}
});
test('GLITCH zero and neutral TONE are exact bypasses; disabled buses remain unmodified',()=>{
 for(const target of ['chord','arp','drums','all']){const f=new PerformanceFX(rate);for(let n=0;n<1000;n++){f.begin(n*.001,120,0,target,false);for(let b=0;b<3;b++){const l=Math.sin(n*.3),r=Math.cos(n*.7),o=f.bus(b,l,r);assert.equal(o[0],l);assert.equal(o[1],r);}const o=f.colour(.123,-.456,0);assert.equal(o[0],.123);assert.equal(o[1],-.456);f.end();}}
 for(const [target,active]of [['chord',0],['arp',1],['drums',2]]){const f=new PerformanceFX(rate);let altered=0;for(let n=0;n<48000;n++){f.begin(n*48/rate,120,1,target,false);for(let b=0;b<3;b++){const v=.2*Math.sin(n*.01),o=f.bus(b,v,v);if(b!==active)assert.equal(o[0],v);else if(Math.abs(o[0]-v)>1e-4)altered++;}f.end();}assert.ok(altered>5000,target);}
});
test('GLITCH repeats dry recorded input, stays bounded without feedback, and HOLD returns to bypass',()=>{
 const f=new PerformanceFX(rate);let peak=0,delta=0,last=0;
 for(let n=0;n<rate*5;n++){const hold=n<rate*3;f.begin(n*48/rate,120,0,'all',hold);const v=.2*Math.sin(n*2*Math.PI*220/rate);const o=f.bus(0,v,v)[0];peak=Math.max(peak,Math.abs(o));delta=Math.max(delta,Math.abs(o-last));last=o;f.bus(1,0,0);f.bus(2,0,0);f.end();if(n>rate*3.1)assert.equal(o,v);}
 assert.ok(peak<=.200001);assert.ok(delta<.02,'smoothed rhythmic edges');metrics.glitch={peak,maximumSampleDelta:delta};
 f.reset();assert.ok(f.buses.every(b=>b.mix===0&&b.l.every(x=>x===0)));assert.equal(f.hold,false);
});
test('TONE changes spectral balance, neutral is exact, extremes remain bounded',()=>{
 function level(freq,tone){const f=new PerformanceFX(rate);let sum=0;for(let n=0;n<rate;n++){const v=.1*Math.sin(n*2*Math.PI*freq/rate),o=f.colour(v,v,tone)[0];if(n>rate/2)sum+=o*o;}return Math.sqrt(sum/(rate/2));}
 const neutral=level(6000,0),dark=level(6000,-1),bright=level(6000,1);assert.ok(dark<neutral*.35);assert.ok(bright>neutral*1.2&&bright<neutral*1.6);assert.ok(level(100,-1)>level(100,0)*.95);metrics.tone={highFrequencyDarkRatio:dark/neutral,highFrequencyBrightRatio:bright/neutral};
});
test('All factory grids preserve exact original velocities, percussion layers and event times',()=>{
 for(let p=0;p<6;p++){const rows=factoryGrid(p),timeline=drumTimeline(p,false);assert.equal(timeline.events.length,patternSteps(p));for(let n=0;n<patternSteps(p);n++){const event=timeline.events[n];assert.equal(event.tick,patternStepTime(p,n)*24);assert.deepEqual(rows.slice(0,6).map(r=>r[event.slot]),percussionStep(p,n));}const snapshot=JSON.stringify(rows),edit=rows.map(r=>r.slice());paintDrumCell(edit,2,15,true,rows);assert.ok(edit[6][15]>0);assert.equal(JSON.stringify(factoryGrid(p)),snapshot);}
});
test('Edited grid plays all six tracks including clap and both original percussion layers',()=>{
 const rows=factoryGrid(1);for(let track=0;track<6;track++)paintDrumCell(rows,track,15,true);const e=engine({rhythm:1,drumCustom:true,drumEdits:{1:rows},tempo:120}),events=[];e.trace=x=>events.push(x);sequence(e);render(e,2.01);const end=events.find(x=>x.kind==='drum'&&x.slot===15);assert.ok(end);for(const i of [0,1,2,3,4,6])assert.ok(end.hits[i]>0);assert.ok(events.some(x=>x.kind==='drum'&&x.tick===96&&x.slot===0));
});
test('SWING delays odd sixteenths, preserves bar length and applies edits on rhythm boundaries',()=>{
 const rows=factoryGrid(0),e=engine({tempo:120,swing:1,drumCustom:true,drumEdits:{0:rows}}),events=[];e.trace=x=>events.push(x);sequence(e);advance(e,.1);rows[0][0]=.1;e.configure({drumCustom:true,drumEdits:{0:rows},swing:.5});advance(e,4);
 assert.ok(events.some(x=>x.kind==='drum'&&Math.abs(x.tick-9.8)<1e-8));assert.ok(events.some(x=>x.kind==='drum'&&Math.abs(x.tick-103.9)<1e-8));assert.equal(events.find(x=>x.kind==='drum'&&x.tick===96).hits[0],.1);assert.deepEqual(events.filter(x=>x.kind==='bar').map(x=>x.tick),[0,96,192]);
});
test('Ten-minute shared-clock soak with swing, combined modes, 120 tempo changes and edits stays sample-accurate',()=>{
 metrics.soak=[];for(const sr of [44100,48000]){const e=new Engine(sr);e.configure({...defaultState(),arp:{...defaultState().arp,mode:'both'}});sequence(e);let musical=0,maxError=0,last=-1,count=0;e.trace=x=>{assert.ok(x.tick>=last-1e-8);last=x.tick;const error=Math.abs(musical-x.tick)/24/(e.tempo/(60*sr));maxError=Math.max(maxError,error);assert.ok(error<1.002,'sample accuracy '+error);count++;};
 for(let i=0;i<600*sr;i++){if(i%(5*sr)===0){const n=i/(5*sr),pattern=n%6;e.configure({tempo:[40,220,83,137,60][n%5],rhythm:pattern,swing:(n%7)/6,drumCustom:n%2===0,drumEdits:{[pattern]:factoryGrid(pattern)},arp:{mode:['chord','arp','both'][n%3],speed:n%6}});}e.schedule();e.clock.advance(e.tempo);e.frame++;musical+=e.tempo*24/(60*sr);if(e.voices.length>200)e.voices=[];}
 assert.ok(count>7000);metrics.soak.push({sampleRate:sr,seconds:600,tempoChanges:120,events:count,maximumErrorSamples:maxError});}
});
test('One-minute full V0.4 DSP soak survives all presets, targeted glitch, swing and mode changes',()=>{
 const e=engine(),start=performance.now();sequence(e);let peak=0;
 for(let n=0;n<12;n++){const pattern=n%6;e.configure({preset:PRESETS[n].id,tempo:[43,220,137,80][n%4],rhythm:pattern,swing:n/11,drumCustom:true,drumEdits:{[pattern]:factoryGrid(pattern)},tone:(n%3)-1,glitch:(n+1)/12,glitchTarget:['all','chord','arp','drums'][n%4],balance:n/11,arp:{mode:['chord','arp','both'][n%3],speed:n%6},fx:{crush:n/11,reverb:.4,wooze:.2,release:1}});e.message({type:'glitch-hold',on:n%2===0});const out=render(e,5);peak=Math.max(peak,out.peak);assert.ok(e.voices.length<=32);assert.equal(e.missingSamples,0);}
 metrics.fullDSP={seconds:60,realtimeFactor:60000/(performance.now()-start),peak,notes:e.events.notes,drumSteps:e.events.drums};e.message({type:'stop'});render(e,.4);assert.equal(e.voices.length,0);assert.ok(e.performance.buses.every(b=>b.mix===0));
});
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/audio-regression.json',JSON.stringify({version:'0.4.2',testType:'Offline numerical DSP and sample-clock simulation; not listening or physical iPhone testing.',results,metrics},null,2));console.log('V0.4 checks:',results.length);