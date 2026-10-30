import * as THREE from 'three';
import { GLTFLoader } from './lib/GLTFLoader.js';
const $=s=>document.querySelector(s);
const buzz=(p=12)=>{try{navigator.vibrate&&navigator.vibrate(p)}catch{}};
const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const inApp=/Instagram|FBAN|FBAV|WhatsApp|Line\/|TikTok|LinkedInApp|Twitter/i.test(navigator.userAgent);

// ---------- characters ----------
const CHARS=[
 {id:'robot',name:'רובוט',url:'models/RobotExpressive.glb',thumb:'thumbs/RobotExpressive.png',h:0.32},
 {id:'fox',name:'שועל',url:'models/Fox.glb',thumb:'thumbs/Fox.png',h:0.22},
 {id:'soldier',name:'לוחם',url:'models/Soldier.glb',thumb:'thumbs/Soldier.png',h:0.36},
];
let sel=CHARS[0]; // Robot default
const car=$('#carousel');
function renderCarousel(){car.innerHTML='';
  CHARS.forEach(c=>{const b=document.createElement('button');b.className='card glass'+(c===sel?' on':'');
    b.innerHTML=c.thumb?`<img src="${c.thumb}" alt=""><span>${c.name}</span>`:`<div class="add">🧩</div><span>${c.name}</span>`;
    b.onclick=()=>{sel=c;buzz(8);renderCarousel();};car.appendChild(b);});
  const up=document.createElement('button');up.className='card glass';up.innerHTML='<div class="add">＋</div><span>דמות משלי</span>';
  up.onclick=()=>$('#file').click();car.appendChild(up);}
renderCarousel();
$('#file').onchange=async e=>{const f=e.target.files[0];if(!f)return;e.target.value='';
  if(!/\.glb$/i.test(f.name)){showErr('קובץ לא נתמך','צריך קובץ ‎.glb‎ אחד (מודל עם טקסטורות בתוכו).');return;}
  const c={id:'custom'+Date.now(),name:f.name.replace(/\.glb$/i,'').slice(0,12),url:URL.createObjectURL(f),h:0.3};
  CHARS.push(c);sel=c;renderCarousel();
  if(running){await swapChar();closeSheet();}};

// ---------- errors ----------
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
// soft contact blob (always visible, grounds the character even if shadow is faint)
const blobTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');const r=g.createRadialGradient(64,64,0,64,64,64);
  r.addColorStop(0,'rgba(0,0,0,.55)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);})();
const blob=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:blobTex,transparent:true,depthWrite:false}));blob.rotation.x=-Math.PI/2;
const ring=new THREE.Mesh(new THREE.RingGeometry(.035,.05,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9}));ring.visible=false;scene.add(ring);
const reticle=new THREE.Mesh(new THREE.RingGeometry(.06,.08,40).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xff3d7f}));reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);

function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
['resize','orientationchange'].forEach(e=>addEventListener(e,()=>setTimeout(resize,60)));
window.visualViewport&&visualViewport.addEventListener('resize',resize);resize();
// block page zoom/scroll gestures on iOS
['gesturestart','gesturechange','dblclick'].forEach(e=>document.addEventListener(e,ev=>ev.preventDefault(),{passive:false}));
document.addEventListener('touchmove',e=>{if(!e.target.closest('.carousel,#sheet'))e.preventDefault();},{passive:false});

