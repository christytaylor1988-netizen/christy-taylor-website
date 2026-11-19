// WILMACHORD musical schema 1. Pure data/logic shared by UI, renderer and tests.
const VERSION = '0.3.1';
const ROOTS = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const QUALITIES = {
  '': [0,4,7], m:[0,3,7], '7':[0,4,7,10], maj7:[0,4,7,11], m7:[0,3,7,10],
  '6':[0,4,7,9], m6:[0,3,7,9], '9':[0,4,7,10,14], maj9:[0,4,7,11,14], m9:[0,3,7,10,14],
  sus2:[0,2,7], sus4:[0,5,7], dim:[0,3,6], m7b5:[0,3,6,10], add9:[0,4,7,14], '5':[0,7]
};
const mod = (x,n=12) => (x%n+n)%n;
const clamp = (x,a,b) => Math.min(b,Math.max(a,x));
function chordName(c, key=0) {return ROOTS[mod(c.root+key)]+c.quality;}
function chordToneOrder(c,key=0,octave=0) {
  const notes=(QUALITIES[c.quality]||QUALITIES['']).map(n=>48+mod(c.root+key)+12*octave+n);
  for(let i=0;i<(c.inversion||0);i++) notes[i%notes.length]+=12;
  return notes.map(n=>clamp(n,24,108));
}
function chordNotes(c,key=0,octave=0){return chordToneOrder(c,key,octave).sort((a,b)=>a-b);}
// Extends the original nine lanes with six/twelve nonduplicated chord-tone voicings.
function laneNotes(c,key=0,octave=0,count=9) {
  const notes=chordNotes(c,key,octave), out=[];
  for(let i=0;i<count;i++){let n=notes[i%notes.length]+12*Math.floor(i/notes.length);while(out.includes(n))n+=12;out.push(n);}
  out.sort((a,b)=>a-b);while(out[out.length-1]>120)for(let i=0;i<out.length;i++)out[i]-=12;
  return out;
}
function voiceLead(notes, previous) {
  if(!previous?.length)return notes;
  return notes.map((note,i)=>{let n=note;const target=previous[i%previous.length];while(n-target>6)n-=12;while(n-target< -6)n+=12;return n;}).sort((a,b)=>a-b);
}
const c=(root,quality='',inversion=0)=>({root,quality,inversion});
const makePalette=(id,name,description,chords)=>({id,name,description,chords});
const PALETTES=[
 makePalette('golden','golden hour','Bright tonic chords, secondary dominants and a borrowed minor IV.',[c(0),c(7),c(9,'m'),c(5),c(2,'m'),c(4,'m'),c(7,'7'),c(9,'7'),c(2,'7'),c(5,'m'),c(10),c(0,'6')]),
 makePalette('dark','after dark','Soul colours: major sixths, minor sevenths and dominant turnarounds.',[c(0,'6'),c(9,'m7'),c(2,'m7'),c(7,'9'),c(5,'maj7'),c(4,'m7'),c(9,'7'),c(2,'7'),c(5,'m6'),c(10,'7'),c(0,'maj7'),c(4,'7')]),
 makePalette('overcast','overcast','Open suspended chords and minor colours around A minor.',[c(9,'m'),c(5,'maj7'),c(0,'add9'),c(7,'sus4'),c(2,'m7'),c(4,'m'),c(9,'m9'),c(5,'add9'),c(0),c(7),c(4,'7'),c(2,'sus2')]),
 makePalette('country','open country','Plain triads, suspended dominants and familiar folk turnarounds.',[c(0),c(5),c(7),c(9,'m'),c(2,'m'),c(4,'m'),c(7,'7'),c(2,'7'),c(9,'7'),c(0,'6'),c(7,'sus4'),c(10)]),
 makePalette('heat','heatwave','Dominant ninths, Dorian minor colours and tight funk voicings.',[c(0,'9'),c(5,'9'),c(7,'9'),c(9,'m7'),c(2,'m7'),c(4,'m7'),c(10,'7'),c(2,'9'),c(9,'7'),c(0,'m7'),c(5,'7'),c(7,'sus4')]),
 makePalette('blue','blue hour','ii–V–I, minor ii–V and chromatic dominant substitutions.',[c(0,'maj7'),c(2,'m7'),c(7,'9'),c(9,'m7'),c(5,'maj7'),c(4,'m7'),c(9,'7'),c(2,'m7b5'),c(7,'7'),c(0,'m6'),c(1,'7'),c(5,'m7')]),
 makePalette('concrete','concrete','Open fifths, modal shifts and stark minor triads.',[c(0,'m'),c(10),c(8),c(5,'m'),c(7,'5'),c(0,'5'),c(3),c(2,'5'),c(6,'5'),c(10,'sus2'),c(5,'sus2'),c(7,'m')]),
 makePalette('insomnia','insomnia','Extended minor and major colours for slow, unsettled loops.',[c(0,'m9'),c(5,'m9'),c(10,'9'),c(3,'maj9'),c(8,'maj7'),c(2,'m7b5'),c(7,'7'),c(0,'m7'),c(5,'7'),c(1,'maj7'),c(10,'m7'),c(3,'6')]),
 makePalette('sunday','sunday morning','Soft major sevenths, added ninths and warm descending changes.',[c(0,'maj7'),c(5,'maj7'),c(9,'m7'),c(7,'sus4'),c(4,'m7'),c(2,'m7'),c(7,'7'),c(0,'add9'),c(5,'6'),c(10,'maj7'),c(9,'7'),c(5,'m6')]),
 makePalette('static','static','Drones, suspended stacks and slow semitone movement.',[c(0,'5'),c(0,'sus2'),c(0,'sus4'),c(2,'5'),c(3,'5'),c(5,'5'),c(7,'5'),c(10,'5'),c(1,'5'),c(0,'m'),c(5,'sus2'),c(7,'sus4')])
];
// Independent voice architectures. Sample provenance and limits: docs/SOUND-DESIGN.md.
const voice=(id,name,method,desc,attack,release,reverb,wooze,crush,extra={})=>({id,name,method,desc,attack,release,reverb,wooze,crush,...extra});
const PRESETS=[
 voice('motorik','MOTORIK','tonewheel','Pulsing drawbar organ · tempo-locked tremolo',.008,.85,.18,.1,.04,{drawbars:[.66,.15,.06,.02],pulse:.22}),
 voice('kosmische','KOSMISCHE','subtractive','Band-limited saw / pulse · moving resonant filter and ring modulation',.09,1.5,.3,.38,.1),
 voice('hypnosis','HYPNOSIS','ensemble','Three ranks of drawbars · sub-octave drone and slow ensemble beating',.32,2.5,.4,.17,0),
 voice('haunted','HAUNTED','modal','Imperfect struck reeds · independently decaying inharmonic resonances',.005,1.5,.4,.23,.05),
 voice('rocksteady','ROCKSTEADY','tonewheel','Percussive 1960s organ · hollow drawbars, key click and third percussion',.004,.32,.13,.045,.03,{drawbars:[.35,.37,.04,.18],pulse:0}),
 voice('cassette','CASSETTE','fm','Four-operator electric tine · decaying modulation, tremolo and tape wear',.006,1.3,.23,.2,.15),
 voice('tape-strings','TAPE STRINGS','sample','Recorded violin ensemble · bandwidth-limited tape treatment',.12,1.7,.3,.22,.045,{bank:'strings'}),
 voice('tape-choir','TAPE CHOIR','sample','Licensed multisampled synthetic choir · warm tape treatment',.16,1.9,.34,.24,.035,{bank:'choir'}),
 voice('grand','GRAND','sample','Recorded Kawai grand · seven pitch zones and two velocity layers',.002,1.1,.17,.015,0,{bank:'grand'}),
 voice('school-piano','SCHOOL PIANO','sample','Recorded Knight upright · six pitch zones and two velocity layers',.003,.9,.12,.055,.015,{bank:'upright'}),
 voice('honky-tonk','HONKY TONK','sample','Recorded upright · three independently detuned strings',.002,1.1,.13,.09,.035,{bank:'upright'}),
 voice('garage','GARAGE','transistor','Raw transistor organ · band-limited pulse dividers and asymmetric drive',.003,.5,.09,.03,.09)
];
const SNARES=[{id:'dry',name:'DRY ACOUSTIC'},{id:'vintage',name:'VINTAGE MACHINE'},{id:'sixties',name:'TIGHT 60s'},{id:'dub',name:'DUB / REGGAE'},{id:'lofi',name:'LO-FI'},{id:'noise',name:'ELECTRONIC NOISE'}];
const RHYTHMS=['STRAIGHT','WALTZ','SHUFFLE','BROKEN','MOTORIK','LO-FI'];
const patternSteps=p=>p===1?12:p===2?8:16;
const patternLength=p=>p===1?3:4;
const patternStepTime=(p,s)=>p===2?Math.floor(s/2)+(s%2?2/3:0):s*.25;
// Direct behavioural port of Somethingchord 0.2.0 RhythmEngine.h percussionStep.
function percussionStep(p,i){
 let kick=0,snare=0,hat=0,open=0,wood=0,tom=0;
 if(p===0){if(i===0||i===8)kick=.85;if(i===4||i===12)snare=.62;if(i%2===0)hat=i%4===0?.36:.25;if(i===14){open=.25;hat=0;}}
 else if(p===1){if(i===0)kick=.85;if(i===4||i===8){snare=.34;wood=.22;}if(i%2===0)hat=.23;if(i===10)tom=.28;}
 else if(p===2){if([0,4,7].includes(i))kick=i===7?.4:.78;if(i===2||i===6)snare=.58;hat=i%2?.21:.39;if(i===5)wood=.3;}
 else if(p===3){if([0,7,11].includes(i))kick=i===0?.8:.5;if(i===6||i===14)snare=.5;if([2,9,15].includes(i))hat=.24;if(i===3||i===10)wood=.48;if(i===12)tom=.42;}
 else if(p===4){if(i%4===0)kick=.72;if(i===4||i===12)snare=.39;if(i%2===0)hat=.34;if(i===15)wood=.16;}
 else {if(i%4===0)kick=i===0?.82:.67;if(i===4||i===12){snare=.48;wood=.22;}if(i%4===2)open=.2;if(i%4===0||i===7||i===15)hat=.26;if(i===14)tom=.18;}
 return [kick,snare,hat,open,wood,tom];
}
const DIVISIONS=[1,.5,1/3,.25,1/6,.125];
const DIVISION_NAMES=['1/4','1/8','1/8T','1/16','1/16T','1/32'];
const ORDERS=['UP','DOWN','UP / DOWN','RANDOM','AS PLAYED'];
function arpIndex(step,length,order,random=.5){
 if(order===1)return length-1-step%length;
 if(order===2){const p=Math.max(1,length*2-2),i=step%p;return i<length?i:p-i;}
 if(order===3)return Math.min(length-1,Math.floor(random*length));
 return step%length;
}
function defaultState(){return {schema:1,paletteId:'golden',custom:[],key:0,octave:0,latch:true,selected:0,preset:'motorik',fx:{attack:.012,release:.85,reverb:.18,wooze:.1,crush:.04},tone:0,glitch:0,glitchTarget:'all',balance:.5,swing:0,drumEdits:{},drumCustom:false,tempo:110,rhythm:0,drumVolume:.6,snare:'dry',strings:9,strumMode:'pluck',progression:[c(0),c(9,'m'),c(5),c(7)],arp:{speed:1,glide:0,order:0,octaves:1,length:.65,mode:'arp'},page:0};}

