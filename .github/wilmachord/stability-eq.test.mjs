import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {current,fixture,repo,writeResults,worklet,html,script,samples} from './fixtures.mjs';
const baseline=execFileSync('git',['show','5f520d5:lie013-preview-7x9/worklet.js'],{cwd:repo,maxBuffer:32e6}).toString(),old=await fixture(baseline,'v042-stability');
const {Engine,EQClass,PRESETS,defaultState}=current,zones=current.decodeSamples(),tests=[],metrics={};
const test=(name,fn)=>{fn();tests.push(name);console.log('PASS',name);};
const render=(e,seconds)=>{const l=new Float32Array(128),r=new Float32Array(128);for(let n=0;n<seconds*e.sr;n+=128)e.process(l,r);return l;};
function engine(C,sr,preset='tape-strings',extra={}){const e=new C(sr);e.message({type:'samples',zones});e.configure({...defaultState(),preset,fx:{...PRESETS.find(p=>p.id===preset)},...extra});return e;}
test('V0.4.2 samples, all 12 presets, clock and routing remain unchanged',()=>{
 assert.equal(PRESETS.length,12);assert.equal(zones.length,38);assert.deepEqual(PRESETS,old.PRESETS);
 const before=execFileSync('git',['show','5f520d5:lie013-preview-7x9/index.html'],{cwd:repo,maxBuffer:32e6}).toString();const samplePart=s=>s.slice(s.indexOf('const SAMPLE_ZONES='),s.indexOf('const EMBEDDED_WORKLET_SOURCE='));assert.equal(samplePart(before),samples);
 const route=s=>s.match(/node=new AudioWorkletNode\([^;]+;node.connect\(ctx.destination\);/)[0];assert.equal(route(before),route(html));
 const embedded=JSON.parse(script.slice(script.indexOf('const EMBEDDED_WORKLET_SOURCE=')+30,script.indexOf(';\nconst $=')));assert.equal(embedded,worklet);
});
test('Eleven unchanged voices and all six drums are sample-exact to V0.4.2 below the voice limit at both rates',()=>{
 metrics.baseline=[];for(const sr of [44100,48000])for(const p of PRESETS.filter(p=>p.id!=='garage')){const a=engine(Engine,sr,p.id,{drive:.5,glitch:0,tone:.3}),b=engine(old.Engine,sr,p.id,{drive:.5,glitch:0,tone:.3});
 for(const e of [a,b]){e.message({type:'chord',chord:{root:0,quality:'maj9'},hold:true});e.message({type:'drums',on:true});}
 const l=new Float32Array(128),r=new Float32Array(128),x=new Float32Array(128),y=new Float32Array(128);
 for(let n=0;n<sr*1.5;n+=128){a.process(l,r);b.process(x,y);assert.deepEqual(l,x,`${sr} ${p.id} ${n} L`);assert.deepEqual(r,y);}
 metrics.baseline.push({sr,preset:p.id,maxSampleDifference:0});
 }
 for(let pattern=0;pattern<6;pattern++){const a=engine(Engine,48000,'motorik',{rhythm:pattern}),b=engine(old.Engine,48000,'motorik',{rhythm:pattern});for(const e of [a,b])e.message({type:'drums',on:true});for(let n=0;n<40;n++)assert.deepEqual(render(a,.02),render(b,.02));}
});
test('Pooled voices protect held notes, preserve HOLD retuning at capacity and return all 40 slots',()=>{
 const e=engine(Engine,48000,'tape-strings',{strings:12,strumMode:'hold'});e.message({type:'chord',chord:{root:0,quality:'maj9'},hold:true});for(let i=0;i<12;i++)e.message({type:'lane',lane:i,pointer:i});render(e,.3);
 for(let n=0;n<30;n++){for(let i=0;i<12;i++)e.note(48+i,.8,-2);render(e,.01);e.message({type:'chord',chord:{root:n%12,quality:'maj9'},hold:true});assert.equal(e.strumPointers.size,12);assert.ok([...e.strumPointers.values()].every(h=>e.voices.includes(h.voice)));const all=[...e.voices,...e.tails,...e.freeVoices];assert.equal(all.length,40);assert.equal(new Set(all).size,40);assert.ok(e.voices.length<=32&&e.tails.length<=8);}
 e.message({type:'strum-clear'});e.message({type:'release'});render(e,8);assert.equal(e.voices.length,0);e.message({type:'stop'});render(e,.5);assert.equal(e.freeVoices.length,40);assert.equal(e.tails.length,0);metrics.pool={voices:32,fadeTails:8,total:40};
});
function gain(freq,settings,sr=48000){const q=new EQClass(sr);q.set(...settings);let input=0,output=0;for(let i=0;i<sr*.15;i++){const x=.05*Math.sin(i*2*Math.PI*freq/sr),y=q.process(x,x)[0];if(i>sr*.08){input+=x*x;output+=y*y;}}return 10*Math.log10(output/input);}
test('Neutral EQ is exact; bands are independent and Presence is an upper-mid bell, not a high shelf',()=>{
 metrics.filters=[];for(const sr of [44100,48000]){const q=new EQClass(sr);for(let i=0;i<1000;i++){const v=Math.sin(i);assert.equal(q.process(v,-v)[0],v);assert.equal(q.out[1],-v);}assert.equal(q.active,false);
 const low=[gain(60,[12,0,0,0],sr),gain(8000,[12,0,0,0],sr)],mid=[gain(850,[0,12,0,0],sr),gain(60,[0,12,0,0],sr),gain(8000,[0,12,0,0],sr)],high=[gain(8000,[0,0,12,0],sr),gain(60,[0,0,12,0],sr)],presence=[gain(2600,[0,0,0,1],sr),gain(100,[0,0,0,1],sr),gain(12000,[0,0,0,1],sr)];
 assert.ok(low[0]-low[1]>10);assert.ok(mid[0]-mid[1]>10&&mid[0]-mid[2]>10);assert.ok(high[0]-high[1]>10);assert.ok(presence[0]>3.7&&presence[0]<4);assert.ok(presence[0]-presence[2]>3.5&&presence[0]-presence[1]>4);assert.ok(gain(2600,[0,0,0,-1],sr)<-4.4);metrics.filters.push({sr,low,mid,high,presence});
 q.set(12,-12,12,1);for(let i=0;i<4000;i++)q.process(.1,.1);q.set(0,0,0,0);for(let i=0;i<4000;i++)q.process(.1,.1);assert.equal(q.active,false);assert.equal(q.process(.123,-.234)[0],.123);assert.equal(q.out[1],-.234);
 }
});
test('EQ and Presence cannot alter drum output, and legacy TONE is preserved exactly',()=>{
 for(const sr of [44100,48000]){const a=engine(Engine,sr,'tape-strings'),b=engine(Engine,sr,'tape-strings',{eq:{low:12,mid:-12,high:12},presence:1});for(const e of [a,b])e.message({type:'drums',on:true});for(let i=0;i<100;i++)assert.deepEqual(render(a,.02),render(b,.02));
 const x=engine(Engine,sr,'motorik',{legacyTone:-.8,presence:-.4,tone:-.8}),y=engine(old.Engine,sr,'motorik',{tone:-.8});for(const e of [x,y])e.note(60,.7,-1);for(let i=0;i<100;i++)assert.deepEqual(render(x,.01),render(y,.01));}
});
test('Rapid EQ/Presence ramps stay bounded without a parameter-edge jump',()=>{
 metrics.ramps=[];for(const sr of [44100,48000]){const q=new EQClass(sr);let last=0,maxJump=0,peak=0;for(let i=0;i<sr*2;i++){if(i%400===0)q.set(i%800?12:-12,i%800?-12:12,i%800?12:-12,i%800?1:-1);const x=.05*Math.sin(i*2*Math.PI*440/sr),y=q.process(x,x)[0];assert.ok(Number.isFinite(y));maxJump=Math.max(maxJump,Math.abs(y-last));peak=Math.max(peak,Math.abs(y));last=y;}assert.ok(maxJump<.03&&peak<.3);metrics.ramps.push({sr,maxJump,peak});}
});
test('All instruments remain finite with maximum EQ, Presence, DRIVE and CRUSH',()=>{
 for(const sr of [44100,48000])for(const p of PRESETS){const e=engine(Engine,sr,p.id,{eq:{low:12,mid:12,high:12},presence:1,drive:1,fx:{...p,crush:1},arp:{...defaultState().arp,mode:'both'}});e.message({type:'sequence',on:true});for(let i=0;i<4;i++)e.note(48+i*4,.8,-1);for(let n=0;n<20;n++){const a=render(e,.025);for(const x of a)assert.ok(Number.isFinite(x)&&Math.abs(x)<.881);}e.message({type:'stop'});render(e,.5);assert.equal(e.voices.length,0);}
});
test('Optional diagnostics do not alter rendered output, and unavailable timers are reported honestly',()=>{
 const a=new current.WilmachordProcessor(),b=new current.WilmachordProcessor();for(const p of [a,b]){p.port.onmessage({data:{type:'samples',zones}});p.port.onmessage({data:{type:'chord',chord:{root:0,quality:'maj9'},hold:true}});}b.port.onmessage({data:{type:'monitor',on:true}});
 const l=new Float32Array(128),r=new Float32Array(128),x=new Float32Array(128),y=new Float32Array(128);for(let i=0;i<200;i++){a.process([],[[l,r]]);b.process([],[[x,y]]);assert.deepEqual(l,x);assert.deepEqual(r,y);}assert.ok(b.messages.some(m=>m.type==='performance-diagnostic'));assert.equal(a.monitorBlocks,0);
 b.monitorClock=null;b.monitorReported=0;b.process([],[[x,y]]);assert.equal(b.messages.at(-1).meanMs,null);b.port.onmessage({data:{type:'monitor',on:false}});const count=b.monitorBlocks;b.process([],[[x,y]]);assert.equal(b.monitorBlocks,count);
});
writeResults('stability-eq',tests,metrics);
