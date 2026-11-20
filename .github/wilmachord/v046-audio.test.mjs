import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {current,fixture,repo,writeResults} from './fixtures.mjs';
const old=await fixture(execFileSync('git',['show','34f37fbbdfaecd2a780c844802fa9d76787729ab:lie013-preview-7x9/worklet.js'],{cwd:repo,maxBuffer:32e6}).toString(),'v045-preserved');
const zones=current.decodeSamples(),tests=[],metrics=[];
const test=(name,fn)=>{fn();tests.push(name);console.log('PASS',name);};
function setup(lib,sr,preset,extra={}){const e=new lib.Engine(sr),p=lib.PRESETS.find(p=>p.id===preset);e.message({type:'samples',zones});e.configure({...lib.defaultState(),preset,fx:{...p},...extra});return e;}
for(const sr of [44100,48000]){
 test(sr+': every unchanged instrument, legacy CASSETTE and nonneutral saved Presence match V0.4.5',()=>{
  for(const p of current.PRESETS.filter(p=>p.id!=='garage')){const a=setup(current,sr,p.id,{presence:.41}),b=setup(old,sr,p.id,{presence:.41});for(const e of[a,b])e.message({type:'chord',chord:{root:2,quality:'m7'},hold:true});const l=new Float32Array(128),r=new Float32Array(128),x=new Float32Array(128),y=new Float32Array(128);for(let i=0;i<sr*.3;i+=128){a.process(l,r);b.process(x,y);assert.deepEqual(l,x,p.id);assert.deepEqual(r,y,p.id);}}
 });
 test(sr+': old drum delay amount and tempo following migrate sample-exactly',()=>{
  const a=setup(current,sr,'motorik'),b=setup(old,sr,'motorik');const state={tempo:73,drumFx:Array.from({length:7},()=>({pitch:0,spring:0,delay:.7})),drumDelay:{time:.4,feedback:.43,legacySync:true}};
  for(const e of[a,b]){e.configure(state);e.message({type:'drums',on:true});}const l=new Float32Array(128),r=new Float32Array(128),x=new Float32Array(128),y=new Float32Array(128);for(let i=0;i<sr*2;i+=128){a.process(l,r);b.process(x,y);assert.deepEqual(l,x);assert.deepEqual(r,y);}
 });
 test(sr+': zero Amount preserves dry drums at every delay time and maximum feedback',()=>{
  for(const time of[.02,.2,.4]){const a=setup(current,sr,'motorik'),b=setup(current,sr,'motorik',{drumDelay:{time,feedback:.94,legacySync:false}});for(const e of[a,b])e.message({type:'drums',on:true});const l=new Float32Array(128),r=new Float32Array(128),x=new Float32Array(128),y=new Float32Array(128);for(let n=0;n<sr;n+=128){a.process(l,r);b.process(x,y);assert.deepEqual(l,x);assert.deepEqual(r,y);}}
 });
 test(sr+': Time is 20–400 ms, feedback produces longer tails and idle processing stops after decay',()=>{
  const tails=[];for(const feedback of[0,.43,.94]){const fx=new current.Engine(sr).drumEffects;fx.setDelay(.2,feedback,false);for(let n=0;n<sr;n++)fx.process(0,1e-10);fx.delayFrames=fx.targetFrames;let tail=0,peak=0;
   for(let n=0;n<sr*30;n++){const value=fx.process(0,n===0?1:0)[0];assert.ok(Number.isFinite(value));peak=Math.max(peak,Math.abs(value));if(n>sr*.35)tail+=value*value;}
   tails.push({feedback,tail,peak,active:fx.active});assert.ok(peak<.65);assert.equal(fx.active,0);fx.setDelay(-1,99,false);assert.equal(fx.targetFrames,sr*.02);assert.equal(fx.feedbackTarget,.94);fx.setDelay(5,-1,false);assert.equal(fx.targetFrames,sr*.4);assert.equal(fx.feedbackTarget,0);
  }assert.ok(tails[2].tail>tails[1].tail*2);assert.ok(tails[1].tail>tails[0].tail);metrics.push({sr,tails});
 });
 test(sr+': rapid delay edits and mode switches stay bounded; STOP clears voices and wet tails',()=>{
  const e=setup(current,sr,'tape-strings',{glitch:.85,drumFx:Array.from({length:7},()=>({pitch:0,spring:.8,delay:1}))});e.message({type:'sequence',on:true});const l=new Float32Array(128),r=new Float32Array(128);let peak=0;
  for(let b=0;b<sr*10/128;b++){if(b%50===0)e.configure({drumFxMode:b%100?'global':'individual',drumDelay:{time:b%100?.02:.4,feedback:.94,legacySync:false},globalDrumFx:{pitch:0,spring:.8,delay:1,tone:0,delayTime:b%100?.4:.02,delayFeedback:.94,delayLegacySync:false}});e.process(l,r);for(const v of l){assert.ok(Number.isFinite(v)&&Math.abs(v)<.881);peak=Math.max(peak,Math.abs(v));}}
  assert.ok(peak>.01);e.message({type:'stop'});for(let i=0;i<sr;i+=128)e.process(l,r);assert.equal(e.voices.length,0);assert.equal(e.drumEffects.active,0);assert.ok(l.every(x=>Math.abs(x)<1e-7));metrics.push({sr,sweepPeak:peak});
 });
 test(sr+': loading a locked performance restores its notes even when already locked',()=>{const e=setup(current,sr,'grand');const first=Array.from({length:12},(_,i)=>48+i),second=first.map(n=>n+7);e.configure({strumLock:true,lockedNotes:first});assert.deepEqual(e.lockedNotes,first);e.configure({strumLock:true,lockedNotes:second});assert.deepEqual(e.lockedNotes,second);assert.equal(e.strumLock,true);});
 test(sr+': audition uses a bounded separate voice group and never changes the selected chord',()=>{
  const e=setup(current,sr,'grand');e.message({type:'chord',chord:{root:0,quality:''},hold:true});const before=JSON.stringify(e.chord),l=new Float32Array(128),r=new Float32Array(128);
  for(let i=0;i<50;i++){e.message({type:'audition',chord:{root:i%12,quality:'m7',inversion:1}});for(let j=0;j<sr*.04;j+=128)e.process(l,r);assert.equal(JSON.stringify(e.chord),before);assert.ok(e.voices.length<=32);}
  e.message({type:'audition-stop'});for(let i=0;i<sr*.2;i+=128)e.process(l,r);assert.ok(!e.voices.some(v=>v.origin==='audition'));assert.ok(e.voices.some(v=>v.origin==='manual'));e.message({type:'stop'});
 });
}
writeResults('v046-audio',tests,{metrics});