const DRUM_TRACKS=['KICK','SNARE','CLAP','CLOSED HAT','OPEN HAT','PERCUSSION'];
const DRUM_LANES=[[0],[1],[6],[2],[3],[4,5]];
function factoryGrid(pattern){
 const rows=Array.from({length:7},()=>Array(16).fill(0));
 for(let step=0;step<patternSteps(pattern);step++){
  const slot=pattern===2?step*2:step;
  percussionStep(pattern,step).forEach((v,lane)=>rows[lane][slot]=v);
 }
 return rows;
}
function validDrumGrid(rows){return Array.isArray(rows)&&rows.length===7&&rows.every(row=>Array.isArray(row)&&row.length===16&&row.every(v=>Number.isFinite(v)&&v>=0&&v<=1));}
function drumTimeline(pattern,custom,swing=0){
 const events=[];
 for(let slot=0;slot<16;slot++){
  if(!custom&&(pattern===1&&slot>=12||pattern===2&&slot%2))continue;
  const step=pattern===2?slot/2:slot;
  let tick=pattern===2&&slot%2===0?patternStepTime(pattern,step)*24:slot*6;
  if(slot%2)tick+=swing*3.8;
  events.push({slot,step:custom?slot:step,tick});
 }
 return {events,length:custom?96:patternLength(pattern)*24};
}
function paintDrumCell(rows,track,step,on,original){
 for(const lane of DRUM_LANES[track])rows[lane][step]=0;
 if(on){const lanes=DRUM_LANES[track];if(original&&lanes.some(l=>original[l][step]>0)){for(const l of lanes)rows[l][step]=original[l][step];}else rows[lanes[0]][step]=[.8,.6,.48,.3,.25,.4][track];}
}

