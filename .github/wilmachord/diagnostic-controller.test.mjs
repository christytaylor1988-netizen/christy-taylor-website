// Controller-level event simulation, NOT a browser or hardware test.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {html,script,current,out} from './fixtures.mjs';const music=current,drums=current,{decodeSamples}=current;
const elements=new Map(),messages=[],timers=new Map(),windowEvents={};let timerId=0,hit=null;
class Element {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.style={};this.listeners={};this.value='';this.className='';this.hidden=false;this.clientWidth=300;this.offsetLeft=0;this.open=false;this.textContent='';this.classList={add:(c)=>this.classes().add(c)&&this.sync(),remove:c=>{this.classes().delete(c);this.sync();},toggle:(c,on)=>{if(on??!this.classes().has(c))this.classes().add(c);else this.classes().delete(c);this.sync();},contains:c=>this.classes().has(c)};}
 classes(){if(this._last!==this.className){this._classes=new Set(this.className.split(' ').filter(Boolean));this._last=this.className;}return this._classes;}
 sync(){this.className=[...this._classes].join(' ');this._last=this.className;}
 set id(v){this._id=v;elements.set(v,this);}get id(){return this._id;}
 append(...xs){for(const x of xs){x.parent=this;this.children.push(x);}}replaceChildren(...xs){this.children=[];this.append(...xs);}add(e){this.append(e);}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}setPointerCapture(){}
 getBoundingClientRect(){return {left:0,top:0,width:360,height:80};}
 matches(q){return q.split(',').some(x=>this.match(x.trim()));}
 match(q){if(q==='dialog[open]')return this.tagName==='DIALOG'&&this.open;if(q==='[data-step]')return this.dataset.step!==undefined;if(q==='[data-close]')return this.dataset.close!==undefined;if(q.startsWith('.'))return this.classes().has(q.slice(1));return this.tagName===q.toUpperCase();}
 querySelector(q){return this.all().find(x=>x.matches(q))||null;}all(){return this.children.flatMap(x=>[x,...x.all()]);}
 closest(q){return this.matches(q)?this:this.parent?.closest(q)||null;}
 addEventListener(k,fn){this.listeners[k]=fn;}dispatchEvent(e){this['on'+e.type]?.({...e,target:this});}
 showModal(){this.open=true;}close(){this.open=false;}click(){this.onclick?.({detail:0,target:this});}
}
for(const m of html.matchAll(/<([\w-]+)[^>]*\bid="([^"]+)"/g)){const e=new Element(m[1]);e.id=m[2];}
for(const id of ['rhythm-toggle','seq-drums','drum-play'])elements.get(id).append(new Element('span'));
for(let i=0;i<4;i++)elements.get('beats').append(new Element('i'));
const doc={hidden:false,getElementById:id=>elements.get(id),createElement:t=>new Element(t),querySelectorAll:q=>[...elements.values()].flatMap(e=>[e,...e.all()]).filter((e,i,a)=>a.indexOf(e)===i&&e.matches(q)),querySelector:q=>doc.querySelectorAll(q)[0]||null,elementFromPoint:()=>hit,addEventListener:(k,fn)=>{const old=doc[k];doc[k]=(...args)=>{old?.(...args);fn(...args);};}};
class AudioContext {constructor(){this.state='running';this.sampleRate=48000;this.currentTime=0;this.created=[];this.destination={channelCount:2,maxChannelCount:2};this.audioWorklet={addModule:async()=>{}};}async resume(){if(this.pendingResume)return this.pendingResume;this.state='running';}createOscillator(){const o={frequency:{value:0},connect:d=>o.connected=d,disconnect:()=>o.disconnected=true,start:t=>o.startTime=t,stop:t=>o.stopTime=t};this.created.push(o);return o;}createGain(){const g={gain:{value:0,events:[],setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.events.push(['ramp',v,t]);},cancelScheduledValues(t){this.events.push(['cancel',t]);}},connect:d=>g.connected=d,disconnect:()=>g.disconnected=true};return g;}suspend(){this.state='suspended';}}
class AudioWorkletNode {constructor(){this.port={postMessage:m=>messages.push(JSON.parse(JSON.stringify(m.type==='samples'?{type:m.type,zones:m.zones.length}:m)))};}connect(){}}
const store=new Map(),scope={...music,...drums,decodeSamples,atob,document:doc,window:{AudioContext,addEventListener(k,fn){windowEvents[k]=fn;}},AudioWorkletNode,Option:class extends Element{constructor(n,v){super('option');this.textContent=n;this.value=v;}},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>fn(),performance:{now:()=>1000},Blob,URL,Event:class{constructor(type){this.type=type;}},confirm:()=>true,console};
const bundled=process.argv.includes('--bundle');
const context=vm.createContext(scope);
vm.runInContext(script+'\nglobalThis.probe={state:()=>s,held:()=>held,validate,showPage,audio,stop,strums:()=>strums.size,context:()=>ctx,loadWorklet,wakeAudio,runAudioTest,receiveAudioTest,cancelAudioTest,test:()=>audioTest};',context);
await context.probe.audio();const $=id=>elements.get(id),state=()=>context.probe.state(),pointer=(id,x=0,y=0,t=0)=>({pointerId:id,button:0,clientX:x,clientY:y,timeStamp:t,preventDefault(){}});
const tests=[];const probe=context.probe;
async function test(name,fn){await fn();tests.push({name,pass:true});console.log('PASS',name);}
await test('No test starts on load, opening help or reading diagnostics',async()=>{assert.equal(probe.test(),null);assert.equal(probe.context().created.length,0);$('about').onclick();assert.equal(probe.test(),null);assert.equal(probe.context().created.length,0);});
await test('Explicit A tap uses same context, only test gain, scheduled fade and hard stop',async()=>{
 const saved=JSON.stringify(state());await $('test-direct').onclick();const t=probe.test(),ctx=probe.context();assert.equal(t.kind,'A');assert.equal(t.osc.connected,t.gain);assert.equal(t.gain.connected,ctx.destination);assert.equal(t.osc.frequency.value,440);assert.equal(t.osc.stopTime,.9);assert.deepEqual(JSON.parse(JSON.stringify(t.gain.gain.events)),[['set',0,0],['ramp',.04,.02],['set',.04,.8],['ramp',0,.85]]);ctx.currentTime=.9;t.osc.onended();assert.equal(probe.test(),null);assert.ok(t.osc.disconnected&&t.gain.disconnected);assert.equal(JSON.stringify(state()),saved);assert.match($('audio-test-result').textContent,/not a measured speaker signal/);
});
await test('B/C use existing worklet and report actual digital output; stored settings unchanged',async()=>{
 const saved=JSON.stringify(state());for(const kind of ['B','C']){await $(kind==='B'?'test-worklet':'test-engine').onclick();const t=probe.test();assert.equal(messages.at(-1).type,'audio-test');assert.equal(messages.at(-1).kind,kind);probe.receiveAudioTest({id:t.id,channels:2,peak:.04,enginePeak:.2,frames:72064,missingSamples:0});assert.equal(probe.test(),null);assert.match($('audio-test-result').textContent,/0.0400/);assert.match($('audio-test-result').textContent,/Did you hear it/);}assert.equal(JSON.stringify(state()),saved);
});
await test('Replacing tests, closing info, panic, focus loss and visibility stop test notes',async()=>{
 for(const cancel of [()=>probe.stop(),()=>windowEvents.blur(),()=>$('info').listeners.close(),()=>$('info').listeners.cancel(),()=>{doc.hidden=true;doc.visibilitychange();doc.hidden=false;}]){await probe.runAudioTest('A');const t=probe.test();cancel();assert.equal(probe.test(),null);assert.ok(t.osc.stopTime<=probe.context().currentTime+.02);t.osc.onended();}
 await probe.runAudioTest('B');const first=probe.test();await probe.runAudioTest('C');assert.notEqual(probe.test().id,first.id);probe.receiveAudioTest({id:first.id});assert.equal(probe.test().kind,'C');probe.cancelAudioTest();
});
await test('Late resume cannot start a cancelled test; timeout prevents unattended start',async()=>{
 const ctx=probe.context();let release;ctx.pendingResume=new Promise(r=>release=r);const start=probe.runAudioTest('A');const count=ctx.created.length;probe.stop();release();await start;assert.equal(ctx.created.length,count);delete ctx.pendingResume;
 await probe.runAudioTest('B');const t=probe.test();timers.get(t.timeout)();assert.equal(probe.test(),null);assert.match($('audio-test-result').textContent,/timed out/);assert.equal(messages.at(-1).type,'audio-test-cancel');
});
await test('Diagnostic messages cannot replace normal transport status or mutate user settings',async()=>{assert.equal(probe.test(),null);assert.ok(html.includes("if(e.data.type==='audio-diagnostic'){receiveAudioTest(e.data);return;}"));assert.ok(!script.includes('audioSession.type='));assert.ok(!script.includes('audioSession.type ='));});
fs.writeFileSync(out+'/diagnostic-controller-results.json',JSON.stringify({testType:'Simulated Web Audio/DOM event tests, not hardware listening',tests,pass:true},null,2));