// ---------- character ----------
const loader=new GLTFLoader();const clock=new THREE.Clock();
let ch=null;
const findA=(acts,keys)=>{const n=Object.keys(acts);for(const k of keys){const m=n.find(x=>x.toLowerCase().includes(k));if(m)return acts[m];}return null;};
async function loadChar(c){
  $('#loading').hidden=false;
  try{
    const g=await loader.loadAsync(c.url);const model=g.scene;
    model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});
    model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model,true);const size=box.getSize(new THREE.Vector3());
    model.scale.setScalar(c.h/(size.y||1));model.updateMatrixWorld(true);box.setFromObject(model,true);
    const ctr=box.getCenter(new THREE.Vector3());model.position.set(-ctr.x,-box.min.y,-ctr.z);
    const fp=Math.max(box.max.x-box.min.x,box.max.z-box.min.z);
    const root=new THREE.Group();const inner=new THREE.Group();inner.add(model);root.add(inner);
    const b=blob.clone();b.scale.setScalar(Math.max(fp*1.3,c.h*0.6));b.position.y=0.002;root.add(b);
    const mixer=new THREE.AnimationMixer(model);const acts={};g.animations.forEach(cl=>acts[cl.name]=mixer.clipAction(cl));
    const map={idle:findA(acts,['idle','survey','stand'])||Object.values(acts)[0]||null,walk:findA(acts,['walking','walk','run']),
      jump:findA(acts,['jump']),dance:findA(acts,['dance']),wave:findA(acts,['wave','hello']),react:findA(acts,['yes','thumbs','wave','jump'])};
    ['jump','wave','react'].forEach(k=>{const a=map[k];if(a){a.setLoop(THREE.LoopOnce);a.clampWhenFinished=true;}});
    if(map.dance)map.dance.setLoop(THREE.LoopRepeat);
    const o={root,inner,mixer,map,active:null,state:'idle',target:null,proc:null,scale:1,danceT:0};
    mixer.addEventListener('finished',()=>{if(o.state!=='walk')play('idle',o);});
    return o;
  }catch(e){showErr('לא הצלחתי לטעון את הדמות','ייתכן שהקובץ פגום או לא בפורמט GLB.<br><small>'+e.message+'</small>');throw e;}
  finally{$('#loading').hidden=true;}
}
function play(name,o=ch){if(!o)return;const a=o.map[name]||(name==='walk'?null:null);o.state=name;
  const target=a||o.map.idle;if(!target)return;
  if(target!==o.active){target.reset().setEffectiveWeight(1).fadeIn(.25).play();if(o.active)o.active.fadeOut(.25);o.active=target;}
  else if(target.loop===THREE.LoopOnce)target.reset().play();}
function setScale(s){if(!ch)return;ch.scale=s;ch.root.scale.setScalar(s);$('#size').value=s;}
function faceCamera(){const cp=new THREE.Vector3();camera.getWorldPosition(cp);ch.root.rotation.y=Math.atan2(cp.x-ch.root.position.x,cp.z-ch.root.position.z);}
function place(p){if(!ch)return;ch.root.position.copy(p);ch.target=null;ring.visible=false;if(!ch.root.parent)scene.add(ch.root);faceCamera();
  shadowPlane.position.y=p.y+0.001;sun.position.set(p.x+0.6,p.y+2,p.z+0.8);sun.target.position.copy(p);
  ch.inner.scale.setScalar(0.01);ch.proc={type:'pop',t:0};play('idle');}
function walkTo(p){if(!ch||!ch.root.parent)return;ch.target=p.clone();ch.target.y=ch.root.position.y;ring.position.copy(ch.target);ring.position.y+=0.003;ring.visible=true;
  if(ch.map.walk)play('walk');else ch.state='walk';}
