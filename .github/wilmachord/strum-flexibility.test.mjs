import assert from 'node:assert/strict';
import {current,writeResults} from './fixtures.mjs';
const tests=[],zones=current.decodeSamples();
function render(e,seconds){const l=new Float32Array(128),r=new Float32Array(128);let peak=0;for(let i=0;i<e.sr*seconds;i+=128){e.process(l,r);for(const x of l){assert.ok(Number.isFinite(x)&&Math.abs(x)<.881);peak=Math.max(peak,Math.abs(x));}}return peak;}
for(const sr of [44100,48000]){
 const e=new current.Engine(sr);e.message({type:'samples',zones});e.configure({...current.defaultState(),strings:12,strumMode:'hold',tempo:220,arp:{...current.defaultState().arp,mode:'both'},progression:[{root:0,quality:'maj7'},{root:5,quality:'m7'}]});
 e.message({type:'sequence',on:true});e.message({type:'strum-lock',on:true});const locked=e.strumNotes();assert.equal(locked[0]%12,0,'can lock first progression chord before first rendered frame');
 e.message({type:'lane',lane:3,pointer:9});const held=e.strumPointers.get('9').voice;render(e,1.2);assert.equal(e.currentChord.root,5);assert.deepEqual(e.strumNotes(),locked);assert.equal(e.strumPointers.get('9').voice,held);
 e.configure({key:7,octave:1});assert.deepEqual(e.strumNotes(),locked);e.message({type:'chord',chord:{root:9,quality:'m'},hold:true});assert.deepEqual(e.strumNotes(),locked);
 e.message({type:'strum-lock',on:false});assert.notDeepEqual(e.strumNotes(),locked);assert.equal(e.strumPointers.get('9').voice.n,e.strumNotes()[3]);e.message({type:'strum-release',pointer:9});assert.equal(e.strumPointers.size,0);
 e.message({type:'stop'});render(e,.5);assert.equal(e.freeVoices.length,40);tests.push(`${sr}: lock survives progression, key/octave/chord changes; FOLLOW retunes HOLD`);
 for(const preset of current.PRESETS){
  const p=new current.Engine(sr);p.message({type:'samples',zones});p.configure({...current.defaultState(),preset:'garage',strumPreset:preset.id});p.message({type:'chord',chord:{root:0,quality:''},hold:true});p.message({type:'lane',lane:4,velocity:.8});
  assert.ok(p.voices.filter(v=>v.origin==='manual').every(v=>v.preset.id==='garage'));assert.equal(p.voices.find(v=>v.origin==='strum').preset.id,preset.id);assert.ok(render(p,.12)>.001);assert.equal(p.missingSamples,0);
  p.configure({strumPreset:'same'});assert.equal(p.strumPreset,null);assert.ok(p.voices.filter(v=>v.origin==='strum').every(v=>v.gate===0));assert.ok(p.voices.filter(v=>v.origin==='manual').every(v=>v.gate===-1));
  p.message({type:'lane',lane:2});assert.equal(p.voices.at(-1).preset.id,'garage');p.message({type:'stop'});render(p,.5);assert.equal(p.freeVoices.length,40);
 }
 tests.push(`${sr}: every existing strum sound plays beside GARAGE; switching releases only strums; one shared pool`);
}
writeResults('strum-flexibility',tests);console.log('PASS',tests.join('\nPASS '));
