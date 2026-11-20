// WILMACHORD musical schema 1. Pure data/logic shared by UI, renderer and tests.
const VERSION = '0.4.6';
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
 voice('haunted','HAUNTED','modal','Cinematic electric reeds · warm twin ranks, slow bloom and lingering wood-toned resonances',.005,1.5,.4,.23,.05),
 voice('rocksteady','ROCKSTEADY','tonewheel','Percussive 1960s organ · hollow drawbars, key click and third percussion',.05,.32,.13,.045,.03,{drawbars:[.35,.37,.04,.18],pulse:0}),
 voice('cassette','CASSETTE','fm','Four-operator electric tine · decaying modulation, tremolo and tape wear',.006,1.3,.23,.2,.15),
 voice('tape-strings','TAPE STRINGS','sample','Recorded violin ensemble · bandwidth-limited tape treatment',.12,1.7,.3,.22,.045,{bank:'strings'}),
 voice('tape-choir','TAPE CHOIR','sample','Licensed multisampled synthetic choir · warm tape treatment',.16,1.9,.34,.24,.035,{bank:'choir'}),
 voice('grand','GRAND','sample','Recorded Kawai grand · seven pitch zones and two velocity layers',.002,1.1,.17,.015,0,{bank:'grand'}),
 voice('school-piano','SCHOOL PIANO','sample','Recorded Knight upright · six pitch zones and two velocity layers',.003,.9,.12,.055,.015,{bank:'upright'}),
 voice('honky-tonk','HONKY TONK','sample','Recorded upright · three independently detuned strings',.002,1.1,.13,.09,.035,{bank:'upright'}),
 voice('garage','GARAGE','transistor','Raw transistor organ · band-limited pulse dividers and asymmetric drive',.003,.5,.09,.03,.09)
];
const SELECTABLE_PRESETS=PRESETS.filter(p=>p.id!=='cassette');
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
function defaultState(){return {schema:1,paletteId:'golden',custom:[],key:0,octave:0,latch:true,selected:0,preset:'motorik',fx:{attack:.012,release:.85,reverb:.18,wooze:.1,crush:.04},drive:0,kosmische:{pulseSpeed:17.3,pulseDepth:.44},tone:0,presence:0,eqByPreset:{},legacyTone:null,glitch:0,glitchTarget:'all',balance:.5,swing:0,drumEdits:{},drumCustom:false,drumFxMode:'individual',drumSpringTone:0,drumDelay:{time:.2,feedback:.43,legacySync:false},globalDrumFx:{pitch:0,spring:0,delay:0,tone:0,delayTime:.2,delayFeedback:.43,delayLegacySync:false},fragmentLength:.25,drumView:'split',drumBank:0,drumMutes:Array(7).fill(false),drumFx:Array.from({length:7},()=>({pitch:0,spring:0,delay:0})),tempo:110,rhythm:0,drumVolume:.6,snare:'dry',strings:9,strumMode:'pluck',strumLock:false,lockedNotes:null,strumPreset:'same',chordLength:1,progression:[c(0),c(9,'m'),c(5),c(7)],arp:{speed:1,glide:0,order:0,octaves:1,length:.65,mode:'arp'},page:0};}

const DRUM_VOICES=['KICK','SNARE','CLOSED HAT','OPEN HAT','WOOD','TOM','CLAP'];
const DRUM_TRACKS=['KICK','SNARE','CLAP','CLOSED HAT','OPEN HAT','WOOD','TOM'];
const DRUM_LANES=[[0],[1],[6],[2],[3],[4],[5]];
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
 if(on){const lanes=DRUM_LANES[track];if(original&&lanes.some(l=>original[l][step]>0)){for(const l of lanes)rows[l][step]=original[l][step];}else rows[lanes[0]][step]=[.8,.6,.48,.3,.25,.4,.4][track];}
}