function act(a){
  if(!ch||!ch.root.parent){hint('קודם געי במסך כדי להעמיד את הדמות');return;}buzz(15);
  if(a==='come'){const cp=new THREE.Vector3();camera.getWorldPosition(cp);const r=ch.root.position;const d=new THREE.Vector3(cp.x-r.x,0,cp.z-r.z);
    const L=d.length(),stop=mode==='xr'?0.45:0.55;if(L>stop+0.03){d.setLength(L-stop);walkTo(r.clone().add(d));}else{ch.proc={type:'hop',t:0};}return;}
  if(a==='spin'){ch.proc={type:'spin',t:0};return;}
  ch.target=null;ring.visible=false;
  if(a==='jump'){ch.proc={type:'hop',t:0,d:ch.map.jump?0.9:0.55};if(ch.map.jump)play('jump');return;}
  if(a==='dance'){if(ch.map.dance){play('dance');ch.danceT=4;}else{if(ch.map.walk)play('walk');ch.proc={type:'dance',t:0};}return;}
  if(a==='wave'){faceCamera();if(ch.map.wave)play('wave');else ch.proc={type:'wiggle',t:0};return;}
  if(a==='react'){ch.proc={type:'hop',t:0,d:.55};if(ch.map.react)play('react');return;}
}
const ease=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
function update(dt){
  if(!ch)return;dt=Math.min(dt,0.05);ch.mixer.update(dt);const r=ch.root,inn=ch.inner;
  if(ch.state==='dance'&&ch.danceT>0){ch.danceT-=dt;if(ch.danceT<=0)play('idle');}
  if(ch.target){const d=ch.target.clone().sub(r.position);d.y=0;const L=d.length();
    if(L<0.01){ch.target=null;ring.visible=false;play('idle');faceCamera();}
    else{const want=Math.atan2(d.x,d.z);let df=want-r.rotation.y;df=Math.atan2(Math.sin(df),Math.cos(df));r.rotation.y+=df*Math.min(1,dt*7);
      const speed=0.22*ch.scale*(Math.abs(df)>1.2?0.25:1);r.position.addScaledVector(d.normalize(),Math.min(L,speed*dt));}
    ring.material.opacity=0.5+0.4*Math.sin(performance.now()/150);}
  const p=ch.proc;
  if(p){p.t+=dt;
    if(p.type==='pop'){const k=Math.min(p.t/0.45,1);const s=k<1?1+Math.sin(k*Math.PI)*0.15:1;inn.scale.setScalar(Math.max(0.01,ease(k)*s));if(k>=1){inn.scale.setScalar(1);ch.proc=null;}}
    else if(p.type==='hop'){const D=p.d||0.55,k=Math.min(p.t/D,1);inn.position.y=Math.sin(k*Math.PI)*0.09;if(k>=1){inn.position.y=0;ch.proc=null;}}
    else if(p.type==='spin'){const k=Math.min(p.t/0.9,1);inn.rotation.y=ease(k)*Math.PI*2;if(k>=1){inn.rotation.y=0;ch.proc=null;}}
    else if(p.type==='wiggle'){inn.rotation.z=Math.sin(p.t*18)*0.12*(1-p.t);if(p.t>1){inn.rotation.z=0;ch.proc=null;}}
    else if(p.type==='dance'){inn.rotation.y+=dt*5;inn.position.y=Math.abs(Math.sin(p.t*9))*0.03;if(p.t>3){inn.rotation.y=0;inn.position.y=0;ch.proc=null;play('idle');}}
  }
}
let hintT;function hint(t,ms=3500){const e=$('#hint');e.textContent=t;e.style.opacity=1;clearTimeout(hintT);if(ms)hintT=setTimeout(()=>e.style.opacity=0,ms);}

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
  const tries=[{video:{facingMode:{exact:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false},
               {video:{facingMode:'environment'},audio:false},{video:true,audio:false}];
  let last;for(const c of tries){try{return await navigator.mediaDevices.getUserMedia(c);}catch(e){last=e;if(e.name==='NotAllowedError'||e.name==='SecurityError')throw e;}}
  throw last;}
function camErr(e){
  const n=e&&e.name;let t='אין גישה למצלמה',b='';
  if(inApp)b='נראה שהקישור נפתח בתוך אפליקציה (וואטסאפ/אינסטגרם). פתחי אותו ב‑<b>'+(isIOS?'Safari':'Chrome')+'</b>: ⋯ ← "פתיחה בדפדפן".';
  else if(n==='NotAllowedError'||n==='SecurityError')b=isIOS?'אישרת "לא לאפשר"? בהגדרות ← Safari ← מצלמה ← <b>לשאול/לאפשר</b>, או לחצי על <b>aA</b> בשורת הכתובת ← הגדרות אתר ← מצלמה. ואז רענני.'
    :'לחצי על סמל המנעול ליד הכתובת ← הרשאות ← מצלמה ← <b>אפשר</b>, ואז רענני.';
  else if(n==='NotFoundError'||n==='OverconstrainedError')b='לא נמצאה מצלמה במכשיר.';
  else if(n==='NotReadableError')b='המצלמה תפוסה באפליקציה אחרת. סגרי אותה ונסי שוב.';
  else if(n==='Insecure')b='המצלמה עובדת רק בכתובת https.';
  else if(n==='NoMedia')b='הדפדפן הזה לא תומך במצלמה. נסי Safari באייפון או Chrome באנדרואיד.';
  else b='שגיאה: '+(e&&e.message);
  showErr(t,b+'<br><br><small>אפשר להמשיך בלי מצלמה כדי לראות את הדמות.</small>');}
async function startCam(){
  buzz(10);
  try{stream=await openCamera();const v=$('#video');v.srcObject=stream;v.setAttribute('playsinline','');v.muted=true;await v.play().catch(()=>{});}
  catch(e){camErr(e);document.body.style.background='linear-gradient(#3a3550,#16141f)';}
  mode='cam';running=true;
  camera.position.set(0,0.6,1.0);camera.lookAt(0,0.02,-0.25);resize();camera.updateMatrixWorld(true);
  ch=await loadChar(sel).catch(()=>null);if(!ch){running=false;return;}window.__ch=ch;
  $('#start').hidden=true;$('#hud').hidden=false;
  // auto place in lower third, immediately visible
  const p=floorHit(new THREE.Vector2(0,-0.38));place(p);
  hint('געי במסך כדי להעמיד את הדמות',5000);
  renderer.setAnimationLoop(()=>{update(clock.getDelta());renderer.render(scene,camera);});
}
async function swapChar(){const old=ch;const pos=old?old.root.position.clone():null;const s=old?old.scale:1;
  const n=await loadChar(sel).catch(()=>null);if(!n)return;if(old)scene.remove(old.root);ch=n;
  if(pos){place(pos);setScale(s);}}
// gestures (camera mode): tap char=react, tap floor=walk, drag char=move, pinch=scale
const ptrs=new Map();let pinch0=0,scale0=1,dragging=false,down=null;
canvas.addEventListener('pointerdown',e=>{if(mode!=='cam')return;e.preventDefault();ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});try{canvas.setPointerCapture(e.pointerId)}catch{}
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a.x-b.x,a.y-b.y)||1;scale0=ch?ch.scale:1;dragging=false;down=null;}
  else if(ptrs.size===1){down={x:e.clientX,y:e.clientY,t:performance.now(),onChar:hitsChar(ndcOf(e.clientX,e.clientY))};dragging=false;}});
