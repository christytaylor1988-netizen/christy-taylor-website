import {current,fixture,repo,writeResults} from './fixtures.mjs';
import {execFileSync} from 'node:child_process';
const original=await fixture(execFileSync('git',['show','34f37fbbdfaecd2a780c844802fa9d76787729ab:lie013-preview-7x9/worklet.js'],{cwd:repo,maxBuffer:32e6}).toString(),'v045-loudness');
const zones=current.decodeSamples(),results=[];
for(const [label,lib] of [['v045',original],['v046',current]])for(const rate of [44100,48000])for(const p of lib.PRESETS.filter(p=>p.id!=='cassette')){
 const e=new lib.Engine(rate),s=lib.defaultState();s.preset=p.id;for(const k in s.fx)s.fx[k]=p[k];e.message({type:'samples',zones});e.configure(s);
 const l=new Float32Array(128),r=new Float32Array(128);let energy=0,weighted=0,peak=0,n=0,low38=0,low1500=0;
 const k38=1-Math.exp(-2*Math.PI*38/rate),k1500=1-Math.exp(-2*Math.PI*1500/rate);
 for(let b=0;b<Math.ceil(rate*4/128);b++){
  if(b===0||b===Math.ceil(rate*2/128))e.message({type:'chord',chord:{root:b===0?0:5,quality:'',inversion:0},hold:true});e.process(l,r);
  for(let i=0;i<128;i++){const x=(l[i]+r[i])*.5;low38+=k38*(x-low38);low1500+=k1500*(x-low1500);const w=x-low38+.58*(x-low1500);energy+=(l[i]*l[i]+r[i]*r[i])*.5;weighted+=w*w;peak=Math.max(peak,Math.abs(l[i]),Math.abs(r[i]));n++;}
 }
 results.push({label,rate,instrument:p.id,rmsDb:10*Math.log10(energy/n),weightedDb:10*Math.log10(weighted/n),peakDb:20*Math.log10(peak)});
}
writeResults('loudness-v046',['All selectable instruments measured at both rates'],{method:'Four seconds, C and F major, factory effects, stereo RMS and spectral-weighted mono proxy (not calibrated LUFS).',results});
console.log(JSON.stringify(results));
