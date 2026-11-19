import assert from 'node:assert/strict';
import {current,writeResults} from './fixtures.mjs';
const tests=[],metrics=[];
for(const sr of [44100,48000]){
 const f=new current.PerformanceFX(sr);let peak=0,jump=0,last=0,remembered=0,reverse=0,loops=0;
 for(let n=0;n<sr*3;n++){
  const hold=n>sr*.4&&n<sr*2.4;
  f.begin(n*48/sr,120,hold?1:0,'chord',hold);
  const input=n<sr*.5?.18*Math.sin(2*Math.PI*317*n/sr):0;
  const y=f.bus(0,input,input)[0];f.bus(1,input,input);f.bus(2,input,input);f.end();
  assert.ok(Number.isFinite(y));peak=Math.max(peak,Math.abs(y));jump=Math.max(jump,Math.abs(y-last));last=y;
  if(n>sr*.7&&n<sr*2.3&&Math.abs(y)>.01)remembered++;
  if(n>sr*2.6)assert.equal(y,input);
 }
 assert.ok(remembered>sr*.8,'HOLD must replay captured sound after live input is silent');
 assert.ok(peak<=.181&&jump<.025,'short crossfades bound transitions');
 const g=new current.PerformanceFX(sr);let changed=0;
 for(let n=0;n<sr*3;n++){
  g.begin(n*48/sr,120,1,'all',false);const x=.13*Math.sin(n*.031)+.04*Math.sin(n*.107);const y=g.bus(0,x,x)[0];g.bus(1,0,0);g.bus(2,0,0);g.end();
  if(Math.abs(y-x)>.001)changed++;if(g.buses[0].action===3)reverse++;if(g.buses[0].read>g.buses[0].cycle)loops++;
 }
 assert.ok(changed>sr&&reverse>0&&loops>0,'intense setting includes splices, reversed fragments and repeated grains');
 metrics.push({sr,rememberedFrames:remembered,changedFrames:changed,reverseFrames:reverse,repeatedFrames:loops,peak,maxSampleJump:jump});
 tests.push(`${sr}: recorded fragments, prolonged HOLD, reverse, repeats, smooth release`);
}
writeResults('fragmentation',tests,{measurements:metrics});console.log('PASS',tests.join('\nPASS '));