canvas.addEventListener('pointermove',e=>{if(mode!=='cam'||!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(ptrs.size===2&&ch){const [a,b]=[...ptrs.values()];setScale(THREE.MathUtils.clamp(scale0*Math.hypot(a.x-b.x,a.y-b.y)/pinch0,0.3,3));return;}
  if(down&&down.onChar&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>10){dragging=true;const p=floorHit(ndcOf(e.clientX,e.clientY));if(p){ch.root.position.copy(p);ch.target=null;ring.visible=false;}}});
const endPtr=e=>{if(mode!=='cam')return;const wasMulti=ptrs.size>1;ptrs.delete(e.pointerId);if(wasMulti||!down)return;
  const d=down;down=null;if(dragging){dragging=false;faceCamera();return;}
  if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>12||performance.now()-d.t>600)return;
  if(d.onChar){act('react');return;}
  const p=floorHit(ndcOf(e.clientX,e.clientY));if(!p)return;buzz(8);$('#hint').style.opacity=0;
  if(!ch.root.parent)place(p);else walkTo(p);};
canvas.addEventListener('pointerup',endPtr);canvas.addEventListener('pointercancel',e=>{ptrs.delete(e.pointerId);down=null;dragging=false;});

// ---------- WebXR (Android Chrome) ----------
async function startXR(){
  ch=await loadChar(sel);
  const s=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay'],domOverlay:{root:$('#hud')}});
  mode='xr';running=true;renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');await renderer.xr.setSession(s);
  $('#start').hidden=true;$('#hud').hidden=false;$('#shot').hidden=true;hint('הזיזי את הטלפון לאט עד שתופיע טבעת, ואז געי במסך',0);
  const hs=await s.requestHitTestSource({space:await s.requestReferenceSpace('viewer')});
  $('#hud').addEventListener('beforexrselect',e=>{if(e.target.closest('button'))e.preventDefault();});
  s.addEventListener('select',e=>{const pose=e.frame.getPose(e.inputSource.targetRaySpace,renderer.xr.getReferenceSpace());
    if(pose&&ch.root.parent){const m=new THREE.Matrix4().fromArray(pose.transform.matrix);ray.set(new THREE.Vector3().setFromMatrixPosition(m),new THREE.Vector3(0,0,-1).transformDirection(m));
      if(ray.intersectObject(ch.inner,true).length){act('react');return;}}
    if(!reticle.visible)return;buzz(10);const p=new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
    if(!ch.root.parent){place(p);hint('געי בדמות או במשטח, או דברי איתה 🎤');}else walkTo(p);});
  s.addEventListener('end',()=>location.reload());
  renderer.setAnimationLoop((t,frame)=>{if(frame){const r=frame.getHitTestResults(hs);if(r.length){reticle.visible=true;reticle.matrix.fromArray(r[0].getPose(renderer.xr.getReferenceSpace()).transform.matrix);}else reticle.visible=false;}
    update(clock.getDelta());renderer.render(scene,camera);});
}
// ---------- iOS Quick Look ----------
async function startQL(){await import('./lib/model-viewer.min.js');const mv=document.createElement('model-viewer');
  Object.entries({src:sel.url,ar:'','ar-modes':'quick-look scene-viewer webxr',autoplay:'','camera-controls':'','shadow-intensity':'1'}).forEach(([k,v])=>mv.setAttribute(k,v));
  mv.innerHTML='<button slot="ar-button" class="cta" style="position:absolute;bottom:calc(env(safe-area-inset-bottom) + 24px);left:5%;width:90%">📱 הצגה בחדר שלי</button>';
  $('#mv').querySelector('model-viewer')?.remove();$('#mv').appendChild(mv);$('#mv').hidden=false;}
