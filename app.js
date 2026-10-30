import * as THREE from 'three';
import { GLTFLoader } from './lib/GLTFLoader.js';
const $=s=>document.querySelector(s);
const CHARS=[
 {id:'robot',name:'🤖 רובוט',url:'models/RobotExpressive.glb',h:0.35},
 {id:'fox',name:'🦊 שועל',url:'models/Fox.glb',h:0.25},
 {id:'soldier',name:'🧍 דמות',url:'models/Soldier.glb',h:0.4},
];
let cur=CHARS[0], customURL=null, customName='';
const picker=$('#picker');
CHARS.forEach(c=>{const b=document.createElement('button');b.className='chip'+(c===cur?' on':'');b.textContent=c.name;b.onclick=()=>{cur=c;customURL=null;$('#fileName').textContent='';[...picker.children].forEach(x=>x.classList.toggle('on',x===b));};picker.appendChild(b);});
$('#file').onchange=e=>{const f=e.target.files[0];if(!f)return;customURL=URL.createObjectURL(f);customName=f.name;$('#fileName').textContent='✓ '+f.name;[...picker.children].forEach(x=>x.classList.remove('on'));};

// ---------- three ----------
const canvas=$('#c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.01,50);
scene.add(new THREE.HemisphereLight(0xffffff,0x444455,2.2));
const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(1,3,1);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
Object.assign(sun.shadow.camera,{left:-2,right:2,top:2,bottom:-2});scene.add(sun);
const shadowPlane=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.ShadowMaterial({opacity:.35}));
shadowPlane.rotation.x=-Math.PI/2;shadowPlane.receiveShadow=true;scene.add(shadowPlane);
const reticle=new THREE.Mesh(new THREE.RingGeometry(.07,.09,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xff2d6f}));
reticle.matrixAutoUpdate=false;reticle.visible=false;scene.add(reticle);
const marker=new THREE.Mesh(new THREE.RingGeometry(.03,.045,24).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.8}));marker.visible=false;scene.add(marker);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