// Bounded feed-forward effects. All musical decisions use the engine's audio clock.
// Clocked dry-history splicing. Three fixed stereo rings; no feedback or allocation
// in the audio loop. HOLD freezes recording, preserving the captured fragment.
class PerformanceFX {
 constructor(sr){
  this.sr=sr;this.amount=0;this.tone=0;this.balance=.5;this.hold=false;this.target='all';
  this.seed=0x4c494530;this.quantum=-1;this.lastTick=-1;this.write=0;this.filled=0;
  this.size=Math.ceil(sr*2.4);this.legacySize=Math.ceil(sr*.9);this.legacyWrite=0;this.fragmentLength=.25;this.lengthScale=1;this.lengthGrid=1;this.low=[0,0];this.toneK=1-Math.exp(-2*Math.PI*1200/sr);
  this.buses=Array.from({length:3},()=>({l:new Float32Array(this.size),r:new Float32Array(this.size),legacyL:new Float32Array(this.legacySize),legacyR:new Float32Array(this.legacySize),legacy:true,ringSize:this.legacySize,history:0,silent:sr,mix:0,action:0,anchor:0,length:1,read:0,lastL:0,lastR:0,fromL:0,fromR:0,transition:1,enabled:false,frozen:false,fade:1,cycle:1,gap:false}));
  this.out=new Float64Array(2);this.smooth=1-Math.exp(-1/(sr*.003));this.transitionStep=1/(sr*.003);
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 reset(){this.hold=false;this.quantum=-1;this.lastTick=-1;this.filled=0;for(const b of this.buses){b.mix=0;b.action=0;b.lastL=0;b.lastR=0;b.fromL=0;b.fromR=0;b.frozen=false;b.l.fill(0);b.r.fill(0);b.legacyL.fill(0);b.legacyR.fill(0);b.history=0;b.silent=this.sr;}}
 setLength(value){const v=clamp(value,0,1);if(v===this.fragmentLength)return;this.fragmentLength=v;this.lengthScale=2**((v-.25)*8);this.lengthGrid=v<=.25?1:2**Math.floor((v-.25)*8);this.quantum=-1;}
 begin(tick,tempo,amount,target,hold){
  const changed=hold!==this.hold||target!==this.target,rewound=tick<this.lastTick;
  this.amount=amount;this.target=target;this.hold=hold;this.lastTick=tick;
  const strength=hold?Math.max(.8,amount):amount,grid=(strength>.7?1.5:3)*this.lengthGrid,q=Math.floor((tick+1e-8)/grid);
  if(q===this.quantum&&!changed&&!rewound)return;this.quantum=q;
  for(let i=0;i<3;i++){
   const b=this.buses[i];b.enabled=target==='all'||i===0&&target==='chord'||i===1&&target==='arp'||i===2&&target==='drums';
   if(hold&&b.frozen&&b.enabled&&!rewound)continue;
   b.frozen=false;b.fromL=b.lastL;b.fromR=b.lastR;b.transition=0;
   if(!b.enabled||strength===0||(this.lengthScale>1&&(b.silent>this.sr*.12||b.history<96))||this.filled<Math.ceil(this.sr*.008)||(!hold&&this.random()>strength*.94)){b.action=0;continue;}
   // Every edit replays recorded audio. Intensity changes density, fragment size,
   // look-back and reverse probability; it is not an amplitude-LFO substitute.
   const pick=this.random(),ticks=strength<.3?(pick<.5?6:3):strength<.7?(pick<.34?3:pick<.7?1.5:.75):(pick<.2?1.5:pick<.55?.75:pick<.85?.375:.25);
   b.legacy=this.lengthScale<=1;b.ringSize=b.legacy?this.legacySize:this.size;const history=Math.min(this.filled,b.ringSize,this.lengthScale>1?b.history:this.filled);
   b.length=Math.max(96,Math.min(history,Math.floor(this.legacySize/3*this.lengthScale),Math.floor(this.size*.82),Math.round(this.sr*60/tempo*ticks/24*this.lengthScale)));
   b.fade=Math.max(8,Math.min(Math.round(this.sr*.0015),Math.floor(b.length/4)));b.cycle=b.length-b.fade;
   const available=Math.min(history-b.length,Math.round(this.sr*60/tempo*(strength>.7?.5:.25)));
   const back=Math.max(0,Math.floor(this.random()*available));b.anchor=((b.legacy?this.legacyWrite:this.write)-b.length-back+b.ringSize)%b.ringSize;
   b.action=strength>.35&&this.random()<strength*.24?3:2;b.gap=strength>.8&&this.random()<.2&&(this.lengthScale<=1||b.length<this.sr*.08);b.read=0;b.frozen=hold;
  }
 }
 bus(i,l,r){
  const b=this.buses[i];if(!b.frozen){if(Math.abs(l)+Math.abs(r)>1e-6){if(b.silent>this.sr*.12)b.history=0;b.silent=0;}else b.silent++;b.history=Math.min(this.size,b.history+1);b.l[this.write]=l;b.r[this.write]=r;b.legacyL[this.legacyWrite]=l;b.legacyR[this.legacyWrite]=r;}
  const selected=this.target==='all'||i===0&&this.target==='chord'||i===1&&this.target==='arp'||i===2&&this.target==='drums';
  const target=(this.amount>0||this.hold)&&selected&&b.action?1:0;b.mix+=(target-b.mix)*this.smooth;
  if(!target&&b.mix<.00001)b.mix=0;
  // Exact clean bypass at rest. Keep recording so the first edit has real audio.
  if(b.mix===0){b.lastL=l;b.lastR=r;this.out[0]=l;this.out[1]=r;return this.out;}
  let wl=l,wr=r;
  if(b.action>1){
   const pos=b.read%b.cycle+b.fade,rev=b.action===3,ring=b.ringSize,bl=b.legacy?b.legacyL:b.l,br=b.legacy?b.legacyR:b.r;
   let p=(b.anchor+(rev?b.length-1-pos:pos)+ring)%ring;wl=bl[p];wr=br[p];
   if(pos>=b.cycle){const f=(pos-b.cycle)/b.fade,head=pos-b.cycle,p2=(b.anchor+(rev?b.length-1-head:head)+ring)%ring;wl+=(bl[p2]-wl)*f;wr+=(br[p2]-wr)*f;}
   if(b.gap){const phase=b.read%(b.cycle*4),edge=Math.min(b.fade,Math.max(0,b.cycle*3-phase),Math.max(0,phase));const gain=Math.min(1,edge/b.fade);wl*=gain;wr*=gain;}
   b.read++;
  }
  b.transition=Math.min(1,b.transition+this.transitionStep);wl=b.fromL+(wl-b.fromL)*b.transition;wr=b.fromR+(wr-b.fromR)*b.transition;
  b.lastL=wl;b.lastR=wr;this.out[0]=l+(wl-l)*b.mix;this.out[1]=r+(wr-r)*b.mix;return this.out;
 }
 end(){this.legacyWrite=(this.legacyWrite+1)%this.legacySize;this.write=(this.write+1)%this.size;if(this.filled<this.size)this.filled++;}
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

// Four instrument-only stereo biquads. RBJ coefficients calculated on control events,
// never in the sample loop. Linear 30 ms coefficient ramps; identity bypass at rest.
class InstrumentEQ {
 constructor(sr){
  this.sr=sr;this.c=new Float64Array(20);this.target=new Float64Array(20);this.delta=new Float64Array(20);this.z=new Float64Array(16);this.values=new Float64Array(4);this.incoming=new Float64Array(4);this.frequencies=new Float64Array([180,850,4500,2600]);this.out=new Float64Array(2);
  for(let i=0;i<4;i++)this.c[i*5]=this.target[i*5]=1;
  this.gain=1;this.gainTarget=1;this.gainDelta=0;this.remaining=0;this.active=false;
 }
 set(low=0,mid=0,high=0,presence=0){
  const values=this.incoming;values[0]=clamp(low,-12,12);values[1]=clamp(mid,-12,12);values[2]=clamp(high,-12,12);values[3]=clamp(presence,-1,1);
  if(values[0]===this.values[0]&&values[1]===this.values[1]&&values[2]===this.values[2]&&values[3]===this.values[3])return;
  const frames=Math.max(1,Math.round(this.sr*.03));let neutral=true;
  for(let band=0;band<4;band++){
   const value=values[band];this.values[band]=value;if(value!==0)neutral=false;
   const db=band===3?value*4.5:value,omega=VTAU*this.frequencies[band]/this.sr,A=10**(db/40),cos=Math.cos(omega),sin=Math.sin(omega),alpha=sin/(2*(band===3?.65:.7));
   let b0=1,b1=0,b2=0,a0=1,a1=0,a2=0;
   if(value!==0){
    if(band===1||band===3){b0=1+alpha*A;b1=-2*cos;b2=1-alpha*A;a0=1+alpha/A;a1=b1;a2=1-alpha/A;}
    else {const t=2*Math.sqrt(A)*sin/Math.SQRT2;
     if(band===0){b0=A*((A+1)-(A-1)*cos+t);b1=2*A*((A-1)-(A+1)*cos);b2=A*((A+1)-(A-1)*cos-t);a0=(A+1)+(A-1)*cos+t;a1=-2*((A-1)+(A+1)*cos);a2=(A+1)+(A-1)*cos-t;}
     else {b0=A*((A+1)+(A-1)*cos+t);b1=-2*A*((A-1)+(A+1)*cos);b2=A*((A+1)+(A-1)*cos-t);a0=(A+1)-(A-1)*cos+t;a1=2*((A-1)-(A+1)*cos);a2=(A+1)-(A-1)*cos-t;}
    }
   }
   const k=band*5;this.target[k]=b0/a0;this.target[k+1]=b1/a0;this.target[k+2]=b2/a0;this.target[k+3]=a1/a0;this.target[k+4]=a2/a0;
  }
  // Preserve room for boosted bands without merely turning up the whole instrument.
  this.gainTarget=10**(-(.35*Math.max(0,values[0],values[1],values[2])+.65*Math.max(0,values[3]))/20);
  for(let i=0;i<20;i++)this.delta[i]=(this.target[i]-this.c[i])/frames;
  this.gainDelta=(this.gainTarget-this.gain)/frames;this.remaining=frames;this.neutral=neutral;this.active=true;
 }
 process(l,r){
  if(!this.active){this.out[0]=l;this.out[1]=r;return this.out;}
  if(this.remaining>0){
   for(let i=0;i<20;i++)this.c[i]+=this.delta[i];this.gain+=this.gainDelta;
   if(--this.remaining===0){this.c.set(this.target);this.gain=this.gainTarget;if(this.neutral){this.z.fill(0);this.active=false;this.out[0]=l;this.out[1]=r;return this.out;}}
  }
  const c=this.c,z=this.z;
  for(let band=0;band<4;band++){
   const k=band*5,j=band*4,yl=c[k]*l+z[j],yr=c[k]*r+z[j+2];
   z[j]=c[k+1]*l-c[k+3]*yl+z[j+1];z[j+1]=c[k+2]*l-c[k+4]*yl;
   z[j+2]=c[k+1]*r-c[k+3]*yr+z[j+3];z[j+3]=c[k+2]*r-c[k+4]*yr;l=yl;r=yr;
  }
  this.out[0]=l*this.gain;this.out[1]=r*this.gain;return this.out;
 }
}

// WILMACHORD voice architectures. No browser nodes; same DSP in worklet/tests.
const VTAU=Math.PI*2, TABLE=new Float32Array(4097);
for(let i=0;i<=4096;i++)TABLE[i]=Math.sin(i/4096*VTAU);
function sine(p){p=(p-Math.floor(p))*4096;const i=p|0;return TABLE[i]+(TABLE[i+1]-TABLE[i])*(p-i);}
function blep(p,dt){if(p<dt){p/=dt;return p+p-p*p-1;}if(p>1-dt){p=(p-1)/dt;return p*p+p+p+1;}return 0;}
function saw(p,dt){return p*2-1-blep(p,dt);}
function pulse(p,dt,width=.5){return (p<width?1:-1)+blep(p,dt)-blep((p-width+1)%1,dt);}
const MODAL_RATIOS=[1,2.013,5.067,8.11],MODAL_WEIGHTS=[.06,.055,.018,.006],MODAL_DECAYS=[.28,.75,1.6,3.8],MODAL_FLOORS=[.24,.09,.025,.008];
const noteHz=n=>440*2**((n-69)/12);
class VoiceSlot {
 constructor(){
  this.id=0;this.n=60;this.f=0.1;this.target=0.1;this.glide=0.1;this.cachedGlide=0.1;this.glideCoef=0.1;this.cachedRelease=null;this.releaseCoef=0.1;
  this.strumOverride=false;this.strumAttackStep=0.1;this.strumReleaseCoef=0.1;this.strumPluckCoef=0.1;this.env=0.1;this.age=0;this.gate=0;this.pluck=false;this.velocity=0.1;this.origin='strum';this.preset=PRESETS[0];this.release=null;this.pan=0.1;this.drift=0.1;this.driftTarget=0.1;this.driftWait=0;this.chordTick=0;this.offTick=undefined;this.tailFrames=undefined;this.lastL=0.1;this.lastR=0.1;
  this.p=0.1;this.q=0.1;this.r=0.1;this.low=0.1;this.low2=0.1;this.band=0.1;this.dc=0.1;this.filter=0.1;this.filterK=0.1;this.sampleEnded=false;
  this.samples=[];this.sampleSlots=Array.from({length:6},()=>({z:null,pos:0.1,ratio:0.1,weight:0.1}));this.modes=new Float64Array(4);this.modeAmp=new Float64Array(4);this.modeDecay=new Float64Array(4);this.modeRelease=new Float64Array(4);
  this.reedPhase=0.1;this.reedAmp=0.1;this.bloom=0.1;this.bloomK=0.1;this.reedDecay=0.1;this.reedRelease=0.1;this.bodyAmp=0.1;this.bodyDecay=0.1;this.bodyRelease=0.1;
 }
}
function prepareVoice(v,engine){
 v.p=0;v.q=0;v.r=0;v.low=0;v.low2=0;v.band=0;v.dc=0;v.filter=0;v.samples.length=0;v.sampleEnded=false;v.modes.fill(0);const p=v.preset;const cutoff=p.method==='fm'?5200:p.bank==='strings'||p.bank==='choir'?4300:p.id==='school-piano'?7600:11000;v.filterK=1-Math.exp(-VTAU*Math.min(cutoff,engine.sr*.4)/engine.sr);
 if(p.method==='modal'){v.reedPhase=0;v.reedAmp=1;v.bloom=0;v.bloomK=1-Math.exp(-1/(engine.sr*.18));v.reedDecay=Math.exp(-.32/engine.sr);v.reedRelease=Math.exp(-.045/engine.sr);v.modeAmp[0]=v.gate===-1&&!v.pluck?1:.82;for(let i=1;i<4;i++)v.modeAmp[i]=.82;for(let i=0;i<4;i++){v.modeDecay[i]=Math.exp(-MODAL_DECAYS[i]/engine.sr);v.modeRelease[i]=Math.exp(-MODAL_DECAYS[i]*.12/engine.sr);}v.bodyAmp=1;v.bodyDecay=Math.exp(-.28/engine.sr);v.bodyRelease=Math.exp(-.04/engine.sr);}
 if(v.preset.method==='sample'){
  const bank=engine.sampleBanks[p.bank];if(!bank?.length){engine.missingSamples++;v.gate=0;return;}
  let group=bank[0];for(let i=1;i<bank.length;i++)if(Math.abs(bank[i].root-v.n)<Math.abs(group.root-v.n))group=bank[i];
  const layers=group.zones,root=group.root,mix=Math.min(1,Math.max(0,(v.velocity-.3)/.6)),count=p.id==='honky-tonk'?3:1;
  let slot=0;for(let i=0;i<layers.length;i++)for(let j=0;j<count;j++){
   const z=layers[i],cents=count===1?0:j===0?-9:j===1?0:12,s=v.sampleSlots[slot++];
   s.z=z;s.pos=0;s.ratio=z.rate/engine.sr/noteHz(root)*2**(cents/1200);s.weight=(z.layer==='soft'?1-mix:z.layer==='hard'?mix:1)/count;v.samples.push(s);
  }
 }
}
function sampleAt(s,step,loop){
 const z=s.z,a=z.data,end=z.loopEnd,start=z.loopStart;
 const fade=loop?(z.loopFade??Math.min(Math.round(z.rate*.012),Math.floor((end-start)/8))):0;
 let p=s.pos;
 if(p>=end){if(loop)p=start+fade+(p-end)%(end-start-fade);else return 0;}
 const i=p|0,f=p-i,next=i+1<end?a[i+1]:(loop?a[start]:a[i]);
 let y=a[i]+(next-a[i])*f;
 if(loop&&p>=end-fade){
  const q=start+p-(end-fade),j=q|0,head=a[j]+(a[j+1]-a[j])*(q-j);
  const blend=.5-.5*Math.cos(Math.PI*(p-(end-fade))/fade);
  y+=(head-y)*blend;
 }
 s.pos=p+step*s.ratio;return y*s.weight*(loop?1:Math.min(1,(end-p)/128));
}
function sampleVoice(v,f){
 const p=v.preset;let y=0;
  const loop=!v.pluck;let ended=true;
  for(let i=0;i<v.samples.length;i++){const s=v.samples[i];y+=sampleAt(s,f,loop);if(s.pos<s.z.loopEnd||loop)ended=false;}
  if(ended)v.gate=0;
  const tape=p.bank==='strings'||p.bank==='choir';
  const k=v.filterK;
  v.low+=k*(y-v.low);v.low2+=k*(v.low-v.low2);y=v.low2*(p.bank==='strings'?2.2:p.bank==='choir'?.85:p.id==='honky-tonk'?3.4:2.4);
  if(tape)y=Math.tanh(y*1.3)*.85;return y;

}
function voiceTone(v,e,f,age){
 const p=v.preset;let y=0;const dt=p.method==='sample'?0:Math.min(.44,f/e.sr),t=e.frame/e.sr;
 if(p.method==='sample'){return sampleVoice(v,f); }else if(p.method==='tonewheel'){
  const h=p.drawbars;
  for(let i=0;i<4;i++)if(f*(i+1)<e.sr*.44)y+=h[i]*sine(v.p*(i+1));
  if(p.id==='motorik')y*=1-p.pulse*(.5-.5*sine(e.beat*2));
  else y+=(f*3<e.sr*.44?.32:0)*sine(v.p*3)*Math.exp(-age*18)+(e.random()*2-1)*Math.exp(-age*170)*.1;
 }else if(p.method==='ensemble'){
  y=.25*sine(v.p)+.22*sine(v.q)+.22*sine(v.r)+.24*sine(v.p*.5)+.08*sine(v.q*2)+.04*sine(v.r*4);
  y*=.88+.12*sine(t*.31);
 }else if(p.method==='subtractive'){
  const input=.45*saw(v.p%1,dt)+.25*pulse(v.q%1,Math.min(.44,dt*1.008),.32+.08*sine(t*.19))+.18*sine(v.p*.5);
  const cutoff=Math.min(e.sr*.15,.86*(700+f*2.5+1500*(.5+.5*sine(t*.23+v.n*.07))));
  const g=Math.tan(Math.PI*cutoff/e.sr),k=.65,a=1/(1+g*(g+k));
  const band=(v.band+g*(input-v.low))*a,low=v.low+g*band;
  v.band=2*band-v.band;v.low=2*low-v.low;y=low*(1-.5*e.pulseDepthNow+.5*e.pulseDepthNow*sine(e.pulsePhase));
 }else if(p.method==='modal'){
  const hold=v.gate===-1&&!v.pluck;
  const movement=.5+.5*sine(t*.17+v.n*.113),brightness=clamp(1-(v.n-60)*.009,.55,1.12)*(.65+.45*v.velocity);
  const bloom=.2+.8*v.bloom;
  // Harmonic reed body plus a gently wandering, detuned rank. Explicit partials
  // remain band-limited at high registers; no pad, delay or reverb is required.
  y=.48*sine(v.p)+.19*bloom*sine(v.reedPhase);
  if(f*2<e.sr*.43)y+=brightness*((.12+.085*v.bloom*movement)*sine(v.p*2)+.045*bloom*sine(v.reedPhase*2));
  if(f*3<e.sr*.43)y+=brightness*(.07*sine(v.p*3)+.018*bloom*sine(v.reedPhase*3));
  if(f*4<e.sr*.43)y+=brightness*(.025+.015*v.bloom*(1-movement))*sine(v.p*4);
  y+=clamp((v.n-45)/30,0,1)*.065*bloom*sine(v.p*.5);
  y*=v.reedAmp;
  const reedFloor=hold?.38:0;v.reedAmp=reedFloor+(v.reedAmp-reedFloor)*(v.gate===0?v.reedRelease:v.reedDecay);
  v.bloom+=(1-v.bloom)*v.bloomK;
  const wander=-3.2+1.3*sine(t*.113+v.n*.071)+.65*sine(t*.37+v.n*.19);
  v.reedPhase=(v.reedPhase+dt*(1+wander*.00057762265))%2;
  const ratios=MODAL_RATIOS,weights=MODAL_WEIGHTS;
  // Preserve resonator energy at note-off. The existing RELEASE envelope controls
  // the tail; slow internal damping lets its upper partials ring naturally.
  for(let i=0;i<4;i++){
   if(f*ratios[i]<e.sr*.43)y+=weights[i]*sine(v.modes[i])*v.modeAmp[i];
   const floor=hold?MODAL_FLOORS[i]:0,decay=v.gate===0?v.modeRelease[i]:v.modeDecay[i];
   v.modeAmp[i]=floor+(v.modeAmp[i]-floor)*decay;v.modes[i]=(v.modes[i]+dt*ratios[i])%1;
  }
  y+=.025*sine(v.q)*v.bodyAmp;
  const floor=hold?.2:0;v.bodyAmp=floor+(v.bodyAmp-floor)*(v.gate===0?v.bodyRelease:v.bodyDecay);
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

// Portable stereo insert; no Web Audio nodes, timers, allocations or shared RNG.
// Two-times oversampling + first-order antiderivative antialiasing (ADAA).
// The log-cosh primitive integrates the biased tanh curve between input samples.
class WarmDrive {
 constructor(sr){
  this.sr=sr;this.amount=0;this.out=new Float64Array(2);this.previous=new Float64Array(2);
  this.state=Array.from({length:2},()=>new Float64Array(8));this.coefficients=[];
  const w=2*Math.PI*Math.min(19000,sr*.4)/(sr*2),cs=Math.cos(w),sn=Math.sin(w);
  for(const q of [.541196100146197,1.306562964876377]){
   const a=sn/(2*q),d=1+a;
   this.coefficients.push([(1-cs)/2/d,(1-cs)/d,(1-cs)/2/d,-2*cs/d,(1-a)/d]);
  }
  this.smooth=1-Math.exp(-1/(sr*.025));this.rmsK=1-Math.exp(-1/(sr*.018));
  this.gainDown=1-Math.exp(-1/(sr*.005));this.gainUp=1-Math.exp(-1/(sr*.09));
  this.dryEnergy=0;this.wetEnergy=0;this.gain=1;this.phase=0;this.seed=0x44525645;this.supply=1;this.supplyTarget=1;this.biasWander=0;this.biasTarget=0;this.wait=0;this.breakupK=1-Math.exp(-1/(sr*.004));this.presenceLow=new Float64Array(2);this.presenceK=1-Math.exp(-2*Math.PI*1800/sr);
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 primitive(x){const a=Math.abs(x);return a+Math.log1p(Math.exp(-2*a))-Math.LN2;}
 segment(x0,x1,k,bias,offset){
  const d=x1-x0;
  return Math.abs(k*d)<1e-5?Math.tanh(k*(x0+x1)*.5+bias)-offset:
   (this.primitive(k*x1+bias)-this.primitive(k*x0+bias))/(k*d)-offset;
 }
 filter(x,ch){
  const s=this.state[ch];
  for(let j=0;j<2;j++){const c=this.coefficients[j],i=j*4,y=c[0]*x+c[1]*s[i]+c[2]*s[i+1]-c[3]*s[i+2]-c[4]*s[i+3];s[i+1]=s[i];s[i]=x;s[i+3]=s[i+2];s[i+2]=y;x=y;}
  return x;
 }
 process(l,r,target){
  this.amount+=(target-this.amount)*this.smooth;
  if(target===0&&this.amount<1e-8){
   this.amount=0;this.previous[0]=l;this.previous[1]=r;this.out[0]=l;this.out[1]=r;
   this.dryEnergy=this.wetEnergy=0;this.gain=1;for(const s of this.state)s.fill(0);return this.out;
  }
  const a=this.amount,k=1+18*a*a,broken=Math.max(0,(a-.65)/.35);
  // Bounded, deterministic bias drift creates uneven breakup, never a hard gate.
  if(--this.wait<=0){
   const starve=this.random()<.6;this.supplyTarget=starve?.5+.35*this.random():1;
   this.biasTarget=(this.random()*2-1)*(starve?1:.3);this.wait=Math.round(this.sr*(.018+.105*this.random()));
  }
  this.supply+=(this.supplyTarget-this.supply)*this.breakupK;this.biasWander+=(this.biasTarget-this.biasWander)*this.breakupK;
  const supply=1-broken*(1-this.supply),bias=.02+.4*a+broken*.75*this.biasWander;
  this.phase=(this.phase+3.7/this.sr)%1000;
  const offset=Math.tanh(bias),mix=Math.min(1,a*3);
  for(let ch=0;ch<2;ch++){
   const x=ch===0?l:r,old=this.previous[ch],mid=(old+x)*.5;
   this.filter(this.segment(old,mid,k,bias,offset)/k,ch);
   this.out[ch]=this.filter(this.segment(mid,x,k,bias,offset)/k,ch);this.previous[ch]=x;
   this.presenceLow[ch]+=this.presenceK*(x-this.presenceLow[ch]);
   this.out[ch]+=(x-this.presenceLow[ch])*.14*a/Math.max(1,this.gain);
  }
  this.dryEnergy+=this.rmsK*((l*l+r*r)*.5-this.dryEnergy);
  this.wetEnergy+=this.rmsK*((this.out[0]**2+this.out[1]**2)*.5-this.wetEnergy);
  // Bounded makeup after small-signal normalization; no initial transient boost.
  const desired=this.dryEnergy>1e-12?clamp(Math.sqrt(this.dryEnergy/(this.wetEnergy+1e-12)),.5,Math.min(k,1+3.5*a)):1;
  this.gain+=(desired-this.gain)*(desired<this.gain?this.gainDown:this.gainUp);
  // Clamp the applied gain too when a downward amount sweep lowers its ceiling.
  const gain=Math.min(this.gain,k,1+3.5*a)*supply;
  this.out[0]=l+mix*(this.out[0]*gain-l);this.out[1]=r+mix*(this.out[1]*gain-r);return this.out;
 }
}

const TAU=Math.PI*2, hz=n=>440*Math.pow(2,(n-69)/12);
// No DOM, Web Audio nodes or timers here. The same renderer runs in the worklet
// and offline verification. A native port can consume the versioned music schema.
// One spring model and one tempo-following analogue delay, shared by seven sends.
// Two dispersive waveguides: stretched allpass cascades accumulate frequency-
// dependent travel time on each reflection. This produces chirped spring echoes.
// Inspired by the allpass-waveguide literature (Parker/Bilbao, DAFx 2009), not an
// exact measurement of a commercial tank. Wet tone is outside the feedback loop.
class DrumEffects {
 constructor(sr){
  this.sr=sr;this.out=new Float64Array(2);this.active=0;this.dc=0;this.low=0;
  this.spring=[.0287,.0379].map((t,i)=>({data:new Float32Array(Math.round(sr*t)),at:0,low:0,tone:0,stages:Array.from({length:16},(_,j)=>({data:new Float32Array(Math.max(1,Math.round(sr*(.00031+i*.000043+j*.000004)))),at:0,g:.76-j*.002-i*.015}))}));
  this.delay=new Float32Array(Math.ceil(sr*1.2));this.at=0;this.delayFrames=sr*60/110*.75;this.targetFrames=this.delayFrames;this.feedback=.43;this.feedbackTarget=.43;this.legacySync=true;this.delayDC=0;this.delayDCK=1-Math.exp(-2*Math.PI*25/sr);
  this.smooth=1-Math.exp(-1/(sr*.04));this.damping=1-Math.exp(-2*Math.PI*5200/sr);this.inputDC=1-Math.exp(-2*Math.PI*160/sr);this.delayK=1-Math.exp(-2*Math.PI*2300/sr);
  this.tone=0;this.toneTarget=0;this.toneK=1-Math.exp(-2*Math.PI*1700/sr);this.springActive=0;this.delayActive=0;
 }
 setTone(value){this.toneTarget=clamp(value,-1,1);}
 tempo(bpm){this.bpm=bpm;if(this.legacySync)this.targetFrames=Math.min(this.delay.length-2,this.sr*60/bpm*.75);}
 setDelay(time,feedback,legacySync=false){this.legacySync=legacySync;this.targetFrames=legacySync?Math.min(this.delay.length-2,this.sr*60/(this.bpm||110)*.75):this.sr*clamp(time,.02,.4);this.feedbackTarget=clamp(feedback,0,.94);}
 reset(){this.active=0;this.springActive=0;this.delayActive=0;this.dc=0;this.delayDC=0;this.low=0;this.delay.fill(0);this.out.fill(0);for(const t of this.spring){t.low=0;t.tone=0;t.data.fill(0);for(const a of t.stages)a.data.fill(0);}}
 process(springSend,delaySend){
  if(Math.abs(springSend)>1e-9)this.springActive=Math.ceil(this.sr*5);if(Math.abs(delaySend)>1e-9)this.delayActive=Math.ceil(this.sr*5);
  if(this.springActive===0&&this.delayActive===0){this.active=0;this.out[0]=0;this.out[1]=0;return this.out;}
  this.out[0]=0;this.out[1]=0;
  if(this.springActive){this.springActive--;this.dc+=this.inputDC*(springSend-this.dc);const input=(springSend-this.dc)*.56;
   this.tone+=(this.toneTarget-this.tone)*this.smooth;if(Math.abs(this.toneTarget-this.tone)<1e-8)this.tone=this.toneTarget;
   const high=this.tone<0?1+.95*this.tone:1+.8*this.tone,comp=this.tone>0?1-.15*this.tone:1;
   for(let i=0;i<2;i++){
    const t=this.spring[i],v=t.data[t.at];t.low+=this.damping*(v-t.low);let x=input+t.low*.82;
    for(let j=0;j<t.stages.length;j++){const a=t.stages[j],read=a.data[a.at],y=read-a.g*x;a.data[a.at]=x+a.g*y;if(++a.at===a.data.length)a.at=0;x=y;}
    t.data[t.at]=Math.tanh(x);if(++t.at===t.data.length)t.at=0;t.tone+=this.toneK*(v-t.tone);this.out[i]=(this.tone===0?v:(t.tone+(v-t.tone)*high)*comp)*.76;
   }
  }
  if(this.delayActive){this.delayActive--;this.delayFrames+=(this.targetFrames-this.delayFrames)*this.smooth;
   const position=(this.at-this.delayFrames+this.delay.length)%this.delay.length,i=position|0,f=position-i,j=(i+1)%this.delay.length;
   const echo=this.delay[i]+(this.delay[j]-this.delay[i])*f;this.low+=this.delayK*(echo-this.low);
   this.feedback+=(this.feedbackTarget-this.feedback)*this.smooth;
   if(!this.legacySync&&Math.abs(this.low)>1e-7)this.delayActive=Math.max(this.delayActive,Math.ceil(this.sr*2));
   this.delayDC+=this.delayDCK*(this.low-this.delayDC);const repeat=this.legacySync?this.low:this.low-this.delayDC;
   this.delay[this.at]=Math.tanh(delaySend*.55+repeat*this.feedback);if(++this.at===this.delay.length)this.at=0;
   this.out[0]+=this.low*.65;this.out[1]+=this.low*.65;
  }
  this.active=Math.max(this.springActive,this.delayActive);return this.out;
 }
}

class Engine {
 constructor(sr=48000){
  this.sr=sr;this.frame=0;this.voices=[];this.maxTails=8;this.freeVoices=Array.from({length:40},()=>new VoiceSlot());this.tailCarry=new Float64Array(4);this.tailCarryDecay=Math.exp(-6.9/(sr*.004));this.sampleBanks=Object.create(null);this.steals=0;this.heldSteals=0;this.tailRecycles=0;this.seed=0x534d4348;this.preset=PRESETS[0];
  this.target={attack:.012,release:.85,reverb:.18,wooze:.1,crush:.04};this.fx={...this.target};
  this.warmDrive=new WarmDrive(sr);this.drive=0;this.paramSmooth=1-Math.exp(-1/(sr*.025));
  this.pulseSpeed=17.3;this.pulseSpeedNow=17.3;this.pulseDepth=.44;this.pulseDepthNow=.44;this.pulsePhase=0;
  this.equalizer=new InstrumentEQ(sr);this.eqLow=0;this.eqMid=0;this.eqHigh=0;this.presence=0;this.performance=new PerformanceFX(sr);this.tone=0;this.glitch=0;this.glitchTarget='all';this.glitchHold=false;this.balance=.5;this.silentCleared=false;this.balanceNow=.5;this.chordGain=1;this.arpGain=1;this.crushDry=0;this.crushWet=0;this.crushGain=1;this.crushComfort=1;this.crushHPDry=0;this.crushHPWet=0;this.crushLowDry=new Float64Array(2);this.crushLowWet=new Float64Array(2);this.crushEarK=1-Math.exp(-TAU*2200/sr);this.swing=0;this.drumCustom=false;this.editGrid=null;this.grid=factoryGrid(0);this.timeline=drumTimeline(0,false);this.gridPlayhead=-1;
  this.chord={root:0,quality:''};this.key=0;this.octave=0;this.held=false;
  this.tempo=110;this.clock=new MusicalClock(sr);this.beat=0;this.samples=[];this.missingSamples=0;this.strings=9;this.strumMode='pluck';this.strumLock=false;this.lockedNotes=null;this.strumPreset=null;this.strumPointers=new Map();this.snare='dry';this.activeSnare='dry';this.trace=null;this.drums=false;this.sequence=false;this.paused=false;this.pattern=0;this.pendingPattern=0;
  this.drumMute=new Float64Array(7).fill(1);this.drumMuteTarget=new Float64Array(7).fill(1);this.drumMuteActive=false;this.drumMuteSmooth=1-Math.exp(-1/(sr*.004));this.drumEffects=new DrumEffects(sr);this.drumWetL=0;this.drumWetR=0;this.drumControlsActive=false;
  this.drumFxMode='individual';this.drumFxSettings=Array.from({length:7},()=>({pitch:0,spring:0,delay:0}));this.globalDrumFx={pitch:0,spring:0,delay:0,tone:0};this.drumSpringTone=0;this.globalSends=new Float64Array(2);this.globalSendTargets=new Float64Array(2);
  this.drumTune=new Float64Array(7).fill(1);this.drumTuneTarget=new Float64Array(7).fill(1);this.drumSemitones=new Float64Array(7);this.drumNoise=new Float64Array(7);this.drumNoiseK=new Float64Array(7).fill(1-Math.exp(-TAU*1800/sr));this.drumSends=new Float64Array(14);this.drumSendTargets=new Float64Array(14);this.drumFxSmooth=1-Math.exp(-1/(sr*.02));this.tunedSnareK=null;
  this.drumStep=0;this.drumStart=0;this.nextDrum=0;this.drumVolume=.6;this.drumEnv=new Float64Array(7);this.drumAge=new Float64Array(7);this.drumPhase=new Float64Array(7);this.drumPitch=new Float64Array(7);this.drumLast=new Float64Array(7);this.drumBridge=new Float64Array(7);this.drumBridgeAge=new Float64Array(7);this.drumBridgeFrames=Math.round(sr*.004);this.drumBridgeAge.fill(this.drumBridgeFrames);
  this.drumDecay=[.19,.105,.027,.17,.038,.14,.085].map(t=>Math.exp(-1/(sr*t)));this.noiseLow=0;this.speaker=0;this.openChoke=false;this.noiseK=1-Math.exp(-TAU*1800/sr);this.speakerK=1-Math.exp(-TAU*3700/sr);this.snareDecay=Math.exp(-1/(sr*.32));this.chokeDecay=Math.exp(-1/(sr*.006));this.snareK={dry:1-Math.exp(-TAU*6500/sr),vintage:1-Math.exp(-TAU*6500/sr),sixties:1-Math.exp(-TAU*4500/sr),dub:1-Math.exp(-TAU*1900/sr),lofi:1-Math.exp(-TAU*6500/sr),noise:1-Math.exp(-TAU*6500/sr)};this.cachedAttack=NaN;this.cachedRelease=NaN;this.cachedCrush=NaN;
  this.progression=[this.chord];this.pendingProgression=null;this.arp={speed:1,order:0,octaves:1,length:.65,glide:0,mode:'arp'};
  this.chordLength=1;this.seqOrigin=0;this.nextArp=0;this.arpStep=0;this.currentBar=-1;this.absoluteBar=-1;this.currentChord=null;this.previousNotes=[];this.lastArp=null;
  this.lowL=0;this.lowR=0;this.heldL=0;this.heldR=0;this.crushPhase=0;this.dcX=[0,0];this.dcY=[0,0];
  this.combs=[.0297,.0371,.0411,.0437,.0307,.0329,.0393,.0451].map(t=>({data:new Float32Array(Math.round(t*sr)),i:0,low:0}));
  this.events={notes:0,drums:0,bars:0,lanes:0};this.peak=0;this.master=1;this.masterTarget=1;this.lastNote=-1;this.maxVoices=32;this.tails=[];this.voiceId=0;this.snareLow=0;this.snareBand=0;this.snareHold=0;this.snareCounter=0;this.lfo=new Float64Array(5);this.outputFilterK=1-Math.exp(-TAU*12000/sr);
 }
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 configure(s){
  if(s.fx)for(const k of Object.keys(this.target))if(Number.isFinite(s.fx[k]))this.target[k]=clamp(s.fx[k],k==='attack'?.002:k==='release'?.03:0,k==='release'?4:k==='attack'?.8:1);
  for(const k of ['tone','glitch','balance','swing','drive'])if(Number.isFinite(s[k]))this[k]=clamp(s[k],k==='tone'?-1:0,1);
  if(Number.isFinite(s.kosmische?.pulseSpeed))this.pulseSpeed=clamp(s.kosmische.pulseSpeed,.12,24);
  if(Number.isFinite(s.kosmische?.pulseDepth))this.pulseDepth=clamp(s.kosmische.pulseDepth,0,1);
  if(Number.isFinite(s.fragmentLength))this.performance.setLength(s.fragmentLength);
  if(['chord','arp','drums','all'].includes(s.glitchTarget))this.glitchTarget=s.glitchTarget;
  if(s.preset)this.preset=PRESETS.find(p=>p.id===s.preset)||this.preset;
  const eq=s.eq||s.eqByPreset?.[this.preset.id];
  if(eq||s.eqByPreset){this.eqLow=Number.isFinite(eq?.low)?clamp(eq.low,-12,12):0;this.eqMid=Number.isFinite(eq?.mid)?clamp(eq.mid,-12,12):0;this.eqHigh=Number.isFinite(eq?.high)?clamp(eq.high,-12,12):0;}
  if(Number.isFinite(s.presence))this.presence=clamp(s.presence,-1,1);
  // Saved pre-0.4.3 TONE remains exact until the user first adjusts PRESENCE.
  const legacy=Number.isFinite(s.legacyTone);if(legacy)this.tone=clamp(s.legacyTone,-1,1);
  this.equalizer.set(this.eqLow,this.eqMid,this.eqHigh,legacy?0:this.presence);
  if(Number.isFinite(s.tempo)){this.tempo=clamp(s.tempo,40,220);this.drumEffects.tempo(this.tempo);}
  if(Number.isFinite(s.key))this.key=s.key;if(Number.isFinite(s.octave))this.octave=clamp(s.octave,-1,2);
  if(Number.isFinite(s.rhythm))this.pendingPattern=clamp(s.rhythm,0,5);
  if(s.drumCustom!==undefined){const grid=s.drumEdits?.[this.pendingPattern];this.drumCustom=!!s.drumCustom&&validDrumGrid(grid);this.editGrid=this.drumCustom?grid.map(r=>r.slice()):null;}
  if(Array.isArray(s.drumMutes)){this.drumMuteActive=false;for(let i=0;i<7;i++){this.drumMuteTarget[i]=s.drumMutes[i]===true?0:1;if(this.drumMuteTarget[i]!==1||this.drumMute[i]!==1)this.drumMuteActive=true;}}
  if(['individual','global'].includes(s.drumFxMode))this.drumFxMode=s.drumFxMode;
  if(Array.isArray(s.drumFx))for(let i=0;i<7;i++)for(const key of ['pitch','spring','delay'])if(Number.isFinite(s.drumFx[i]?.[key]))this.drumFxSettings[i][key]=clamp(s.drumFx[i][key],key==='pitch'?-12:0,key==='pitch'?12:1);
  if(s.globalDrumFx)for(const key of ['pitch','spring','delay','tone'])if(Number.isFinite(s.globalDrumFx[key]))this.globalDrumFx[key]=clamp(s.globalDrumFx[key],key==='pitch'?-12:key==='tone'?-1:0,key==='pitch'?12:1);
  if(Number.isFinite(s.drumSpringTone))this.drumSpringTone=clamp(s.drumSpringTone,-1,1);
  const global=this.drumFxMode==='global';const delay=global?{time:s.globalDrumFx?.delayTime,feedback:s.globalDrumFx?.delayFeedback,legacySync:s.globalDrumFx?.delayLegacySync}:s.drumDelay;if(delay){this.drumEffects.setDelay(Number.isFinite(delay.time)?delay.time:.2,Number.isFinite(delay.feedback)?delay.feedback:.43,delay.legacySync!==false);}this.drumEffects.setTone(global?this.globalDrumFx.tone:this.drumSpringTone);
  this.globalSendTargets[0]=global?this.globalDrumFx.spring:0;this.globalSendTargets[1]=global?this.globalDrumFx.delay:0;
  for(let i=0;i<7;i++){
   const p=global?this.globalDrumFx:this.drumFxSettings[i],pitch=p.pitch;
   if(pitch!==this.drumSemitones[i]){this.drumSemitones[i]=pitch;const ratio=2**(pitch/12);this.drumTuneTarget[i]=ratio;this.drumNoiseK[i]=1-Math.exp(-TAU*1800*ratio/this.sr);if(i===1){this.tunedSnareK={};for(const kind of SNARES){const f=kind.id==='sixties'?4500:kind.id==='dub'?1900:6500;this.tunedSnareK[kind.id]=1-Math.exp(-TAU*Math.min(this.sr*.4,f*ratio)/this.sr);}}}
   this.drumSendTargets[i*2]=global?0:p.spring;this.drumSendTargets[i*2+1]=global?0:p.delay;
   if(this.drumTuneTarget[i]!==1||this.drumSendTargets[i*2]!==0||this.drumSendTargets[i*2+1]!==0){if(!this.drumControlsActive)this.drumNoise.fill(this.noiseLow);this.drumControlsActive=true;}
  }
  if(Number.isFinite(s.drumVolume))this.drumVolume=clamp(s.drumVolume,0,1);
  if(Number.isFinite(s.chordLength)){this.chordLength=clamp(s.chordLength,.1,1.25);for(const v of this.voices)if(v.origin==='seq'&&v.gate!==0)v.offTick=v.chordTick+96*this.chordLength;}
  if(s.arp){const old=this.arp;this.arp={...this.arp,...s.arp};if(this.sequence&&old.mode!==this.arp.mode){this.pendingMode=this.arp.mode;this.arp.mode=old.mode;}else if(this.sequence&&s.arp.mode===old.mode)this.pendingMode=null;if(old.speed!==this.arp.speed)this.nextArp=Math.ceil(this.clock.tick/(DIVISIONS[this.arp.speed]*24))*(DIVISIONS[this.arp.speed]*24);}
  if(['dry','vintage','sixties','dub','lofi','noise'].includes(s.snare))this.snare=s.snare;
  if([6,9,12].includes(s.strings)&&s.strings!==this.strings){this.releaseStrums();this.strings=s.strings;}
  if(['pluck','hold'].includes(s.strumMode)&&s.strumMode!==this.strumMode){this.releaseStrums();this.strumMode=s.strumMode;}
  if(s.strumPreset!==undefined){const preset=s.strumPreset==='same'?null:PRESETS.find(p=>p.id===s.strumPreset);if(preset!==undefined&&preset!==this.strumPreset){this.releaseStrums();for(const v of this.voices)if(v.origin==='strum'){v.gate=0;v.release=.025;}this.strumPreset=preset;}}
  if(s.strumLock!==undefined){
   if(s.strumLock){const valid=Array.isArray(s.lockedNotes)&&s.lockedNotes.length===12&&s.lockedNotes.every(n=>Number.isInteger(n)&&n>=24&&n<=120);if(valid&&(!this.strumLock||s.lockedNotes.some((n,i)=>n!==this.lockedNotes[i])))this.lockedNotes=s.lockedNotes.slice();else if(!this.strumLock)this.lockedNotes=this.liveStrumNotes(12);}
   const was=this.strumLock;this.strumLock=!!s.strumLock;if(was&&!this.strumLock)this.retuneStrums();
  }
  if(s.progression?.length){if(this.sequence)this.pendingProgression=structuredCopy(s.progression);else this.progression=structuredCopy(s.progression);}
 }
 message(m){
  if(m.type==='strum-lock'){if(m.on)this.lockedNotes=Array.isArray(m.notes)&&m.notes.length===12&&m.notes.every(n=>Number.isInteger(n)&&n>=24&&n<=120)?m.notes.slice():this.liveStrumNotes(12);this.strumLock=!!m.on;if(!m.on)this.retuneStrums();}
  if(m.type==='glitch-hold')this.glitchHold=!!m.on;
  if(m.type==='config')this.configure(m.state);
  if(m.type==='samples'){
   this.samples=m.zones;this.sampleBanks=Object.create(null);
   for(const z of this.samples){z.loopFade=Math.min(Math.round(z.rate*.012),Math.floor((z.loopEnd-z.loopStart)/8));const bank=this.sampleBanks[z.bank]||(this.sampleBanks[z.bank]=[]);let group=bank.find(g=>g.root===z.root);if(!group){group={root:z.root,zones:[]};bank.push(group);}group.zones.push(z);}
  }
  if(m.type==='audition'||m.type==='audition-stop'){for(const v of this.voices)if(v.origin==='audition'){v.gate=0;v.release=.025;}if(m.type==='audition'&&m.chord){this.masterTarget=1;this.playChord(m.chord,.65,'audition');}}
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
   if(m.on&&!this.drums){this.masterTarget=this.paused?0:1;if(!this.sequence)this.resetTransport();this.drums=true;}
   else if(!m.on){this.drums=false;/* Existing drum tails decay naturally. */}
  }
  if(m.type==='pause'&&this.sequence&&!this.paused){
   this.paused=true;this.held=false;this.glitchHold=false;this.masterTarget=0;
   for(const v of this.voices){v.gate=0;v.release=.008;}this.releaseStrums();
  }
  if(m.type==='resume'&&this.paused){
   this.paused=false;this.masterTarget=1;
   // Restore the current chord only for the remaining part of its existing gate.
   const offTick=this.absoluteBar*96+96*this.chordLength;
   if(this.sequence&&this.currentChord&&this.arp.mode!=='arp'&&this.clock.beat*24<offTick){
    this.previousNotes=this.playChord(this.currentChord,-1,'seq',this.previousNotes);
    for(const v of this.voices)if(v.origin==='seq'&&v.gate!==0){v.chordTick=this.absoluteBar*96;v.offTick=offTick;}
   }
  }
  if(m.type==='sequence'){
   if(m.on&&this.paused){this.message({type:'resume'});return;}
   if(m.on&&this.sequence)return;
   this.release('seq');this.release('arp');this.releaseStrums();
   if(m.on&&!this.sequence){this.release('manual');this.held=false;this.resetTransport();this.sequence=true;this.drums=true;this.masterTarget=1;}
   else if(!m.on){this.message({type:'stop'});}
  }
  if(m.type==='stop'){this.glitchHold=false;this.gridPlayhead=-1;this.drums=false;this.sequence=false;this.held=false;this.currentBar=-1;this.currentChord=null;this.masterTarget=0;for(const v of this.voices){v.gate=0;v.release=.008;}this.drumEnv.fill(0);this.releaseStrums();this.resetTransport();}
 }
 resetTransport(){
  this.paused=false;
  if(this.pendingMode){this.arp.mode=this.pendingMode;this.pendingMode=null;}
  this.clock.reset();this.performance.quantum=-1;this.beat=0;this.pattern=this.pendingPattern;this.drumStep=0;this.drumStart=0;this.nextDrum=0;
  this.seqOrigin=0;this.nextArp=0;this.arpStep=0;this.currentBar=-1;this.absoluteBar=-1;this.previousNotes=[];this.lastArp=null;
  if(this.pendingProgression){this.progression=this.pendingProgression;this.pendingProgression=null;}
 }
 liveStrumNotes(count=this.strings){return laneNotes(this.sequence?(this.currentChord||this.progression[0]):this.chord,this.sequence?0:this.key,this.octave,count);}
 strumNotes(){return this.strumLock&&this.lockedNotes?this.lockedNotes.slice(0,this.strings):this.liveStrumNotes();}
 releaseStrum(token){const held=this.strumPointers.get(token);if(held){held.voice.gate=0;this.strumPointers.delete(token);}}
 releaseStrums(){for(const token of this.strumPointers.keys())this.releaseStrum(token);}
 retuneStrums(){if(this.strumLock)return;const notes=this.strumNotes();for(const held of this.strumPointers.values()){const old=held.voice;old.gate=0;old.release=.045;held.voice=null;held.voice=this.note(notes[held.lane],old.velocity,-1,'strum');}}
 release(origin){for(const v of this.voices)if(v.origin===origin)v.gate=0;}
 note(n,velocity=.7,seconds=.2,origin='strum',from=null){
  if(this.voices.length>=this.maxVoices){
   // Protect manual/HOLD notes and attacks; prefer released or older plucked notes.
   let index=0,best=Infinity;
   for(let i=0;i<this.voices.length;i++){
    const x=this.voices[i],rank=x.gate===0?0:x.pluck?(x.age<this.sr*this.fx.attack?3:1):x.origin==='arp'?2:4;
    const score=rank*10+x.env+(x.age===0?.5:0);if(score<best){best=score;index=i;}
   }
   const old=this.voices[index];for(let i=index+1;i<this.voices.length;i++)this.voices[i-1]=this.voices[i];this.voices.length--;
   this.steals++;if(old.gate===-1&&!old.pluck)this.heldSteals++;
   for(const [token,held]of this.strumPointers)if(held.voice===old)this.strumPointers.delete(token);
   if(old.env>.00001){
    if(this.tails.length>=this.maxTails){
     let quiet=0;for(let i=1;i<this.tails.length;i++)if(this.tails[i].env<this.tails[quiet].env)quiet=i;
     const tail=this.tails[quiet],ch=tail.origin==='arp'?2:0;this.tailCarry[ch]+=tail.lastL;this.tailCarry[ch+1]+=tail.lastR;
     for(let i=quiet+1;i<this.tails.length;i++)this.tails[i-1]=this.tails[i];this.tails.length--;this.freeVoices.push(tail);this.tailRecycles++;
    }
    old.gate=0;old.release=.008;old.tailFrames=Math.round(this.sr*.008);this.tails.push(old);
   }else this.freeVoices.push(old);
  }
  const f=hz(n),start=from===null?f:hz(from),glide=from===null?0:this.arp.glide*.5,v=this.freeVoices.pop();
  v.id=++this.voiceId;v.n=n;v.f=start;v.target=f;v.glide=glide;v.cachedGlide=glide;v.glideCoef=glide>0?1-Math.exp(-1/(this.sr*glide*.2)):1;v.cachedRelease=null;v.releaseCoef=0;v.env=0;v.age=0;v.gate=seconds<0?-1:Math.round(seconds*this.sr);v.pluck=seconds===-2;v.velocity=velocity;v.origin=origin;v.preset=origin==='strum'&&this.strumPreset?this.strumPreset:this.preset;v.strumOverride=origin==='strum'&&!!this.strumPreset;v.strumAttackStep=v.strumOverride?1/(this.sr*v.preset.attack):0;v.strumReleaseCoef=v.strumOverride?Math.exp(-6.9/(this.sr*v.preset.release)):0;v.strumPluckCoef=v.strumOverride?Math.exp(-5/(this.sr*(.45+v.preset.release*2))):0;v.release=null;v.pan=(n%7-3)*.04;v.drift=0;v.driftTarget=this.random()*2-1;v.driftWait=0;v.offTick=undefined;v.tailFrames=undefined;v.lastL=0;v.lastR=0;
  prepareVoice(v,this);this.voices.push(v);this.events.notes++;this.lastNote=n;return v;
 }
 playChord(c,seconds,origin,previous=[]){
  let ns=chordNotes(c,origin==='manual'?this.key:0,this.octave);
  if(this.arp.glide>0&&previous.length)ns=voiceLead(ns,previous);
  ns.forEach((n,i)=>this.note(n,.65,seconds,origin,previous.length&&this.arp.glide>0?previous[i%previous.length]:null));return ns;
 }
 schedule(){
  if(this.paused)return;
  const position=this.clock.tick+this.clock.phase;
  // Drum swing is scheduled at fractional ticks, on the same sample clock.
  this.scheduleDrums(position);
  if(!this.clock.due)return;this.clock.due=false;const tick=this.clock.tick;
  if(!this.sequence)return;
  const bar=Math.floor(tick/96);
  if(bar!==this.absoluteBar){
   this.absoluteBar=bar;if(this.pendingMode){this.arp.mode=this.pendingMode;this.pendingMode=null;}if(this.pendingProgression){this.progression=this.pendingProgression;this.pendingProgression=null;}
   this.currentBar=bar%this.progression.length;this.currentChord=this.progression[this.currentBar];this.events.bars++;this.trace?.({kind:'bar',tick,frame:this.frame,bar:this.currentBar});
   if(this.arp.mode==='arp')this.release('seq');this.release('arp');this.arpStep=0;this.nextArp=bar*96;this.retuneStrums();
   const firstId=this.voiceId;
   if(this.arp.mode!=='arp')this.previousNotes=this.playChord(this.currentChord,-1,'seq',this.previousNotes);
   if(this.arp.mode!=='arp')for(const v of this.voices)if(v.origin==='seq'&&v.id>firstId){v.chordTick=tick;v.offTick=tick+96*this.chordLength;}
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
   for(let i=0;i<7;i++)if(hits[i]){this.drumBridge[i]=this.drumLast[i];this.drumBridgeAge[i]=0;this.drumEnv[i]=hits[i]*(.97+.06*this.random());this.drumAge[i]=0;this.drumPhase[i]=0;this.drumPitch[i]=.992+.016*this.random();if(i===1){this.activeSnare=this.snare;this.snareLow=0;this.snareBand=0;}}
   if(hits[2])this.openChoke=true;if(hits[3])this.openChoke=false;this.events.drums++;this.trace?.({kind:'drum',tick:this.nextDrum,frame:this.frame,pattern:this.pattern,step:event.step,slot:event.slot,hits});
  }
  if(++this.drumStep>=this.timeline.events.length){this.drumStep=0;this.drumStart+=this.timeline.length;this.nextDrum=this.drumStart;}
  else this.nextDrum=this.drumStart+this.timeline.events[this.drumStep].tick;
 }
 drumSample(){
  const noise=this.random()*2-1;this.noiseLow+=this.noiseK*(noise-this.noiseLow);const high=noise-this.noiseLow;let sum=0,springSend=0,delaySend=0;
  for(let i=0;i<7;i++){
   let muteGain=1;if(this.drumMuteActive){muteGain=this.drumMute[i]+(this.drumMuteTarget[i]-this.drumMute[i])*this.drumMuteSmooth;if(Math.abs(muteGain-this.drumMuteTarget[i])<1e-8)muteGain=this.drumMuteTarget[i];this.drumMute[i]=muteGain;}
   let tune=1,tunedHigh=high;
   if(this.drumControlsActive){tune=this.drumTune[i];if(tune!==this.drumTuneTarget[i]){tune+=(this.drumTuneTarget[i]-tune)*this.drumFxSmooth;if(Math.abs(tune-this.drumTuneTarget[i])<1e-8)tune=this.drumTuneTarget[i];this.drumTune[i]=tune;}
   const k=i*2;for(let j=k;j<k+2;j++){let v=this.drumSends[j];if(v!==this.drumSendTargets[j]){v+=(this.drumSendTargets[j]-v)*this.drumFxSmooth;if(Math.abs(v-this.drumSendTargets[j])<1e-8)v=this.drumSendTargets[j];this.drumSends[j]=v;}}
   this.drumNoise[i]+=this.drumNoiseK[i]*(noise-this.drumNoise[i]);tunedHigh=tune===1?high:noise-this.drumNoise[i];}
   if(this.drumEnv[i]<.000001&&this.drumBridgeAge[i]>=this.drumBridgeFrames){this.drumLast[i]=0;continue;}const t=this.drumAge[i]++/this.sr;let sound=0,f=0;
   if(i===0)f=48+48*Math.exp(-t*48);if(i===1)f=177;if(i===2||i===3)f=3371;if(i===4)f=796;if(i===5)f=91+27*Math.exp(-t*24);
   this.drumPhase[i]+=TAU*f*this.drumPitch[i]*tune/this.sr;const p=this.drumPhase[i];
   if(i===0)sound=Math.sin(p)*1.15;if(i===1)sound=this.snareSample(noise,t,p);
   if(i===2||i===3)sound=tunedHigh*.36+(Math.sin(p)+Math.sin(p*1.427))*.045;
   if(i===4)sound=(Math.sin(p)+.4*Math.sin(p*1.61))*.45;if(i===5)sound=Math.sin(p)*.7;
   if(i===6)sound=tunedHigh*.9*(t<.03?(.25+.75*Math.max(0,Math.sin(t*TAU*85*tune))):Math.exp(-(t-.03)*18));
   let value=sound*this.drumEnv[i]*Math.min(1,t/.0007);
   if(this.drumBridgeAge[i]<this.drumBridgeFrames){value+=this.drumBridge[i]*(.5+.5*Math.cos(Math.PI*this.drumBridgeAge[i]/this.drumBridgeFrames));this.drumBridgeAge[i]++;}
   this.drumLast[i]=value;const audible=value*muteGain;sum+=audible;springSend+=audible*this.drumSends[i*2];delaySend+=audible*this.drumSends[i*2+1];this.drumEnv[i]*=i===1?this.snareDecay:this.drumDecay[i];if(i===3&&this.openChoke)this.drumEnv[i]*=this.chokeDecay;
  }
  this.speaker+=this.speakerK*(Math.tanh(sum*1.4)*.55-this.speaker);const dry=this.speaker*this.drumVolume;
  for(let i=0;i<2;i++)if(this.globalSends[i]!==this.globalSendTargets[i]){this.globalSends[i]+=(this.globalSendTargets[i]-this.globalSends[i])*this.drumFxSmooth;if(Math.abs(this.globalSends[i]-this.globalSendTargets[i])<1e-8)this.globalSends[i]=this.globalSendTargets[i];}
  springSend=springSend*this.drumVolume+dry*this.globalSends[0];delaySend=delaySend*this.drumVolume+dry*this.globalSends[1];
  if(springSend!==0||delaySend!==0||this.drumEffects.active){const wet=this.drumEffects.process(springSend,delaySend);this.drumWetL=wet[0];this.drumWetR=wet[1];}else{this.drumWetL=0;this.drumWetR=0;}return dry;
 }
 snareSample(noise,t,p){
  const kind=this.activeSnare,lowK=this.drumSemitones[1]===0?this.snareK[kind]:this.tunedSnareK[kind];
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
  if(this.drumMuteActive){let active=false;for(let j=0;j<7;j++)if(this.drumMute[j]!==1||this.drumMuteTarget[j]!==1){active=true;break;}this.drumMuteActive=active;}
  // Re-enter the exact neutral path after smoothed controls settle. Check once
  // per block, avoiding seven extra smoothing/filter loops on every sample.
  if(this.drumControlsActive){let active=false;for(let i=0;i<7;i++)if(this.drumTune[i]!==1||this.drumTuneTarget[i]!==1||this.drumSends[i*2]!==0||this.drumSends[i*2+1]!==0||this.drumSendTargets[i*2]!==0||this.drumSendTargets[i*2+1]!==0){active=true;break;}this.drumControlsActive=active;}
  for(let i=0;i<left.length;i++){
   this.schedule();const t=this.frame/this.sr;
   this.pulseSpeedNow+=(this.pulseSpeed-this.pulseSpeedNow)*this.paramSmooth;this.pulseDepthNow+=(this.pulseDepth-this.pulseDepthNow)*this.paramSmooth;
   this.fx.attack+=(this.target.attack-this.fx.attack)*.002;this.fx.release+=(this.target.release-this.fx.release)*.002;this.fx.reverb+=(this.target.reverb-this.fx.reverb)*.002;this.fx.wooze+=(this.target.wooze-this.fx.wooze)*.002;this.fx.crush+=(this.target.crush-this.fx.crush)*.002;
   const woozeAmount=2*this.fx.wooze+70*this.fx.wooze*this.fx.wooze,flutter=.1*Math.sin(t*TAU*7.1);for(let k=0;k<5;k++)this.lfo[k]=woozeAmount*(.75*Math.sin(t*TAU*(.27+k*.031))+flutter);
   if(this.cachedAttack!==this.fx.attack){this.cachedAttack=this.fx.attack;this.attackStep=1/(this.sr*this.fx.attack);}if(this.cachedRelease!==this.fx.release){this.cachedRelease=this.fx.release;this.releaseCoef=Math.exp(-6.9/(this.sr*this.fx.release));this.pluckCoef=Math.exp(-5/(this.sr*(.45+this.fx.release*2)));}const attackStep=this.attackStep,releaseCoef=this.releaseCoef,pluckCoef=this.pluckCoef;
   let l=0,r=0,al=0,ar=0;this.balanceNow+=(this.balance-this.balanceNow)*.002;this.chordGain+=((this.arp.mode==='both'?Math.cos(this.balanceNow*Math.PI/2):1)-this.chordGain)*.002;this.arpGain+=((this.arp.mode==='both'?Math.sin(this.balanceNow*Math.PI/2):1)-this.arpGain)*.002;
   this.performance.begin(this.clock.tick+this.clock.phase,this.tempo,this.masterTarget>0?this.glitch:0,this.glitchTarget,this.masterTarget>0&&this.glitchHold);
   for(let j=0;j<this.voices.length+this.tails.length;j++){
    const v=j<this.voices.length?this.voices[j]:this.tails[j-this.voices.length];
    if(v.offTick!==undefined&&this.clock.tick+this.clock.phase>=v.offTick)v.gate=0;
    if(v.gate>0)v.gate--;if(v.tailFrames!==undefined&&--v.tailFrames<=0){v.env=0;continue;}
    const down=v.gate!==0,age=v.age++/this.sr,p=v.preset;
    const naturalPiano=v.pluck&&p.method==='sample'&&(p.bank==='grand'||p.bank==='upright');
    const voiceAttack=v.strumOverride?p.attack:this.fx.attack;
    if(down){if(v.pluck&&!naturalPiano&&age>voiceAttack)v.env*=v.strumOverride?v.strumPluckCoef:pluckCoef;else v.env=Math.min(1,v.env+(v.strumOverride?v.strumAttackStep:attackStep));}
    else{if(v.release!==v.cachedRelease){v.cachedRelease=v.release;v.releaseCoef=v.release?Math.exp(-6.9/(this.sr*v.release)):0;}v.env*=v.release?v.releaseCoef:v.strumOverride?v.strumReleaseCoef:releaseCoef;}
    if(v.pluck&&v.env<.00001&&age>voiceAttack)v.gate=0;
    if(v.env<.00001&&!down)continue;
    if(--v.driftWait<=0){v.driftTarget=this.random()*2-1;v.driftWait=this.sr*(.6+this.random());}v.drift+=(v.driftTarget-v.drift)/(this.sr*.3);
    if(v.glide!==v.cachedGlide){v.cachedGlide=v.glide;v.glideCoef=v.glide>0?1-Math.exp(-1/(this.sr*v.glide*.2)):1;}v.f+=(v.target-v.f)*v.glideCoef;
    const cents=this.lfo[v.n%5]+woozeAmount*.15*v.drift;
    const freq=v.f*Math.pow(2,cents/1200),tone=p.method==='sample'?sampleVoice(v,freq):voiceTone(v,this,freq,age);
    const value=tone*v.env*v.velocity*.18*(p.id==='garage'?.60:1);if(v.origin==='arp'){v.lastL=value*(1-v.pan);v.lastR=value*(1+v.pan);al+=v.lastL;ar+=v.lastR;}else{const gain=v.origin==='seq'?this.chordGain:1;v.lastL=value*(1-v.pan)*gain;v.lastR=value*(1+v.pan)*gain;l+=v.lastL;r+=v.lastR;}
   }
   l+=this.tailCarry[0];r+=this.tailCarry[1];al+=this.tailCarry[2];ar+=this.tailCarry[3];for(let j=0;j<4;j++)this.tailCarry[j]*=this.tailCarryDecay;
   const arpGain=this.arpGain;al*=arpGain;ar*=arpGain;
   let fxOut=this.performance.bus(0,l,r);l=fxOut[0];r=fxOut[1];fxOut=this.performance.bus(1,al,ar);l+=fxOut[0];r+=fxOut[1];
   if(this.drive>0||this.warmDrive.amount>0){fxOut=this.warmDrive.process(l,r,this.drive);l=fxOut[0];r=fxOut[1];}
   const crush=this.fx.crush;if(this.cachedCrush!==crush){this.cachedCrush=crush;this.crushLevels=Math.pow(2,15-11*crush);this.crushAdvance=1/(1+23*crush*crush);this.crushDrive=1+12*crush*crush;this.crushRoot=Math.sqrt(this.crushDrive);}const levels=this.crushLevels;this.crushPhase+=this.crushAdvance;
   if(this.crushPhase>=1){this.crushPhase%=1;this.heldL=Math.round(l*levels)/levels;this.heldR=Math.round(r*levels)/levels;}
   const drive=this.crushDrive,wl=Math.tanh(this.heldL*drive)/this.crushRoot,wr=Math.tanh(this.heldR*drive)/this.crushRoot;
   // Match wet RMS to dry RMS without changing quantisation, sample hold or drive.
   this.crushDry+=.0005*((l*l+r*r)*.5-this.crushDry);this.crushWet+=.0005*((wl*wl+wr*wr)*.5-this.crushWet);
   const compensation=this.crushDry>1e-10?clamp(Math.sqrt(this.crushDry/(this.crushWet+1e-12)),.16,1.5):1/Math.sqrt(drive);
   this.crushGain+=(compensation-this.crushGain)*(compensation<this.crushGain?.004:.0004);
   // Keep the original quantizer/hold/saturator. Weight excess upper-band energy
   // in compensation, not a filter: the wet stem retains its harmonic ratios.
   this.crushLowDry[0]+=this.crushEarK*(l-this.crushLowDry[0]);this.crushLowDry[1]+=this.crushEarK*(r-this.crushLowDry[1]);
   this.crushLowWet[0]+=this.crushEarK*(wl-this.crushLowWet[0]);this.crushLowWet[1]+=this.crushEarK*(wr-this.crushLowWet[1]);
   this.crushHPDry+=.0005*(((l-this.crushLowDry[0])**2+(r-this.crushLowDry[1])**2)*.5-this.crushHPDry);
   this.crushHPWet+=.0005*(((wl-this.crushLowWet[0])**2+(wr-this.crushLowWet[1])**2)*.5-this.crushHPWet);
   const raw=clamp((crush-.6)/.4,0,1),high=raw*raw*(3-2*raw);
   const ear=this.crushDry>1e-10&&this.crushWet>1e-10?clamp(Math.sqrt((1+12*this.crushHPDry/this.crushDry)/(1+12*this.crushHPWet/this.crushWet)),.45,1):1;
   const comfort=1-high*(1-ear);this.crushComfort+=(comfort-this.crushComfort)*this.paramSmooth;
   // A small clean anchor at the extreme prevents quantizer dead zones from
   // swallowing quiet notes, and retains chord definition at 100% CRUSH.
   const available=clamp(this.crushWet/(this.crushDry*.04+1e-12),0,1);
   const mix=crush*(1-.16*high)*(1-high*(1-available)),wetGain=this.crushGain*this.crushComfort;
   l+=mix*(wl*wetGain-l);r+=mix*(wr*wetGain-r);
   fxOut=this.performance.colour(l,r,this.tone);l=fxOut[0];r=fxOut[1];
   if(this.equalizer.active){fxOut=this.equalizer.process(l,r);l=fxOut[0];r=fxOut[1];}
   const cutoff=this.outputFilterK;this.lowL+=cutoff*(l-this.lowL);this.lowR+=cutoff*(r-this.lowR);l=this.lowL;r=this.lowR;
   let wetL=0,wetR=0;
   for(let j=0;j<8;j++){const c=this.combs[j],v=c.data[c.i];c.low+=(v-c.low)*.3;c.data[c.i]=(j<4?l:r)*.22+c.low*.76;c.i=(c.i+1)%c.data.length;if(j<4)wetL+=v;else wetR+=v;}
   const rv=this.fx.reverb,d=this.drumSample();fxOut=this.performance.bus(2,d+this.drumWetL,d+this.drumWetR);l=l*(1-rv*.25)+wetL*rv*.65+fxOut[0];r=r*(1-rv*.25)+wetR*rv*.65+fxOut[1];this.performance.end();
   this.master+=(this.masterTarget-this.master)*.004;
   const dl=l-this.dcX[0]+.9984*this.dcY[0],dr=r-this.dcX[1]+.9984*this.dcY[1];this.dcX[0]=l;this.dcX[1]=r;this.dcY[0]=dl;this.dcY[1]=dr;
   left[i]=Math.tanh(dl*.9)*.88*this.master;right[i]=Math.tanh(dr*.9)*.88*this.master;this.peak=Math.max(this.peak,Math.abs(left[i]),Math.abs(right[i]));
   if(!this.paused&&(this.drums||this.sequence||this.masterTarget>0&&(this.glitch>0||this.glitchHold)))this.clock.advance(this.tempo);this.beat=this.clock.beat;this.frame++;this.pulsePhase=(this.pulsePhase+this.pulseSpeedNow/this.sr)%1;
  }
  let kept=0;for(let j=0;j<this.tails.length;j++){const v=this.tails[j];if(v.tailFrames>0&&v.env>=.00001)this.tails[kept++]=v;else this.freeVoices.push(v);}this.tails.length=kept;kept=0;for(let j=0;j<this.voices.length;j++){const v=this.voices[j];if(v.gate!==0||v.env>=.00001)this.voices[kept++]=v;else this.freeVoices.push(v);}this.voices.length=kept;
  if(this.masterTarget>0)this.silentCleared=false;
  if(this.master<.00001&&this.masterTarget===0&&!this.silentCleared){this.silentCleared=true;this.performance.reset();this.drumEffects.reset();for(const v of this.voices)this.freeVoices.push(v);for(const v of this.tails)this.freeVoices.push(v);this.voices.length=0;this.tails.length=0;this.tailCarry.fill(0);for(const c of this.combs)c.data.fill(0);}
 }
 status(){return {strumLock:this.strumLock,strumNotes:this.strumNotes(),lockedNotes:this.strumLock?this.lockedNotes:null,frame:this.frame,peak:this.peak,voices:this.voices.length,tails:this.tails.length,heldStrings:this.strumPointers.size,missingSamples:this.missingSamples,tick:this.clock.tick,events:{...this.events},bar:this.currentBar,beat:Math.floor((this.beat-this.seqOrigin)%4),drumStep:this.drumStep,gridStep:this.gridPlayhead,glitchHold:this.glitchHold,mode:this.arp.mode,lastNote:this.lastNote,drums:this.drums,sequence:this.sequence,paused:this.paused};}
}
function structuredCopy(x){return JSON.parse(JSON.stringify(x));}

class WilmachordProcessor extends AudioWorkletProcessor {
 constructor(){
  super();this.engine=new Engine(sampleRate);this.counter=0;this.audioTest=null;
  this.monitor=false;this.monitorBlocks=0;this.monitorMs=0;this.monitorMax=0;this.monitorOver=0;this.monitorPeak=0;this.monitorTails=0;this.monitorGaps=0;this.monitorEnd=-1;this.monitorReported=0;
  this.monitorClock=typeof performance!=='undefined'&&typeof performance.now==='function'?()=>performance.now():null;
  this.port.onmessage=e=>{
   const m=e.data;
   if(m.type==='monitor'){this.monitor=!!m.on;if(m.on){this.monitorBlocks=0;this.monitorMs=0;this.monitorMax=0;this.monitorOver=0;this.monitorPeak=0;this.monitorTails=0;this.monitorGaps=0;this.monitorEnd=-1;this.monitorReported=0;}return;}
   if(m.type==='audio-test'){
    if(!['B','C'].includes(m.kind))return;
    this.engine.message({type:'stop'});
    this.audioTest={id:m.id,kind:m.kind,frame:0,end:Math.round(sampleRate*1.5),peak:0,enginePeak:0,channels:0,started:false,stopped:false,cancelled:false};
   }else if(m.type==='audio-test-cancel'){
    if(this.audioTest?.id===m.id)this.cancelAudioTest();
   }else{
    // A normal stop or new performance gesture always ends the temporary test.
    if(this.audioTest&&['stop','pause','resume','chord','lane','drums','sequence'].includes(m.type))this.cancelAudioTest();
    this.engine.message(m);
   }
  };
 }
 cancelAudioTest(){
  const d=this.audioTest;if(!d)return;
  d.cancelled=true;d.fadeEnd=Math.min(d.end,d.frame+Math.round(sampleRate*.025));
  // Keep the test path silent until the existing master's stop fade has cleared.
  // Removing its attenuation after only 25 ms would expose a quiet residual tail.
  d.end=Math.min(d.end,d.frame+Math.round(sampleRate*.1));
  if(d.kind==='C')this.engine.message({type:'stop'});
 }
 process(inputs,outputs){
  const o=outputs[0];if(!o?.[0])return true;
  const started=this.monitor&&this.monitorClock?this.monitorClock():0;
  const d=this.audioTest;
  if(d?.kind==='C'&&!d.cancelled){
   // Let any old performance fade before triggering a finite note. No settings change.
   if(!d.started&&d.frame>=sampleRate*.12){d.started=true;this.engine.masterTarget=1;this.engine.note(69,.6,.7,'manual');}
   if(!d.stopped&&d.frame>=sampleRate*1.1){d.stopped=true;this.engine.message({type:'stop'});}
  }
  this.engine.process(o[0],o[1]||o[0]);
  if(d){
   d.channels=o.length;d.enginePeak=Math.max(d.enginePeak,this.engine.peak);
   for(let i=0;i<o[0].length;i++){
    const frame=d.frame+i,env=Math.max(0,Math.min(1,frame/(sampleRate*.02),((d.fadeEnd??d.end)-frame)/(sampleRate*.025)));
    for(let channel=0;channel<o.length;channel++){
     const value=d.kind==='B'?Math.sin(TAU*440*frame/sampleRate)*.04:o[channel][i]*.25;
     o[channel][i]=value*env;d.peak=Math.max(d.peak,Math.abs(o[channel][i]));
    }
   }
   d.frame+=o[0].length;
   if(d.frame>=d.end){
    this.audioTest=null;
    this.port.postMessage({type:'audio-diagnostic',id:d.id,kind:d.kind,cancelled:d.cancelled,peak:d.peak,enginePeak:d.enginePeak,channels:d.channels,frames:d.frame,missingSamples:this.engine.missingSamples});
   }
  }
  if(this.monitor){
   const ms=this.monitorClock?this.monitorClock()-started:null,frames=o[0].length;
   this.monitorBlocks++;if(ms!==null){this.monitorMs+=ms;this.monitorMax=Math.max(this.monitorMax,ms);if(ms>frames/sampleRate*1000)this.monitorOver++;}
   this.monitorPeak=Math.max(this.monitorPeak,this.engine.voices.length);this.monitorTails=Math.max(this.monitorTails,this.engine.tails.length);
   const frame=typeof currentFrame==='number'?currentFrame:null;if(frame!==null){if(this.monitorEnd>=0&&frame!==this.monitorEnd)this.monitorGaps++;this.monitorEnd=frame+frames;}
   if(this.engine.frame-this.monitorReported>=sampleRate*.5){this.monitorReported=this.engine.frame;this.port.postMessage({type:'performance-diagnostic',voices:this.engine.voices.length,peakVoices:this.monitorPeak,tails:this.monitorTails,steals:this.engine.steals,heldSteals:this.engine.heldSteals,blocks:this.monitorBlocks,meanMs:ms===null?null:this.monitorMs/this.monitorBlocks,maxMs:ms===null?null:this.monitorMax,overruns:ms===null?null:this.monitorOver,frameGaps:this.monitorGaps,budgetMs:frames/sampleRate*1000,peak:this.engine.peak});}
  }
  if(++this.counter%12===0)this.port.postMessage(this.engine.status());
  return true;
 }
}
registerProcessor('wilmachord',WilmachordProcessor);
