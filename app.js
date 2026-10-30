import * as THREE from 'three';
import { GLTFLoader } from './lib/GLTFLoader.js';
import { reply, greet, PERSONAS } from './brain.js';
const $=s=>document.querySelector(s);
const buzz=(p=12)=>{try{navigator.vibrate&&navigator.vibrate(p)}catch{}};
const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const inApp=/Instagram|FBAN|FBAV|WhatsApp|Line\/|TikTok|LinkedInApp|Twitter/i.test(navigator.userAgent);

// ---------- palettes ----------
const PALETTES=[
 {id:'shelly',name:'שלי',a1:'#FF539B',a2:'#6A43B8',base:'#251C35',dot:'#EFD081'},
 {id:'disco',name:'DISCO',a1:'#F347A0',a2:'#1689F5',base:'#202024',dot:'#D5F478'},
 {id:'lilac',name:'לילך',a1:'#B394E5',a2:'#6A43B8',base:'#1E1830',dot:'#ECE3FF'},
 {id:'night',name:'לילה',a1:'#FF3D7F',a2:'#7B3DFF',base:'#0A0A0F',dot:'#ffffff'},
 {id:'ocean',name:'אוקיינוס',a1:'#22D3EE',a2:'#2345D8',base:'#0B1220',dot:'#DDF4FF'},
 {id:'sunset',name:'שקיעה',a1:'#FB923C',a2:'#E11D48',base:'#1A0F14',dot:'#FDE68A'},
 {id:'mint',name:'מנטה',a1:'#34D399',a2:'#0EA5E9',base:'#0B1512',dot:'#D5F478'},
];
function hexToHsl(h){let r=parseInt(h.slice(1,3),16)/255,g=parseInt(h.slice(3,5),16)/255,b=parseInt(h.slice(5,7),16)/255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let H=0,S=0,L=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn;S=L>.5?d/(2-mx-mn):d/(mx+mn);H=mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4;H*=60;}return[H,S*100,L*100];}
const hsl=(h,s,l)=>`hsl(${(h+360)%360} ${s}% ${l}%)`;
function customPal(hex){const[h,s]=hexToHsl(hex);return{id:'custom',name:'שלי בחרתי',a1:hex,a2:hsl(h-45,Math.min(90,s+5),45),base:hsl(h,35,10),dot:hsl(h+30,90,80)};}
let accent=new THREE.Color('#FF539B');
function applyPal(p){const r=document.documentElement.style;r.setProperty('--a1',p.a1);r.setProperty('--a2',p.a2);r.setProperty('--base',p.base);
  const c=new THREE.Color(p.a1);r.setProperty('--glow',`rgba(${c.r*255|0},${c.g*255|0},${c.b*255|0},.38)`);accent.set(p.a1);
  if(window.__ring){__ring.material.color.copy(accent);__ret.material.color.copy(accent);}
  document.querySelector('meta[name=theme-color]').content=p.base;}
let curPal=(()=>{try{return JSON.parse(localStorage.getItem('shellyar.palette'))}catch{return null}})()||PALETTES[0];
applyPal(curPal);
function renderPals(){const box=$('#pals');box.innerHTML='';
  PALETTES.forEach(p=>{const b=document.createElement('button');b.className='pal'+(curPal.id===p.id?' on':'');
    b.innerHTML=`<span class="sw" style="background:linear-gradient(135deg,${p.a1},${p.a2})"><i style="background:${p.dot}"></i></span>${p.name}`;
    b.onclick=()=>{curPal=p;save();};box.appendChild(b);});
  const c=document.createElement('label');c.className='pal'+(curPal.id==='custom'?' on':'');
  c.innerHTML=`<span class="sw custom"><input type="color" value="${curPal.id==='custom'?curPal.a1:'#ff539b'}"></span>צבע משלי`;
  c.querySelector('input').oninput=e=>{curPal=customPal(e.target.value);applyPal(curPal);};
  c.querySelector('input').onchange=()=>save();box.appendChild(c);
  function save(){applyPal(curPal);localStorage.setItem('shellyar.palette',JSON.stringify(curPal));buzz(8);renderPals();}}
const openPal=()=>{renderPals();$('#palSheet').hidden=false;$('#palBg').hidden=false;};
const closePal=()=>{$('#palSheet').hidden=true;$('#palBg').hidden=true;};
$('#palBtn').onclick=openPal;$('#palBtn2').onclick=()=>{closeSheet();openPal();};$('#palBg').onclick=closePal;