$('#mvClose').onclick=()=>$('#mv').hidden=true;

// ---------- capture ----------
async function capture(){
  buzz([10,40,10]);const v=$('#video'),dpr=Math.min(devicePixelRatio,2),W=Math.round(innerWidth*dpr),H=Math.round(innerHeight*dpr);
  const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  if(v.videoWidth){const s=Math.max(W/v.videoWidth,H/v.videoHeight),w=v.videoWidth*s,h=v.videoHeight*s;g.drawImage(v,(W-w)/2,(H-h)/2,w,h);}
  else{g.fillStyle='#222';g.fillRect(0,0,W,H);}
  renderer.render(scene,camera);g.drawImage(canvas,0,0,W,H);
  g.font=`700 ${Math.round(14*dpr)}px -apple-system,sans-serif`;g.fillStyle='rgba(255,255,255,.85)';g.textAlign='left';g.fillText('✦ Shelly AR',14*dpr,H-16*dpr);
  const fl=$('#flash');fl.style.opacity=.85;setTimeout(()=>fl.style.opacity=0,120);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.92));const name='shelly-ar-'+Date.now()+'.jpg';
  const file=new File([blob],name,{type:'image/jpeg'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:'Shelly AR'});return;}catch(e){if(e.name==='AbortError')return;}}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();hint('התמונה נשמרה ✓');}
window.__capture=capture;