// ---------- character ----------
const loader=new GLTFLoader();
let ch=null; window.dbg=()=>ch&&({p:ch.root.position.toArray(),s:ch.model.scale.x,cam:camera.position.toArray(),in:!!ch.root.parent});
const clock=new THREE.Clock();
function find(acts,keys){const n=Object.keys(acts);for(const k of keys){const m=n.find(x=>x.toLowerCase().includes(k));if(m)return acts[m];}return null;}
async function loadChar(){
  const url=customURL||cur.url;
  const g=await loader.loadAsync(url);
  const model=g.scene;model.traverse(o=>{if(o.isMesh){o.castShadow=true;o.frustumCulled=false;}});
  model.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(model,true);const size=box.getSize(new THREE.Vector3());
  const targetH=customURL?0.3:cur.h;const s=targetH/(size.y||1);model.scale.setScalar(s);
  model.updateMatrixWorld(true);box.setFromObject(model,true);console.log('size',size.toArray());model.position.y-=box.min.y;const c=box.getCenter(new THREE.Vector3());model.position.x-=c.x;model.position.z-=c.z;
  const root=new THREE.Group();root.add(model);
  const mixer=new THREE.AnimationMixer(model);const acts={};
  g.animations.forEach(cl=>acts[cl.name]=mixer.clipAction(cl));
  const map={idle:find(acts,['idle','survey','stand'])||Object.values(acts)[0],walk:find(acts,['walk','run']),jump:find(acts,['jump']),
    dance:find(acts,['dance']),wave:find(acts,['wave','yes','thumbs']),react:find(acts,['yes','thumbs','punch','wave','jump'])};
  ['jump','wave','react'].forEach(k=>{if(map[k]){map[k].setLoop(THREE.LoopOnce);map[k].clampWhenFinished=true;}});
  ch={root,model,mixer,map,state:'idle',active:null,target:null,proc:null,scale:1};
  play('idle');console.log('anims:',Object.keys(acts));
  mixer.addEventListener('finished',()=>{if(ch.state!=='walk')play('idle');});
  return ch;
}
function play(name){
  if(!ch)return;const a=ch.map[name]||ch.map.idle;ch.state=name;
  if(a&&a!==ch.active){a.reset().fadeIn(.25).play();if(ch.active)ch.active.fadeOut(.25);ch.active=a;}
  else if(a&&a.loop===THREE.LoopOnce){a.reset().play();}
  if(!ch.map[name]&&name!=='idle'){ch.proc={type:name,t:0};} // procedural fallback
}
function act(a){
  if(!ch||!ch.root.parent){say('קודם מציבים דמות 🙂');return;}
  if(a==='come'){const p=new THREE.Vector3();camera.getWorldPosition(p);const r=ch.root.position;const d=new THREE.Vector3(p.x-r.x,0,p.z-r.z);const L=d.length();if(L>0.5)d.setLength(L-0.45);else d.set(0,0,0);walkTo(r.clone().add(d));return;}
  if(a==='bigger'){ch.scale*=1.25;ch.root.scale.setScalar(ch.scale);return;}
  if(a==='smaller'){ch.scale/=1.25;ch.root.scale.setScalar(ch.scale);return;}
  if(a==='spin'){ch.proc={type:'spin',t:0};return;}
  if(a==='reset'){scene.remove(ch.root);say('הקישו על הרצפה כדי להציב');return;}
  ch.target=null;
  if(a==='jump'){ch.proc={type:'hop',t:0};if(ch.map.jump)play('jump');return;}
  if(a==='dance'){if(ch.map.dance)play('dance');else{play('walk');ch.proc={type:'dance',t:0};setTimeout(()=>{if(ch.state==='walk'&&!ch.target)play('idle')},3000);}return;}
  if(a==='wave'){if(ch.map.wave)play('wave');else ch.proc={type:'hop',t:0};return;}
  if(a==='react'){ch.proc={type:'hop',t:0};if(ch.map.react)play('react');return;}
}
function walkTo(p){if(!ch)return;ch.target=p.clone();ch.target.y=ch.root.position.y;marker.position.copy(ch.target);marker.visible=true;play('walk');}
function place(pos){if(!ch)return;ch.root.position.copy(pos);const cp=new THREE.Vector3();camera.getWorldPosition(cp);ch.root.rotation.y=Math.atan2(cp.x-pos.x,cp.z-pos.z);scene.add(ch.root);shadowPlane.position.y=pos.y+0.001;say('הקישו על הדמות / על הרצפה, או דברו אליה 🎤');}
function update(dt){
  if(!ch)return;ch.mixer.update(dt);const r=ch.root;
  if(ch.target){const d=ch.target.clone().sub(r.position);d.y=0;const L=d.length();
    if(L<0.02){ch.target=null;marker.visible=false;play('idle');}
    else{const want=Math.atan2(d.x,d.z);let df=want-r.rotation.y;df=Math.atan2(Math.sin(df),Math.cos(df));r.rotation.y+=df*Math.min(1,dt*8);
      r.position.addScaledVector(d.normalize(),Math.min(L,0.25*ch.scale*dt));}}
  const m=ch.model;
  if(ch.proc){const p=ch.proc;p.t+=dt;
    if(p.type==='hop'){m.position.y=Math.max(0,Math.sin(Math.min(p.t/0.6,1)*Math.PI))*0.12/ch.scale*(1)+baseY(m);if(p.t>0.6){m.position.y=baseY(m);ch.proc=null;}}
    else if(p.type==='spin'){r.rotation.y+=dt*Math.PI*2/1.0;if(p.t>1)ch.proc=null;}
    else if(p.type==='dance'){r.rotation.y+=dt*4;m.position.y=baseY(m)+Math.abs(Math.sin(p.t*8))*0.03/ch.scale;if(p.t>3){ch.proc=null;m.position.y=baseY(m);}}
  }
}
function baseY(m){if(m.userData.by===undefined)m.userData.by=m.position.y;return m.userData.by;}
let msgT;function say(t){const e=$('#msg');e.textContent=t;e.style.opacity=1;clearTimeout(msgT);msgT=setTimeout(()=>e.style.opacity=.0,4000);}

// ---------- tap handling (shared) ----------
const ray=new THREE.Raycaster();
function hitsChar(ndc){if(!ch||!ch.root.parent)return false;ray.setFromCamera(ndc,camera);return ray.intersectObject(ch.root,true).length>0;}