// ---------- characters ----------
const CHARS=[
 {id:'robot',name:'רובי',url:'models/RobotExpressive.glb',thumb:'thumbs/RobotExpressive.png',h:0.32},
 {id:'pelican',name:'פלי השקנאי',sprite:{body:'sprites/pelican-body.webp',head:'sprites/pelican-head.webp',w:807,h:900,pivot:[455,245]},thumb:'thumbs/pelican.png',h:0.36,tag:'מהברנד'},
 {id:'chameleon',name:'זיקי הזיקית',sprite:{body:'sprites/chameleon-body.webp',head:'sprites/chameleon-head.webp',w:900,h:700,pivot:[590,255]},thumb:'thumbs/chameleon.png',h:0.24,tag:'מהברנד'},
 {id:'fox',name:'פוקסי',url:'models/Fox.glb',thumb:'thumbs/Fox.png',h:0.22},
 {id:'soldier',name:'מקס',url:'models/Soldier.glb',thumb:'thumbs/Soldier.png',h:0.36},
];
let sel=CHARS[0];
const car=$('#carousel');
function renderCarousel(){car.innerHTML='';
  CHARS.forEach(c=>{const b=document.createElement('button');b.className='card glass'+(c===sel?' on':'');
    b.innerHTML=(c.tag?`<span class="tag">${c.tag}</span>`:'')+(c.thumb?`<img src="${c.thumb}" alt="">`:`<div class="add"><svg class="i"><use href="#i-cube"/></svg></div>`)+`<span>${c.name}</span>`;
    b.onclick=()=>{sel=c;buzz(8);renderCarousel();};car.appendChild(b);});
  const up=document.createElement('button');up.className='card glass';up.innerHTML='<div class="add"><svg class="i"><use href="#i-plus"/></svg></div><span>דמות משלי</span>';
  up.onclick=()=>$('#file').click();car.appendChild(up);}
renderCarousel();
$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;e.target.value='';
  if(!/\.glb$/i.test(f.name)){showErr('קובץ לא נתמך','צריך קובץ GLB אחד (מודל עם הטקסטורות בתוכו).');return;}
  const c={id:'custom'+Date.now(),persona:'custom',name:f.name.replace(/\.glb$/i,'').slice(0,12),url:URL.createObjectURL(f),h:0.3};
  CHARS.push(c);sel=c;renderCarousel();if(running){await swapChar();closeSheet();}};

function showErr(t,b){$('#errT').textContent=t;$('#errB').innerHTML=b;$('#err').hidden=false;}
$('#errOk').onclick=()=>$('#err').hidden=true;

// ---------- three ----------
const canvas=$('#c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setClearColor(0x000000,0);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(55,1,0.01,50);
scene.add(new THREE.HemisphereLight(0xffffff,0x606070,2.0));
const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(0.6,2,0.8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-1.5,right:1.5,top:1.5,bottom:-1.5,near:0.1,far:6});sun.shadow.radius=6;sun.shadow.bias=-0.0005;
scene.add(sun);scene.add(sun.target);
const shadowPlane=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.ShadowMaterial({opacity:.4}));
shadowPlane.rotation.x=-Math.PI/2;shadowPlane.receiveShadow=true;scene.add(shadowPlane);
const blobTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);})();
const blob=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false}));blob.rotation.x=-Math.PI/2;
const ring=new THREE.Mesh(new THREE.RingGeometry(.035,.05,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:accent,transparent:true,opacity:.9}));ring.visible=false;scene.add(ring);
const reticle=new THREE.Mesh(new THREE.RingGeometry(.06,.08,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:accent}));reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
window.__ring=ring;window.__ret=reticle;applyPal(curPal);

function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
['resize','orientationchange'].forEach(e=>addEventListener(e,()=>setTimeout(resize,60)));
window.visualViewport&&visualViewport.addEventListener('resize',resize);resize();
['gesturestart','gesturechange','dblclick'].forEach(e=>document.addEventListener(e,ev=>ev.preventDefault(),{passive:false}));
document.addEventListener('touchmove',e=>{if(!e.target.closest('.carousel,.sheet'))e.preventDefault();},{passive:false});

