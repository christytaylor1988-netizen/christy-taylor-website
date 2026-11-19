import assert from 'node:assert/strict';
import fs from 'node:fs';
import {current,fixture,oldFile,out} from './fixtures.mjs';
const {WilmachordProcessor,decodeSamples,PRESETS,defaultState}=current;const {WilmachordProcessor:BaselineProcessor}=await fixture(oldFile('worklet.js'),'diag-baseline');
const zones=decodeSamples(),results=[],metrics=[];
function test(name,fn){fn();results.push({name,pass:true});console.log('PASS',name);}
function setup(sr=48000,preset='motorik',Class=WilmachordProcessor){globalThis.sampleRate=sr;const p=new Class();p.port.onmessage({data:{type:'samples',zones}});p.port.onmessage({data:{type:'config',state:{...defaultState(),preset}}});return p;}
function render(p,seconds,channels=2){const l=new Float32Array(128),r=new Float32Array(128);let peak=0,delta=0,last=0;for(let n=0;n<seconds*p.engine.sr;n+=128){p.process([],[[l,...(channels===2?[r]:[])]]);for(const a of channels===2?[l,r]:[l])for(const v of a){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}for(const v of l){delta=Math.max(delta,Math.abs(v-last));last=v;}}return{peak,delta,last};}
test('B generates identical safe stereo sine and stops on audio frames at 44.1/48 kHz',()=>{
 for(const sr of [44100,48000]){const p=setup(sr);p.port.onmessage({data:{type:'audio-test',id:1,kind:'B'}});const out=render(p,1.6);const done=p.messages.find(m=>m.type==='audio-diagnostic');assert.equal(done.channels,2);assert.ok(done.frames>=1.5*sr&&done.frames<1.5*sr+128);assert.ok(out.peak>.039&&out.peak<.040001);assert.ok(out.delta<.0026);assert.equal(p.audioTest,null);assert.equal(out.last,0);assert.equal(render(p,.2).peak,0);metrics.push({kind:'B',sampleRate:sr,...out,done});}
});
test('C uses all twelve existing instruments through full DSP with no missing samples and automatic release',()=>{
 for(const preset of PRESETS){const p=setup(48000,preset.id);const before=JSON.stringify([p.engine.preset,p.engine.target,p.engine.arp,p.engine.tone,p.engine.glitch,p.engine.balance]);p.port.onmessage({data:{type:'audio-test',id:2,kind:'C'}});const out=render(p,1.7),done=p.messages.find(m=>m.type==='audio-diagnostic');assert.ok(out.peak>.00001&&out.peak<.221,preset.id);assert.ok(done.enginePeak>0);assert.equal(done.missingSamples,0);assert.equal(p.engine.voices.length,0);assert.equal(p.engine.masterTarget,0);assert.equal(p.audioTest,null);assert.equal(JSON.stringify([p.engine.preset,p.engine.target,p.engine.arp,p.engine.tone,p.engine.glitch,p.engine.balance]),before);metrics.push({kind:'C',preset:preset.id,...out});}
});
test('B/C cancellation fades in 25 ms and clears within 100 ms plus one render quantum',()=>{
 for(const kind of ['B','C'])for(const type of ['audio-test-cancel','stop']){const p=setup();p.port.onmessage({data:{type:'audio-test',id:3,kind}});render(p,.3);p.port.onmessage({data:{type,id:3}});render(p,.03);assert.ok(render(p,.08).peak<1e-10);assert.equal(p.audioTest,null);assert.ok(p.messages.some(m=>m.type==='audio-diagnostic'&&m.cancelled));assert.ok(render(p,.2).peak<.00001);assert.equal(p.engine.voices.length,0);}
});
test('Unknown tests cannot start audio; stale cancellation cannot cancel the next test',()=>{
 const p=setup();p.port.onmessage({data:{type:'audio-test',id:4,kind:'invalid'}});assert.equal(p.audioTest,null);p.port.onmessage({data:{type:'audio-test',id:5,kind:'B'}});p.port.onmessage({data:{type:'audio-test-cancel',id:4}});assert.equal(p.audioTest.cancelled,false);render(p,1.6);assert.equal(p.audioTest,null);
});
test('One-channel buffers remain finite; eleven unmodified instruments are bit-identical to V0.4.1',()=>{
 const mono=setup();mono.port.onmessage({data:{type:'audio-test',id:6,kind:'B'}});assert.ok(render(mono,1.6,1).peak<.040001);
 for(const preset of PRESETS.filter(p=>p.id!=='haunted')){const a=setup(48000,preset.id),b=setup(48000,preset.id,BaselineProcessor);for(const p of [a,b]){p.port.onmessage({data:{type:'config',state:{drumVolume:0,arp:{mode:'both'},fx:{crush:.4,reverb:.5},tone:.3,glitch:.2}}});p.port.onmessage({data:{type:'sequence',on:true}});}const l=new Float32Array(128),r=new Float32Array(128),x=new Float32Array(128),y=new Float32Array(128);for(let n=0;n<48000;n+=128){a.process([],[[l,r]]);b.process([],[[x,y]]);assert.deepEqual(l,x);assert.deepEqual(r,y);}}
});
fs.writeFileSync(out+'/diagnostic-worklet-results.json',JSON.stringify({testType:'Numerical output buffer tests, not audible speaker testing',results,metrics,pass:true},null,2));
