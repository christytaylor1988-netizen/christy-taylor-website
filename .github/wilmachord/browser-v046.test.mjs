// V0.4.6 persistence and interaction tests in real desktop browser engines.
// Mobile viewport emulation is not a physical-iPhone listening test.
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {dist,html,out,writeResults} from './fixtures.mjs';
const probe=`\nglobalThis.wilmaTest={state:()=>s,status:()=>lastStatus,showPage,beatSnapshot,performanceSnapshot,resetHistory,histories,edit:(o)=>{Object.assign(s,o);config();renderAll();},stop};\n`;
const served=html.replace('</script>',probe+'</script>');
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.split('/').pop()||'index.html';if(!['index.html','worklet.js','version.json','SOUND-CREDITS.txt'].includes(name)){res.writeHead(404).end();return;}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':'application/json');res.end(name==='index.html'?served:fs.readFileSync(path.join(dist,name)));});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/lie013-preview-7x9/`,results=[];
for(const [name,type] of [['chromium',chromium],['webkit',webkit]]){
 const browser=await type.launch({headless:true}),context=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true}),page=await context.newPage(),errors=[],tests=[];
 page.on('pageerror',e=>errors.push(String(e)));
 const test=async(label,fn)=>{await fn();tests.push(label);console.log('PASS',name,label);};
 const show=n=>page.evaluate(n=>wilmaTest.showPage(n),n);
 const edit=o=>page.evaluate(o=>wilmaTest.edit(o),o);
 const state=()=>page.evaluate(()=>wilmaTest.state());
 const snap=kind=>page.evaluate(kind=>kind==='beat'?wilmaTest.beatSnapshot():wilmaTest.performanceSnapshot(),kind);
 const start=async()=>{await page.locator('#start-audio').tap();await page.waitForFunction(()=>document.getElementById('start-overlay').hidden);};
 const close=()=>page.locator('#preset-manager [data-close]').tap();
 const open=async kind=>{await show(kind==='beat'?2:1);await page.locator(kind==='beat'?'#save-beat':'#my-performances').tap();};
 const save=async(kind,title)=>{await open(kind);await page.locator('#preset-name').fill(title);await page.locator('#preset-save-as').tap();await close();};
 const load=async(kind,title,useTempo=false)=>{await open(kind);await page.locator('#preset-list button').filter({hasText:title+' ·'}).tap();await page.locator('#preset-use-tempo').setChecked(useTempo);await page.locator('#preset-load').tap();};
 try{
  await page.goto(url);await start();
  await test('Effects tabs and progression groups remain reachable at both iPhone viewport heights',async()=>{
   for(const height of[812,640]){await page.setViewportSize({width:375,height});await show(0);for(const group of['dynamics','space','eq']){await page.locator('#fx-tab-'+group).tap();assert.equal(await page.locator('#fx-'+group).isVisible(),true);assert.equal(await page.locator('#fx-tab-'+group).getAttribute('aria-selected'),'true');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),375);}await page.locator('#fx-tab-space').tap();await page.locator('#effects').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`${name}-v046-effects-${height}.png`)});await show(1);await page.locator('#mode-chord').tap();assert.equal(await page.locator('#arpeggiator-controls').isVisible(),false);await page.locator('#mode-both').tap();assert.equal(await page.locator('#arpeggiator-controls').isVisible(),true);}
   await page.setViewportSize({width:375,height:812});
  });
  let beatA,performanceA;
  await test('Complete named beat saves, confirms replacement, and reloads every drum setting independently',async()=>{
   const grid=Array.from({length:7},(_,r)=>Array.from({length:16},(_,c)=>(c+r)%4===0?1:0));
   await edit({tempo:137,rhythm:2,drumCustom:true,drumEdits:{2:grid},swing:.21,snare:'dub',drumVolume:.71,drumMutes:[true,false,true,false,false,true,false],drumFxMode:'global',drumFx:Array.from({length:7},(_,i)=>({pitch:i-3,spring:i/10,delay:i/8})),drumSpringTone:-.42,drumDelay:{time:.12,feedback:.71,legacySync:false},globalDrumFx:{pitch:4,spring:.62,delay:.73,tone:.23,delayTime:.33,delayFeedback:.83,delayLegacySync:false}});
   beatA=await snap('beat');await save('beat','Dub A');assert.equal((await state()).myBeats.length,1);
   await open('beat');page.once('dialog',d=>d.dismiss());await page.locator('#preset-save').tap();assert.deepEqual((await state()).myBeats[0].data,beatA);await close();
   await edit({tempo:90,snare:'noise',drumVolume:.32,drumMutes:Array(7).fill(false)});await save('beat','Beat B');const perf=await snap('performance');await load('beat','Dub A');const after=await snap('beat');assert.deepEqual({...after,tempo:137},beatA);assert.equal(after.tempo,90);assert.deepEqual(await snap('performance'),perf);
   await load('beat','Dub A',true);assert.equal((await state()).tempo,137);
  });
  await test('Named performance restores palette, progression, sound, FX and locked notes without replacing drums',async()=>{
   const s=await state(),palette={id:'user-v046-test',name:'Voicings test',description:'Test grouping',chords:Array.from({length:12},(_,i)=>({root:i,quality:i%2?'m7':'maj7',inversion:i%3}))};
   await edit({custom:[...s.custom,palette],paletteId:palette.id,tempo:123,key:3,octave:1,selected:7,preset:'garage',fx:{...s.fx,attack:.043,release:2.3,reverb:.4,wooze:.2,crush:.12},drive:.2,strings:12,strumMode:'hold',strumLock:true,lockedNotes:Array.from({length:12},(_,i)=>48+i),strumPreset:'grand',glitch:.24,glitchTarget:'all',fragmentLength:1,balance:.62,chordLength:.77,arp:{...s.arp,mode:'both',speed:2,length:.23,order:3,octaves:2,glide:.14},progression:[{root:0,quality:'maj7',inversion:1},{root:5,quality:'m7',inversion:0}],latch:false});
   performanceA=await snap('performance');await save('performance','Night performance');const drums=await snap('beat');
   await edit({tempo:155,preset:'motorik',paletteId:'golden',key:0,strings:6,lockedNotes:Array.from({length:12},(_,i)=>60+i)});await load('performance','Night performance');const after=await snap('performance');assert.deepEqual({...after,tempo:123},performanceA);assert.equal(after.tempo,155);assert.deepEqual({...await snap('beat'),tempo:drums.tempo},drums);
   await page.waitForFunction(()=>wilmaTest.status().strumLock&&wilmaTest.status().lockedNotes?.[0]===48);
   await load('performance','Night performance',true);assert.equal((await state()).tempo,123);
  });
  await test('Both collections survive immediate reload; beats and performances can be mixed at the current shared tempo',async()=>{
   await page.reload();await start();const s=await state();assert.equal(s.myBeats.length,2);assert.equal(s.myPerformances.length,1);assert.deepEqual(s.myBeats[0].data,beatA);assert.deepEqual(s.myPerformances[0].data,performanceA);
   await load('beat','Beat B');const beat=await snap('beat');await load('performance','Night performance');assert.deepEqual(await snap('beat'),beat);const perf=await snap('performance');await load('beat','Dub A');assert.deepEqual(await snap('performance'),perf);
  });
  await test('Rename, Save As and confirmed deletion leave the active sound intact and persist',async()=>{
   await open('beat');await page.locator('#preset-name').fill('Dub renamed');await page.locator('#preset-rename').tap();assert.equal((await state()).myBeats[0].name,'Dub renamed');await page.locator('#preset-name').fill('Dub copy');await page.locator('#preset-save-as').tap();assert.equal((await state()).myBeats.length,3);const current=await snap('beat');page.once('dialog',d=>d.dismiss());await page.locator('#preset-delete').tap();assert.equal((await state()).myBeats.length,3);page.once('dialog',d=>d.accept());await page.locator('#preset-delete').tap();assert.equal((await state()).myBeats.length,2);assert.deepEqual(await snap('beat'),current);await close();await page.reload();await start();assert.equal((await state()).myBeats.length,2);assert.equal((await state()).myBeats[0].name,'Dub renamed');
  });
  await test('All 16 columns and seven muteable tracks fit; paint undo/redo keeps transport running',async()=>{
   await show(2);await page.locator('#drum-view-all').tap();assert.equal(await page.locator('.drum-cell').count(),112);assert.equal(await page.locator('.drum-label').count(),7);assert.ok(await page.locator('#drum-scroll').evaluate(e=>e.scrollWidth<=e.clientWidth+1));for(const height of[812,640]){await page.setViewportSize({width:375,height});await page.locator('#drum-page').evaluate(e=>e.scrollTop=0);const bounds=await page.locator('#drum-grid').boundingBox(),viewport=await page.locator('#drum-page').boundingBox();assert.ok(bounds.y>=viewport.y&&bounds.y+bounds.height<=viewport.y+viewport.height+1,JSON.stringify({height,bounds,viewport}));await page.screenshot({path:path.join(out,name+'-v046-all16-'+height+'.png')});}await page.setViewportSize({width:375,height:812});
   await page.evaluate(()=>wilmaTest.resetHistory());const before=await snap('beat');const cell=page.locator('.drum-cell').nth(8);await cell.tap();const after=await snap('beat');assert.notDeepEqual(after,before);await page.locator('#drum-play').tap();await page.waitForFunction(()=>wilmaTest.status().drums);await page.locator('#drum-undo').tap();assert.deepEqual(await snap('beat'),before);assert.equal((await page.evaluate(()=>wilmaTest.status())).drums,true);await page.locator('#drum-redo').tap();assert.deepEqual(await snap('beat'),after);
   const mute=(await state()).drumMutes[1],label=page.locator('.drum-label').nth(1);await label.dispatchEvent('pointerdown',{pointerId:91,clientX:20,clientY:200,pointerType:'touch'});await page.waitForTimeout(350);await label.dispatchEvent('pointerup',{pointerId:91,clientX:20,clientY:200});assert.equal((await state()).drumMutes[1],!mute);await label.dispatchEvent('pointerdown',{pointerId:92,clientX:20,clientY:200,pointerType:'touch'});await label.dispatchEvent('pointermove',{pointerId:92,clientX:20,clientY:230});await page.waitForTimeout(350);await label.dispatchEvent('pointerup',{pointerId:92});assert.equal((await state()).drumMutes[1],!mute);await page.evaluate(()=>wilmaTest.stop());
  });
  await test('Factory/My Beats switches preserve unsaved edits and the saved libraries',async()=>{
   const mine=await snap('beat');await page.locator('#drum-factory').tap();await page.locator('#beat-next').tap();await page.locator('.drum-cell').nth(11).tap();const factory=await snap('beat');await page.locator('#drum-edit').tap();const active=b=>({...b,drumEdits:{[b.rhythm]:b.drumEdits[b.rhythm]}});assert.deepEqual(active(await snap('beat')),active(mine));await page.locator('#drum-factory').tap();assert.deepEqual(active(await snap('beat')),active(factory));assert.equal((await state()).myBeats.length,2);
  });
  assert.deepEqual(errors,[]);writeResults(name+'-v046-browser',tests);results.push({browser:name,pass:true,tests:tests.length});
 }catch(e){await page.screenshot({path:path.join(out,name+'-v046-failure.png')}).catch(()=>{});throw e;}finally{await browser.close();}
}
server.close();writeResults('browser-v046-summary',results);