// ---------- character loading ----------
const loader=new GLTFLoader();const texLoader=new THREE.TextureLoader();const clock=new THREE.Clock();
let ch=null;
const findA=(acts,keys)=>{const n=Object.keys(acts);for(const k of keys){const m=n.find(x=>x.toLowerCase().includes(k));if(m)return acts[m];}return null;};
function baseObj(c,inner,fp){const root=new THREE.Group();root.add(inner);const b=blob.clone();b.scale.setScalar(Math.max(fp*1.3,c.h*0.6));b.position.y=0.002;root.add(b);return root;}
async function loadGLB(c){
  const g=await loader.loadAsync(c.url);const model=g.scene;
  model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});
  model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model,true);const size=box.getSize(new THREE.Vector3());
  model.scale.setScalar(c.h/(size.y||1));model.updateMatrixWorld(true);box.setFromObject(model,true);
  const ctr=box.getCenter(new THREE.Vector3());model.position.set(-ctr.x,-box.min.y,-ctr.z);
  const fp=Math.max(box.max.x-box.min.x,box.max.z-box.min.z);
  const inner=new THREE.Group();inner.add(model);const root=baseObj(c,inner,fp);
  const mixer=new THREE.AnimationMixer(model);const acts={};g.animations.forEach(cl=>acts[cl.name]=mixer.clipAction(cl));
  const map={idle:findA(acts,['idle','survey','stand'])||Object.values(acts)[0]||null,walk:findA(acts,['walking','walk','run']),
    jump:findA(acts,['jump']),dance:findA(acts,['dance']),wave:findA(acts,['wave','hello']),react:findA(acts,['yes','thumbs','wave','jump'])};
  ['jump','wave','react'].forEach(k=>{const a=map[k];if(a){a.setLoop(THREE.LoopOnce);a.clampWhenFinished=true;}});
  let head=null;model.traverse(o=>{if(!head&&o.isBone&&/head/i.test(o.name))head=o;});
  return{root,inner,mixer,map,head,height:c.h};
}
async function loadSprite(c){
  const s=c.sprite;const [tb,th]=await Promise.all([texLoader.loadAsync(s.body),texLoader.loadAsync(s.head)]);
  [tb,th].forEach(t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;});
  const H=c.h,W=H*s.w/s.h;
  const mat=t=>new THREE.MeshBasicMaterial({map:t,transparent:true,alphaTest:0.4,side:THREE.DoubleSide});
  const bill=new THREE.Group();                 // billboard (faces camera)
  const flip=new THREE.Group();bill.add(flip);   // horizontal flip / card spin
  const squash=new THREE.Group();flip.add(squash);
  const body=new THREE.Mesh(new THREE.PlaneGeometry(W,H),mat(tb));body.position.y=H/2;squash.add(body);
  // head pivot at neck
  const px=(s.pivot[0]/s.w-0.5)*W, py=(1-s.pivot[1]/s.h)*H;
  const headPivot=new THREE.Group();headPivot.position.set(px,py,0.002);squash.add(headPivot);
  const head=new THREE.Mesh(new THREE.PlaneGeometry(W,H),mat(th));head.position.set(-px,H/2-py,0);headPivot.add(head);
  // soft back-shadow sprite to fake thickness
  const back=new THREE.Mesh(new THREE.PlaneGeometry(W,H),new THREE.MeshBasicMaterial({map:tb,transparent:true,alphaTest:0.4,color:0x000000,opacity:.18,depthWrite:false}));
  back.position.set(0.006,H/2-0.004,-0.004);squash.add(back);
  const inner=new THREE.Group();inner.add(bill);const root=baseObj(c,inner,W*0.7);
  const mixer=new THREE.AnimationMixer(new THREE.Object3D());
  return{root,inner,mixer,map:{},sprite:{bill,flip,squash,headPivot,W,H,face:1},height:H};
}
async function loadChar(c){
  $('#loading').hidden=false;
  try{const o=c.sprite?await loadSprite(c):await loadGLB(c);
    Object.assign(o,{c,persona:c.persona||c.id,active:null,state:'idle',target:null,proc:null,scale:1,danceT:0,talk:0,t:0});
    o.mixer.addEventListener('finished',()=>{if(o.state!=='walk')play('idle',o);});
    if(o.map.idle)play('idle',o);return o;
  }catch(e){showErr('לא הצלחתי לטעון את הדמות','ייתכן שהקובץ פגום או לא בפורמט GLB.<br><small>'+e.message+'</small>');throw e;}
  finally{$('#loading').hidden=true;}
}
function play(name,o=ch){if(!o)return;o.state=name;const target=o.map[name]||o.map.idle;if(!target)return;
  if(target!==o.active){target.reset().setEffectiveWeight(1).fadeIn(.25).play();if(o.active)o.active.fadeOut(.25);o.active=target;}
  else if(target.loop===THREE.LoopOnce)target.reset().play();}
function setScale(s){if(!ch)return;ch.scale=s;ch.root.scale.setScalar(s);$('#size').value=s;}
const camPos=()=>{const v=new THREE.Vector3();camera.getWorldPosition(v);return v;};
function faceCamera(){const cp=camPos();ch.root.rotation.y=Math.atan2(cp.x-ch.root.position.x,cp.z-ch.root.position.z);}
function place(p){if(!ch)return;ch.root.position.copy(p);ch.target=null;ring.visible=false;if(!ch.root.parent)scene.add(ch.root);faceCamera();
  shadowPlane.position.y=p.y+0.001;sun.position.set(p.x+0.6,p.y+2,p.z+0.8);sun.target.position.copy(p);
  ch.inner.scale.setScalar(0.01);ch.proc={type:'pop',t:0};play('idle');}
