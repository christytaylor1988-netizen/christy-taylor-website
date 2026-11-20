// Controller-level event simulation, NOT a browser or hardware test.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
import {html,script,current,out} from './fixtures.mjs';const music=current,drums=current,{decodeSamples}=current;
const elements=new Map(),messages=[],timers=new Map(),windowEvents={},frames=new Map();let timerId=0,hit=null;const connections=new Set();
class Element {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.attrs={};this.style={};this.listeners={};this.value='';this.className='';this.hidden=false;this.clientWidth=300;this.offsetLeft=0;this.open=false;this.textContent='';this.classList={add:(c)=>this.classes().add(c)&&this.sync(),remove:c=>{this.classes().delete(c);this.sync();},toggle:(c,on)=>{if(on??!this.classes().has(c))this.classes().add(c);else this.classes().delete(c);this.sync();},contains:c=>this.classes().has(c)};}
 classes(){if(this._last!==this.className){this._classes=new Set(this.className.split(' ').filter(Boolean));this._last=this.className;}return this._classes;}
 sync(){this.className=[...this._classes].join(' ');this._last=this.className;}
 set id(v){this._id=v;elements.set(v,this);}get id(){return this._id;}
 append(...xs){for(const x of xs){x.parent=this;this.children.push(x);}}replaceChildren(...xs){this.children=[];this.append(...xs);}add(e){this.append(e);}
 setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}setPointerCapture(){}
 getContext(){return this.tagName==='CANVAS'?{fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){}}:null;}
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
const header=new Element('header');header.append(elements.get('about'));
for(let i=0;i<4;i++)elements.get('beats').append(new Element('i'));
const doc={hidden:false,getElementById:id=>elements.get(id),createElement:t=>new Element(t),querySelectorAll:q=>[...elements.values()].flatMap(e=>[e,...e.all()]).filter((e,i,a)=>a.indexOf(e)===i&&e.matches(q)),querySelector:q=>doc.querySelectorAll(q)[0]||null,elementFromPoint:()=>hit,addEventListener:(k,fn)=>{doc[k]=fn;}};
class AudioContext {constructor(){this.state='running';this.sampleRate=48000;this.destination={};this.audioWorklet={addModule:async()=>{}};}async resume(){this.state='running';}suspend(){this.state='suspended';}createAnalyser(){return {fftSize:256,getFloatTimeDomainData(d){d.fill(.1);}};}}
class AudioWorkletNode {constructor(){this.port={postMessage:m=>messages.push(JSON.parse(JSON.stringify(m.type==='samples'?{type:m.type,zones:m.zones.length}:m)))};}connect(dest){connections.add(dest);}disconnect(dest){connections.delete(dest);}}
const store=new Map(),scope={...music,...drums,decodeSamples,atob,document:doc,window:{AudioContext,addEventListener(k,fn){windowEvents[k]=fn;}},AudioWorkletNode,Option:class extends Element{constructor(n,v){super('option');this.textContent=n;this.value=v;}},localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{frames.set(++timerId,fn);return timerId;},cancelAnimationFrame:id=>frames.delete(id),performance:{now:()=>1000},Blob,URL,Event:class{constructor(type){this.type=type;}},confirm:()=>true,console};
const bundled=true,context=vm.createContext(scope);
vm.runInContext(script+'\nglobalThis.probe={state:()=>s,held:()=>held,validate,showPage,audio,stop,strums:()=>strums.size,context:()=>ctx,loadWorklet,wakeAudio,transport:()=>({seqOn,seqPaused,drumsOn}),scope:()=>({scopeEnabled,scopeAnalyser,scopeFrameId}),bank:()=>drumBank,update:(step)=>{lastStatus={...lastStatus,gridStep:step};updateDrumPlayhead();}};',context);
await context.probe.audio();const $=id=>elements.get(id),state=()=>context.probe.state(),pointer=(id,x=0,y=0,t=0)=>({pointerId:id,button:0,clientX:x,clientY:y,timeStamp:t,preventDefault(){}});
const tests=[];function test(name,fn){fn();tests.push(name);console.log('PASS',name);}
test('Controller initialises 12 tiles per page, eleven selectable sounds and rhythm buttons',()=>{assert.equal($('chords').children.length,12);assert.equal($('seq-chords').children.length,12);assert.equal($('preset-strip').children.length,11);assert.equal($('rhythms').children.length,6);assert.equal($('start-overlay').hidden,true);});
test('Chord pointer selection sends actual notes; latch retains release',()=>{const b=$('chords').children[2];b.onpointerdown(pointer(1));b.onpointerup(pointer(1));assert.equal(state().selected,2);assert.equal(context.probe.held(),true);assert.equal(messages.at(-1).type,'chord');assert.equal(messages.at(-1).chord.root,9);});
test('Fast strum crossing fills every skipped lane in both directions',()=>{const before=messages.filter(m=>m.type==='lane').length;$('strum').onpointerdown(pointer(2,1,0,0));$('strum').onpointermove(pointer(2,359,0,50));$('strum').onpointermove(pointer(2,1,0,100));$('strum').onpointerup(pointer(2));const lanes=messages.filter(m=>m.type==='lane').slice(before).map(m=>m.lane);assert.deepEqual(lanes,[0,1,2,3,4,5,6,7,8,7,6,5,4,3,2,1,0]);});
test('Non-latch simultaneous chord and strum pointers; chord release stops hold',()=>{$('latch').onclick();assert.equal(context.probe.held(),false);const b=$('chords').children[0];b.onpointerdown(pointer(3));$('strum').onpointerdown(pointer(4,100));assert.equal(messages.at(-1).type,'lane');b.onpointerup(pointer(3));assert.equal(context.probe.held(),false);assert.equal(messages.at(-1).type,'release');$('strum').onpointercancel(pointer(4));});
test('Preset changes preserve palette, rhythm and progression',()=>{const before=JSON.stringify([state().paletteId,state().rhythm,state().progression]);$('preset-strip').children[3].onclick();assert.equal(state().preset,'haunted');assert.equal(JSON.stringify([state().paletteId,state().rhythm,state().progression]),before);});
test('Palette and key changes preserve independent progression',()=>{const before=JSON.stringify(state().progression);$('palette').onchange({target:{value:'blue'}});$('key').onchange({target:{value:'3'}});assert.equal(state().paletteId,'blue');assert.equal(state().key,3);assert.equal(JSON.stringify(state().progression),before);});
test('Tap chord then tile assigns transposed snapshot, duplicate and delete work',()=>{const ch=$('seq-chords').children[0];ch.onpointerdown(pointer(5));ch.onpointerup(pointer(5));const b=$('progression').children[1];b.onpointerdown(pointer(6));b.onpointerup(pointer(6));assert.equal(state().progression[1].root,3);assert.equal(state().progression[1].quality,'maj7');$('duplicate').onclick();assert.equal(state().progression.length,5);assert.equal(state().progression[2].root,3);$('delete-step').onclick();assert.equal(state().progression.length,4);});
test('Drag chord assignment reaches target tile',()=>{const ch=$('seq-chords').children[2];ch.onpointerdown(pointer(7,10));hit=$('progression').children[0];ch.onpointermove(pointer(7,80,100));ch.onpointerup(pointer(7,80,100));assert.equal(state().progression[0].root,10);assert.equal(state().progression[0].quality,'9');hit=null;});
test('Long-press tile reordering retains all chord snapshots',()=>{const before=JSON.stringify(state().progression[0]);const b=$('progression').children[0];b.onpointerdown(pointer(8));[...timers.values()].at(-1)();hit=$('progression').children[2];b.onpointermove(pointer(8,100));b.onpointerup(pointer(8,100));assert.equal(JSON.stringify(state().progression[2]),before);hit=null;});
test('Chord editor creates separate custom palette and leaves factory unchanged',()=>{$('edit-palette').onclick();const b=$('chords').children[1];b.onpointerdown(pointer(9));b.onpointerup(pointer(9));assert.equal($('editor').open,true);$('edit-name').value='Test palette';$('edit-root').value='6';$('edit-quality').value='m9';$('edit-inversion').value='1';$('editor-form').onsubmit({preventDefault(){}});$('edit-palette').onclick();assert.equal(state().custom.length,1);assert.equal(state().custom[0].chords[1].quality,'m9');assert.equal(music.PALETTES.find(p=>p.id==='blue').chords[1].quality,'m7');});
test('Page navigation, sequence and rhythm commands, and panic stop',()=>{$('page-seq').onclick();assert.equal($('main-page').hidden,true);$('seq-play').onclick();assert.equal(messages.at(-1).type,'sequence');$('rhythm-toggle').onclick();assert.equal(messages.at(-1).type,'drums');$('panic').onclick();assert.equal(messages.at(-1).type,'stop');assert.equal($('seq-play').textContent,'PLAY');});
test('Imported numeric values are bounded and discrete controls are integral',()=>{const input=music.defaultState();input.key=2.7;input.arp.speed=2.9;input.arp.octaves=99;input.fx.crush=99;const d=context.probe.validate(input);assert.equal(d.key,3);assert.equal(d.arp.speed,3);assert.equal(d.arp.octaves,3);assert.equal(d.fx.crush,1);});
test('String selector renders 6/9/12 lanes; HOLD emits independent pointer release messages',()=>{
 $('latch').onclick();const b=$('chords').children[0];b.onpointerdown(pointer(20));b.onpointerup(pointer(20));
 for(const count of [6,12,9]){$('string-count').onchange({target:{value:String(count)}});assert.equal(state().strings,count);assert.equal($('lanes').children.length,count);}
 $('strum-mode').onclick();assert.equal(state().strumMode,'hold');$('strum').onpointerdown(pointer(21,40,50));$('strum').onpointerdown(pointer(22,200,50));assert.equal(context.probe.strums(),2);$('strum').onpointermove(pointer(22,350,50,50));assert.equal([...$('lanes').children].filter(e=>e.classList.contains('lit')).length,2);$('strum').onpointerup(pointer(21));assert.equal(context.probe.strums(),1);assert.equal(messages.at(-1).pointer,21);assert.equal(messages.at(-1).type,'strum-release');$('strum').onlostpointercapture(pointer(22));assert.equal(context.probe.strums(),0);
});
test('Leaving plate, cancelling, switching page and losing focus cannot retain a strum pointer',()=>{
 $('strum').onpointerdown(pointer(23,100,40));$('strum').onpointermove(pointer(23,100,100));assert.equal(context.probe.strums(),0);
 $('strum').onpointerdown(pointer(24,100,40));$('strum').onpointercancel(pointer(24));assert.equal(context.probe.strums(),0);
 $('strum').onpointerdown(pointer(25,100,40));$('page-main').onclick();assert.equal(context.probe.strums(),0);
 $('strum').onpointerdown(pointer(26,100,40));windowEvents.blur();assert.equal(context.probe.strums(),0);assert.equal(messages.at(-1).type,'stop');
});
test('Progression PLAY reflects automatic drums, STOP stops both, mode switch never resets transport',()=>{
 $('seq-play').onclick();assert.equal($('rhythm-toggle').querySelector('span').textContent,'STOP DRUMS');const before=messages.filter(x=>x.type==='sequence').length;const mode=state().arp.mode;$('mode-both').onclick();assert.notEqual(state().arp.mode,mode);assert.equal(messages.filter(x=>x.type==='sequence').length,before);assert.equal($('mode-both').getAttribute('aria-pressed'),true);$('seq-stop').onclick();assert.equal($('rhythm-toggle').querySelector('span').textContent,'START DRUMS');
});
test('Six snare choices are independent; V0.1 imports preserve original settings with safe new defaults',()=>{
 const before=JSON.stringify([state().preset,state().paletteId,state().progression,state().rhythm]);for(const snare of music.SNARES){$('snare-select').onchange({target:{value:snare.id}});assert.equal(state().snare,snare.id);}assert.equal(JSON.stringify([state().preset,state().paletteId,state().progression,state().rhythm]),before);
 const raw=JSON.parse(JSON.stringify(state()));delete raw.strings;delete raw.strumMode;delete raw.snare;const migrated=context.probe.validate(raw);assert.equal(migrated.strings,9);assert.equal(migrated.strumMode,'pluck');assert.equal(migrated.snare,'dry');assert.equal(JSON.stringify(migrated.progression),JSON.stringify(raw.progression));assert.equal(migrated.preset,raw.preset);assert.equal(JSON.stringify(migrated.fx),JSON.stringify(raw.fx));
 const saved=context.probe.validate(JSON.parse(JSON.stringify(state())));assert.equal(saved.strumMode,state().strumMode);assert.equal(saved.strings,state().strings);assert.equal(saved.snare,state().snare);
});
test('Three pages and performance controls preserve original five effects',()=>{
 $('page-drums').onclick();assert.equal(state().page,2);assert.equal($('drum-page').hidden,false);assert.equal($('seq-page').hidden,true);
 assert.equal($('effects').hidden,false);assert.equal($('performance-controls').hidden,false);assert.equal($('effects').children.length,12);
 $('presence').value=-.5;$('presence').oninput();$('glitch').value=.7;$('glitch').oninput();$('glitch-target').onchange({target:{value:'drums'}});
 $('preset-strip').children[4].onclick();assert.equal(state().presence,-.5);assert.equal(state().glitch,.7);assert.equal(state().glitchTarget,'drums');
});
test('Momentary glitch HOLD releases on every cancellation path and blur',()=>{
 for(const event of ['onpointerup','onpointercancel','onlostpointercapture']){$('glitch-hold').onpointerdown(pointer(30));assert.equal(messages.at(-1).on,true);$('glitch-hold')[event](pointer(30));assert.equal(messages.at(-1).on,false);}
 $('glitch-hold').onpointerdown(pointer(31));windowEvents.blur();assert.equal($('glitch-hold').getAttribute('aria-pressed'),false);assert.equal(messages.at(-1).type,'stop');
});
const cell=(track,step)=>$('drum-grid').children.find(e=>e.dataset.drumTrack===track&&e.dataset.drumStep===step);
test('Drum editor paints skipped cells, erases by initial cell, and retains factory data',()=>{
 $('drum-pattern').onchange({target:{value:'0'}});const factory=JSON.stringify(drums.factoryGrid(0));
 let start=cell(2,0);$('drum-grid').onpointerdown({...pointer(40),target:start});hit=cell(2,7);$('drum-grid').onpointermove(pointer(40,200,100));$('drum-grid').onpointerup(pointer(40));hit=null;
 assert.equal(state().drumCustom,true);assert.ok(state().drumEdits[0][6].slice(0,8).every(v=>v>0));assert.equal(JSON.stringify(drums.factoryGrid(0)),factory);
 start=cell(2,2);$('drum-grid').onpointerdown({...pointer(41),target:start});hit=cell(2,5);$('drum-grid').onpointermove(pointer(41,200,100));$('drum-grid').onpointercancel(pointer(41));hit=null;
 assert.ok(state().drumEdits[0][6].slice(2,6).every(v=>v===0));assert.ok(state().drumEdits[0][6][1]>0);
 const edit=JSON.stringify(state().drumEdits[0]);$('drum-factory').onclick();assert.equal(state().drumCustom,false);$('drum-edit').onclick();assert.equal(JSON.stringify(state().drumEdits[0]),edit);
 $('drum-bank-b').onclick();assert.ok(cell(0,15));cell(0,15).onclick({detail:0});assert.ok(state().drumEdits[0][0][15]>0);
});
test('Six factory patterns load exact original hits; edits, swing and performance settings roundtrip',()=>{
 for(let p=0;p<6;p++){$('drum-pattern').onchange({target:{value:String(p)}});assert.equal(state().rhythm,p);assert.equal(state().drumCustom,false);}
 $('swing').value=.8;$('swing').oninput();const restored=context.probe.validate(JSON.parse(JSON.stringify(state())));assert.equal(restored.swing,.8);assert.equal(restored.tone,state().tone);assert.equal(JSON.stringify(restored.drumEdits),JSON.stringify(state().drumEdits));
 const old=music.defaultState();for(const key of ['tone','glitch','balance','swing','drumEdits','drumCustom'])delete old[key];const migrated=context.probe.validate(old);assert.equal(migrated.glitch,0);assert.equal(migrated.tone,0);assert.equal(migrated.balance,.5);assert.equal(migrated.drumCustom,false);
});
test('Combined mode and balance survive save; imported malformed drum grids are rejected',()=>{
 $('mode-both').onclick();$('mode-both').onclick();$('mode-both').onclick();state().arp.mode='both';$('balance').value=.23;$('balance').oninput();const restored=context.probe.validate(JSON.parse(JSON.stringify(state())));assert.equal(restored.arp.mode,'both');assert.equal(restored.balance,.23);
 const bad=music.defaultState();bad.drumCustom=true;bad.drumEdits={0:[[Infinity]]};assert.equal(context.probe.validate(bad).drumCustom,false);
});