// ---------- mode: camera fallback ----------
let mode=null,stream=null;
const floor=new THREE.Plane(new THREE.Vector3(0,1,0),0);
async function startCam(){
  try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}},audio:false});
    $('#video').srcObject=stream;}catch(e){alert('אין גישה למצלמה ('+e.name+'). ממשיכים בלי מצלמה.');}
  mode='cam';camera.position.set(0,0.45,0.6);camera.lookAt(0,0,-0.2);
  // device tilt → camera pitch (makes it feel anchored)
  addEventListener('deviceorientation',e=>{if(mode!=='cam'||e.beta==null)return;const pitch=THREE.MathUtils.degToRad(Math.min(90,Math.max(10,e.beta))-90);camera.rotation.set(pitch,0,0,'YXZ');});
  await enterUI();
  renderer.setAnimationLoop(()=>{update(clock.getDelta());renderer.render(scene,camera);});
}
// pointer gestures for cam mode
const ptrs=new Map();let pinch0=0,scale0=1,drag=false,downT=0,downXY=null;
canvas.addEventListener('pointerdown',e=>{if(mode!=='cam')return;ptrs.set(e.pointerId,e);canvas.setPointerCapture(e.pointerId);
  if(ptrs.size===2){const [a,b]=[...ptrs.values()];pinch0=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);scale0=ch?ch.scale:1;}
  else{downT=performance.now();downXY=[e.clientX,e.clientY];drag=hitsChar(ndcOf(e));}});
canvas.addEventListener('pointermove',e=>{if(mode!=='cam'||!ptrs.has(e.pointerId))return;ptrs.set(e.pointerId,e);
  if(ptrs.size===2&&ch){const [a,b]=[...ptrs.values()];const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);ch.scale=Math.min(6,Math.max(.2,scale0*d/pinch0));ch.root.scale.setScalar(ch.scale);return;}
  if(drag&&ch&&Math.hypot(e.clientX-downXY[0],e.clientY-downXY[1])>8){const p=floorHit(ndcOf(e));if(p){ch.root.position.copy(p);ch.target=null;}}});
canvas.addEventListener('pointerup',e=>{if(mode!=='cam')return;const multi=ptrs.size>1;ptrs.delete(e.pointerId);if(multi)return;
  const moved=downXY&&Math.hypot(e.clientX-downXY[0],e.clientY-downXY[1])>8;if(moved||performance.now()-downT>500){drag=false;return;}
  const n=ndcOf(e);if(drag){act('react');drag=false;return;}
  const p=floorHit(n);if(!p)return;if(!ch.root.parent)place(p);else walkTo(p);});
function ndcOf(e){return new THREE.Vector2(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight)*2+1);}
function floorHit(n){ray.setFromCamera(n,camera);const p=new THREE.Vector3();return ray.ray.intersectPlane(floor,p)?p:null;}

// ---------- mode: WebXR ----------
let xrHitSrc=null;
async function startXR(){
  await loadIfNeeded();
  const s=await navigator.xr.requestSession('immersive-ar',{requiredFeatures:['hit-test'],optionalFeatures:['dom-overlay','light-estimation'],domOverlay:{root:$('#ui')}});
  mode='xr';renderer.xr.enabled=true;renderer.xr.setReferenceSpaceType('local');await renderer.xr.setSession(s);
  $('#start').hidden=true;$('#ui').hidden=false;say('הזיזו את הטלפון עד שתופיע טבעת, ואז הקישו');
  const view=await s.requestReferenceSpace('viewer');xrHitSrc=await s.requestHitTestSource({space:view});
  let tapNDC=null;
  s.addEventListener('select',e=>{ // use input ray: tap on char → react; else place/walk at reticle
    const pose=e.frame.getPose(e.inputSource.targetRaySpace,renderer.xr.getReferenceSpace());
    if(pose&&ch&&ch.root.parent){const m=new THREE.Matrix4().fromArray(pose.transform.matrix);const o=new THREE.Vector3().setFromMatrixPosition(m);const d=new THREE.Vector3(0,0,-1).transformDirection(m);
      ray.set(o,d);if(ray.intersectObject(ch.root,true).length){act('react');return;}}
    if(!reticle.visible)return;const p=new THREE.Vector3().setFromMatrixPosition(reticle.matrix);
    if(!ch.root.parent)place(p);else walkTo(p);});
  s.addEventListener('end',()=>{location.reload();});
  renderer.setAnimationLoop((t,frame)=>{
    if(frame&&xrHitSrc){const hr=frame.getHitTestResults(xrHitSrc);if(hr.length){const pose=hr[0].getPose(renderer.xr.getReferenceSpace());reticle.visible=true;reticle.matrix.fromArray(pose.transform.matrix);}else reticle.visible=false;}
    update(clock.getDelta());renderer.render(scene,camera);});
}
// ---------- iOS Quick Look via model-viewer ----------
async function startQL(){
  await import('./lib/model-viewer.min.js');
  const mv=document.createElement('model-viewer');
  mv.setAttribute('src',customURL||cur.url);mv.setAttribute('ar','');mv.setAttribute('ar-modes','webxr scene-viewer quick-look');
  mv.setAttribute('autoplay','');mv.setAttribute('camera-controls','');mv.setAttribute('shadow-intensity','1');
  mv.innerHTML='<button slot="ar-button" class="btn" style="position:absolute;bottom:30px;left:50%;transform:translateX(-50%)">📱 הצג בחדר שלי</button>';
  const box=$('#mv');box.querySelector('model-viewer')?.remove();box.appendChild(mv);box.style.display='block';
}
$('#mvClose').onclick=()=>{$('#mv').style.display='none';};

