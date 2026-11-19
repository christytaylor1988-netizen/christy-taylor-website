import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {current,fixture,oldFile,html,samples,worklet,writeResults} from './fixtures.mjs';
const previous=await fixture(oldFile('worklet.js'),'previous');
const {Engine,decodeSamples,PRESETS,defaultState}=current,zones=decodeSamples(),tests=[];
const test=(name,f)=>{f();tests.push(name);console.log('PASS',name);};
function make(C=Engine,rate=48000,extra={}){const e=new C(rate);e.message({type:'samples',zones});e.configure({...defaultState(),tempo:120,arp:{...defaultState().arp,mode:'both'},...extra});return e;}
function render(e,frames){const l=new Float32Array(128),r=new Float32Array(128);let peak=0,delta=0,prev=0;for(let n=0;n<frames;n+=128){const a=l.subarray(0,Math.min(128,frames-n)),b=r.subarray(0,a.length);e.process(a,b);for(const x of a){assert.ok(Number.isFinite(x));peak=Math.max(peak,Math.abs(x));delta=Math.max(delta,Math.abs(x-prev));prev=x;}}return {peak,delta};}
function pos(e){return [e.clock.tick,e.clock.phase,e.clock.beat,e.currentBar,e.absoluteBar,e.nextArp,e.nextDrum,e.arpStep,e.drumStep];}
test('All twelve preset identities and 38 samples are preserved; only requested preset metadata changes',()=>{
 assert.deepEqual(PRESETS.map(p=>({...p,desc:'',attack:p.id==='rocksteady'?.004:p.attack})),previous.PRESETS.map(p=>({...p,desc:''})));assert.equal(PRESETS.find(p=>p.id==='rocksteady').attack,.05);assert.equal(PRESETS.length,12);assert.equal(zones.length,38);
 const old=oldFile('index.html'),start=old.indexOf('const SAMPLE_ZONES='),end=old.indexOf('const EMBEDDED_WORKLET_SOURCE=');
 assert.equal(samples,old.slice(start,end));
 const inline=JSON.parse(html.match(/const EMBEDDED_WORKLET_SOURCE=(.*);\n/)[1]);assert.equal(inline,worklet);
});
const parity={};
test('Normal audio is sample-for-sample identical to the V0.4.1 for the eleven unmodified instruments, combined mode and effects',()=>{
 for(const p of PRESETS.filter(p=>p.id!=='haunted')){const config={preset:p.id,drumVolume:0,glitch:.44,tone:.3,swing:.42,fx:{attack:.03,release:.8,crush:.4,wooze:.4,reverb:.3}};
  const a=make(Engine,48000,config),b=make(previous.Engine,48000,config);a.message({type:'sequence',on:true});b.message({type:'sequence',on:true});
  const al=new Float32Array(128),ar=new Float32Array(128),bl=new Float32Array(128),br=new Float32Array(128),hash=crypto.createHash('sha256');
  for(let n=0;n<96000;n+=128){a.process(al,ar);b.process(bl,br);assert.deepEqual(al,bl,p.id);assert.deepEqual(ar,br,p.id);hash.update(Buffer.from(al.buffer));}
  parity[p.id]=hash.digest('hex');
 }
});
test('Pause freezes the complete shared musical position and event counts at 44.1 and 48 kHz',()=>{
 for(const rate of [44100,48000])for(const mode of ['chord','arp','both']){const e=make(Engine,rate,{arp:{...defaultState().arp,mode}});e.message({type:'sequence',on:true});render(e,Math.round(rate*1.23));
  const position=pos(e),events={...e.events};e.message({type:'pause'});render(e,rate);assert.deepEqual(pos(e),position);assert.deepEqual(e.events,events);assert.equal(e.voices.length,0);assert.ok(render(e,128).peak<1e-8);assert.equal(e.strumPointers.size,0);
  e.message({type:'resume'});assert.deepEqual(pos(e),position);render(e,rate);assert.ok(e.clock.beat>position[2]);assert.ok(e.events.drums>events.drums);e.message({type:'stop'});assert.equal(e.clock.tick,0);assert.equal(e.clock.beat,0);assert.equal(e.currentBar,-1);
 }
});
test('Repeated PLAY is idempotent; resume does not duplicate chord voices or scheduler events',()=>{
 const e=make();e.message({type:'sequence',on:true});render(e,12345);const p=pos(e),count=e.voices.length;e.message({type:'sequence',on:true});assert.deepEqual(pos(e),p);assert.equal(e.voices.length,count);
 e.message({type:'pause'});render(e,24000);e.message({type:'resume'});const restored=e.voices.length;assert.ok(restored>0);e.message({type:'resume'});e.message({type:'sequence',on:true});assert.equal(e.voices.length,restored);assert.deepEqual(pos(e),p);
});
test('Tempo changes and 40 pause/resume cycles preserve alignment with an uninterrupted control clock',()=>{
 for(const rate of [44100,48000]){const a=make(Engine,rate),b=make(Engine,rate);const ta=[],tb=[];a.trace=x=>ta.push([x.kind,x.tick,x.bar??x.slot??x.n]);b.trace=x=>tb.push([x.kind,x.tick,x.bar??x.slot??x.n]);
  a.message({type:'sequence',on:true});b.message({type:'sequence',on:true});
  for(let i=0;i<40;i++){const frames=2900+i*19;render(a,frames);render(b,frames);a.message({type:'pause'});const tempo=70+i*3;a.configure({tempo});b.configure({tempo});render(a,2400);a.message({type:'resume'});assert.deepEqual(pos(a),pos(b));}
  assert.deepEqual(ta,tb);a.message({type:'stop'});render(a,24000);assert.equal(a.voices.length,0);assert.equal(a.strumPointers.size,0);assert.equal(a.glitchHold,false);
 }
});
test('Stopping from pause resets; restarting begins bar zero with drums and arp on the same frame',()=>{
 const e=make(),trace=[];e.trace=x=>trace.push(x);e.message({type:'sequence',on:true});render(e,160000);e.message({type:'pause'});render(e,12000);e.message({type:'stop'});assert.equal(e.paused,false);assert.equal(e.clock.tick,0);e.message({type:'resume'});assert.equal(e.sequence,false);trace.length=0;e.message({type:'sequence',on:true});render(e,128);
 assert.equal(trace.find(x=>x.kind==='bar').bar,0);assert.equal(trace.find(x=>x.kind==='drum').frame,trace.find(x=>x.kind==='arp').frame);
});
test('All instruments release held strums and stay bounded through rapid pause/resume',()=>{
 for(const p of PRESETS){const e=make(Engine,48000,{preset:p.id,strumMode:'hold',strings:12});e.message({type:'sequence',on:true});render(e,20000);e.message({type:'lane',lane:4,velocity:.8,pointer:9});e.message({type:'glitch-hold',on:true});
  for(let i=0;i<5;i++){e.message({type:'pause'});assert.equal(e.strumPointers.size,0);assert.equal(e.glitchHold,false);assert.ok(render(e,12000).peak<.881);e.message({type:'resume'});assert.ok(render(e,16000).peak<.881);}
  e.message({type:'stop'});render(e,24000);assert.equal(e.voices.length,0);
 }
});
writeResults('transport-preservation',tests,{normalAudioSHA256:parity});