context.probe.showPage(0);
const gesture=(x,y,id=1)=>({identifier:id,clientX:x,clientY:y});
const instrument=$('instrument'),target=$('about');
for(const [start,end,expected] of [[300,20,1],[300,20,2],[20,300,1],[20,300,0]]){
 instrument.listeners.touchstart({touches:[gesture(start,25)],target});
 instrument.listeners.touchend({changedTouches:[gesture(end,30)],preventDefault(){}});
 assert.equal(state().page,expected);
}
test('V0.3.1 touch swipes traverse all three pages in both directions',()=>assert.equal(state().page,0));
for(const id of ['strum','drum-grid','progression'])$(id).className=id;
for(const excluded of ['strum','drum-grid','progression','presence']){
 instrument.listeners.touchstart({touches:[gesture(300,25)],target:$(excluded)});
 instrument.listeners.touchend({changedTouches:[gesture(20,30)],preventDefault(){}});
 assert.equal(state().page,0);
}
test('Playing surfaces, drum drawing, progression and sliders do not trigger page swipes',()=>assert.equal(state().page,0));
instrument.listeners.touchstart({touches:[gesture(300,25),gesture(290,25,2)],target});
instrument.listeners.touchend({changedTouches:[gesture(20,25)],preventDefault(){}});
test('Multitouch playing does not start navigation',()=>assert.equal(state().page,0));
instrument.listeners.touchstart({touches:[gesture(300,25)],target});instrument.listeners.touchcancel();
instrument.listeners.touchend({changedTouches:[gesture(20,25)],preventDefault(){}});
test('Cancelled swipe cannot change pages',()=>assert.equal(state().page,0));
const audioCtx=context.probe.context();audioCtx.state='suspended';doc.touchstart();await Promise.resolve();
test('Next touch resumes suspended AudioContext',()=>assert.equal(audioCtx.state,'running'));
audioCtx.state='suspended';doc.pointerdown();await Promise.resolve();
test('Mouse or pen resumes suspended AudioContext',()=>assert.equal(audioCtx.state,'running'));
const moduleURLs=[];await context.probe.loadWorklet({audioWorklet:{addModule:async u=>moduleURLs.push(u)}});
test('AudioWorklet loads the same-origin relative worklet path',()=>assert.deepEqual(moduleURLs,['./worklet.js?v=0.4.4']));
const fallbackURLs=[];await context.probe.loadWorklet({audioWorklet:{addModule:async u=>{fallbackURLs.push(u);if(u==='./worklet.js?v=0.4.4')throw Error('test failure');}}});
test('External module failure invokes identical embedded fallback',()=>{assert.equal(fallbackURLs.length,2);assert.ok(fallbackURLs[1].startsWith('blob:'));});
await assert.rejects(context.probe.loadWorklet({audioWorklet:{addModule:async()=>{throw Error('both unavailable');}}}),/Audio engine could not load/);
test('Failure of both module routes reports an explicit error',()=>{});