async function loadIfNeeded(){say('טוען דמות…');try{await loadChar();}catch(e){alert('שגיאה בטעינת המודל: '+e.message);throw e;}}
async function enterUI(){await loadIfNeeded();$('#start').hidden=true;$('#ui').hidden=false;say('הקישו על הרצפה כדי להציב דמות');}
$('#goCam').onclick=()=>startCam();
$('#goXR').onclick=()=>startXR().catch(e=>{alert('AR מלא לא זמין: '+e.message+'\nעוברים למצב מצלמה');startCam();});
$('#goQL').onclick=()=>startQL();
$('#back').onclick=()=>location.reload();
document.querySelectorAll('#bar [data-a]').forEach(b=>b.onclick=()=>act(b.dataset.a));

// ---------- voice ----------
const CMDS=[['jump',['קפוץ','קפצי','תקפוץ','קפיצה','jump','hop']],['dance',['רקוד','רקדי','תרקוד','ריקוד','dance','party']],
 ['wave',['שלום','היי','הי ','נופף','hello','wave','hey']],['come',['בוא','בואי','תבוא','הנה','come','here']],
 ['spin',['סובב','תסתובב','סיבוב','spin','turn']],['bigger',['גדל','תגדל','גדול','bigger','grow']],['smaller',['קטן','תקטן','smaller','shrink']]];
const SR=window.SpeechRecognition||window.webkitSpeechRecognition;let rec=null,listening=false,lang='he-IL';
function startRec(){rec=new SR();rec.lang=lang;rec.continuous=true;rec.interimResults=false;
  rec.onresult=e=>{const t=e.results[e.results.length-1][0].transcript.toLowerCase();let hit=null;for(const [a,ws] of CMDS)if(ws.some(w=>t.includes(w.trim()))){hit=a;break;}
    say('🎤 "'+t+'"'+(hit?' ✓':''));if(hit)act(hit);};
  rec.onend=()=>{if(listening){lang=lang==='he-IL'?'he-IL':lang;try{rec.start()}catch{}}};rec.onerror=e=>{if(e.error==='not-allowed'){listening=false;$('#mic').classList.remove('on');say('אין הרשאת מיקרופון');}};rec.start();}
$('#mic').onclick=()=>{if(!SR){say('הדפדפן לא תומך בזיהוי קול – השתמשו בכפתורים');return;}
  listening=!listening;$('#mic').classList.toggle('on',listening);if(listening){startRec();say('מקשיב… "קפוץ", "רקוד", "בוא", "שלום" (גם באנגלית)');}else rec&&rec.stop();};
// long-press mic toggles language
let lp;$('#mic').addEventListener('pointerdown',()=>lp=setTimeout(()=>{lang=lang==='he-IL'?'en-US':'he-IL';say('שפת זיהוי: '+(lang==='he-IL'?'עברית':'English'));if(listening){rec.stop();}},700));
$('#mic').addEventListener('pointerup',()=>clearTimeout(lp));

// ---------- capability detection ----------
(async()=>{const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  let xr=false;try{xr=!!(navigator.xr&&await navigator.xr.isSessionSupported('immersive-ar'));}catch{}
  if(xr)$('#goXR').style.display='';if(isIOS)$('#goQL').style.display='';
  $('#support').textContent=xr?'✓ המכשיר תומך ב-AR מלא (WebXR)':isIOS?'אייפון: מצב מצלמה אינטראקטיבי, או Quick Look לעיגון אמיתי':'מצב מצלמה אינטראקטיבי';
  window.__ready=true;})();
