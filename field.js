const $=s=>document.querySelector(s);
const field=$('#field'), reader=$('#reader'), sources=$('#sources'), sound=$('#sound');
const tones=[-24,-17,-12,-7,-5,0,7,12,19,24,28,31];
// Home ink, visiting ink, position, diameter, and voice in the manifesto score.
const drops=[
 ['#ffc549','#fb8149',14,38,10,8], ['#ab5fda','#be4d89',26,19,13,4],
 ['#90cb48','#21cbb7',42,27,9,7], ['#4b92ec','#41c4d7',61,14,12,6],
 ['#f255a6','#e35479',80,26,14,3], ['#a72038','#be4d89',88,54,16,0],
 ['#675bd2','#ab5fda',73,72,18,1], ['#455e96','#627ce5',55,77,21,2],
 ['#21cbb7','#2985df',40,60,16,9], ['#fb8149','#ffc549',21,73,13,10],
 ['#45a588','#90cb48',8,60,10,5], ['#81cbd6','#a77aef',58,47,8,11]
];
// Seconds per phrase and movement amplitude, from tentative to restless to settled.
const moods=[
 ['bob',4.8,8,68],['sway',3.6,6,-72],['bob',4,10,62],['sway',4.4,9,-56],
 ['tremor',5.8,1.6,-64],['tremor',4.9,2.2,50],['tremor',6.4,1.9,-74],['sway',5.2,6,50],
 ['bob',4.6,8,-58],['pulse',2.1,8,62],['bob',5.6,5,55],['bob',6.2,9,-65]
];
// Relative partial frequencies, levels and decay lengths give each material a different resonance.
const materials={
 warning: {attack:.009,tail:.24,partials:[[1,1,1],[2,.25,.7],[3,.13,.45]]},
 stars: {attack:.012,tail:3.1,partials:[[1,.85,1],[2.006,.38,.67],[3.015,.20,.48],[4.16,.09,.26]]},
 knock: {attack:.016,tail:.56,partials:[[1,1,1],[2.71,.37,.50],[4.36,.16,.28]]},
 wire: {attack:.028,tail:.85,partials:[[1,.85,1],[1.05946,.48,.82],[2.38,.23,.53]]},
 pressure: {attack:.15,tail:1.65,partials:[[1,1,1],[1.045,.49,.94],[2,.38,.73],[2.83,.2,.68]]},
 divided: {attack:.24,tail:1.38,partials:[[1,.86,1],[1.4142,.43,.91],[3.014,.23,.66]]},
 glass: {attack:.022,tail:2.8,partials:[[1,1,1],[2.01,.36,.66],[3.97,.16,.38]]},
 wood:  {attack:.013,tail:.52,partials:[[1,1,1],[2.7,.46,.32],[4.2,.13,.18]]},
 bowl:  {attack:.13,tail:3.8,partials:[[1,1,1],[2.005,.42,.76],[3.02,.18,.58]]},
 reed:  {attack:.38,tail:1.5,partials:[[1,1,1],[3,.29,.82],[5,.09,.54]]},
 felt:  {attack:.085,tail:.94,partials:[[1,1,1],[2,.55,.58],[3,.12,.29]]}
};
// Tuning follows each existing voice; short motifs distinguish neighbouring weeks.
const motifs=[
 ['glass',.5,[1,1.25,1.5,2,1.5],[.48,.36,.78,.42,2.9]],
 ['reed',1,[1,.75,1,1.125],[1.1,1.6,.82,2.4]],
 ['wood',.5,[1,1.25,1.5,1.25,2],[.37,.37,.72,.48,2.1]],
 ['bowl',1,[1,1.5,1.25,1],[1.4,.64,1.2,3.4]],
 ['knock',1,[1,1.4142,1.05946,1.4142,1],[.23,.58,.19,.33,2.55]],
 ['pressure',1,[1,.94387,.8909],[.72,1.46,3.05]],
 ['divided',1,[1,1.05946,.94387,1.4142],[.49,1.24,.36,2.85]],
 ['warning',2,[1.5,1.5,1.125,1,.75,.62],[.22,.74,.23,.47,.15,3.8]],
 ['bowl',.25,[1,1.25,1.5,2],[.95,.68,1.25,3.2]],
 ['wood',.25,[1,1.25,1.5,1.25,1.5,2],[.28,.28,.45,.28,.5,1.8]],
 ['bowl',1,[1,1.5,1.25,1],[1.25,1.25,1.25,3.5]],
 ['stars',.25,[1,1.5,2,2.5,2,1.5,1.25,2,1],[.22,.17,.34,.19,.63,.28,.27,.91,3.8]]
];
let nextNote=0,step=0,ambientStep=0;
const ambientOrder=[0,3,8,10,11];
function playAccent(i,number,level,output=master){
 const [material,register,notes]=motifs[i];
 // Week five alternates a blunt knock with a close, metallic answering voice.
 const reply=i===4 && number%2===1;
 const {attack,tail,partials}=materials[reply?'wire':material];
 const base=432*2**(tones[drops[i][5]]/12)*register*notes[number%notes.length];
 const now=ctx.currentTime;
 for(const [ratio,gain,duration] of partials){
   const osc=ctx.createOscillator(),envelope=ctx.createGain();
   const powerDown=i===7 && number%notes.length===notes.length-1;
   const end=now+attack+(powerDown?.62:tail)*duration;
   osc.frequency.setValueAtTime(base*ratio,now);
   if(i===7){
     osc.type='triangle';
     osc.frequency.exponentialRampToValueAtTime(base*ratio*(powerDown?.46:.94),end);
   }
   if(i===5)osc.frequency.exponentialRampToValueAtTime(base*ratio*.947,end);
   envelope.gain.setValueAtTime(.00001,now);
   envelope.gain.exponentialRampToValueAtTime(level*gain,now+attack);
   if(powerDown){
     for(const fraction of [.32,.57,.76]){
       const dip=now+(end-now)*fraction;
       envelope.gain.exponentialRampToValueAtTime(.0002,dip);
       envelope.gain.exponentialRampToValueAtTime(level*gain*.44*(1-fraction),dip+.012);
     }
   }
   envelope.gain.exponentialRampToValueAtTime(.00001,end);
   osc.connect(envelope).connect(output);
   osc.onended=()=>{osc.disconnect();envelope.disconnect()};
   osc.start(now);osc.stop(end+.02);
 }
}
function sequenceAccent(){
 if(!enabled||ctx.state!=='running'||ctx.currentTime<nextNote)return;
 if(active>=0){
   const rhythm=motifs[active][3], note=step++%rhythm.length;
   const accent=note===0?.14:note%2?.092:.115;
   playAccent(active,note,accent*(reader.open?1.5:.72));
   nextNote=ctx.currentTime+rhythm[note];
 }else{
   playAccent(ambientOrder[ambientStep%ambientOrder.length],ambientStep++,.034,bed);
   nextNote=ctx.currentTime+4.2;
 }
}
let current=-1,active=-1,ctx,master,bed,voices=[],enabled=false,explicitMute=false;
const phases=moods.map((_,i)=>i*.17), emphasis=moods.map(()=>0);
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const num=i=>String(i+1).padStart(2,'0');
let previous=performance.now(),lastPaint=0;
function animate(now){
 const dt=Math.min((now-previous)/1000,.1);
 previous=now;
 const draw=now-lastPaint>=30;
 const items=field.children;
 for(let i=0;i<moods.length;i++){
   const [kind,period,amount,shift]=moods[i];
   emphasis[i]+=((active===i?1:0)-emphasis[i])*(1-Math.exp(-dt*4));
   const focus=emphasis[i];
   phases[i]+=dt*(1+(kind==='tremor'?.14:.55)*focus)/period;
   const angle=phases[i]*Math.PI*2;
   const rise=(1-Math.cos(angle))*.5;
   const beat=kind==='tremor' ? Math.pow(rise,8) : rise;
   if(draw){
     const target=reader.open && current===i ? $('#print') : items[i].firstElementChild;
     let x=0,y=0;
     if(kind==='tremor'){
       x=amount*beat*Math.sin(angle*12);
       y=amount*(.42*beat*Math.cos(angle*10)+.45*Math.sin(angle));
     }else{
       y=-amount*Math.sin(angle);x=(kind==='sway'?amount:amount*.3)*Math.cos(angle);
     }
     const intensity=reduced.matches?0:1+(kind==='tremor'?.2:1)*focus;
     target.style.transform='translate('+x*intensity+'px,'+y*intensity+'px) scale('+(1+focus*.32+beat*(kind==='tremor'?.013:.045)*intensity)+')';
     target.style.filter='blur(2.5px) hue-rotate('+(reduced.matches?0:shift*Math.sin(angle*.44)*(1+focus*.35))+'deg) saturate('+(1.08+focus*.20)+')';
     if(ctx && enabled){
       const idx=drops[i][5];
       const weight=(.5+.5*Math.sin(ctx.currentTime*(.32+idx*.043)+idx))**2;
       const level=(.023+.036*weight)*(idx>8?.68:1);
       voices[i].gain.setTargetAtTime(level*(active<0?1:.76)+focus*(.038+.065*beat),ctx.currentTime,.065);
     }
   }
 }
 if(draw){lastPaint=now;sequenceAccent();}
 requestAnimationFrame(animate);
}
// Relative to the original field level: -15 dB idle, -22 dB on hover, -32 dB while reading.
function bedLevel(){return reader.open ? .025 : active>=0 ? .08 : .18}
function tune(i){
 if(i!==active){step=0;nextNote=(ctx?.currentTime||0)+(i<0?2:.12);}
 active=i;
 if(bed)bed.gain.setTargetAtTime(bedLevel(),ctx.currentTime,i<0?.42:.20);
 $('#caption').textContent=i<0?'Select an orb to read and hear its week.':'Week '+num(i)+' · '+weeks[i][0];
 field.querySelectorAll('.drop').forEach((b,j)=>b.classList.toggle('selected',i===j));
}
async function setSound(on){
 try{
   if(on && !ctx){
     if(navigator.audioSession){try{navigator.audioSession.type='playback'}catch{}}
     ctx=new (window.AudioContext||window.webkitAudioContext)();master=ctx.createGain();
     master.gain.value=0;
     bed=ctx.createGain();
     bed.gain.value=bedLevel();
     bed.connect(master);
     const limiter=ctx.createDynamicsCompressor();
     limiter.threshold.value=-11;limiter.ratio.value=4;
     master.connect(limiter).connect(ctx.destination);
     voices=drops.map(drop=>{
       const freq=432*2**(tones[drop[5]]/12),g=ctx.createGain();g.gain.value=0;g.connect(bed);
       const oscillator=ctx.createOscillator();oscillator.frequency.value=freq;oscillator.connect(g);oscillator.start();
       // Give the bass voices an audible overtone on small speakers.
       if(freq<200){
         const overtone=ctx.createOscillator(),partial=ctx.createGain();
         overtone.frequency.value=freq*2;partial.gain.value=.28;overtone.connect(partial).connect(g);overtone.start();
       }
       return g;
     });
   }
   enabled=on;
   if(on)await ctx.resume();
   master?.gain.setTargetAtTime(enabled?.82:0,ctx.currentTime,.15);
   document.querySelectorAll('.audio-toggle').forEach(b=>{
     b.setAttribute('aria-pressed',String(enabled));b.textContent=enabled?'Mute sound':'Enable sound';
   });
 }catch{enabled=false;document.querySelectorAll('.audio-toggle').forEach(b=>b.textContent='Retry sound')}
}
document.querySelectorAll('.audio-toggle').forEach(b=>b.onclick=()=>{
 explicitMute=enabled;void setSound(!enabled);
});
function tint(el,i){
 const [ink,echo,x,y,size]=drops[i];const styles={'--ink1':ink,'--ink2':echo,'--x':x+'%','--y':y+'%','--size':size,'--angle':(i*47)+'deg','--time':(13+i%5*2)+'s','--delay':(-i*2.7-1)+'s','--dx':(i%2?1:-1)*(9+i%4*3)+'px','--dy':(i%3?1:-1)*(12+i%5*3)+'px'};
 Object.entries(styles).forEach(([k,v])=>el.style.setProperty(k,v));
}
function openWeek(i){
 if(i<0||i>=weeks.length)return;current=i;const [name,subtitle,...paras]=weeks[i];
 $('#week').textContent='Week '+num(i);$('#title').textContent=name;tint(reader,i);$('#subtitle').textContent=subtitle;
 $('#writing').replaceChildren(...paras.flatMap((s,j)=>{
   const h=document.createElement('h3'),p=document.createElement('p');h.textContent=['What?','So what?','Now what?'][j];p.textContent=s;return [h,p];
 }));
 $('#prev').disabled=i===0;$('#next').disabled=i===11;
 const entering=!reader.open;
 if(entering){
   const orb=field.children[i].getBoundingClientRect();
   const x=orb.left+orb.width/2,y=orb.top+orb.height/2;
   reader.style.setProperty('--origin-x',x+'px');reader.style.setProperty('--origin-y',y+'px');
   reader.style.setProperty('--diameter',orb.width+'px');
   const distance=Math.hypot(Math.max(x,innerWidth-x),Math.max(y,innerHeight-y));
   reader.style.setProperty('--reach',Math.max(2,4*distance/orb.width));
   reader.showModal();
 }
 reader.scrollTop=0;tune(i);step=0;nextNote=(ctx?.currentTime||0)+.08;
}
reader.setAttribute('aria-labelledby','title');sources.setAttribute('aria-label','Bibliography');
weeks.forEach(([name],i)=>{
 const b=document.createElement('button');b.className='drop';tint(b,i);
 b.setAttribute('aria-label','Week '+num(i)+' · '+name);
 b.innerHTML='<span class="pigment" aria-hidden="true"></span><span class="numeral">'+num(i)+'</span>';
 b.onclick=()=>{if(!explicitMute)void setSound(true);openWeek(i)};
 for(const e of ['pointerenter','focus'])b.addEventListener(e,()=>{if(!reader.open)tune(i)});
 for(const e of ['pointerleave','blur'])b.addEventListener(e,()=>{if(!reader.open&&active===i)tune(-1)});
 field.append(b);
});
$('#bib').onclick=()=>{tune(-1);sources.showModal();sources.scrollTop=0};
$('#prev').onclick=()=>openWeek(current-1);$('#next').onclick=()=>openWeek(current+1);
document.querySelectorAll('.close').forEach(b=>{
 if(b.closest('#reader'))return;
 b.onclick=()=>b.closest('dialog').close();
});
let closingReader=false;
reader.querySelector('.close').addEventListener('click',()=>closeReader());
reader.addEventListener('cancel',event=>{
 event.preventDefault();
 closeReader();
});
function closeReader(){
 if(closingReader||!reader.open)return;
 closingReader=true;
 reader.classList.add('closing');
 window.setTimeout(()=>{
   reader.classList.remove('closing');
   closingReader=false;
   reader.close();
 },950);
}
reader.onclose=()=>{
 if(closingReader)return;
 current=-1;tune(-1);
};

requestAnimationFrame(animate);
