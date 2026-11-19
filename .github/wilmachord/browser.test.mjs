// Automated desktop engines with mobile emulation. This cannot confirm physical speaker output.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {dist,html,out,writeResults} from './fixtures.mjs';
// Test-only accessors appended in memory. No test API is shipped in the instrument.
const probe=`\nglobalThis.wilmaTest={state:()=>s,status:()=>lastStatus,context:()=>ctx,showPage,stop,update:(step)=>{lastStatus={...lastStatus,gridStep:step};updateDrumPlayhead();},snapshot:()=>({held,seqOn,seqPaused,drumsOn,chordEdit,drumBank,strums:strums.size,scopeEnabled,scopeActive:!!scopeAnalyser,scopeFrame:scopeFrameId,playing:!!painting}),output:()=>{if(!scopeAnalyser)return null;const d=new Float32Array(256);scopeAnalyser.getFloatTimeDomainData(d);return Math.max(...d.map(Math.abs));},releasePaint:finishPaint};\n`;
const served=html.replace('</script>',probe+'</script>');
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');const name=url.pathname.split('/').pop()||'index.html';
 if(!['index.html','worklet.js','version.json','SOUND-CREDITS.txt'].includes(name)){res.writeHead(404).end();return;}
 try{res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.json')?'application/json':name.endsWith('.html')?'text/html':'text/plain');res.end(name==='index.html'?served:fs.readFileSync(path.join(dist,name)));}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/lie013-preview-7x9/`;
const all=[];
async function suite(type,name){
 const browser=await type.launch({headless:true});const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:3,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[],failed=[];page.on('pageerror',e=>errors.push(String(e)));page.on('requestfailed',r=>failed.push(r.url()));
 const tests=[];async function test(label,f){await f();tests.push(label);console.log('PASS',name,label);}
 const snap=()=>page.evaluate(()=>wilmaTest.snapshot());
 async function wait(pred){await page.waitForFunction(pred,null,{timeout:8000});}
 async function show(n){await page.evaluate(n=>wilmaTest.showPage(n),n);}
 async function pointer(selector,type,id=7,x=20,y=20){await page.locator(selector).dispatchEvent(type,{pointerId:id,pointerType:'touch',isPrimary:id===7,button:0,clientX:x,clientY:y,bubbles:true});}
 try{
 await page.goto(url);await page.locator('#start-audio').tap();await wait(()=>document.getElementById('start-overlay').hidden);
 await test('11 selectable instruments, 38 decoded samples, external worklet and running AudioContext',async()=>{
  assert.equal(await page.locator('#preset-strip button').count(),11);assert.equal(await page.locator('#chords button').count(),12);
  assert.equal(await page.evaluate(()=>wilmaTest.context().state),'running');assert.match(await page.locator('#status').textContent(),/0.4.4/);
  await page.locator('#main-play').tap();await wait(()=>wilmaTest.status().events?.drums>2);assert.equal(await page.evaluate(()=>wilmaTest.status().missingSamples),0);assert.ok(await page.evaluate(()=>wilmaTest.status().peak)>0);
 });
 await test('Progression transport is shared, repeated PLAY does not restart, PAUSE freezes and PLAY resumes',async()=>{
  await page.locator('#main-pause').tap();await wait(()=>wilmaTest.status().paused===true);const tick=await page.evaluate(()=>wilmaTest.status().tick);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>wilmaTest.status().tick),tick);
  await show(1);assert.equal(await page.locator('#seq-pause').getAttribute('aria-pressed'),'true');await page.locator('#seq-play').tap();await wait(()=>wilmaTest.status().tick>0&&!wilmaTest.status().paused);assert.ok(await page.evaluate(()=>wilmaTest.status().tick)>=tick);
  const before=await page.evaluate(()=>wilmaTest.status().tick);await page.locator('#seq-play').tap();await page.waitForTimeout(80);assert.ok(await page.evaluate(()=>wilmaTest.status().tick)>=before);
  await page.locator('#seq-stop').tap();await wait(()=>!wilmaTest.status().sequence);assert.equal(await page.evaluate(()=>wilmaTest.status().tick),0);
 });
 await test('Only the selected CHORD / ARP / combined button is highlighted; BALANCE persists',async()=>{
  for(const mode of ['chord','arp','both']){await page.locator('#mode-'+mode).tap();assert.equal(await page.locator('.mode-buttons .active').count(),1);assert.equal(await page.evaluate(()=>wilmaTest.state().arp.mode),mode);}
  await page.locator('#balance').evaluate(e=>e.value='0.23');await page.locator('#balance').dispatchEvent('input');assert.equal(await page.evaluate(()=>wilmaTest.state().balance),.23);
 });
 await test('Both pages scroll without horizontal overflow; effect hit targets are at least 44 px',async()=>{
  for(const n of [0,1]){await show(n);const el=page.locator(n?'#seq-page':'#main-page');const box=await el.evaluate(e=>({height:e.clientHeight,content:e.scrollHeight,width:e.clientWidth,sw:e.scrollWidth}));assert.ok(box.content>box.height+100);assert.ok(box.sw<=box.width+1);await el.evaluate(e=>e.scrollTop=e.scrollHeight);assert.ok(await el.evaluate(e=>e.scrollTop)>0);await page.screenshot({path:path.join(out,name+'-page'+(n+1)+'-bottom.png')});await el.evaluate(e=>e.scrollTop=0);await page.screenshot({path:path.join(out,name+'-page'+(n+1)+'-top.png')});}
  await show(0);const sizes=await page.locator('#effects input').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().height));assert.equal(sizes.length,10);assert.ok(sizes.every(x=>x>=44));
  assert.equal(await page.locator('#main-page').evaluate(e=>getComputedStyle(e).touchAction),'auto');assert.equal(await page.locator('#preset-strip').evaluate(e=>getComputedStyle(e).touchAction),'pan-x');
 });
 await test('Long chord holds stay in PLAY; explicit EDIT opens existing editor and DONE restores playing',async()=>{
  await page.locator('#main-page').evaluate(e=>e.scrollTop=0);const chord=page.locator('#chords button').first();const box=await chord.boundingBox();await page.mouse.move(box.x+20,box.y+20);await page.mouse.down();await page.waitForTimeout(850);assert.equal(await page.locator('#editor').evaluate(e=>e.open),false);assert.equal((await snap()).held,true);await page.mouse.up();
  await page.locator('#edit-palette').tap();assert.equal((await snap()).chordEdit,true);await chord.tap();assert.equal(await page.locator('#editor').evaluate(e=>e.open),true);await page.locator('#editor [data-close]').tap();await page.locator('#edit-palette').tap();assert.equal((await snap()).chordEdit,false);
 });
 await test('Six, nine and twelve strings; PLUCK and independent HOLD releases remain functional',async()=>{
  for(const n of [6,9,12]){await page.locator('#string-count').selectOption(String(n));assert.equal(await page.locator('#lanes .lane').count(),n);}
  await page.locator('#strum-mode').tap();assert.equal(await page.evaluate(()=>wilmaTest.state().strumMode),'hold');
  await page.locator('#chords button').first().tap();const b=await page.locator('#strum').boundingBox();
  // Synthetic pointer messages exercise cancellation logic; physical multitouch still needs a phone.
  await page.evaluate(({x,y})=>{const e=document.getElementById('strum');const original=e.setPointerCapture;e.setPointerCapture=()=>{};for(const id of [71,72])e.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,button:0,clientX:x+id,clientY:y+65,bubbles:true}));e.setPointerCapture=original;},{x:b.x,y:b.y});
  assert.equal((await snap()).strums,2);await pointer('#strum','pointerup',71);assert.equal((await snap()).strums,1);await pointer('#strum','pointercancel',72);assert.equal((await snap()).strums,0);await page.locator('#strum-mode').tap();assert.equal(await page.evaluate(()=>wilmaTest.state().strumMode),'pluck');
 });
 await test('Rhythm settings are discoverable; all drum toggles share one transport',async()=>{
  await page.locator('#clock').tap();assert.equal(await page.locator('#settings').evaluate(e=>e.open),true);assert.equal(await page.locator('#snare-select option').count(),6);await page.locator('#settings [data-close]').tap();await page.locator('#rhythm-toggle').tap();assert.equal((await snap()).drumsOn,true);await show(1);assert.equal(await page.locator('#seq-drums').getAttribute('aria-pressed'),'true');await page.locator('#seq-drums').tap();assert.equal((await snap()).drumsOn,false);
 });
 await test('Drum bank follows live playback; manual and active-paint overrides do not replace cells',async()=>{
  await show(2);await page.locator('#drum-play').tap();await wait(()=>wilmaTest.snapshot().drumBank===1);await wait(()=>wilmaTest.snapshot().drumBank===0);await page.locator('#drum-play').tap();
  await page.locator('#drum-bank-b').tap();assert.equal((await snap()).drumBank,1);await page.locator('#drum-play').tap();
  await page.evaluate(()=>{const g=document.getElementById('drum-grid');const orig=g.setPointerCapture;g.setPointerCapture=()=>{};g.children[11].dispatchEvent(new PointerEvent('pointerdown',{pointerId:77,button:0,bubbles:true}));g.setPointerCapture=orig;globalThis.savedCell=g.children[11];globalThis.savedSwing=document.getElementById('swing');wilmaTest.update(10);});
  assert.equal((await snap()).drumBank,0);assert.equal(await page.evaluate(()=>savedCell.isConnected),true);assert.equal(await page.evaluate(()=>savedSwing===document.getElementById('swing')),true);await pointer('#drum-grid','pointerup',77);await page.evaluate(()=>{globalThis.savedSwing=document.getElementById('swing');wilmaTest.update(0);wilmaTest.update(9);});assert.equal(await page.evaluate(()=>savedSwing===document.getElementById('swing')),true);await page.evaluate(()=>wilmaTest.stop());await page.screenshot({path:path.join(out,name+'-drums.png')});
 });
 await test('Scope follows actual output, OFF removes analysis and animation without stopping audio',async()=>{
  await show(0);await page.locator('#main-play').tap();await wait(()=>wilmaTest.snapshot().scopeActive);await page.waitForTimeout(180);assert.ok(await page.evaluate(()=>wilmaTest.output())>0);
  await page.locator('#about').tap();await page.locator('#scope-toggle').tap();assert.equal((await snap()).scopeActive,false);assert.equal((await snap()).scopeFrame,null);const tick=await page.evaluate(()=>wilmaTest.status().tick);await page.waitForTimeout(160);assert.ok(await page.evaluate(()=>wilmaTest.status().tick)>tick);assert.ok(await page.evaluate(()=>wilmaTest.status().peak)>0);await page.locator('#info [data-close]').tap();
 });
 await test('Saved scope, sounds and musical settings survive reload; PLAY is the default editing mode',async()=>{
  const before=await page.evaluate(()=>JSON.stringify([wilmaTest.state().preset,wilmaTest.state().progression,wilmaTest.state().strings,wilmaTest.state().balance]));await page.waitForTimeout(400);await page.reload();await page.locator('#start-audio').tap();await wait(()=>document.getElementById('start-overlay').hidden);assert.equal((await snap()).scopeEnabled,false);assert.equal((await snap()).chordEdit,false);assert.equal(await page.evaluate(()=>JSON.stringify([wilmaTest.state().preset,wilmaTest.state().progression,wilmaTest.state().strings,wilmaTest.state().balance])),before);
 });
 await test('V0.4.4 controls have comfortable targets, show pulse only for Kosmische and preserve saved values',async()=>{
  await show(0);await page.locator('#fx-sound').tap();
  const set=async(id,value)=>{await page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);};
  await set('drive',.65);assert.equal(await page.locator('#crush-level').count(),0);
  await page.getByRole('button',{name:'KOSMISCHE instrument',exact:true}).tap();assert.equal(await page.locator('#pulse-speed').count(),1);await set('pulse-speed',.4);await set('pulse-depth',.8);
  const bounds=await page.locator('#effects input').evaluateAll(xs=>xs.map(e=>{const r=e.getBoundingClientRect();return {height:r.height,width:r.width};}));assert.equal(bounds.length,12);assert.ok(bounds.every(b=>b.height>=44&&b.width>100));
  await page.locator('#pulse-depth').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,name+'-v043-kosmische.png')});
  const before=await page.evaluate(()=>JSON.stringify([wilmaTest.state().drive,wilmaTest.state().kosmische]));await page.waitForTimeout(300);await page.reload();await page.locator('#start-audio').tap();await wait(()=>document.getElementById('start-overlay').hidden);assert.equal(await page.evaluate(()=>JSON.stringify([wilmaTest.state().drive,wilmaTest.state().kosmische])),before);
  await page.getByRole('button',{name:'GARAGE instrument',exact:true}).tap();assert.equal(await page.locator('#pulse-speed').count(),0);assert.equal(await page.locator('#drive').inputValue(),'0.65');
 });
 await test('EQ and Presence save per instrument, reset cleanly and keep drums sounding',async()=>{
  await show(0);await page.getByRole('button',{name:'TAPE STRINGS instrument',exact:true}).tap();await page.locator('#fx-sound').tap();
  const set=async(id,v)=>page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},v);
  await set('eq-low',6);await set('eq-mid',-4);await set('eq-high',3);await set('presence',.5);
  await page.getByRole('button',{name:'GRAND instrument',exact:true}).tap();assert.equal(await page.locator('#eq-low').inputValue(),'0');await page.getByRole('button',{name:'TAPE STRINGS instrument',exact:true}).tap();assert.equal(await page.locator('#eq-low').inputValue(),'6');
  await page.waitForTimeout(200);await page.reload();await page.locator('#start-audio').tap();await wait(()=>document.getElementById('start-overlay').hidden);assert.equal(await page.locator('#eq-mid').inputValue(),'-4');assert.equal(await page.locator('#presence').inputValue(),'0.5');await page.locator('#eq-reset').tap();assert.equal(await page.locator('#eq-low').inputValue(),'0');
  await page.locator('#presence').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,name+'-v043-eq.png')});
 });
 await test('Optional performance diagnostics report counters, preserve audio and turn fully off',async()=>{
  await show(0);await page.locator('#main-play').tap();await page.locator('#about').tap();await page.locator('#monitor-toggle').tap();await page.waitForTimeout(700);assert.match(await page.locator('#performance-monitor').textContent(),/Voices/);assert.ok(await page.evaluate(()=>wilmaTest.status().peak)>0);await page.locator('#monitor-toggle').tap();assert.equal(await page.locator('#performance-monitor').isVisible(),false);await page.locator('#info [data-close]').tap();await page.evaluate(()=>wilmaTest.stop());
 });
 await test('All eleven selectable presets produce finite live worklet output with DRIVE and the single extreme CRUSH control',async()=>{
  await show(0);await page.evaluate(()=>wilmaTest.stop());
  for(const preset of ['MOTORIK','KOSMISCHE','HYPNOSIS','HAUNTED','ROCKSTEADY','TAPE STRINGS','TAPE CHOIR','GRAND','SCHOOL PIANO','HONKY TONK','GARAGE']){
   await page.getByRole('button',{name:preset+' instrument',exact:true}).tap();await page.locator('#fx-crush').evaluate(e=>{e.value=.9;e.dispatchEvent(new Event('input',{bubbles:true}));});await page.locator('#chords button').first().tap();await page.waitForTimeout(250);const status=await page.evaluate(()=>wilmaTest.status());assert.equal(status.missingSamples,0,preset);assert.ok(status.peak>0&&status.peak<.881,preset);
  }
  await page.evaluate(()=>wilmaTest.stop());await page.locator('#drive').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,name+'-v043-effects.png')});
 });
 await test('Legacy saved CRUSH LEVEL zero migrates without muting maximum CRUSH',async()=>{
  await page.evaluate(()=>{const saved={...wilmaTest.state(),crushLevel:0,fx:{...wilmaTest.state().fx,crush:1}};localStorage.setItem('wilmachord.lie013.v1',JSON.stringify(saved));});await page.reload();await page.locator('#start-audio').tap();await wait(()=>document.getElementById('start-overlay').hidden);assert.equal(await page.locator('#crush-level').count(),0);assert.equal(await page.evaluate(()=>wilmaTest.state().crushLevel),undefined);assert.equal(await page.locator('#fx-crush').inputValue(),'1');await page.locator('#chords button').first().tap();await page.waitForTimeout(250);const status=await page.evaluate(()=>wilmaTest.status());assert.ok(status.peak>0&&status.peak<.881);await page.evaluate(()=>wilmaTest.stop());
 });
 await test('ROCKSTEADY defaults to 50 ms; saved custom attack survives reload and shared tempo stays live',async()=>{
  await show(0);await page.getByRole('button',{name:'ROCKSTEADY instrument',exact:true}).tap();assert.equal(await page.locator('#fx-attack').inputValue(),'0.05');await page.locator('#fx-attack').evaluate(e=>{e.value=.137;e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(200);await page.reload();await page.locator('#start-audio').tap();await wait(()=>document.getElementById('start-overlay').hidden);assert.equal(await page.locator('#fx-attack').inputValue(),'0.137');
  await page.locator('#main-play').tap();await page.locator('#clock').tap();const bpm=page.getByRole('slider',{name:'tempo',exact:true});for(const value of [50,220,80,190,110,220]){await bpm.evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);await page.waitForTimeout(50);}await page.locator('#settings [data-close]').tap();await page.waitForTimeout(250);const status=await page.evaluate(()=>wilmaTest.status());assert.ok(status.drums&&status.sequence&&status.events.notes>0);assert.equal(status.missingSamples,0);assert.ok(status.peak>0&&status.peak<.881);await page.locator('#main-pause').tap();await wait(()=>wilmaTest.status().paused);await page.locator('#main-play').tap();await wait(()=>!wilmaTest.status().paused);await page.locator('#main-stop').tap();
 });
 await test('V0.4.4 drum voice controls are independent, scrollable and comfortably sized',async()=>{
  await show(2);assert.equal(await page.locator('#drum-voice-buttons button').count(),7);
  for(const [voice,pitch,spring,delay] of [['KICK',-4,.15,.25],['SNARE',5,.7,.65],['TOM',7,.2,.35]]){
   await page.locator('#drum-voice-buttons button').getByText(voice,{exact:true}).tap();
   for(const [id,value] of [['drum-pitch',pitch],['drum-spring',spring],['drum-delay',delay]]){await page.locator('#'+id).evaluate((e,v)=>e.value=v,String(value));await page.locator('#'+id).dispatchEvent('input');}
  }
  await page.locator('#drum-voice-buttons button').getByText('SNARE',{exact:true}).tap();assert.equal(await page.locator('#drum-pitch').inputValue(),'5');
  const sizes=await page.locator('#drum-fx-controls input').evaluateAll(xs=>xs.map(x=>x.getBoundingClientRect().height));assert.ok(sizes.every(x=>x>=44));
  await page.screenshot({path:path.join(out,name+'-v044-drums.png')});await show(0);await show(2);assert.equal(await page.locator('#drum-spring').inputValue(),'0.7');
 });
 await test('Melody LOCK remains fixed over changing chords; FOLLOW restores live notes',async()=>{
  await page.evaluate(()=>wilmaTest.stop());await show(0);await page.locator('#main-page').evaluate(e=>e.scrollTop=0);await page.locator('#chords button').first().tap();
  await page.locator('#strum-lock').tap();await wait(()=>wilmaTest.status().strumLock===true);const notes=await page.evaluate(()=>wilmaTest.state().lockedNotes);
  await page.locator('#main-play').tap();await wait(()=>wilmaTest.status().bar===1);assert.deepEqual(await page.evaluate(()=>wilmaTest.status().lockedNotes),notes);
  await page.locator('#strum-follow').tap();await wait(()=>wilmaTest.status().strumLock===false);await page.locator('#main-stop').tap();
 });
 await test('Independent STRUM SOUND and SAME AS CHORDS preserve the main sound',async()=>{
  await show(0);await page.getByRole('button',{name:'GARAGE instrument',exact:true}).tap();await page.locator('.strum-sound-panel summary').tap();
  await page.locator('#strum-sound-buttons button').getByText('TAPE STRINGS',{exact:true}).tap();assert.equal(await page.evaluate(()=>wilmaTest.state().preset),'garage');assert.equal(await page.evaluate(()=>wilmaTest.state().strumPreset),'tape-strings');
  assert.equal(await page.locator('#strum-sound-buttons button').getByText('CASSETTE',{exact:true}).count(),0);await page.screenshot({path:path.join(out,name+'-v044-strum.png')});await page.locator('.strum-sound-panel summary').tap();
 });
 await test('CHORD LENGTH, ARP LENGTH, ARP SPEED and both tempo views are independent',async()=>{
  await show(1);for(const [id,value]of [['chord-length','1.15'],['arp-length','0.3'],['arp-speed','4'],['seq-bpm','146']]){await page.locator('#'+id).evaluate((e,v)=>e.value=v,value);await page.locator('#'+id).dispatchEvent('input');}
  assert.deepEqual(await page.evaluate(()=>{const s=wilmaTest.state();return[s.chordLength,s.arp.length,s.arp.speed,s.tempo];}),[1.15,.3,4,146]);assert.match(await page.locator('#seq-tempo').textContent(),/146/);assert.match(await page.locator('#tempo').textContent(),/146/);
  await page.locator('#seq-clock').tap();await page.locator('#tempo-range').evaluate((e,v)=>e.value=v,'123');await page.locator('#tempo-range').dispatchEvent('input');await page.locator('#settings [data-close]').tap();assert.equal(await page.locator('#seq-bpm').inputValue(),'123');
  await page.locator('#seq-page').evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({path:path.join(out,name+'-v044-progression.png')});
 });
 await test('Combined live worklet keeps producing audio with GLITCH, drum sends and independent strums',async()=>{
  await show(0);await page.getByRole('button',{name:'TAPE STRINGS instrument',exact:true}).tap();await page.locator('.strum-sound-panel summary').tap();await page.locator('#strum-sound-buttons button').getByText('GARAGE',{exact:true}).tap();await page.locator('.strum-sound-panel summary').tap();await page.locator('#fx-performance').tap();await page.locator('#glitch').evaluate((e,v)=>e.value=v,'0.85');await page.locator('#glitch').dispatchEvent('input');await page.locator('#glitch-target').selectOption('all');
  await show(1);await page.locator('#mode-both').tap();await page.locator('#seq-play').tap();await show(0);let peaks=0;
  for(let i=0;i<24;i++){
   await page.evaluate(i=>{const e=document.getElementById('strum'),r=e.getBoundingClientRect(),old=e.setPointerCapture;e.setPointerCapture=()=>{};e.dispatchEvent(new PointerEvent('pointerdown',{pointerId:991,button:0,clientX:r.left+(i%12+.5)*r.width/12,clientY:r.top+65,bubbles:true}));e.dispatchEvent(new PointerEvent('pointerup',{pointerId:991,bubbles:true}));e.setPointerCapture=old;},i);
   await page.waitForTimeout(250);const status=await page.evaluate(()=>wilmaTest.status());assert.equal(status.missingSamples,0);assert.ok(status.voices<=32&&status.tails<=8);if(status.peak>1e-5)peaks++;
  }
  assert.ok(peaks>=22);await page.evaluate(()=>wilmaTest.stop());await wait(()=>wilmaTest.status().voices===0);await page.locator('#glitch').evaluate((e,v)=>e.value=v,'0');await page.locator('#glitch').dispatchEvent('input');
 });
 await test('Legacy CASSETTE and shared lengths load safely without restoring a CASSETTE selector',async()=>{
  await page.evaluate(()=>{const s=wilmaTest.state();s.preset='cassette';s.arp.length=.42;delete s.chordLength;localStorage.setItem('wilmachord.lie013.v1',JSON.stringify(s));});await page.reload();await page.locator('#start-audio').tap();await wait(()=>document.getElementById('start-overlay').hidden);
  assert.equal(await page.locator('#preset-strip button').count(),11);assert.equal(await page.locator('#preset-strip button').getByText('CASSETTE',{exact:true}).count(),0);assert.equal(await page.evaluate(()=>wilmaTest.state().preset),'cassette');assert.equal(await page.evaluate(()=>wilmaTest.state().chordLength),.42);
  await show(0);await page.locator('#chords button').first().tap();await wait(()=>wilmaTest.status().peak>1e-5);assert.equal(await page.evaluate(()=>wilmaTest.status().missingSamples),0);await page.evaluate(()=>wilmaTest.stop());
 });
 await test('Short Safari viewport keeps footer and all scrolling controls reachable',async()=>{
  await page.setViewportSize({width:375,height:640});for(const n of [0,1,2]){await show(n);const rect=await page.locator('footer').boundingBox();assert.ok(rect.y+rect.height<=640);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),375);}await page.screenshot({path:path.join(out,name+'-short-viewport.png')});
 });
 if(name==='chromium')await test('Trusted touch vertical scroll and horizontal header swipe stay separate',async()=>{
  await page.setViewportSize({width:375,height:812});await show(0);const cdp=await context.newCDPSession(page);
  const drag=async(x,y,dx,dy)=>{await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});for(let i=1;i<=12;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12,id:1}]});await page.waitForTimeout(18);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);};
  await page.locator('#main-page').evaluate(e=>e.scrollTop=0);await drag(25,680,0,-220);assert.equal(await page.evaluate(()=>wilmaTest.state().page),0);assert.ok(await page.locator('#main-page').evaluate(e=>e.scrollTop)>0);
  await page.locator('#preset-strip').scrollIntoViewIfNeeded();await page.locator('#preset-strip').evaluate(e=>e.scrollLeft=0);const strip=await page.locator('#preset-strip').boundingBox();await drag(strip.x+strip.width-12,strip.y+strip.height/2,-180,0);assert.ok(await page.locator('#preset-strip').evaluate(e=>e.scrollLeft)>20,'Native horizontal preset scrolling');
  await drag(320,42,-250,1);assert.equal(await page.evaluate(()=>wilmaTest.state().page),1);await drag(320,42,-250,1);assert.equal(await page.evaluate(()=>wilmaTest.state().page),2);await drag(40,42,250,1);assert.equal(await page.evaluate(()=>wilmaTest.state().page),1);
 });
 await test('Reduced-motion preference starts the scope disabled unless explicitly enabled',async()=>{
  const c=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce'});const p=await c.newPage();await p.goto(url);await p.locator('#start-audio').click();await p.waitForFunction(()=>document.getElementById('start-overlay').hidden);assert.equal(await p.evaluate(()=>wilmaTest.snapshot().scopeEnabled),false);await p.locator('#about').click();await p.locator('#scope-toggle').click();assert.equal(await p.evaluate(()=>wilmaTest.snapshot().scopeActive),true);await c.close();
 });
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);writeResults(name+'-browser',tests,{viewport:'375 x 812 and 375 x 640 CSS pixels',physicalIPhoneTest:false});all.push({browser:name,tests:tests.length,pass:true});
 }catch(e){await page.screenshot({path:path.join(out,name+'-failure.png')}).catch(()=>{});fs.writeFileSync(path.join(out,name+'-failure.json'),JSON.stringify({error:String(e),stack:e.stack,errors,failed,passed:tests},null,2));throw e;}finally{await browser.close();}
}
try{await suite(chromium,'chromium');await suite(webkit,'webkit');writeResults('browser-summary',all);}finally{server.close();}