function walkTo(p){if(!ch||!ch.root.parent)return;ch.target=p.clone();ch.target.y=ch.root.position.y;ring.position.copy(ch.target);ring.position.y+=0.003;ring.visible=true;
  if(ch.map.walk)play('walk');else ch.state='walk';}
function act(a){
  if(!ch||!ch.root.parent){hint('קודם געי במסך כדי להעמיד את הדמות');return;}buzz(15);
  if(a==='come'){const cp=camPos();const r=ch.root.position;const d=new THREE.Vector3(cp.x-r.x,0,cp.z-r.z);
    const L=d.length(),stop=mode==='xr'?0.45:0.75;if(L>stop+0.03){d.setLength(L-stop);walkTo(r.clone().add(d));}else{ch.proc={type:'hop',t:0};}return;}
  if(a==='spin'){ch.proc={type:'spin',t:0};return;}
  if(a==='bigger'){setScale(Math.min(3,ch.scale*1.25));return;}
  if(a==='smaller'){setScale(Math.max(.3,ch.scale/1.25));return;}
  if(a==='hello'){say(greet(ch.persona));act('wave');return;}
  ch.target=null;ring.visible=false;
  if(a==='jump'){ch.proc={type:'hop',t:0,d:ch.map.jump?0.9:0.55};if(ch.map.jump)play('jump');return;}
  if(a==='dance'){if(ch.map.dance){play('dance');ch.danceT=4;}else{if(ch.map.walk)play('walk');ch.proc={type:'dance',t:0};}return;}
  if(a==='wave'){faceCamera();if(ch.map.wave)play('wave');else ch.proc={type:'wiggle',t:0};return;}
  if(a==='react'){ch.proc={type:'hop',t:0,d:.55};if(ch.map.react)play('react');return;}
}
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
const tmpV=new THREE.Vector3();
function update(dt){
  if(!ch)return;dt=Math.min(dt,0.05);ch.t+=dt;ch.mixer.update(dt);const r=ch.root,inn=ch.inner,sp=ch.sprite;
  if(ch.state==='dance'&&ch.danceT>0){ch.danceT-=dt;if(ch.danceT<=0)play('idle');}
  let moving=false;
  if(ch.target){const d=ch.target.clone().sub(r.position);d.y=0;const L=d.length();
    if(L<0.01){ch.target=null;ring.visible=false;play('idle');faceCamera();}
    else{moving=true;const want=Math.atan2(d.x,d.z);let df=want-r.rotation.y;df=Math.atan2(Math.sin(df),Math.cos(df));r.rotation.y+=df*Math.min(1,dt*7);
      const speed=0.22*ch.scale*(Math.abs(df)>1.2&&!sp?0.25:1);r.position.addScaledVector(d.normalize(),Math.min(L,speed*dt));
      if(sp){const right=tmpV.set(1,0,0).applyQuaternion(camera.quaternion);const s=Math.sign(d.dot(right));if(s)sp.face=s;}}
    ring.material.opacity=0.5+0.4*Math.sin(performance.now()/150);}
  const p=ch.proc;let spinA=0;
  if(p){p.t+=dt;
    if(p.type==='pop'){const k=Math.min(p.t/0.45,1);const s=k<1?1+Math.sin(k*Math.PI)*0.15:1;inn.scale.setScalar(Math.max(0.01,ease(k)*s));if(k>=1){inn.scale.setScalar(1);ch.proc=null;}}
    else if(p.type==='hop'){const D=p.d||0.55,k=Math.min(p.t/D,1);inn.position.y=Math.sin(k*Math.PI)*0.09;if(sp)sp.squash.scale.y=1+Math.sin(k*Math.PI)*0.06;if(k>=1){inn.position.y=0;ch.proc=null;}}
    else if(p.type==='spin'){const k=Math.min(p.t/0.9,1);spinA=ease(k)*Math.PI*2;if(!sp)inn.rotation.y=spinA;if(k>=1){inn.rotation.y=0;spinA=0;ch.proc=null;}}
    else if(p.type==='wiggle'){inn.rotation.z=Math.sin(p.t*18)*0.12*(1-p.t);if(p.t>1){inn.rotation.z=0;ch.proc=null;}}
    else if(p.type==='dance'){if(sp){spinA=p.t*7;inn.rotation.z=Math.sin(p.t*10)*0.1;}else inn.rotation.y+=dt*5;inn.position.y=Math.abs(Math.sin(p.t*9))*0.03;
      if(p.t>3){inn.rotation.y=0;inn.rotation.z=0;inn.position.y=0;ch.proc=null;play('idle');}}
  }
  const talking=ch.talk>0;
  if(sp){ // 2.5D sprite: billboard + procedural motion
    const cp=camPos();const yaw=Math.atan2(cp.x-r.position.x,cp.z-r.position.z);
    sp.bill.rotation.y=yaw-r.rotation.y-inn.rotation.y;
    sp.flip.scale.x+=((sp.face)-sp.flip.scale.x)*Math.min(1,dt*10);
    if(spinA)sp.flip.scale.x=Math.cos(spinA)*sp.face;
    const t=ch.t;
    if(moving){sp.squash.rotation.z=Math.sin(t*12)*0.07;sp.squash.position.y=Math.abs(Math.sin(t*12))*0.012;}
    else if(!p||p.type!=='hop'){sp.squash.rotation.z*=0.85;sp.squash.position.y*=0.8;sp.squash.scale.y=1+Math.sin(t*2.2)*0.012;}
    sp.headPivot.rotation.z=talking?Math.sin(t*16)*0.07+Math.sin(t*5)*0.03:Math.sin(t*1.3)*0.025;
    if(talking)sp.squash.scale.y=1+Math.abs(Math.sin(t*16))*0.02;
  }else if(talking){
    if(ch.head){ch.head.rotation.x+=Math.sin(ch.t*16)*0.12;ch.head.rotation.y+=Math.sin(ch.t*5)*0.08;}
    else inn.position.y=Math.abs(Math.sin(ch.t*16))*0.008;
  }
  positionBubble();
}
let hintT;function hint(t,ms=3500){const e=$('#hint');e.textContent=t;e.style.opacity=1;clearTimeout(hintT);if(ms)hintT=setTimeout(()=>e.style.opacity=0,ms);}