// ---------- voice ----------
const CMDS=[['jump',['קפוץ','קפצי','תקפוץ','תקפצי','קפיצה','jump','hop']],['dance',['רקוד','רקדי','תרקוד','תרקדי','ריקוד','לרקוד','dance','party']],
 ['wave',['שלום','היי','נופף','hello','wave','hey']],['come',['בוא','בואי','תבוא','תבואי','הנה','אליי','come','here']],
 ['spin',['סובב','תסתובב','סיבוב','spin','turn']]];
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null,listening=false,lang='he-IL',heardT;
function heard(t,ok){const e=$('#heard');e.textContent=(ok?'✓ ':'')+'"'+t+'"';e.style.opacity=1;clearTimeout(heardT);heardT=setTimeout(()=>e.style.opacity=0,2500);}
function match(t){t=t.toLowerCase();for(const [a,ws] of CMDS)if(ws.some(w=>t.includes(w)))return a;return null;}
function startRec(){rec=new SR();rec.lang=lang;rec.continuous=!isIOS;rec.interimResults=true;let fired=false;
  rec.onresult=e=>{const r=e.results[e.results.length-1];const t=r[0].transcript.trim();const a=match(t);
    heard(t,!!a);if(a&&!fired){fired=true;act(a);setTimeout(()=>fired=false,900);}if(r.isFinal)fired=false;};
  rec.onerror=e=>{if(e.error==='not-allowed'||e.error==='service-not-allowed'){stopMic();showErr('אין גישה למיקרופון',isIOS?'בהגדרות ← Safari ← מיקרופון ← לאפשר. בנוסף: הגדרות ← כללי ← מקלדת ← הפעלת "הכתבה".':'אשרי גישה למיקרופון בהגדרות האתר.');}};
  rec.onend=()=>{if(listening)setTimeout(()=>{try{startRec()}catch{}},150);};
  try{rec.start();}catch{}}
function stopMic(){listening=false;$('#mic').classList.remove('on');try{rec&&rec.abort()}catch{}}
$('#mic').onclick=()=>{buzz(15);if(!SR){showErr('אין זיהוי קול בדפדפן הזה','אפשר להשתמש בכפתורים למטה. זיהוי קול עובד ב‑Chrome ובספארי (iOS 14.5+).');return;}
  if(listening){stopMic();return;}listening=true;$('#mic').classList.add('on');heard(lang==='he-IL'?'מקשיבה… "קפוץ", "רקוד", "בוא"':'Listening… "jump", "dance", "come"');startRec();};

// ---------- UI wiring ----------
document.querySelectorAll('.act').forEach(b=>b.onclick=()=>act(b.dataset.a));
$('#go').onclick=()=>startCam();
$('#goXR').onclick=()=>startXR().catch(e=>{showErr('AR מלא לא זמין','עוברים למצב מצלמה.<br><small>'+e.message+'</small>');startCam();});
$('#goQL').onclick=()=>startQL();
$('#close').onclick=()=>{buzz(8);location.reload();};
$('#shot').onclick=()=>capture();
const openSheet=()=>{$('#sheet').hidden=false;$('#sheetBg').hidden=false;};const closeSheet=()=>{$('#sheet').hidden=true;$('#sheetBg').hidden=true;};
$('#settings').onclick=()=>{buzz(8);openSheet();};$('#sheetBg').onclick=closeSheet;
$('#size').oninput=e=>setScale(+e.target.value);
$('#upload2').onclick=()=>$('#file').click();
$('#swap').onclick=async()=>{const i=CHARS.indexOf(sel);sel=CHARS[(i+1)%CHARS.length];await swapChar();hint(sel.name);};
document.querySelectorAll('#lang button').forEach(b=>b.onclick=()=>{lang=b.dataset.l;document.querySelectorAll('#lang button').forEach(x=>x.classList.toggle('on',x===b));if(listening){stopMic();$('#mic').click();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&listening)stopMic();});

(async()=>{let xr=false;try{xr=!!(navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar'));}catch{}
  $('#goXR').hidden=!xr;$('#goQL').hidden=!isIOS;
  if(inApp)$('#note').textContent='טיפ: לפתוח בדפדפן ('+(isIOS?'Safari':'Chrome')+') ולא בתוך וואטסאפ/אינסטגרם';
  window.__ready=true;})();
