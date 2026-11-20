import fs from 'node:fs';import {performance,PerformanceObserver} from 'node:perf_hooks';
import {fixture,worklet,current,out} from './fixtures.mjs';
import {execFileSync} from 'node:child_process';
const dir=new URL('file://'+out+'/'),repo=new URL('../../',import.meta.url);
const baseline=execFileSync('git',['show','34f37fbbdfaecd2a780c844802fa9d76787729ab:lie013-preview-7x9/worklet.js'],{cwd:repo,maxBuffer:32e6}).toString();
const label=process.argv[2]||'baseline',lib=await fixture(label==='baseline'?baseline:worklet,'stress-'+label),zones=current.decodeSamples();
const expanded=process.argv.includes('--expanded');
const long=process.argv.includes('--long'),profile=process.argv.includes('--profile'),results=[],gc=[];
const observer=new PerformanceObserver(list=>gc.push(...list.getEntries().map(x=>({start:x.startTime,duration:x.duration}))));observer.observe({entryTypes:['gc']});
function run(sr,scenario,seconds){
 const e=new lib.Engine(sr),preset=lib.PRESETS.find(x=>x.id==='tape-strings');e.message({type:'samples',zones});e.configure({...lib.defaultState(),preset:preset.id,chordLength:.65,strings:12,strumMode:'pluck',tempo:180,rhythm:4,drive:scenario==='effects'?1:0,fx:{...preset,crush:scenario==='effects'?1:preset.crush},arp:{...lib.defaultState().arp,mode:scenario==='chord'?'chord':scenario==='arp'?'arp':'both',speed:4},...(label!=='baseline'&&scenario==='eq'?{eq:{low:8,mid:-6,high:8},presence:.6}:{} )});
 if(scenario==='combined-fx')e.configure({strumPreset:'garage',chordLength:1.1,glitch:.85,glitchTarget:'all',drive:.35,drumFx:Array.from({length:7},(_,i)=>({pitch:i-3,spring:.65,delay:.55}))});
 e.message({type:'chord',chord:{root:0,quality:'maj9'},hold:true});if(!['sustain','strum','latch-off'].includes(scenario))e.message({type:'drums',on:true});if(['chord','arp','both','effects','eq','soak','combined-fx'].includes(scenario))e.message({type:'sequence',on:true});
 const l=new Float32Array(128),r=new Float32Array(128),blocks=Math.ceil(seconds*sr/128),timings=new Float64Array(blocks),dead=128/sr*1000;
 let lastHold=false,lastLock=false,peak=0,maxJump=0,last=0,maxVoices=0,maxTails=0,over=0,silent=0,silentRun=0,maxSilentRun=0,nans=0,stolen=0,heldStolen=0,lastStrum=-1,lastChord=-1,lastTempo=-1,firstPeak=0;
 const eventTicks=new Float64Array(40000),eventFrames=new Float64Array(40000),beforeIds=new Int32Array(32),beforeHeld=new Uint8Array(32);let eventCount=0,maxEventLateFrames=0,expectedBeat=0;
 e.trace=x=>{if(x.kind==='drum'){eventTicks[eventCount]=x.tick;eventFrames[eventCount++]=x.frame;maxEventLateFrames=Math.max(maxEventLateFrames,(e.clock.tick+e.clock.phase-x.tick)/(e.tempo*24/(60*sr)));}};
 global.gc?.();const heapBefore=process.memoryUsage().heapUsed,start=performance.now();
 for(let b=0;b<blocks;b++){
  const time=b*128/sr,ci=Math.floor(time/1.3),si=Math.floor(time/.12),ti=Math.floor(time/.2);
  const begin=performance.now();
  if(ci!==lastChord){lastChord=ci;if(!['chord','arp','both','effects','eq','soak','combined-fx'].includes(scenario))e.message({type:'chord',chord:{root:[0,5,9,7][ci%4],quality:ci%2?'m7':'maj9'},hold:true});}
  if(scenario==='latch-off'&&time%1.3>.7)e.message({type:'release'});
  if(scenario!=='sustain'&&si!==lastStrum){lastStrum=si;for(let i=0;i<12;i++){const count=e.voices.length>=e.maxVoices?e.voices.length:0;for(let j=0;j<count;j++){const v=e.voices[j];beforeIds[j]=v.id;beforeHeld[j]=v.gate===-1&&!v.pluck?1:0;}
 e.message({type:'lane',lane:si%2?11-i:i,velocity:.78,pointer:1});if(count){stolen++;for(let j=0;j<count;j++)if(beforeHeld[j]){let found=false;for(let k=0;k<e.voices.length;k++)if(e.voices[k].id===beforeIds[j]){found=true;break;}if(!found)heldStolen++;}}}}
  if(['tempo','both','effects','eq','soak','combined-fx'].includes(scenario)&&ti!==lastTempo){lastTempo=ti;e.configure({tempo:[80,140,220,180,110,200][ti%6]});}
  if(scenario==='combined-fx'&&expanded&&b%128===0){const section=Math.floor(time/12);e.configure({drumFxMode:section%2?'global':'individual',drumDelay:{time:[.02,.2,.4][section%3],feedback:[0,.43,.94][section%3],legacySync:false},globalDrumFx:{pitch:section%2?5:-3,spring:.8,delay:.7,tone:section%3-1,delayTime:[.4,.02,.2][section%3],delayFeedback:[.94,0,.43][section%3],delayLegacySync:false},drumSpringTone:section%3-1,fragmentLength:[0,.25,1][section%3],drumMutes:Array.from({length:7},(_,i)=>i===section%7)});}
  if(scenario==='combined-fx'){const hold=time%30>=20&&time%30<22,lock=time%30>=12&&time%30<24;if(hold!==lastHold){e.message({type:'glitch-hold',on:hold});lastHold=hold;}if(lock!==lastLock){e.message({type:'strum-lock',on:lock});lastLock=lock;}}
  expectedBeat+=128*e.tempo/(60*sr);e.process(l,r);const ms=performance.now()-begin;timings[b]=ms;if(ms>dead)over++;maxVoices=Math.max(maxVoices,e.voices.length);maxTails=Math.max(maxTails,e.tails.length);
  let blockPeak=0;for(let j=0;j<128;j++){const x=l[j];if(!Number.isFinite(x)||!Number.isFinite(r[j]))nans++;blockPeak=Math.max(blockPeak,Math.abs(x),Math.abs(r[j]));maxJump=Math.max(maxJump,Math.abs(x-last));last=x;}peak=Math.max(peak,blockPeak);if(b<sr/128)firstPeak=Math.max(firstPeak,blockPeak);
  if(time>.3&&blockPeak<1e-7){silent++;silentRun++;}else silentRun=0;maxSilentRun=Math.max(maxSilentRun,silentRun);
 }
 const end=performance.now(),heapUncollected=process.memoryUsage().heapUsed,clockBeat=e.clock.beat;global.gc?.();const heapAfter=process.memoryUsage().heapUsed;timings.sort();
 e.message({type:'stop'});for(let i=0;i<Math.ceil(sr/128);i++)e.process(l,r);
 return {sr,scenario,expanded,seconds,blocks,meanBlockMs:timings.reduce((a,b)=>a+b,0)/blocks,p50:timings[Math.floor(blocks*.5)],p95:timings[Math.floor(blocks*.95)],p99:timings[Math.floor(blocks*.99)],worstBlockMs:timings[blocks-1],budgetMs:dead,deadlineOverruns:over,maxVoices,maxTails,stolen,heldStolen,peak,maxSampleJump:maxJump,silentBlocks:silent,maxSilentMs:maxSilentRun*128/sr*1000,nonfinite:nans,missingSamples:e.missingSamples,voicesAfterStop:e.voices.length,tailsAfterStop:e.tails.length,drumEvents:eventCount,eventsOrdered:eventTicks.subarray(0,eventCount).every((x,i)=>i===0||x>eventTicks[i-1]),maxEventLateFrames,clockBeat,expectedBeat:scenario==='sustain'||scenario==='strum'||scenario==='latch-off'?0:expectedBeat,clockErrorBeats:Math.abs(clockBeat-(['sustain','strum','latch-off'].includes(scenario)?0:expectedBeat)),heapUncollected,heapBefore,heapAfter,heapGrowth:heapAfter-heapBefore,wallSeconds:(end-start)/1000,start,end};
}
for(const sr of profile?[48000]:[44100,48000])for(const scenario of profile?['drums']:long?[process.argv.includes('--fx')?'combined-fx':'soak']:['sustain','strum','latch-off','drums','chord','arp','both','effects','tempo',...(label!=='baseline'?['eq']:[])]){
 const result=run(sr,scenario,long?600:profile?25:8);if(result.nonfinite||result.missingSamples||result.voicesAfterStop||result.tailsAfterStop||!result.eventsOrdered||result.maxEventLateFrames>1.001||result.clockErrorBeats>1e-6)throw Error('Stress invariant failed '+JSON.stringify(result));results.push(result);await new Promise(r=>setImmediate(r));console.log(JSON.stringify(result));
}
await new Promise(r=>setImmediate(r));observer.disconnect();
fs.writeFileSync(new URL(label+(long?'-long':profile?'-profile':'-stress')+'.json',dir),JSON.stringify({label,physicalIPhone:false,deadlineMeaning:'Instrumented desktop render calls; includes note/parameter dispatch. OS scheduling and GC spikes are not proof of iPhone AudioWorklet underruns.',forcedGCAvailable:!!global.gc,platform:process.platform,arch:process.arch,results,gc},null,2));