// ---------- speech bubble + TTS ----------
const bubble=$('#bubble');let bubbleHideT;
function positionBubble(){if(bubble.style.opacity==='0'||!ch||!ch.root.parent)return;
  const top=ch.root.position.clone();top.y+=(ch.height*ch.scale)+0.02;const v=top.project(camera);
  let x=(v.x+1)/2*innerWidth,y=(1-v.y)/2*innerHeight-12;const w=bubble.offsetWidth/2;
  x=Math.max(w+10,Math.min(innerWidth-w-10,x));y=Math.max(bubble.offsetHeight+70,Math.min(innerHeight-260,y));
  bubble.style.left=x+'px';bubble.style.top=y+'px';}
let voiceOn=true,heVoice=null;
function pickVoice(){const vs=(window.speechSynthesis&&speechSynthesis.getVoices())||[];const he=vs.filter(v=>/^he|^iw/i.test(v.lang));
  const score=v=>(/natural|neural|online|premium|enhanced/i.test(v.name)?4:0)+(/google/i.test(v.name)?2:0)+(/carmit/i.test(v.name)?3:0)+(v.localService?1:0);
  heVoice=he.sort((a,b)=>score(b)-score(a))[0]||null;}
if(window.speechSynthesis){pickVoice();speechSynthesis.onvoiceschanged=pickVoice;}
function say(text){
  if(!ch)return;const persona=PERSONAS[ch.persona]||PERSONAS.custom;
  $('#who').textContent=persona.name;$('#btext').textContent=text;bubble.style.opacity=1;positionBubble();clearTimeout(bubbleHideT);
  const est=Math.max(1800,text.length*75);
  const done=()=>{ch&&(ch.talk=0);$('#mic').classList.remove('talk');bubbleHideT=setTimeout(()=>bubble.style.opacity=0,1600);resumeRec();};
  pauseRec();ch.talk=1;$('#mic').classList.add('talk');
  if(voiceOn&&window.speechSynthesis){
    speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='he-IL';if(heVoice)u.voice=heVoice;u.pitch=persona.pitch||1;u.rate=persona.rate||1;
    let ended=false;const fin=()=>{if(!ended){ended=true;done();}};u.onend=fin;u.onerror=fin;speechSynthesis.speak(u);
    setTimeout(()=>{if(!speechSynthesis.speaking)fin();},est+4000); // safety
  }else setTimeout(done,est);
}
window.__say=say;

// ---------- camera mode ----------
let mode=null,running=false,stream=null;
const floor=new THREE.Plane(new THREE.Vector3(0,1,0),0);const ray=new THREE.Raycaster();
const ndcOf=(x,y)=>new THREE.Vector2(x/innerWidth*2-1,-(y/innerHeight)*2+1);
function floorHit(n){ray.setFromCamera(n,camera);const p=new THREE.Vector3();if(!ray.ray.intersectPlane(floor,p))return null;
  p.z=THREE.MathUtils.clamp(p.z,-3,0.75);p.x=THREE.MathUtils.clamp(p.x,-1.5,1.5);return p;}
