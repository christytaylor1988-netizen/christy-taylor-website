import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
export const repo=path.resolve(import.meta.dirname,'../..');
export const dist=path.join(repo,'lie013-preview-7x9');
export const out=process.env.WILMA_TEST_OUTPUT||path.join(repo,'.github/wilmachord/output');
fs.mkdirSync(out,{recursive:true});
export const html=fs.readFileSync(path.join(dist,'index.html'),'utf8');
export const script=html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/)[1];
export const worklet=fs.readFileSync(path.join(dist,'worklet.js'),'utf8');
export const samples=script.slice(script.indexOf('const SAMPLE_ZONES='),script.indexOf('const EMBEDDED_WORKLET_SOURCE='));
export const baseline='10df54224eebb79e28063b1cd34fbe82b9449218';
export function oldFile(name){return execFileSync('git',['show',baseline+':lie013-preview-7x9/'+name],{cwd:repo,maxBuffer:32*1024*1024}).toString();}
export const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'wilmachord-test-'));
export async function fixture(code,name){
 const file=path.join(scratch,name+'.mjs');
 fs.writeFileSync(file,`globalThis.AudioWorkletProcessor=class{constructor(){this.messages=[];this.port={postMessage:m=>this.messages.push(m)};}};globalThis.registerProcessor=()=>{};globalThis.sampleRate=48000;\n`+code+'\nconst DriveClass=typeof WarmDrive==="undefined"?null:WarmDrive;\n'+samples+'\nexport {sampleAt,DriveClass,voiceTone,prepareVoice,Engine,WilmachordProcessor,PerformanceFX,factoryGrid,drumTimeline,paintDrumCell,decodeSamples,PRESETS,percussionStep,patternSteps,patternStepTime,defaultState,VERSION,PALETTES,SNARES,RHYTHMS};');
 return import(pathToFileURL(file).href);
}
export const current=await fixture(worklet,'current');
export function writeResults(name,tests,metrics={}){fs.writeFileSync(path.join(out,name+'.json'),JSON.stringify({pass:true,testType:'Automated software test; not physical iPhone listening',tests,metrics},null,2));}
