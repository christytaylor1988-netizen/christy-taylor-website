import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {current,fixture,oldFile,writeResults,worklet,html} from './fixtures.mjs';
const old=await fixture(oldFile('worklet.js'),'batch2-old'),{Engine,DriveClass,PRESETS,defaultState,decodeSamples}=current;
const zones=decodeSamples(),tests=[],metrics={};
const test=(name,fn)=>{fn();tests.push(name);console.log('PASS',name);};
function make(id='motorik',extra={},C=Engine,sr=48000){const e=new C(sr);e.message({type:'samples',zones});const p=PRESETS.find(x=>x.id===id);e.configure({...defaultState(),preset:id,drumVolume:0,fx:{...p,reverb:0,wooze:0,crush:0},...extra});return e;}
function render(e,seconds,capture=false){const frames=Math.round(e.sr*seconds),l=new Float32Array(128),r=new Float32Array(128),data=capture?new Float64Array(frames):null;let sum=0,peak=0,delta=0,last=0;for(let n=0;n<frames;n+=128){const a=l.subarray(0,Math.min(128,frames-n)),b=r.subarray(0,a.length);e.process(a,b);for(let j=0;j<a.length;j++){assert.ok(Number.isFinite(a[j])&&Number.isFinite(b[j]));sum+=(a[j]*a[j]+b[j]*b[j])*.5;peak=Math.max(peak,Math.abs(a[j]),Math.abs(b[j]));delta=Math.max(delta,Math.abs(a[j]-last));last=a[j];if(data)data[n+j]=a[j];}}return{rms:Math.sqrt(sum/frames),peak,delta,data};}
const db=(a,b)=>20*Math.log10(Math.max(a,1e-15)/Math.max(b,1e-15));
test('New parameter defaults preserve old sets and reject invalid/out-of-range DSP values',()=>{
 const d=defaultState();assert.equal(d.drive,0);assert.equal(d.crushLevel,1);assert.deepEqual(d.kosmische,{pulseSpeed:17.3,pulseDepth:.44});const e=make();e.configure({drive:4,crushLevel:-1,kosmische:{pulseSpeed:100,pulseDepth:-2}});assert.equal(e.drive,1);assert.equal(e.crushLevel,0);assert.equal(e.pulseSpeed,24);assert.equal(e.pulseDepth,0);e.configure({drive:NaN,kosmische:{pulseSpeed:NaN}});assert.equal(e.drive,1);assert.equal(e.pulseSpeed,24);
});
test('DRIVE zero is a numerical bypass and returns fully to bypass after automation',()=>{
 const d=new DriveClass(48000);for(let i=0;i<2000;i++){const a=Math.sin(i*.81)*.4,b=Math.cos(i*.31)*.31,o=d.process(a,b,0);assert.equal(o[0],a);assert.equal(o[1],b);}for(let i=0;i<48000;i++)d.process(.12,-.13,1);for(let i=0;i<48000;i++)d.process(.12,-.13,0);assert.equal(d.amount,0);assert.deepEqual([...d.process(.123,-.234,0)],[.123,-.234]);
});
test('DRIVE is distinct, compensated and bounded for all twelve instruments, single notes and extended chords',()=>{
 metrics.drive=[];
 for(const p of PRESETS)for(const notes of [[60],[48,55,58,62,65,69]]){
  const levels=[];for(const drive of [0,.15,.5,1]){const e=make(p.id,{drive});notes.forEach(n=>e.note(n,.8,-1,'manual'));render(e,.4);const o=render(e,1.3);assert.ok(o.rms>1e-5,p.id);assert.ok(o.peak<.881);levels.push(o);}
  const changes=levels.map(o=>db(o.rms,levels[0].rms));metrics.drive.push({preset:p.id,notes:notes.length,rmsDB:changes,peaks:levels.map(o=>o.peak)});assert.ok(Math.max(...changes)<2.5,JSON.stringify(metrics.drive.at(-1)));assert.ok(changes[3]>-8,p.id+' over-attenuated');
 }
});
function fft(input){const n=input.length,re=Float64Array.from(input),im=new Float64Array(n);for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j)[re[i],re[j]]=[re[j],re[i]];}for(let size=2;size<=n;size*=2){const half=size/2;for(let a=0;a<n;a+=size)for(let j=0;j<half;j++){const c=Math.cos(-2*Math.PI*j/size),s=Math.sin(-2*Math.PI*j/size),k=a+j+half,r=re[k]*c-im[k]*s,m=re[k]*s+im[k]*c;re[k]=re[a+j]-r;im[k]=im[a+j]-m;re[a+j]+=r;im[a+j]+=m;}}return re.map((r,i)=>r*r+im[i]*im[i]);}
test('Antialiased DRIVE suppresses folded harmonics compared with the equivalent naive saturator',()=>{
 const n=8192,bin=736,sr=48000,a=.6,k=1+18*a*a,bias=.02+.16*a,d=new DriveClass(sr);d.amount=a;
 const filtered=new Float64Array(n),naive=new Float64Array(n);for(let i=0;i<n*8;i++){const x=.7*Math.sin(2*Math.PI*bin*i/n),o=d.process(x,x,a)[0];if(i>=n*7){filtered[i-n*7]=o;naive[i-n*7]=(Math.tanh(k*x+bias)-Math.tanh(bias))/k;}}
 function ratio(x){const p=fft(x);let alias=0,fund=0;for(let i=1;i<n/2;i++){if(Math.abs(i-bin)<=2)fund+=p[i];let legit=false;for(let h=1;h*bin<n/2;h++)if(Math.abs(i-h*bin)<=2)legit=true;if(!legit)alias+=p[i];}return alias/fund;}
 const reduction=10*Math.log10(ratio(naive)/ratio(filtered));metrics.antialias={frequencyHz:bin*sr/n,aliasReductionDB:reduction};assert.ok(reduction>12,JSON.stringify(metrics.antialias));
});
test('Original CRUSH quantisation, hold, saturation and compensation remain unchanged; level scales wet only',()=>{
 // Inspect and isolate only downstream colour/output/reverb to observe the crusher stem.
 metrics.crushLevel=[];
 for(const crush of [.75,1]){const engines=[1,.4,0].map(crushLevel=>{const e=make('motorik',{crushLevel,fx:{attack:.008,release:.85,reverb:0,wooze:0,crush}});e.crushLevelNow=crushLevel;e.note(60,.7,-1,'manual');e.outputFilterK=0;e.performance.colour=(l,r)=>{e.stem=[l,r];return [0,0];};return e;});
  const l=new Float32Array(1),r=new Float32Array(1);let maxError=0,energy=0;
  for(let n=0;n<48000;n++){for(const e of engines)e.process(l,r);for(let ch=0;ch<2;ch++){const full=engines[0].stem[ch],quiet=engines[1].stem[ch],dry=engines[2].stem[ch];maxError=Math.max(maxError,Math.abs((quiet-dry)-.4*(full-dry)));energy+=(full-dry)**2;}
   for(const e of engines.slice(1)){assert.equal(e.heldL,engines[0].heldL);assert.equal(e.crushGain,engines[0].crushGain);assert.equal(e.crushWet,engines[0].crushWet);}}
  assert.ok(maxError<1e-14);assert.ok(energy>.01);metrics.crushLevel.push({crush,wetScale:.4,maximumScalarError:maxError});
 }
});
test('DRIVE and CRUSH LEVEL never alter drum-only output or shared musical timing',()=>{
 const a=make('motorik',{drive:1,crushLevel:0,drumVolume:.6}),b=make('motorik',{drumVolume:.6},old.Engine);for(const e of [a,b])e.message({type:'drums',on:true});for(let i=0;i<30;i++){const x=render(a,.1,true),y=render(b,.1,true);assert.deepEqual(x.data,y.data);assert.equal(a.clock.tick,b.clock.tick);assert.equal(a.clock.phase,b.clock.phase);}
});
test('KOSMISCHE controls the existing ring pulse with continuous phase, adjustable rate/depth and warmer filtering',()=>{
 const e=make('kosmische');render(e,.2);const before=e.pulsePhase;e.configure({kosmische:{pulseSpeed:.12,pulseDepth:1}});assert.equal(e.pulsePhase,before);render(e,1);assert.ok(Math.abs(e.pulseSpeedNow-.12)<1e-10);assert.ok(e.pulseDepthNow>.999);const phase=e.pulsePhase;render(e,1);assert.ok(Math.abs((e.pulsePhase-phase+1)%1-.12)<1e-6);
 e.configure({kosmische:{pulseSpeed:24,pulseDepth:0}});render(e,1);assert.ok(Math.abs(e.pulseSpeedNow-24)<1e-10);assert.ok(e.pulseDepthNow<1e-10);
 // Pulse depth changes only multiplication after the original moving resonant filter.
 const aa=make('kosmische',{kosmische:{pulseSpeed:2,pulseDepth:0}}),bb=make('kosmische',{kosmische:{pulseSpeed:2,pulseDepth:1}});for(const x of [aa,bb]){x.note(60,.7,-1);render(x,.8);}assert.equal(aa.voices[0].low,bb.voices[0].low);assert.equal(aa.voices[0].band,bb.voices[0].band);assert.match(worklet,/\.86\*\(700\+f\*2\.5/);metrics.kosmische={rateHz:[.12,24],depth:[0,1],phaseContinuous:true,filterCutoffScale:.86};
});
test('HAUNTED naturally rings longer, held partials retain energy and RELEASE produces a longer dry tail',()=>{
 metrics.haunted={};
 for(const [label,C]of [['batch1',old.Engine],['batch2',Engine]]){const e=make('haunted',{},C);e.note(60,.7,-2);render(e,2);metrics.haunted[label]=render(e,1).rms;}
 assert.ok(metrics.haunted.batch2>metrics.haunted.batch1*5);
 const held=make('haunted');held.note(60,.7,-1,'manual');render(held,8);metrics.haunted.held8seconds=render(held,.5).rms;assert.ok(metrics.haunted.held8seconds>.004);assert.ok(held.voices[0].modeAmp[1]>.08);
 const tails=[];for(const release of [.03,4]){const e=make('haunted',{fx:{attack:.005,release,reverb:0,wooze:0,crush:0}});const v=e.note(60,.7,-1,'manual');render(e,3);const amps=[...v.modeAmp];e.release('manual');render(e,1/e.sr);assert.ok(v.modeAmp.every((x,i)=>Math.abs(x-amps[i])<1e-5),'no energy discontinuity on release');render(e,.5);tails.push(render(e,.5).rms);render(e,8);assert.equal(e.voices.length,0);}assert.ok(tails[1]>.001&&tails[1]>tails[0]*100);metrics.haunted.releaseTailRMS=tails;
});
test('Fast parameter sweeps stay smooth, combined effects bounded, and STOP clears all instruments',()=>{
 metrics.sweeps=[];for(const p of PRESETS){const e=make(p.id,{arp:{...defaultState().arp,mode:'both',speed:5,octaves:3},fx:{attack:.002,release:4,reverb:1,wooze:1,crush:1},glitch:1,tone:1});e.message({type:'sequence',on:true});let peak=0;for(let i=0;i<16;i++){e.configure({drive:i%2,crushLevel:1-i%2,kosmische:{pulseSpeed:i%2?24:.12,pulseDepth:i%2}});peak=Math.max(peak,render(e,.1).peak);}assert.ok(peak<.881);e.message({type:'stop'});const tail=render(e,.5);assert.equal(e.voices.length,0);assert.equal(e.strumPointers.size,0);assert.ok(render(e,.1).peak<1e-7);metrics.sweeps.push({preset:p.id,peak});}
 const d=new DriveClass(48000);let last=0,maxDelta=0;for(let i=0;i<48000*3;i++){const x=.2*Math.sin(2*Math.PI*220*i/48000),y=d.process(x,x,(Math.floor(i/6000)%2))[0];maxDelta=Math.max(maxDelta,Math.abs(y-last));last=y;}assert.ok(maxDelta<.03);metrics.driveSweepMaximumDelta=maxDelta;
});
test('Thirty-two voices plus maximum DRIVE stay within a desktop real-time budget',()=>{
 const times=[];for(const drive of [0,1]){const e=make('garage',{drive});for(let i=0;i<32;i++)e.note(42+i,.7,-1);render(e,.2);const start=performance.now();render(e,2);times.push(performance.now()-start);}metrics.cpu={platform:process.platform,architecture:process.arch,renderSeconds:2,voices:32,baselineMs:times[0],driveMs:times[1],relativeCost:times[1]/times[0],driveRealtimeFactor:2000/times[1],physicalIPhone:false};assert.ok(times[1]<2000);assert.ok(times[1]/times[0]<2.8);
});
test('Output routing, worklet wrapper, all other voices and Batch 1 event/navigation handlers are preserved',()=>{
 const prior=oldFile('worklet.js'),oldHtml=oldFile('index.html');assert.equal(worklet.slice(worklet.indexOf('class WilmachordProcessor')),prior.slice(prior.indexOf('class WilmachordProcessor')));
 for(const marker of ["async function audio()",'function showPage','function renderTransport','function updateScope']){if(!oldHtml.includes(marker))continue;const extract=s=>s.slice(s.indexOf(marker),s.indexOf('\n}',s.indexOf(marker))+2);assert.equal(extract(html),extract(oldHtml),marker);}
 assert.equal((html.match(/node.connect\(ctx.destination\)/g)||[]).length,(oldHtml.match(/node.connect\(ctx.destination\)/g)||[]).length);
});
writeResults('sound-batch2',tests,metrics);