function hitsChar(n){if(!ch||!ch.root.parent)return false;ray.setFromCamera(n,camera);return ray.intersectObject(ch.inner,true).length>0;}
async function openCamera(){
  if(!window.isSecureContext)throw Object.assign(new Error('insecure'),{name:'Insecure'});
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw Object.assign(new Error('nomedia'),{name:'NoMedia'});
  const tries=[{video:{facingMode:{exact:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false},{video:{facingMode:'environment'},audio:false},{video:true,audio:false}];
  let last;for(const c of tries){try{return await navigator.mediaDevices.getUserMedia(c);}catch(e){last=e;if(e.name==='NotAllowedError'||e.name==='SecurityError')throw e;}}
  throw last;}
function camErr(e){const n=e&&e.name;let b='';
  if(inApp)b='נראה שהקישור נפתח בתוך אפליקציה (וואטסאפ או אינסטגרם). פתחי אותו ב-<b>'+(isIOS?'Safari':'Chrome')+'</b> דרך התפריט, "פתיחה בדפדפן".';
  else if(n==='NotAllowedError'||n==='SecurityError')b=isIOS?'בהגדרות, Safari, מצלמה: בחרי <b>לשאול</b> או <b>לאפשר</b>. או לחצי על <b>aA</b> בשורת הכתובת, הגדרות אתר, מצלמה. ואז רענני.':'לחצי על סמל המנעול ליד הכתובת, הרשאות, מצלמה, <b>אפשר</b>, ואז רענני.';
  else if(n==='NotFoundError'||n==='OverconstrainedError')b='לא נמצאה מצלמה במכשיר.';
  else if(n==='NotReadableError')b='המצלמה תפוסה באפליקציה אחרת. סגרי אותה ונסי שוב.';
  else if(n==='Insecure')b='המצלמה עובדת רק בכתובת https.';
  else if(n==='NoMedia')b='הדפדפן הזה לא תומך במצלמה. נסי Safari באייפון או Chrome באנדרואיד.';
  else b='שגיאה: '+(e&&e.message);
  showErr('אין גישה למצלמה',b+'<br><br><small>אפשר להמשיך בלי מצלמה כדי לראות את הדמות.</small>');}
function unlockTTS(){try{if(window.speechSynthesis){const u=new SpeechSynthesisUtterance(' ');u.volume=0;speechSynthesis.speak(u);}}catch{}}
async function startCam(){
  buzz(10);unlockTTS();
  try{stream=await openCamera();const v=$('#video');v.srcObject=stream;v.muted=true;await v.play().catch(()=>{});}
  catch(e){camErr(e);document.body.style.background='linear-gradient(#3a3550,#16141f)';}
  mode='cam';running=true;
  camera.position.set(0,0.6,1.0);camera.lookAt(0,0.02,-0.25);resize();camera.updateMatrixWorld(true);
  ch=await loadChar(sel).catch(()=>null);if(!ch){running=false;return;}window.__ch=ch;
  $('#start').hidden=true;$('#hud').hidden=false;
  place(floorHit(new THREE.Vector2(0,-0.38)));
  hint('געי במסך כדי להעמיד את הדמות',4000);
  setTimeout(()=>say(greet(ch.persona)),900);
  renderer.setAnimationLoop(()=>{update(clock.getDelta());renderer.render(scene,camera);});
}
async function swapChar(){const old=ch;const pos=old?old.root.position.clone():null;const s=old?old.scale:1;
  const n=await loadChar(sel).catch(()=>null);if(!n)return;if(old)scene.remove(old.root);ch=n;window.__ch=ch;
  if(pos){place(pos);setScale(s);}setTimeout(()=>say(greet(ch.persona)),600);}
const ptrs=new Map();let pinch0=0,scale0=1,dragging=false,down=null;
canvas.addEventListener('pointerdown',e=>{if(mode!=='cam')return;e.preventDefault();ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});try{canvas.setPointerCapture(e.pointerId)}catch{}
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y)||1;scale0=ch?ch.scale:1;dragging=false;down=null;}
  else if(ptrs.size===1){down={x:e.clientX,y:e.clientY,t:performance.now(),onChar:hitsChar(ndcOf(e.clientX,e.clientY))};dragging=false;}});
canvas.addEventListener('pointermove',e=>{if(mode!=='cam'||!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2&&ch){const [a,b]=[...ptrs.values()];setScale(THREE.MathUtils.clamp(scale0*Math.hypot(a.x-b.x,a.y-b.y)/pinch0,0.3,3));return;}
  if(down&&down.onChar&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>10){dragging=true;const p=floorHit(ndcOf(e.clientX,e.clientY));if(p){ch.root.position.copy(p);ch.target=null;ring.visible=false;}}});