// Bounded feed-forward effects. All musical decisions use the engine's audio clock.
class PerformanceFX {
 constructor(sr){
  this.sr=sr;this.amount=0;this.tone=0;this.balance=.5;this.hold=false;this.target='all';
  this.seed=0x4c494530;this.quantum=-1;this.lastTick=-1;this.write=0;
  this.size=Math.ceil(sr*.9);this.low=[0,0];this.toneK=1-Math.exp(-2*Math.PI*1200/sr);
  this.buses=Array.from({length:3},()=>({l:new Float32Array(this.size),r:new Float32Array(this.size),mix:0,action:0,anchor:0,length:1,read:0,lastL:0,lastR:0,fromL:0,fromR:0,transition:1}));
  this.out=new Float64Array(2);this.smooth=1-Math.exp(-1/(sr*.003));
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 reset(){this.hold=false;this.quantum=-1;this.lastTick=-1;for(const b of this.buses){b.mix=0;b.action=0;b.lastL=0;b.lastR=0;b.fromL=0;b.fromR=0;b.l.fill(0);b.r.fill(0);}}
 begin(tick,tempo,amount,target,hold){
  this.amount=amount;this.target=target;this.hold=hold;
  const q=Math.floor((tick+1e-8)/3),rewound=tick<this.lastTick;this.lastTick=tick;
  if(q===this.quantum&&!rewound)return;this.quantum=q;
  const strength=hold?Math.max(.85,amount):amount;
  for(let i=0;i<3;i++){
   const b=this.buses[i],enabled=target==='all'||target===['chord','arp','drums'][i];
   b.fromL=b.lastL;b.fromR=b.lastR;b.transition=0;
   b.action=enabled&&strength>0&&this.random()<strength*.9?1+Math.floor(this.random()*(strength>.65?3:2)):0;
   if(b.action>1){const ticks=[3,1.5,.75][Math.floor(this.random()*(strength>.5?3:2))];b.length=Math.max(32,Math.min(this.size/3,Math.round(this.sr*60/tempo*ticks/24)));b.anchor=(this.write-b.length+this.size)%this.size;b.read=0;}
  }
 }
 bus(i,l,r){
  const b=this.buses[i];b.l[this.write]=l;b.r[this.write]=r;
  const enabled=(this.amount>0||this.hold)&&(this.target==='all'||this.target===['chord','arp','drums'][i]);
  const target=enabled&&b.action?1:0;b.mix+=(target-b.mix)*this.smooth;
  if(!target&&b.mix<.00001)b.mix=0;
  let wl=0,wr=0;
  if(b.action>1){
   // Read only recorded dry input: there is no feedback path. A short loop-edge
   // crossfade removes discontinuities even at rapid / reversed subdivisions.
   const fade=Math.min(64,Math.floor(b.length/4)),pos=b.read%(b.length-fade)+fade,rev=b.action===3;
   const at=x=>(b.anchor+(rev?b.length-1-x:x)+this.size)%this.size;
   let p=at(pos);wl=b.l[p];wr=b.r[p];
   if(pos>=b.length-fade){const f=(pos-(b.length-fade))/fade,p2=at(pos-(b.length-fade));wl=wl*(1-f)+b.l[p2]*f;wr=wr*(1-f)+b.r[p2]*f;}
   b.read++;wl*=.9;wr*=.9;
  }
  b.transition=Math.min(1,b.transition+1/(this.sr*.004));wl=b.fromL+(wl-b.fromL)*b.transition;wr=b.fromR+(wr-b.fromR)*b.transition;b.lastL=wl;b.lastR=wr;
  this.out[0]=b.mix?l+(wl-l)*b.mix:l;this.out[1]=b.mix?r+(wr-r)*b.mix:r;
  return this.out;
 }
 end(){this.write=(this.write+1)%this.size;}
 colour(l,r,value){
  this.tone+=(value-this.tone)*this.smooth;if(Math.abs(this.tone-value)<1e-8)this.tone=value;
  this.low[0]+=this.toneK*(l-this.low[0]);this.low[1]+=this.toneK*(r-this.low[1]);
  const high=this.tone<0?1+.93*this.tone:1+.65*this.tone,comp=this.tone>0?1-.12*this.tone:1;
  this.out[0]=this.tone===0?l:(this.low[0]+(l-this.low[0])*high)*comp;
  this.out[1]=this.tone===0?r:(this.low[1]+(r-this.low[1])*high)*comp;return this.out;
 }
}

// One integer musical timeline, advanced only by rendered audio samples.
// 24 ticks/quarter represents every offered straight/triplet subdivision exactly.
class MusicalClock {
 constructor(sr){this.sr=sr;this.reset();}
 reset(){this.tick=0;this.phase=0;this.due=true;}
 advance(tempo){this.phase+=tempo*24/(60*this.sr);if(this.phase>=1-1e-12){this.phase=Math.max(0,this.phase-1);this.tick++;this.due=true;}}
 get beat(){return (this.tick+this.phase)/24;}
}

// WILMACHORD voice architectures. No browser nodes; same DSP in worklet/tests.
const VTAU=Math.PI*2, TABLE=new Float32Array(4097);
for(let i=0;i<=4096;i++)TABLE[i]=Math.sin(i/4096*VTAU);
function sine(p){p=(p-Math.floor(p))*4096;const i=p|0;return TABLE[i]+(TABLE[i+1]-TABLE[i])*(p-i);}
function blep(p,dt){if(p<dt){p/=dt;return p+p-p*p-1;}if(p>1-dt){p=(p-1)/dt;return p*p+p+p+1;}return 0;}
function saw(p,dt){return p*2-1-blep(p,dt);}
function pulse(p,dt,width=.5){return (p<width?1:-1)+blep(p,dt)-blep((p-width+1)%1,dt);}
const MODAL_RATIOS=[1,2.013,5.067,8.11],MODAL_WEIGHTS=[.6,.28,.16,.07],MODAL_DECAYS=[1.6,3.1,6.8,15];
const noteHz=n=>440*2**((n-69)/12);
function prepareVoice(v,engine){
 v.p=0;v.q=0;v.r=0;v.low=0;v.low2=0;v.band=0;v.dc=0;v.filter=0;v.samples=[];v.sampleEnded=false;v.modes=new Float64Array(4);const p=v.preset;const cutoff=p.method==='fm'?5200:p.bank==='strings'||p.bank==='choir'?4300:p.id==='school-piano'?7600:11000;v.filterK=1-Math.exp(-VTAU*Math.min(cutoff,engine.sr*.4)/engine.sr);
 if(v.preset.method==='sample'){
  const bank=engine.samples.filter(z=>z.bank===v.preset.bank);if(!bank.length){engine.missingSamples++;v.gate=0;return;}
  const root=bank.reduce((a,b)=>Math.abs(b.root-v.n)<Math.abs(a.root-v.n)?b:a).root;
  const layers=bank.filter(z=>z.root===root),mix=Math.min(1,Math.max(0,(v.velocity-.3)/.6));
  const detunes=v.preset.id==='honky-tonk'?[-9,0,12]:[0];
  for(const z of layers)for(const cents of detunes)v.samples.push({z,pos:0,ratio:z.rate/engine.sr/noteHz(root)*2**(cents/1200),weight:(z.layer==='soft'?1-mix:z.layer==='hard'?mix:1)/detunes.length});
 }
}
function sampleAt(s,step,loop){
 const z=s.z,a=z.data;let p=s.pos;
 if(p>=z.loopEnd){if(loop)p=z.loopStart+(p-z.loopStart)%(z.loopEnd-z.loopStart);else return 0;}
 const i=p|0,f=p-i,b=i+1<z.loopEnd?a[i+1]:(loop?a[z.loopStart]:a[i]);
 s.pos=p+step*s.ratio;return (a[i]+(b-a[i])*f)*s.weight*(loop?1:Math.min(1,(z.loopEnd-p)/128));
}
function voiceTone(v,e,f,age){
 const p=v.preset,dt=Math.min(.44,f/e.sr),t=e.frame/e.sr;let y=0;
 if(p.method==='sample'){
  const loop=!v.pluck;let ended=true;
  for(const s of v.samples){y+=sampleAt(s,f,loop);if(s.pos<s.z.loopEnd||loop)ended=false;}
  if(ended)v.gate=0;
  const tape=p.bank==='strings'||p.bank==='choir';
  const k=v.filterK;
  v.low+=k*(y-v.low);v.low2+=k*(v.low-v.low2);y=v.low2*(p.bank==='strings'?2.2:p.bank==='choir'?.85:p.id==='honky-tonk'?3.4:2.4);
  if(tape)y=Math.tanh(y*1.3)*.85;
 }else if(p.method==='tonewheel'){
  const h=p.drawbars;
  for(let i=0;i<4;i++)if(f*(i+1)<e.sr*.44)y+=h[i]*sine(v.p*(i+1));
  if(p.id==='motorik')y*=1-p.pulse*(.5-.5*sine(e.beat*2));
  else y+=(f*3<e.sr*.44?.32:0)*sine(v.p*3)*Math.exp(-age*18)+(e.random()*2-1)*Math.exp(-age*170)*.1;
 }else if(p.method==='ensemble'){
  y=.25*sine(v.p)+.22*sine(v.q)+.22*sine(v.r)+.24*sine(v.p*.5)+.08*sine(v.q*2)+.04*sine(v.r*4);
  y*=.88+.12*sine(t*.31);
 }else if(p.method==='subtractive'){
  const input=.45*saw(v.p%1,dt)+.25*pulse(v.q%1,Math.min(.44,dt*1.008),.32+.08*sine(t*.19))+.18*sine(v.p*.5);
  const cutoff=Math.min(e.sr*.15,700+f*2.5+1500*(.5+.5*sine(t*.23+v.n*.07)));
  const g=Math.tan(Math.PI*cutoff/e.sr),k=.65,a=1/(1+g*(g+k));
  const band=(v.band+g*(input-v.low))*a,low=v.low+g*band;
  v.band=2*band-v.band;v.low=2*low-v.low;y=low*(.78+.22*sine(t*17.3));
 }else if(p.method==='modal'){
  const hold=v.gate===-1&&!v.pluck;
  const ratios=MODAL_RATIOS,weights=MODAL_WEIGHTS,decays=MODAL_DECAYS;
  for(let i=0;i<4;i++){if(f*ratios[i]<e.sr*.43)y+=weights[i]*sine(v.modes[i])*((hold&&i===0?.18:0)+Math.exp(-age*decays[i])*.82);v.modes[i]=(v.modes[i]+dt*ratios[i])%1;}
  y+=.08*sine(v.q)*Math.exp(-age*.7);
 }else if(p.method==='fm'){
  const tine=sine(v.p*7)*(.08*Math.exp(-age*12)),mod=sine(v.p*2+tine)*(.35+1.6*Math.exp(-age*4));
  y=.75*sine(v.p+mod*.16)+.14*sine(v.q+ sine(v.q*3)*.08*Math.exp(-age*2));
  y*=(v.gate===-1&&!v.pluck?.18:0)+.82*Math.exp(-age*.9);y*=.88+.12*sine(t*4.6);v.low+=v.filterK*(y-v.low);y=v.low;
 }else if(p.method==='transistor'){
  y=.36*pulse(v.p%1,dt,.43)+(f*2<e.sr*.44?.18*pulse((v.p*2)%1,Math.min(.44,dt*2),.5):0)+(f*4<e.sr*.44?.12*pulse((v.p*4)%1,Math.min(.44,dt*4),.5):0);
  y=(Math.tanh(y*2+.15)-Math.tanh(.15))*.65;
 }
 v.p=(v.p+dt)%2;v.q=(v.q+dt*1.0041)%2;v.r=(v.r+dt*.9966)%2;
 // Blep operates on unit phase; the organ/modal phase has a two-cycle sub-octave.
 return y;
}

const TAU=Math.PI*2, hz=n=>440*Math.pow(2,(n-69)/12);
// No DOM, Web Audio nodes or timers here. The same renderer runs in the worklet
// and offline verification. A native port can consume the versioned music schema.
class Engine {
 constructor(sr=48000){
  this.sr=sr;this.frame=0;this.voices=[];this.seed=0x534d4348;this.preset=PRESETS[0];
  this.target={attack:.012,release:.85,reverb:.18,wooze:.1,crush:.04};this.fx={...this.target};
  this.performance=new PerformanceFX(sr);this.tone=0;this.glitch=0;this.glitchTarget='all';this.glitchHold=false;this.balance=.5;this.silentCleared=false;this.balanceNow=.5;this.chordGain=1;this.arpGain=1;this.crushDry=0;this.crushWet=0;this.crushGain=1;this.swing=0;this.drumCustom=false;this.editGrid=null;this.grid=factoryGrid(0);this.timeline=drumTimeline(0,false);this.gridPlayhead=-1;
  this.chord={root:0,quality:''};this.key=0;this.octave=0;this.held=false;
  this.tempo=110;this.clock=new MusicalClock(sr);this.beat=0;this.samples=[];this.missingSamples=0;this.strings=9;this.strumMode='pluck';this.strumPointers=new Map();this.snare='dry';this.activeSnare='dry';this.trace=null;this.drums=false;this.sequence=false;this.pattern=0;this.pendingPattern=0;
  this.drumStep=0;this.drumStart=0;this.nextDrum=0;this.drumVolume=.6;this.drumEnv=new Float64Array(7);this.drumAge=new Float64Array(7);this.drumPhase=new Float64Array(7);this.drumPitch=new Float64Array(7);
  this.drumDecay=[.19,.105,.027,.17,.038,.14,.085].map(t=>Math.exp(-1/(sr*t)));this.noiseLow=0;this.speaker=0;this.openChoke=false;
  this.progression=[this.chord];this.pendingProgression=null;this.arp={speed:1,order:0,octaves:1,length:.65,glide:0,mode:'arp'};
  this.seqOrigin=0;this.nextArp=0;this.arpStep=0;this.currentBar=-1;this.absoluteBar=-1;this.currentChord=null;this.previousNotes=[];this.lastArp=null;
  this.lowL=0;this.lowR=0;this.heldL=0;this.heldR=0;this.crushPhase=0;this.dcX=[0,0];this.dcY=[0,0];
  this.combs=[.0297,.0371,.0411,.0437,.0307,.0329,.0393,.0451].map(t=>({data:new Float32Array(Math.round(t*sr)),i:0,low:0}));
  this.events={notes:0,drums:0,bars:0,lanes:0};this.peak=0;this.master=1;this.masterTarget=1;this.lastNote=-1;this.maxVoices=32;this.tails=[];this.voiceId=0;this.snareLow=0;this.snareBand=0;this.snareHold=0;this.snareCounter=0;this.lfo=new Float64Array(5);this.outputFilterK=1-Math.exp(-TAU*12000/sr);
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 configure(s){
  if(s.fx)for(const k of Object.keys(this.target))if(Number.isFinite(s.fx[k]))this.target[k]=clamp(s.fx[k],k==='attack'?.002:k==='release'?.03:0,k==='release'?4:k==='attack'?.8:1);
  for(const k of ['tone','glitch','balance','swing'])if(Number.isFinite(s[k]))this[k]=clamp(s[k],k==='tone'?-1:0,1);
  if(['chord','arp','drums','all'].includes(s.glitchTarget))this.glitchTarget=s.glitchTarget;
  if(s.preset)this.preset=PRESETS.find(p=>p.id===s.preset)||this.preset;
  if(Number.isFinite(s.tempo))this.tempo=clamp(s.tempo,40,220);
  if(Number.isFinite(s.key))this.key=s.key;if(Number.isFinite(s.octave))this.octave=clamp(s.octave,-1,2);
  if(Number.isFinite(s.rhythm))this.pendingPattern=clamp(s.rhythm,0,5);
  if(s.drumCustom!==undefined){const grid=s.drumEdits?.[this.pendingPattern];this.drumCustom=!!s.drumCustom&&validDrumGrid(grid);this.editGrid=this.drumCustom?grid.map(r=>r.slice()):null;}
  if(Number.isFinite(s.drumVolume))this.drumVolume=clamp(s.drumVolume,0,1);
  if(s.arp){const old=this.arp;this.arp={...this.arp,...s.arp};if(this.sequence&&old.mode!==this.arp.mode){this.pendingMode=this.arp.mode;this.arp.mode=old.mode;}else if(this.sequence&&s.arp.mode===old.mode)this.pendingMode=null;if(old.speed!==this.arp.speed)this.nextArp=Math.ceil(this.clock.tick/(DIVISIONS[this.arp.speed]*24))*(DIVISIONS[this.arp.speed]*24);}
  if(['dry','vintage','sixties','dub','lofi','noise'].includes(s.snare))this.snare=s.snare;
  if([6,9,12].includes(s.strings)&&s.strings!==this.strings){this.releaseStrums();this.strings=s.strings;}
  if(['pluck','hold'].includes(s.strumMode)&&s.strumMode!==this.strumMode){this.releaseStrums();this.strumMode=s.strumMode;}
  if(s.progression?.length){if(this.sequence)this.pendingProgression=structuredCopy(s.progression);else this.progression=structuredCopy(s.progression);}
 }
 message(m){
  if(m.type==='glitch-hold')this.glitchHold=!!m.on;
  if(m.type==='config')this.configure(m.state);
  if(m.type==='samples')this.samples=m.zones;
  if(m.type==='chord'){this.chord=m.chord;this.held=!!m.hold;this.release('manual');this.masterTarget=1;if(m.sound!==false)this.playChord(this.chord,m.hold?-1:.3,'manual');this.retuneStrums();}
  if(m.type==='release'){this.held=false;this.release('manual');}
  if(m.type==='lane'){
   this.masterTarget=1;const ns=this.strumNotes(),lane=clamp(m.lane,0,this.strings-1),token=String(m.pointer??'legacy');
   this.releaseStrum(token);const hold=this.strumMode==='hold'&&m.pointer!==undefined;
   const v=this.note(ns[lane],clamp(m.velocity??.7,.15,1),hold?-1:-2,'strum');
   if(hold)this.strumPointers.set(token,{lane,voice:v});this.events.lanes++;
  }
  if(m.type==='strum-release')this.releaseStrum(String(m.pointer));
  if(m.type==='strum-clear')this.releaseStrums();
  if(m.type==='drums'){
   if(m.on&&!this.drums){this.masterTarget=1;if(!this.sequence)this.resetTransport();this.drums=true;}
   else if(!m.on){this.drums=false;/* Existing drum tails decay naturally. */}
  }
  if(m.type==='sequence'){
   this.release('seq');this.release('arp');this.releaseStrums();
   if(m.on&&!this.sequence){this.release('manual');this.held=false;this.resetTransport();this.sequence=true;this.drums=true;this.masterTarget=1;}
   else if(!m.on){this.sequence=false;this.drums=false;this.currentChord=null;this.currentBar=-1;}
  }
  if(m.type==='stop'){this.glitchHold=false;this.gridPlayhead=-1;this.drums=false;this.sequence=false;this.held=false;this.currentBar=-1;this.currentChord=null;this.masterTarget=0;for(const v of this.voices){v.gate=0;v.release=.008;}this.drumEnv.fill(0);this.releaseStrums();}
 }
 resetTransport(){
  if(this.pendingMode){this.arp.mode=this.pendingMode;this.pendingMode=null;}
  this.clock.reset();this.performance.quantum=-1;this.beat=0;this.pattern=this.pendingPattern;this.drumStep=0;this.drumStart=0;this.nextDrum=0;
  this.seqOrigin=0;this.nextArp=0;this.arpStep=0;this.currentBar=-1;this.absoluteBar=-1;this.previousNotes=[];this.lastArp=null;
  if(this.pendingProgression){this.progression=this.pendingProgression;this.pendingProgression=null;}
 }
 strumNotes(){return laneNotes(this.sequence&&this.currentChord?this.currentChord:this.chord,this.sequence?0:this.key,this.octave,this.strings);}
 releaseStrum(token){const held=this.strumPointers.get(token);if(held){held.voice.gate=0;this.strumPointers.delete(token);}}
 releaseStrums(){for(const token of this.strumPointers.keys())this.releaseStrum(token);}
 retuneStrums(){const notes=this.strumNotes();for(const held of this.strumPointers.values()){const old=held.voice;old.gate=0;old.release=.045;held.voice=this.note(notes[held.lane],old.velocity,-1,'strum');}}
 release(origin){for(const v of this.voices)if(v.origin===origin)v.gate=0;}
 note(n,velocity=.7,seconds=.2,origin='strum',from=null){
  if(this.voices.length>=this.maxVoices){let index=0;for(let i=1;i<this.voices.length;i++)if(this.voices[i].env<this.voices[index].env)index=i;
   const [old]=this.voices.splice(index,1);old.gate=0;old.release=.008;old.tailFrames=Math.round(this.sr*.008);if(old.env>.00001)this.tails.push(old);
   // An actual simultaneous 32+ note burst has zero-envelope victims; no audible discontinuity.
   for(const [token,held]of this.strumPointers)if(held.voice===old)this.strumPointers.delete(token);
  }
  const f=hz(n),start=from===null?f:hz(from),glide=from===null?0:this.arp.glide*.5;
  const v={id:++this.voiceId,n,f:start,target:f,glide,env:0,age:0,gate:seconds<0?-1:Math.round(seconds*this.sr),pluck:seconds===-2,velocity,origin,preset:this.preset,release:null,pan:(n%7-3)*.04,drift:0,driftTarget:this.random()*2-1,driftWait:0};
  prepareVoice(v,this);this.voices.push(v);this.events.notes++;this.lastNote=n;return v;
 }
 playChord(c,seconds,origin,previous=[]){
  let ns=chordNotes(c,origin==='manual'?this.key:0,this.octave);
  if(this.arp.glide>0&&previous.length)ns=voiceLead(ns,previous);
  ns.forEach((n,i)=>this.note(n,.65,seconds,origin,previous.length&&this.arp.glide>0?previous[i%previous.length]:null));return ns;
 }
 schedule(){
  const position=this.clock.tick+this.clock.phase;
  // Drum swing is scheduled at fractional ticks, on the same sample clock.
  this.scheduleDrums(position);
  if(!this.clock.due)return;this.clock.due=false;const tick=this.clock.tick;
  if(!this.sequence)return;
  const bar=Math.floor(tick/96);
  if(bar!==this.absoluteBar){
   this.absoluteBar=bar;if(this.pendingMode){this.arp.mode=this.pendingMode;this.pendingMode=null;}if(this.pendingProgression){this.progression=this.pendingProgression;this.pendingProgression=null;}
   this.currentBar=bar%this.progression.length;this.currentChord=this.progression[this.currentBar];this.events.bars++;this.trace?.({kind:'bar',tick,frame:this.frame,bar:this.currentBar});
   this.release('seq');this.release('arp');this.arpStep=0;this.nextArp=bar*96;this.retuneStrums();
   if(this.arp.mode!=='arp')this.previousNotes=this.playChord(this.currentChord,-1,'seq',this.previousNotes);
   if(this.arp.mode!=='arp')for(const v of this.voices)if(v.origin==='seq'&&v.gate!==0)v.offTick=tick+96*this.arp.length;
  }
  if(this.arp.mode!=='chord'&&tick>=this.nextArp){
   const base=(this.arp.order===4?chordToneOrder:chordNotes)(this.currentChord,0,this.octave),notes=[];
   for(let o=0;o<this.arp.octaves;o++)notes.push(...base.map(n=>n+o*12));if(this.arp.order!==4)notes.sort((a,b)=>a-b);
   const n=notes[arpIndex(this.arpStep++,notes.length,this.arp.order,this.random())],d=DIVISIONS[this.arp.speed]*24;
   const v=this.note(n,.7,-1,'arp',this.arp.glide>0?this.lastArp:null);v.offTick=tick+d*this.arp.length;
   this.trace?.({kind:'arp',tick,frame:this.frame,n});this.lastArp=n;this.nextArp=tick+d;
  }
 }
 scheduleDrums(position){
  // Muted drums still advance. Pattern, edit and swing changes latch on a bar edge.
  if(!(this.drums||this.sequence)||position+1e-8<this.nextDrum)return;
  if(this.drumStep===0){this.pattern=this.pendingPattern;this.grid=this.drumCustom&&this.editGrid?this.editGrid:factoryGrid(this.pattern);this.timeline=drumTimeline(this.pattern,this.drumCustom,this.swing);}
  const event=this.timeline.events[this.drumStep],hits=this.grid.map(row=>row[event.slot]);this.gridPlayhead=event.slot;
  if(this.drums){
   for(let i=0;i<7;i++)if(hits[i]){this.drumEnv[i]=hits[i]*(.97+.06*this.random());this.drumAge[i]=0;this.drumPhase[i]=0;this.drumPitch[i]=.992+.016*this.random();if(i===1){this.activeSnare=this.snare;this.snareLow=0;this.snareBand=0;}}
   if(hits[2])this.openChoke=true;if(hits[3])this.openChoke=false;this.events.drums++;this.trace?.({kind:'drum',tick:this.nextDrum,frame:this.frame,pattern:this.pattern,step:event.step,slot:event.slot,hits});
  }
  if(++this.drumStep>=this.timeline.events.length){this.drumStep=0;this.drumStart+=this.timeline.length;this.nextDrum=this.drumStart;}
  else this.nextDrum=this.drumStart+this.timeline.events[this.drumStep].tick;
 }
 drumSample(){
  const noise=this.random()*2-1;this.noiseLow+=(1-Math.exp(-TAU*1800/this.sr))*(noise-this.noiseLow);const high=noise-this.noiseLow;let sum=0;
  for(let i=0;i<7;i++){
   if(this.drumEnv[i]<.000001)continue;const t=this.drumAge[i]++/this.sr;let sound=0,f=0;
   if(i===0)f=48+48*Math.exp(-t*48);if(i===1)f=177;if(i===2||i===3)f=3371;if(i===4)f=796;if(i===5)f=91+27*Math.exp(-t*24);
   this.drumPhase[i]+=TAU*f*this.drumPitch[i]/this.sr;const p=this.drumPhase[i];
   if(i===0)sound=Math.sin(p)*1.15;if(i===1)sound=this.snareSample(noise,t,p);
   if(i===2||i===3)sound=high*.36+(Math.sin(p)+Math.sin(p*1.427))*.045;
   if(i===4)sound=(Math.sin(p)+.4*Math.sin(p*1.61))*.45;if(i===5)sound=Math.sin(p)*.7;
   if(i===6)sound=high*.9*(t<.03?(.25+.75*Math.max(0,Math.sin(t*TAU*85))):Math.exp(-(t-.03)*18));
   sum+=sound*this.drumEnv[i]*Math.min(1,t/.0007);this.drumEnv[i]*=i===1?Math.exp(-1/(this.sr*.32)):this.drumDecay[i];if(i===3&&this.openChoke)this.drumEnv[i]*=Math.exp(-1/(this.sr*.006));
  }
  this.speaker+=(1-Math.exp(-TAU*3700/this.sr))*(Math.tanh(sum*1.4)*.55-this.speaker);return this.speaker*this.drumVolume;
 }
 snareSample(noise,t,p){
  const kind=this.activeSnare,lowK=1-Math.exp(-TAU*(kind==='dub'?1900:kind==='sixties'?4500:6500)/this.sr);
  this.snareLow+=lowK*(noise-this.snareLow);this.snareBand+=.06*(this.snareLow-this.snareBand);const wire=this.snareLow-this.snareBand;
  if(kind==='dry')return wire*.95*Math.exp(-t*13)+(Math.sin(p)+.45*Math.sin(p*1.57))*.44*Math.exp(-t*24);
  if(kind==='vintage')return noise*.62*Math.exp(-t*18)+(.55*Math.sin(p*1.02)+.34*Math.sin(p*1.86))*Math.exp(-t*23);
  if(kind==='sixties')return wire*1.15*Math.exp(-t*33)+Math.sin(p*1.31)*.63*Math.exp(-t*38);
  if(kind==='dub')return wire*.7*Math.exp(-t*9)+Math.sin(p*.82)*.65*Math.exp(-t*27)+Math.sin(p*2.57)*.16*Math.exp(-t*7)*(1+.35*Math.sin(t*89));
  if(kind==='lofi'){if(this.snareCounter++%5===0)this.snareHold=Math.round(wire*15)/15;return Math.tanh(this.snareHold*2)*.75*Math.exp(-t*19)+Math.sin(p*.91)*.25*Math.exp(-t*17);}
  return (noise-this.snareLow)*1.2*Math.exp(-t*7)+Math.sin(90*(1-Math.exp(-t*50)))*.24*Math.exp(-t*50);
 }
 process(left,right){
  this.peak=0;
  for(let i=0;i<left.length;i++){
   this.schedule();const t=this.frame/this.sr;
   for(const k in this.fx)this.fx[k]+=(this.target[k]-this.fx[k])*.002;
   const woozeAmount=2*this.fx.wooze+70*this.fx.wooze*this.fx.wooze,flutter=.1*Math.sin(t*TAU*7.1);for(let k=0;k<5;k++)this.lfo[k]=woozeAmount*(.75*Math.sin(t*TAU*(.27+k*.031))+flutter);
   const attackStep=1/(this.sr*this.fx.attack),releaseCoef=Math.exp(-6.9/(this.sr*this.fx.release)),pluckCoef=Math.exp(-5/(this.sr*(.45+this.fx.release*2)));
   let l=0,r=0,al=0,ar=0;this.balanceNow+=(this.balance-this.balanceNow)*.002;this.chordGain+=((this.arp.mode==='both'?Math.cos(this.balanceNow*Math.PI/2):1)-this.chordGain)*.002;this.arpGain+=((this.arp.mode==='both'?Math.sin(this.balanceNow*Math.PI/2):1)-this.arpGain)*.002;
   this.performance.begin(this.clock.tick+this.clock.phase,this.tempo,this.masterTarget>0?this.glitch:0,this.glitchTarget,this.masterTarget>0&&this.glitchHold);
   for(let j=0;j<this.voices.length+this.tails.length;j++){
    const v=j<this.voices.length?this.voices[j]:this.tails[j-this.voices.length];
    if(v.offTick!==undefined&&this.clock.tick+this.clock.phase>=v.offTick)v.gate=0;
    if(v.gate>0)v.gate--;if(v.tailFrames!==undefined&&--v.tailFrames<=0){v.env=0;continue;}
    const down=v.gate!==0,age=v.age++/this.sr,p=v.preset;
    const naturalPiano=v.pluck&&p.method==='sample'&&['grand','upright'].includes(p.bank);
    if(down){if(v.pluck&&!naturalPiano&&age>this.fx.attack)v.env*=pluckCoef;else v.env=Math.min(1,v.env+attackStep);}
    else v.env*=v.release?Math.exp(-6.9/(this.sr*v.release)):releaseCoef;
    if(v.pluck&&v.env<.00001&&age>this.fx.attack)v.gate=0;
    if(v.env<.00001&&!down)continue;
    if(--v.driftWait<=0){v.driftTarget=this.random()*2-1;v.driftWait=this.sr*(.6+this.random());}v.drift+=(v.driftTarget-v.drift)/(this.sr*.3);
    v.f+=(v.target-v.f)*(v.glide>0?1-Math.exp(-1/(this.sr*v.glide*.2)):1);
    const cents=this.lfo[v.n%5]+woozeAmount*.15*v.drift;
    const freq=v.f*Math.pow(2,cents/1200),tone=voiceTone(v,this,freq,age);
    const value=tone*v.env*v.velocity*.18;if(v.origin==='arp'){al+=value*(1-v.pan);ar+=value*(1+v.pan);}else{const gain=v.origin==='seq'?this.chordGain:1;l+=value*(1-v.pan)*gain;r+=value*(1+v.pan)*gain;}
   }
   const arpGain=this.arpGain;al*=arpGain;ar*=arpGain;
   let fxOut=this.performance.bus(0,l,r);l=fxOut[0];r=fxOut[1];fxOut=this.performance.bus(1,al,ar);l+=fxOut[0];r+=fxOut[1];
   const crush=this.fx.crush,levels=Math.pow(2,15-11*crush);this.crushPhase+=1/(1+23*crush*crush);
   if(this.crushPhase>=1){this.crushPhase%=1;this.heldL=Math.round(l*levels)/levels;this.heldR=Math.round(r*levels)/levels;}
   const drive=1+12*crush*crush,wl=Math.tanh(this.heldL*drive)/Math.sqrt(drive),wr=Math.tanh(this.heldR*drive)/Math.sqrt(drive);
   // Match wet RMS to dry RMS without changing quantisation, sample hold or drive.
   this.crushDry+=.0005*((l*l+r*r)*.5-this.crushDry);this.crushWet+=.0005*((wl*wl+wr*wr)*.5-this.crushWet);
   const compensation=this.crushDry>1e-10?clamp(Math.sqrt(this.crushDry/(this.crushWet+1e-12)),.16,1.5):1/Math.sqrt(drive);
   this.crushGain+=(compensation-this.crushGain)*(compensation<this.crushGain?.004:.0004);
   l+=crush*(wl*this.crushGain-l);r+=crush*(wr*this.crushGain-r);
   fxOut=this.performance.colour(l,r,this.tone);l=fxOut[0];r=fxOut[1];
   const cutoff=this.outputFilterK;this.lowL+=cutoff*(l-this.lowL);this.lowR+=cutoff*(r-this.lowR);l=this.lowL;r=this.lowR;
   let wetL=0,wetR=0;
   for(let j=0;j<8;j++){const c=this.combs[j],v=c.data[c.i];c.low+=(v-c.low)*.3;c.data[c.i]=(j<4?l:r)*.22+c.low*.76;c.i=(c.i+1)%c.data.length;if(j<4)wetL+=v;else wetR+=v;}
   const rv=this.fx.reverb,d=this.drumSample();fxOut=this.performance.bus(2,d,d);l=l*(1-rv*.25)+wetL*rv*.65+fxOut[0];r=r*(1-rv*.25)+wetR*rv*.65+fxOut[1];this.performance.end();
   this.master+=(this.masterTarget-this.master)*.004;
   const dl=l-this.dcX[0]+.9984*this.dcY[0],dr=r-this.dcX[1]+.9984*this.dcY[1];this.dcX[0]=l;this.dcX[1]=r;this.dcY[0]=dl;this.dcY[1]=dr;
   left[i]=Math.tanh(dl*.9)*.88*this.master;right[i]=Math.tanh(dr*.9)*.88*this.master;this.peak=Math.max(this.peak,Math.abs(left[i]),Math.abs(right[i]));
   if(this.drums||this.sequence||this.masterTarget>0&&(this.glitch>0||this.glitchHold))this.clock.advance(this.tempo);this.beat=this.clock.beat;this.frame++;
  }
  this.tails=this.tails.filter(v=>v.tailFrames>0&&v.env>=.00001);
  this.voices=this.voices.filter(v=>v.gate!==0||v.env>=.00001);
  if(this.masterTarget>0)this.silentCleared=false;
  if(this.master<.00001&&this.masterTarget===0&&!this.silentCleared){this.silentCleared=true;this.performance.reset();this.voices=[];this.tails=[];for(const c of this.combs)c.data.fill(0);}
 }
 status(){return {frame:this.frame,peak:this.peak,voices:this.voices.length,tails:this.tails.length,heldStrings:this.strumPointers.size,missingSamples:this.missingSamples,tick:this.clock.tick,events:{...this.events},bar:this.currentBar,beat:Math.floor((this.beat-this.seqOrigin)%4),drumStep:this.drumStep,gridStep:this.gridPlayhead,glitchHold:this.glitchHold,mode:this.arp.mode,lastNote:this.lastNote,drums:this.drums,sequence:this.sequence};}
}
function structuredCopy(x){return JSON.parse(JSON.stringify(x));}

class WilmachordProcessor extends AudioWorkletProcessor {
 constructor(){super();this.engine=new Engine(sampleRate);this.counter=0;this.port.onmessage=e=>this.engine.message(e.data);}
 process(inputs,outputs){const o=outputs[0];if(o?.[0]){this.engine.process(o[0],o[1]||o[0]);if(++this.counter%12===0)this.port.postMessage(this.engine.status());}return true;}
}
registerProcessor('wilmachord',WilmachordProcessor);