test('Long PLAY holds and double taps never open the editor',()=>{
 context.probe.stop();const b=$('chords').children[0];b.onpointerdown(pointer(90));for(const f of [...timers.values()])f();assert.equal($('editor').open,false);assert.equal(b.ondblclick,undefined);b.onpointerup(pointer(90));
});
test('Explicit EDIT silences manual holds; DONE restores PLAY without altering palettes',()=>{
 const before=JSON.stringify(state().custom);$('edit-palette').onclick();assert.equal($('edit-palette').textContent,'DONE');assert.equal(context.probe.held(),false);const b=$('chords').children[0];b.onpointerdown(pointer(91));b.onpointerup(pointer(91));assert.equal($('editor').open,true);$('editor').close();$('edit-palette').onclick();assert.equal($('edit-palette').textContent,'EDIT');assert.equal(JSON.stringify(state().custom),before);
});
test('Main and sequencer transports share state; PLAY cannot send duplicate starts',()=>{
 context.probe.stop();$('main-play').onclick();const count=messages.filter(m=>m.type==='sequence').length;$('seq-play').onclick();assert.equal(messages.filter(m=>m.type==='sequence').length,count);$('seq-pause').onclick();assert.equal(context.probe.transport().seqPaused,true);assert.equal($('main-pause').getAttribute('aria-pressed'),true);assert.equal(messages.at(-1).type,'pause');$('main-play').onclick();assert.equal(messages.at(-1).type,'resume');assert.equal(context.probe.transport().seqPaused,false);$('main-stop').onclick();assert.equal(context.probe.transport().seqOn,false);assert.equal(context.probe.transport().drumsOn,false);
});
test('All three explicit mode buttons select one mode without restarting transport',()=>{
 $('main-play').onclick();const count=messages.filter(m=>m.type==='sequence').length;
 for(const mode of ['chord','arp','both']){$('mode-'+mode).onclick();assert.equal(state().arp.mode,mode);for(const other of ['chord','arp','both'])assert.equal($('mode-'+other).getAttribute('aria-pressed'),other===mode);}
 assert.equal(messages.filter(m=>m.type==='sequence').length,count);context.probe.stop();
});
test('Scope OFF removes only its side tap and cancels animation; preference persists',()=>{
 assert.equal(context.probe.scope().scopeEnabled,true);const a=context.probe.scope().scopeAnalyser;assert.ok(a);assert.ok(connections.has(context.probe.context().destination));assert.ok(connections.has(a));const id=context.probe.scope().scopeFrameId;assert.ok(frames.has(id));$('scope-toggle').onclick();assert.equal(context.probe.scope().scopeAnalyser,null);assert.equal(context.probe.scope().scopeFrameId,null);assert.ok(!frames.has(id));assert.ok(!connections.has(a));assert.ok(connections.has(context.probe.context().destination));assert.equal(store.get('wilmachord.lie013.scope'),'off');$('scope-toggle').onclick();assert.ok(context.probe.scope().scopeAnalyser);
});
test('Vertical direction lock cannot turn into horizontal page switching',()=>{
 context.probe.showPage(0);const target=new Element('div');instrument.listeners.touchstart({touches:[gesture(300,200)],target});instrument.listeners.touchmove({touches:[gesture(290,240)],preventDefault(){throw Error('vertical scroll prevented');}});instrument.listeners.touchend({changedTouches:[gesture(30,245)],preventDefault(){}});assert.equal(state().page,0);
});
test('Manual banks never follow playback or replace cells, including during painting',()=>{
 context.probe.stop();$('drum-bank-a').onclick();$('drum-play').onclick();const swing=$('swing'),start=cell(1,0);$('drum-grid').onpointerdown({...pointer(92),target:start});
 for(const step of [7,8,15,0,9,0]){context.probe.update(step);assert.equal(context.probe.bank(),0);assert.ok($('drum-grid').children.includes(start));assert.equal($('swing'),swing);}
 $('drum-grid').onpointerup(pointer(92));$('drum-bank-b').onclick();context.probe.update(0);assert.equal(context.probe.bank(),1);context.probe.stop();assert.equal(context.probe.bank(),1);
});
test('All 16 mode exposes every step in seven independent rows and saves the selected view',()=>{
 $('drum-view-all').onclick();assert.equal($('drum-grid').children.filter(x=>x.dataset.drumStep!==undefined).length,112);assert.ok(cell(6,15));assert.equal($('drum-banks').hidden,true);
 const saved=context.probe.validate(JSON.parse(JSON.stringify(state())));assert.equal(saved.drumView,'all');assert.equal(saved.drumBank,1);$('drum-view-split').onclick();$('drum-bank-a').onclick();assert.equal($('drum-grid').children.filter(x=>x.dataset.drumStep!==undefined).length,56);
});
test('Name-only long press mutes independently, cancels on scroll and preserves steps and effects',()=>{
 const snapshot=JSON.stringify([state().drumEdits,state().drumFx]);const labels=$('drum-grid').children.filter(x=>x.dataset.muteLane!==undefined);assert.equal(labels.length,7);
 for(const label of labels){const lane=+label.dataset.muteLane;label.onpointerdown(pointer(100,5,5));label.onpointermove(pointer(100,5,25));assert.equal(state().drumMutes[lane],false);label.onpointerdown(pointer(101,5,5));[...timers.values()].at(-1)();label.onpointerup(pointer(101));assert.equal(state().drumMutes[lane],true);assert.match(label.textContent,/MUTE/);assert.equal(label.getAttribute('aria-pressed'),true);}
 assert.equal(JSON.stringify([state().drumEdits,state().drumFx]),snapshot);assert.ok(context.probe.validate(JSON.parse(JSON.stringify(state()))).drumMutes.every(Boolean));for(const label of labels)label.onclick({detail:0});assert.ok(state().drumMutes.every(x=>!x));
});
test('Legacy CRUSH LEVEL cannot mute imported sets; pulse and DRIVE still save independently',()=>{
 const old=context.probe.validate({schema:1,preset:'garage',fx:{crush:1},crushLevel:0,latch:true});assert.equal(old.drive,0);assert.equal(old.crushLevel,undefined);assert.equal(old.fx.crush,1);
 const set=(id,value)=>{$(id).value=value;$(id).oninput();};set('drive',.63);
 const before=JSON.stringify([state().paletteId,state().progression,state().rhythm,state().drumEdits]);$('preset-strip').children[1].onclick();assert.equal($('effects').children.length,14);set('pulse-speed',.5);set('pulse-depth',.81);
 const restored=context.probe.validate(JSON.parse(JSON.stringify(state())));assert.equal(restored.kosmische.pulseDepth,.81);assert.ok(Math.abs(restored.kosmische.pulseSpeed-.12*Math.sqrt(200))<1e-10);assert.equal(restored.drive,.63);assert.equal(restored.crushLevel,undefined);
 $('preset-strip').children.find(b=>b.textContent==='GARAGE').onclick();assert.equal($('effects').children.length,12);assert.equal(state().kosmische.pulseDepth,.81);assert.equal(JSON.stringify([state().paletteId,state().progression,state().rhythm,state().drumEdits]),before);assert.ok(!$('effects').children.some(x=>x.children.some(c=>c.id==='crush-level')));
});
test('ROCKSTEADY selection defaults to 50 ms, manual and deliberately saved attacks survive validation',()=>{
 $('preset-strip').children[4].onclick();assert.equal(state().fx.attack,.05);$('fx-attack').value=.137;$('fx-attack').oninput();assert.equal(state().fx.attack,.137);const saved=context.probe.validate(JSON.parse(JSON.stringify(state())));assert.equal(saved.fx.attack,.137);assert.equal(context.probe.validate({schema:1,preset:'rocksteady',fx:{attack:.004}}).fx.attack,.004);assert.equal(context.probe.validate({schema:1,preset:'rocksteady'}).fx.attack,.05);
 $('preset-strip').children[0].onclick();assert.equal(state().fx.attack,.008);$('preset-strip').children[4].onclick();assert.equal(state().fx.attack,.05);
});
test('Per-instrument EQ roundtrips, RESET is neutral and other presets keep their bands',()=>{
 $('preset-strip').children.find(b=>b.textContent==='TAPE STRINGS').onclick();$('eq-low').value=6;$('eq-low').oninput();$('eq-mid').value=-3;$('eq-mid').oninput();$('eq-high').value=4;$('eq-high').oninput();
 $('preset-strip').children[0].onclick();assert.equal(+$('eq-low').value,0);$('eq-low').value=-4;$('eq-low').oninput();$('preset-strip').children.find(b=>b.textContent==='TAPE STRINGS').onclick();assert.equal(+$('eq-low').value,6);assert.equal(+$('eq-mid').value,-3);
 const saved=context.probe.validate(JSON.parse(JSON.stringify(state())));assert.equal(saved.eqByPreset['tape-strings'].high,4);$('eq-reset').onclick();for(const k of ['low','mid','high'])assert.equal(+$('eq-'+k).value,0);assert.equal(state().eqByPreset.motorik.low,-4);
});
test('Old TONE imports preserve their color until Presence is deliberately adjusted',()=>{
 const migrated=context.probe.validate({schema:1,tone:-.8});assert.equal(migrated.legacyTone,-.8);assert.equal(migrated.presence,-.4);assert.equal(migrated.tone,-.8);
 const again=context.probe.validate(JSON.parse(JSON.stringify(migrated)));assert.equal(again.legacyTone,-.8);
 state().legacyTone=-.8;state().tone=-.8;$('presence').value=.4;$('presence').oninput();assert.equal(state().legacyTone,null);assert.equal(state().tone,0);assert.equal(state().presence,.4);
});
test('Performance diagnostics are optional and never rewire or stop the audio graph',()=>{
 const before=messages.filter(x=>['stop','sequence'].includes(x.type)).length;assert.equal($('monitor-toggle').textContent,'');$('monitor-toggle').onclick();assert.deepEqual(messages.at(-1),{type:'monitor',on:true});assert.equal($('performance-monitor').hidden,false);$('monitor-toggle').onclick();assert.deepEqual(messages.at(-1),{type:'monitor',on:false});assert.equal($('performance-monitor').hidden,true);assert.ok(connections.has(context.probe.context().destination));assert.equal(messages.filter(x=>['stop','sequence'].includes(x.type)).length,before);
});
test('Seven independent drum editors retain pitch and sends across voice/page changes and save',()=>{
 for(let i=0;i<7;i++){$('drum-voice-buttons').children[i].onclick();$('drum-pitch').value=i-3;$('drum-pitch').oninput();$('drum-spring').value=i/10;$('drum-spring').oninput();$('drum-delay').value=(6-i)/10;$('drum-delay').oninput();}
 $('page-main').onclick();$('page-drums').onclick();const d=context.probe.validate(JSON.parse(JSON.stringify(state())));for(let i=0;i<7;i++){assert.equal(d.drumFx[i].pitch,i-3);assert.equal(d.drumFx[i].spring,i/10);assert.equal(d.drumFx[i].delay,(6-i)/10);}
 const old=music.defaultState();delete old.drumFx;assert.ok(context.probe.validate(old).drumFx.every(p=>p.pitch===0&&p.spring===0&&p.delay===0));
});
test('LOCK persists a note snapshot, FOLLOW clears it, and separate strum sound preserves the chord sound',()=>{
 context.probe.stop();$('strum-lock').onclick();assert.equal(state().strumLock,true);assert.equal(state().lockedNotes.length,12);const notes=JSON.stringify(state().lockedNotes);const main=state().preset;
 const sound=$('strum-sound-buttons').children.find(b=>b.textContent==='TAPE STRINGS');sound.onclick();assert.equal(state().preset,main);assert.equal(state().strumPreset,'tape-strings');assert.equal(JSON.stringify(state().lockedNotes),notes);
 const restored=context.probe.validate(JSON.parse(JSON.stringify(state())));assert.equal(restored.strumLock,true);assert.equal(JSON.stringify(restored.lockedNotes),notes);assert.equal(restored.strumPreset,'tape-strings');
 $('strum-follow').onclick();assert.equal(state().strumLock,false);$('strum-sound-buttons').children[0].onclick();assert.equal(state().strumPreset,'same');
});
test('Independent progression gates and shared BPM controls survive safe legacy migration',()=>{
 $('chord-length').value=1.15;$('chord-length').oninput();$('arp-length').value=.31;$('arp-length').oninput();$('arp-speed').value=4;$('arp-speed').oninput();$('seq-bpm').value=143;$('seq-bpm').oninput();assert.equal(state().chordLength,1.15);assert.equal(state().arp.length,.31);assert.equal(state().arp.speed,4);assert.equal(state().tempo,143);assert.equal($('seq-tempo').textContent,'143 BPM');
 $('clock').onclick();$('tempo-range').value=137;$('tempo-range').oninput();assert.equal(+$('seq-bpm').value,137);const legacy=music.defaultState();delete legacy.chordLength;legacy.arp.length=.42;legacy.preset='cassette';const d=context.probe.validate(legacy);assert.equal(d.chordLength,.42);assert.equal(d.preset,'cassette');assert.ok(!$('preset-strip').children.some(b=>b.textContent==='CASSETTE'));assert.ok(!$('strum-sound-buttons').children.some(b=>b.textContent==='CASSETTE'));
 const saved=context.probe.validate(JSON.parse(JSON.stringify(state())));assert.equal(saved.chordLength,1.15);assert.equal(saved.arp.length,.31);
});
test('Global drum FX and fragment length persist without overwriting individual settings',()=>{
 const saved=JSON.stringify(state().drumFx);$('drum-fx-global').onclick();assert.equal($('drum-voice-buttons').hidden,true);for(const[id,v]of[['drum-pitch',8],['drum-spring',.8],['drum-delay',.7],['spring-tone',-.8],['fragment-length',1]]){$(id).value=v;$(id).oninput();}
 assert.equal(state().globalDrumFx.tone,-.8);assert.equal(JSON.stringify(state().drumFx),saved);$('drum-fx-individual').onclick();assert.equal($('drum-voice-buttons').hidden,false);$('spring-tone').value=.4;$('spring-tone').oninput();const restored=context.probe.validate(JSON.parse(JSON.stringify(state())));assert.equal(restored.globalDrumFx.pitch,8);assert.equal(restored.drumSpringTone,.4);assert.equal(restored.fragmentLength,1);assert.equal(restored.globalDrumFx.tone,-.8);assert.equal(restored.drumFxMode,'individual');const legacy=context.probe.validate({schema:1});assert.equal(legacy.fragmentLength,.25);assert.equal(legacy.drumFxMode,'individual');
});
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/'+(bundled?'bundled-controller-results.json':'controller-results.json'),JSON.stringify({testType:'Controller event simulation; not real browser or touch hardware',bundled,tests,pass:true},null,2));