const tapLines=()=>pick(['היי, זה מדגדג!','כן? אני מקשיבה.','אפשר לדבר איתי, פשוט לחצי על המיקרופון.','עוד פעם!']);
const pick=a=>a[Math.floor(Math.random()*a.length)];
canvas.addEventListener('pointerup',e=>{if(mode!=='cam')return;const wasMulti=ptrs.size>1;ptrs.delete(e.pointerId);if(wasMulti||!down)return;
  const d=down;down=null;if(dragging){dragging=false;faceCamera();return;}
  if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>12||performance.now()-d.t>600)return;
  if(d.onChar){act('react');const p=PERSONAS[ch.persona]||PERSONAS.custom;say(p.g==='f'?tapLines():tapLines().replace('מקשיבה','מקשיב'));return;}
  const p=floorHit(ndcOf(e.clientX,e.clientY));if(!p)return;buzz(8);$('#hint').style.opacity=0;
  if(!ch.root.parent)place(p);else walkTo(p);});
canvas.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);down=null;dragging=false;});

// ---------- WebXR (Android Chrome) ----------
async function startXR(){
  unlockTTS();ch=await loadChar(sel);window.__ch=ch;
  const s=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay'],domOverlay:{root:document.body}});
  mode='xr';running=true;renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');await renderer.xr.setSession(s);
  $('#start').hidden=true;$('#hud').hidden=false;$('#shot').hidden=true;hint('הזיזי את הטלפון לאט עד שתופיע טבעת, ואז געי במסך',0);
  const hs=await s.requestHitTestSource({space:await s.requestReferenceSpace('viewer')});
  document.body.addEventListener('beforexrselect',e=>{if(e.target.closest('button,.sheet,input'))e.preventDefault();});
  s.addEventListener('select',e=>{const pose=e.frame.getPose(e.inputSource.targetRaySpace,renderer.xr.getReferenceSpace());
    if(pose&&ch.root.parent){const m=new THREE.Matrix4().fromArray(pose.transform.matrix);ray.set(new THREE.Vector3().setFromMatrixPosition(m),new THREE.Vector3(0,0,-1).transformDirection(m));
      if(ray.intersectObject(ch.inner,true).length){act('react');return;}}
    if(!reticle.visible)return;buzz(10);const p=new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
    if(!ch.root.parent){place(p);hint('געי בדמות או במשטח, או דברי איתה',3500);setTimeout(()=>say(greet(ch.persona)),700);}else walkTo(p);});
  s.addEventListener('end',()=>location.reload());
  renderer.setAnimationLoop((t,frame)=>{if(frame){const r=frame.getHitTestResults(hs);if(r.length){reticle.visible=true;reticle.matrix.fromArray(r[0].getPose(renderer.xr.getReferenceSpace()).transform.matrix);}else reticle.visible=false;}
    update(clock.getDelta());renderer.render(scene,camera);});
}
async function startQL(){if(sel.sprite){showErr('לא זמין לדמות הזו','תצוגת Quick Look עובדת רק עם דמויות תלת ממד (רובי, פוקסי, מקס, או קובץ GLB). את פלי וזיקי אפשר לפתוח במצב מצלמה.');return;}
  await import('./lib/model-viewer.min.js');const mv=document.createElement('model-viewer');
  Object.entries({src:sel.url,ar:'','ar-modes':'quick-look scene-viewer webxr',autoplay:'','camera-controls':'','shadow-intensity':'1'}).forEach(([k,v])=>mv.setAttribute(k,v));
  mv.innerHTML='<button slot="ar-button" class="cta" style="position:absolute;bottom:calc(env(safe-area-inset-bottom) + 24px);left:5%;width:90%">הצגה בחדר שלי</button>';
  $('#mv').querySelector('model-viewer')?.remove();$('#mv').appendChild(mv);$('#mv').hidden=false;}
$('#mvClose').onclick=()=>$('#mv').hidden=true;

// ---------- capture ----------
async function capture(){
  buzz([10,40,10]);const v=$('#video'),dpr=Math.min(devicePixelRatio,2),W=Math.round(innerWidth*dpr),H=Math.round(innerHeight*dpr);
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  if(v.videoWidth){const s=Math.max(W/v.videoWidth,H/v.videoHeight),w=v.videoWidth*s,h=v.videoHeight*s;g.drawImage(v,(W-w)/2,(H-h)/2,w,h);}else{g.fillStyle='#222';g.fillRect(0,0,W,H);}
  renderer.render(scene,camera);g.drawImage(canvas,0,0,W,H);
  g.font=`700 ${Math.round(14*dpr)}px -apple-system,sans-serif`;g.fillStyle='rgba(255,255,255,.85)';g.textAlign='left';g.fillText('Shelly AR',14*dpr,H-16*dpr);
  const fl=$('#flash');fl.style.opacity=.85;setTimeout(()=>fl.style.opacity=0,120);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.92));const name='shelly-ar-'+Date.now()+'.jpg';const file=new File([blob],name,{type:'image/jpeg'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'Shelly AR'});return;}catch(e){if(e.name==='AbortError')return;}}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();hint('התמונה נשמרה');}

