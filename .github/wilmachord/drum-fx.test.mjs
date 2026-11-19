import assert from 'node:assert/strict';
import {current,writeResults} from './fixtures.mjs';
const tests=[],metrics=[];
function voice(sr,lane,pitch,spring=0,delay=0){const e=new current.Engine(sr),fx=current.defaultState().drumFx;fx[lane]={pitch,spring,delay};e.configure({drumFx:fx});for(let i=0;i<sr*.5;i++)e.drumSample();e.drumEnv[lane]=.8;e.drumPitch[lane]=1;return e;}
for(const sr of [44100,48000]){
 for(let i=0;i<7;i++){
  const dry=voice(sr,i,0),tuned=voice(sr,i,12),sent=voice(sr,i,0,.8,.7);let difference=0,wetEnergy=0,dryEnergy=0;
  for(let n=0;n<sr*.8;n++){const a=dry.drumSample(),b=tuned.drumSample();sent.drumSample();difference+=Math.abs(a-b);wetEnergy+=sent.drumWetL**2+sent.drumWetR**2;dryEnergy+=a*a;}
  assert.ok(difference>.01&&dryEnergy>0,`voice ${i} must audibly change its waveform when tuned`);assert.ok(wetEnergy>.00001);
  for(let j=0;j<7;j++)assert.equal(tuned.drumTuneTarget[j],i===j?2:1);
  metrics.push({sr,voice:i,tunedDifference:difference,wetEnergy});
 }
 tests.push(`${sr}: independent pitch, spring and delay on all seven voices`);
 const e=new current.Engine(sr),b=e.drumEffects;b.tempo(120);let first=-1,peak=0,tail=0;
 for(let n=0;n<sr*8;n++){const y=b.process(0,n===0?1:0)[0];assert.ok(Number.isFinite(y));if(Math.abs(y)>1e-6&&first<0)first=n;peak=Math.max(peak,Math.abs(y));if(n>sr*7)tail=Math.max(tail,Math.abs(y));}
 assert.ok(first/sr>.37&&first/sr<.38);assert.ok(peak<.6&&tail<1e-6);assert.equal(b.active,0);
 tests.push(`${sr}: dotted-eighth delay timing, bounded feedback and eventual silence`);
 b.reset();let springPeak=0,lateEnergy=0;
 for(let n=0;n<sr*2;n++){const y=b.process(n===0?1:0,0);assert.ok(Number.isFinite(y[0])&&Number.isFinite(y[1]));springPeak=Math.max(springPeak,Math.abs(y[0]),Math.abs(y[1]));if(n>sr*.06)lateEnergy+=y[0]**2;}
 assert.ok(springPeak>0&&springPeak<.5&&lateEnergy>.001);b.reset();assert.deepEqual([...b.process(0,0)],[0,0]);
 tests.push(`${sr}: dispersed spring tail and clean reset`);
}
writeResults('drum-fx',tests,{measurements:metrics});console.log('PASS',tests.join('\nPASS '));