// ---------- voice conversation ----------
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null,listening=false,paused=false,lang='he-IL',heardT;
function heard(t){const e=$('#heard');e.textContent=t;e.style.opacity=1;clearTimeout(heardT);heardT=setTimeout(()=>e.style.opacity=0,2500);}
function handleUtterance(t){const r=reply(t,ch?ch.persona:'custom');if(r.act)act(r.act);if(r.say)say(r.say);}
window.__talk=handleUtterance;
function startRec(){if(!listening||paused)return;rec=new SR();rec.lang=lang;rec.continuous=false;rec.interimResults=true;
  rec.onresult=e=>{const r=e.results[e.results.length-1];const t=r[0].transcript.trim();heard('"'+t+'"');if(r.isFinal&&t)handleUtterance(t);};
  rec.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){stopMic();showErr('אין גישה למיקרופון',isIOS?'בהגדרות, Safari, מיקרופון: לאפשר. בנוסף בהגדרות, כללי, מקלדת: להפעיל הכתבה.':'אשרי גישה למיקרופון בהגדרות האתר.');}};
  rec.onend=()=>{rec=null;if(listening&&!paused)setTimeout(startRec,200);};
  try{rec.start();}catch{}}
function pauseRec(){paused=true;try{rec&&rec.abort()}catch{}}
function resumeRec(){paused=false;if(listening&&!rec)setTimeout(startRec,250);}
function stopMic(){listening=false;$('#mic').classList.remove('on');try{rec&&rec.abort()}catch{}}
$('#mic').onclick=()=>{buzz(15);if(!SR){showErr('אין זיהוי דיבור בדפדפן הזה','אפשר להשתמש בכפתורים למטה. זיהוי דיבור עובד ב-Chrome ובספארי.');return;}
  if(listening){stopMic();return;}listening=true;paused=false;$('#mic').classList.add('on');heard(lang==='he-IL'?'מקשיבה... דברי עם הדמות':'Listening...');startRec();};

// ---------- UI wiring ----------
document.querySelectorAll('.act').forEach(b=>b.onclick=()=>{const a=b.dataset.a;act(a);
  const lines={jump:'הופ!',dance:'תני מוזיקה!',come:(PERSONAS[ch?.persona]||{}).g==='f'?'אני באה!':'אני בא!',spin:'סיבוב!'};if(lines[a]&&ch&&ch.root.parent)say(lines[a]);});
$('#go').onclick=()=>startCam();
$('#goXR').onclick=()=>startXR().catch(e=>{showErr('AR מלא לא זמין','עוברים למצב מצלמה.<br><small>'+e.message+'</small>');startCam();});
$('#goQL').onclick=()=>startQL();
$('#close').onclick=()=>{buzz(8);location.reload();};
$('#shot').onclick=()=>capture();
const openSheet=()=>{$('#sheet').hidden=false;$('#sheetBg').hidden=false;};function closeSheet(){$('#sheet').hidden=true;$('#sheetBg').hidden=true;}
$('#settings').onclick=()=>{buzz(8);openSheet();};$('#sheetBg').onclick=closeSheet;
$('#size').oninput=e=>setScale(+e.target.value);
$('#upload2').onclick=()=>$('#file').click();
$('#swap').onclick=async()=>{const i=CHARS.indexOf(sel);sel=CHARS[(i+1)%CHARS.length];await swapChar();};
document.querySelectorAll('#lang button').forEach(b=>b.onclick=()=>{lang=b.dataset.l;document.querySelectorAll('#lang button').forEach(x=>x.classList.toggle('on',x===b));if(listening){stopMic();$('#mic').click();}});
document.querySelectorAll('#voiceOn button').forEach(b=>b.onclick=()=>{voiceOn=b.dataset.v==='1';document.querySelectorAll('#voiceOn button').forEach(x=>x.classList.toggle('on',x===b));});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&listening)stopMic();});
(async()=>{let xr=false;try{xr=!!(navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar'));}catch{}
  $('#goXR').hidden=!xr;$('#goQL').hidden=!isIOS;
  if(inApp)$('#note').textContent='טיפ: לפתוח בדפדפן ('+(isIOS?'Safari':'Chrome')+') ולא בתוך וואטסאפ או אינסטגרם';
  window.__ready=true;})();
