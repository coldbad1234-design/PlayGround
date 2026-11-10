import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const $ = (id) => document.getElementById(id);
const weapons = [
  {name:'VANTA-4',type:'ASSAULT RIFLE',class:'ASSAULT',desc:'Built to hold the line.',damage:24,rate:8,mag:30,reserve:120,spread:.018,reload:1.55,range:90,color:0xb6ef67,icon:'⌁'},
  {name:'KRAIT-9',type:'SUBMACHINE GUN',class:'SMG',desc:'Close the distance. Own the room.',damage:17,rate:13,mag:36,reserve:180,spread:.032,reload:1.35,range:54,color:0xd9cf70,icon:'⌁'},
  {name:'MORROW 12',type:'TACTICAL SHOTGUN',class:'SHOTGUN',desc:'A hard answer to a close question.',damage:12,rate:1.25,mag:8,reserve:48,spread:.095,reload:1.85,range:24,color:0xe98e5d,icon:'⌁'},
  {name:'LONGSHOT',type:'MARKSMAN RIFLE',class:'MARKSMAN',desc:'Patience is a force multiplier.',damage:75,rate:1.2,mag:10,reserve:50,spread:.004,reload:1.9,range:130,color:0x9ca9a2,icon:'⌁'},
  {name:'HEX-45',type:'SIDEARM',class:'PISTOL',desc:'The last word is still a word.',damage:29,rate:4.2,mag:15,reserve:90,spread:.024,reload:1.2,range:58,color:0xd88458,icon:'⌁'},
  {name:'BULWARK',type:'LIGHT MACHINE GUN',class:'LMG',desc:'Make the whole horizon duck.',damage:21,rate:10,mag:60,reserve:180,spread:.043,reload:2.6,range:78,color:0x78966b,icon:'⌁'},
  {name:'FROSTBITE',type:'BURST RIFLE',class:'BURST',desc:'Three beats. One clean finish.',damage:23,rate:5.5,mag:24,reserve:120,spread:.014,reload:1.55,range:88,color:0x78b5bb,icon:'⌁'},
  {name:'WRAITH',type:'SUPPRESSED SMG',class:'SMG',desc:'A quiet entry. A loud exit.',damage:19,rate:11,mag:32,reserve:160,spread:.024,reload:1.4,range:62,color:0x9284bf,icon:'⌁'},
  {name:'SUNFALL',type:'HEAVY PISTOL',class:'PISTOL',desc:'Small package. Unreasonable impact.',damage:52,rate:2.3,mag:8,reserve:48,spread:.016,reload:1.55,range:75,color:0xe1b360,icon:'⌁'},
  {name:'CINDER',type:'COMBAT SHOTGUN',class:'SHOTGUN',desc:'For when subtle is off the table.',damage:10,rate:2.1,mag:10,reserve:60,spread:.11,reload:1.9,range:28,color:0xcf7051,icon:'⌁'}
];
const modes = {
  skirmish:{name:'SKIRMISH',sub:'FIRST TO 25 ELIMINATIONS',time:480,limit:25},
  timeattack:{name:'TIME ATTACK',sub:'SCORE AS MUCH AS YOU CAN',time:90,limit:0},
  survival:{name:'SURVIVAL',sub:'OUTLAST ESCALATING WAVES',time:0,limit:0},
  domination:{name:'DOMINATION',sub:'HOLD THE ZONE TO WIN',time:180,limit:100}
};
const defaultConfig = {optic:'iron',barrel:'standard',muzzle:'standard',stock:'standard',grip:'standard',underbarrel:'standard',magazine:'standard',laser:'off',ammo:'standard',finish:'ember'};
const weaponConfigs = weapons.map(()=>({...defaultConfig}));
const ammoStates = weapons.map((w,index)=>({mag:magazineCapacity(w,weaponConfigs[index]),reserve:w.reserve}));
let config = weaponConfigs[0];
const finishColors = {ember:0xc46a43,arctic:0x88aaab,moss:0x708c5b,violet:0x8873b3};
const attachmentSlots = [
  {id:'optic',name:'OPTIC',options:[['iron','IRON SIGHTS'],['reflex','REFLEX'],['precision','4× SCOPE']]},
  {id:'barrel',name:'BARREL',options:[['standard','STANDARD'],['long','LONG RANGE'],['light','LIGHTWEIGHT']]},
  {id:'muzzle',name:'MUZZLE',options:[['standard','STANDARD'],['compensator','COMPENSATOR'],['suppressor','SUPPRESSOR']]},
  {id:'stock',name:'STOCK',options:[['standard','STANDARD'],['tactical','TACTICAL'],['light','LIGHT']]},
  {id:'grip',name:'REAR GRIP',options:[['standard','STANDARD'],['ergonomic','ERGONOMIC'],['tape','RAPID TAPE']]},
  {id:'underbarrel',name:'UNDERBARREL',options:[['standard','STANDARD'],['vertical','VERTICAL GRIP'],['angled','ANGLED GRIP']]},
  {id:'magazine',name:'MAGAZINE',options:[['standard','STANDARD'],['extended','EXTENDED'],['fast','FAST MAG']]},
  {id:'laser',name:'LASER',options:[['off','OFF'],['green','GREEN'],['red','RED']]},
  {id:'ammo',name:'AMMUNITION',options:[['standard','STANDARD'],['hollow','HOLLOW POINT'],['armor','AP ROUNDS']]},
  {id:'finish',name:'FINISH',options:[['ember','EMBER'],['arctic','ARCTIC'],['moss','MOSS'],['violet','VIOLET']]}
];
const perks = {gunsmith:true,overkill:false,quickdraw:false};
const perkDetails = [
  {id:'gunsmith',name:'GUNSMITH',tag:'10 ATTACHMENTS',desc:'Unlock every weapon slot. Without it, you can fit 3 attachments.'},
  {id:'overkill',name:'OVERKILL',tag:'SECOND PRIMARY',desc:'Equip a second primary and swap between both in the arena.'},
  {id:'quickdraw',name:'QUICKDRAW',tag:'FAST HANDS',desc:'Reload 25% faster and swap weapons more quickly.'}
];
const weaponSlots = [0,null,4];
let selectedWeapon=0, selectedMode='skirmish', currentWeapon=0, currentSlot=0, selectedSlot=0, loadoutTab='attachments', gameActive=false, paused=false, finished=false;
let scene,camera,renderer,clock,raycaster,playerRig,weaponRig,weaponParts=[],bots=[],obstacles=[],tracers=[],effects=[];
let yaw=0,pitch=0,keys={},mouseDown=false,lastShot=0,reloading=false,reloadEnd=0,activeReloadDuration=0,weaponReadyAt=0,magAmmo=30,reserveAmmo=120,health=100,playerKills=0,rivalKills=0,shotsFired=0,shotsHit=0,elapsed=0,modeClock=0,spawnTimer=0,roundWave=1,domProgress=0,domEnemy=0,damageFlash=0,toastTimer;
const player={pos:new THREE.Vector3(0,1.68,16),vel:new THREE.Vector3(),speed:8.2};
const worldMat=(color,rough=.8,metal=0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const materialCache=new Map();
function mat(color,rough=.8,metal=0){const key=`${color}-${rough}-${metal}`;if(!materialCache.has(key))materialCache.set(key,worldMat(color,rough,metal));return materialCache.get(key)}
function box(parent,x,y,z,w,h,d,material,bevel=false){const geo=new THREE.BoxGeometry(w,h,d);const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);if(bevel){const edges=new THREE.EdgesGeometry(geo);const line=new THREE.LineSegments(edges,new THREE.LineBasicMaterial({color:0x36443c,transparent:true,opacity:.35}));mesh.add(line)}parent.add(mesh);return mesh}
function cylinder(parent,x,y,z,rt,rb,h,material,segments=12){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,segments),material);mesh.position.set(x,y,z);parent.add(mesh);return mesh}

function init(){
  scene=new THREE.Scene();scene.background=new THREE.Color(0x121c1b);scene.fog=new THREE.FogExp2(0x121c1b,.018);
  camera=new THREE.PerspectiveCamera(76,innerWidth/innerHeight,.08,180);camera.rotation.order='YXZ';
  renderer=new THREE.WebGLRenderer({canvas:$('gameCanvas'),antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  clock=new THREE.Clock();raycaster=new THREE.Raycaster();raycaster.far=145;
  scene.add(new THREE.HemisphereLight(0xabc8c0,0x29302a,1.25));
  const key=new THREE.DirectionalLight(0xffe1b5,2.4);key.position.set(-15,25,10);scene.add(key);
  const teal=new THREE.PointLight(0x4ab8a3,23,42);teal.position.set(0,8,-10);scene.add(teal);
  const orange=new THREE.PointLight(0xf08b52,26,34);orange.position.set(18,6,3);scene.add(orange);
  buildArena();
  playerRig=new THREE.Group();scene.add(playerRig);playerRig.position.copy(player.pos);
  camera.position.set(0,0,0);playerRig.add(camera);
  buildViewWeapon();
  addEvents();resize();renderer.setAnimationLoop(frame);
}
function buildArena(){
  const ground=box(scene,0,-.55,0,100,1,100,mat(0x29312d,.93));
  const floorGrid=new THREE.GridHelper(80,40,0x5b7970,0x374741);floorGrid.position.y=-.045;floorGrid.material.transparent=true;floorGrid.material.opacity=.2;scene.add(floorGrid);
  // Arena walls and broken industrial skyline.
  box(scene,0,5,-29,66,11,1.3,mat(0x25312e));box(scene,0,5,29,66,11,1.3,mat(0x25312e));box(scene,-33,5,0,1.3,11,58,mat(0x25312e));box(scene,33,5,0,1.3,11,58,mat(0x25312e));
  for(let x=-30;x<=30;x+=6){box(scene,x,10.8,-28.4,2.4,.28,.18,mat(x%12?0x60746b:0xb6ef67,.45,.2));box(scene,x,10.8,28.4,2.4,.28,.18,mat(x%12?0x60746b:0xd28358,.45,.2))}
  // back walls with ribbing and service bays
  for(let z of [-29,29]){for(let x=-27;x<=27;x+=9){box(scene,x,4.7,z+(z<0?.73:-.73),.32,9.3,.28,mat(0x394741,.75,.22));box(scene,x,1.4,z+(z<0?.9:-.9),4.8,.22,.12,mat(0x6a7668,.45,.35))}}
  // Objective lanes: cover stacks, shipping modules, and raised platforms.
  const crateMat=mat(0x536257,.75,.25),crateDark=mat(0x3c4943,.72,.28),orangeMat=mat(0x9d573c,.68,.26),edge=mat(0xb6ef67,.4,.32);
  const crates=[[-13,0,-17,7,3,3],[12,0,-18,8,2.7,3],[-21,0,-7,4,3.8,4],[20,0,-4,5,3.2,4],[-11,0,1,4,2.3,3],[13,0,5,5,2.6,3],[-20,0,17,7,3.2,3],[20,0,18,6,3.6,3],[0,0,-22,5,2.3,2],[1,0,12,4,2.1,3]];
  crates.forEach(([x,y,z,w,h,d],i)=>{let o=box(scene,x,y+h/2,z,w,h,d,i%3===0?orangeMat:i%2?crateMat:crateDark,true);o.userData.collider={x,z,w,d};obstacles.push(o);box(scene,x,y+h/2,z-d/2-.025,w*.88,.06,.05,edge);for(let xx=x-w/2+.24;xx<x+w/2;xx+=.58)box(scene,xx,y+.12,z-d/2-.04,.035,h-.24,.04,mat(0x26332d,.65,.3));});
  // Mid arena barricades and flank pillars
  for(const [x,z] of [[-26,-20],[-26,0],[-26,20],[26,-20],[26,0],[26,20]]){box(scene,x,3,z,1.5,6,1.5,mat(0x36433e,.72,.3),true);box(scene,x,6.1,z,2,.22,2,orangeMat)}
  // overhead gantry
  box(scene,0,9,-7,48,.5,.75,mat(0x364640,.56,.45));box(scene,0,8.65,-7,42,.08,.08,edge);
  for(let x=-21;x<=21;x+=7){box(scene,x,7.7,-7,.16,2,.16,mat(0x4e6058,.5,.5));box(scene,x,9.3,-7,1.8,.22,.7,mat(0x293832,.45,.4))}
  // Cargo pallets, pipes, hazard marks
  for(const [x,z] of [[-4,-11],[8,-13],[-17,10],[16,12]]){box(scene,x,.15,z,2.7,.3,2.1,mat(0x6a513e,.85));for(let k=-1;k<=1;k++)box(scene,x+k*.85,.39,z,.13,.16,1.9,mat(0x967047,.6,.2))}
  for(const [x,z] of [[-29,-11],[29,11]]){cylinder(scene,x,2.2,z,.8,.8,4,mat(0x46534b,.38,.55),16);cylinder(scene,x,4.3,z,.87,.87,.12,edge,16)}
  // Glow lamps and signage
  for(const [x,z,color] of [[-28,-25,0xb6ef67],[28,-25,0xf08b52],[-28,25,0x54b8a4],[28,25,0xb6ef67]]){box(scene,x,7,z,1.1,1.3,.22,mat(0x16221d,.4,.3));box(scene,x,7,z-.14,.68,.68,.08,new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:2.3,roughness:.3}));const l=new THREE.PointLight(color,11,14);l.position.set(x,7,z);scene.add(l)}
  // skyline silhouettes outside the perimeter give depth
  for(let i=0;i<30;i++){const x=(Math.random()-.5)*140,z=(Math.random()<.5?-1:1)*(37+Math.random()*18),h=4+Math.random()*12,w=2+Math.random()*5;box(scene,x,h/2-0.2,z,w,h,2,mat(i%3?0x202c29:0x283631,.9))}
  const zone=new THREE.Mesh(new THREE.RingGeometry(3.2,3.5,48),new THREE.MeshBasicMaterial({color:0xb6ef67,transparent:true,opacity:.7,side:THREE.DoubleSide}));zone.rotation.x=-Math.PI/2;zone.position.set(0,.035,-2);scene.add(zone);const zoneLight=new THREE.PointLight(0x73c880,4,9);zoneLight.position.set(0,1,-2);scene.add(zoneLight);scene.userData.zone=zone;
}
function buildViewWeapon(){
  if(weaponRig){camera.remove(weaponRig)}
  config=weaponConfigs[currentWeapon];
  weaponRig=new THREE.Group();weaponParts=[];weaponRig.position.set(.35,-.32,-.65);weaponRig.rotation.set(-.04,-.05,-.015);camera.add(weaponRig);
  const w=weapons[currentWeapon],bodyMat=new THREE.MeshStandardMaterial({color:finishColors[config.finish],roughness:.34,metalness:.68}),dark=mat(0x1d2522,.4,.7),rubber=mat(0x101715,.9),metal=mat(0x74817a,.26,.82),glow=new THREE.MeshStandardMaterial({color:0x9be659,emissive:0x73b339,emissiveIntensity:1.25,roughness:.3});
  const kind=w.class;
  let length=kind==='SHOTGUN'?1.0:kind==='MARKSMAN'?1.2:kind==='LMG'?1.1:kind==='PISTOL'?.63:.9;
  const body=box(weaponRig,0,0,0,length,.17,.19,bodyMat,true);weaponParts.push(body);
  box(weaponRig,0,.105,-.035,length*.62,.055,.17,dark);box(weaponRig,-length*.05,-.115,.015,.22,.25,.16,rubber);
  box(weaponRig,-length*.34,-.16,.02,.19,.3,.16,bodyMat);
  const barrelLen=config.muzzle==='suppressor'?.49:config.barrel==='long'?.46:config.barrel==='light'?.29:kind==='SHOTGUN'?.38:.34;
  cylinder(weaponRig,length*.5+barrelLen/2,0,0,.035,.035,barrelLen,metal,12).rotation.z=Math.PI/2;
  cylinder(weaponRig,length*.5+barrelLen,0,0,.052,.045,.11,config.muzzle==='suppressor'?dark:metal,12).rotation.z=Math.PI/2;
  box(weaponRig,-.14,-.27,.04,.16,.28,.17,dark).rotation.x=-.19;
  box(weaponRig,.05,-.12,.13,.28,.1,.07,dark);
  for(let i=0;i<3;i++)box(weaponRig,-.17+i*.12,.1,.105,.055,.028,.018,glow);
  if(kind==='LMG'){box(weaponRig,-.03,-.25,.04,.2,.3,.16,dark);box(weaponRig,.32,-.14,0,.13,.13,.13,bodyMat)}
  if(kind==='SHOTGUN'){cylinder(weaponRig,.3,-.13,0,.07,.07,.42,dark,12).rotation.z=Math.PI/2}
  if(kind==='PISTOL'){box(weaponRig,-.25,-.14,0,.17,.26,.14,bodyMat);weaponRig.scale.setScalar(.78)}
  if(kind==='MARKSMAN' || config.optic!=='iron'){
    const scope=config.optic==='precision'?dark:bodyMat;box(weaponRig,-.03,.22,0,config.optic==='precision'?.38:.31,.16,.14,scope);cylinder(weaponRig,-.03,.22,.081,.055,.055,.025,glow,16);box(weaponRig,-.03,.13,0,.22,.06,.11,dark);
  } else {box(weaponRig,-.02,.16,0,.08,.12,.08,dark)}
  if(config.stock!=='standard')box(weaponRig,-length*.48,-.035,0,config.stock==='light'?.27:.34,.09,.13,config.stock==='light'?rubber:bodyMat);
  if(config.underbarrel!=='standard')box(weaponRig,.08,-.2,0,.28,.09,.13,dark);
  if(config.magazine!=='standard')box(weaponRig,-.02,-.25,.025,.17,config.magazine==='extended'?.31:.24,.15,config.magazine==='extended'?bodyMat:dark);
  if(config.muzzle==='compensator')box(weaponRig,length*.5+barrelLen,.025,0,.12,.075,.075,dark);
  if(config.laser!=='off'){const laserColor=config.laser==='green'?0x71ff72:0xff4c52;const laser=new THREE.Mesh(new THREE.BoxGeometry(.012,.012,.22),new THREE.MeshBasicMaterial({color:laserColor}));laser.position.set(.13,-.13,.14);weaponRig.add(laser)}
  // sculpted highlights and handguard ribs
  for(let i=0;i<5;i++)box(weaponRig,-.1+i*.09,.045,.106,.028,.035,.018,metal);
  const glove=mat(0x28342f,.9);box(weaponRig,-.09,-.28,.12,.19,.1,.18,glove);
  weaponRig.userData.baseY=-.32;weaponRig.userData.recoil=0;
}

function makeBot(x,z,elite=false){
  const root=new THREE.Group();root.position.set(x,0,z);root.userData.bot=null;
  const armor=new THREE.MeshStandardMaterial({color:elite?0x9a5945:0x56635c,roughness:.48,metalness:.48});
  const black=mat(0x171f1c,.62,.48), visor=new THREE.MeshStandardMaterial({color:elite?0xff9a62:0xe98767,emissive:elite?0xf05728:0xb43b27,emissiveIntensity:1.55,roughness:.25});
  const bot={root,hp:elite?145:100,max:elite?145:100,elite,fire:1+Math.random()*1.7,strafe:(Math.random()<.5?-1:1),speed:elite?2.45:2.9,dead:false,parts:[],hitFlash:0};root.userData.bot=bot;
  const torso=box(root,0,1.12,0,.68,.77,.38,armor,true),head=box(root,0,1.72,-.015,.38,.38,.36,black,true);box(root,0,1.73,-.2,.27,.11,.025,visor);
  box(root,0,1.35,-.21,.38,.06,.025,visor);box(root,-.38,1.34,0,.16,.43,.24,armor);box(root,.38,1.34,0,.16,.43,.24,armor);
  box(root,-.19,.53,0,.2,.6,.26,black);box(root,.19,.53,0,.2,.6,.26,black);
  box(root,0,.99,-.2,.31,.14,.035,mat(0xb6ef67,.5,.4));
  const gun=box(root,.28,1.05,-.36,.16,.12,.58,black);gun.rotation.x=-.1;
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.61,.035,5,28),new THREE.MeshBasicMaterial({color:elite?0xff815e:0xf1775f,transparent:true,opacity:.48}));ring.position.y=1.1;root.add(ring);
  root.traverse(o=>{if(o.isMesh){o.userData.bot=bot;bot.parts.push(o)}});scene.add(root);bots.push(bot);return bot;
}
function spawnBot(){
  if(bots.filter(b=>!b.dead).length>=8)return;
  let x,z,tries=0;do{x=(Math.random()-.5)*47;z=(Math.random()-.5)*43;tries++}while(tries<30&&(Math.hypot(x-player.pos.x,z-player.pos.z)<13||isBlocked(x,z,.8)));
  const elite=selectedMode==='survival'&&roundWave>2&&Math.random()<Math.min(.2+roundWave*.035,.55);
  const b=makeBot(x,z,elite);showToast(elite?'ELITE HOSTILE DETECTED':'HOSTILE INBOUND');return b;
}
function isBlocked(x,z,r=.55){
  if(Math.abs(x)>30.6||Math.abs(z)>26.7)return true;
  return obstacles.some(o=>{const c=o.userData.collider;return c&&x>c.x-c.w/2-r&&x<c.x+c.w/2+r&&z>c.z-c.d/2-r&&z<c.z+c.d/2+r});
}
function addEvents(){
  addEventListener('resize',resize);
  document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==$('gameCanvas')&&gameActive&&!paused&&!finished&&!isTouch()){pauseGame()}});
  document.addEventListener('mousemove',e=>{if(document.pointerLockElement===$('gameCanvas')&&gameActive&&!paused){yaw-=e.movementX*.0022;pitch-=e.movementY*.0022;pitch=THREE.MathUtils.clamp(pitch,-1.27,1.27)}});
  document.addEventListener('keydown',e=>{keys[e.code]=true;if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.repeat)return;
    if(e.code==='Escape'){if(gameActive&&!paused)pauseGame();else if(paused)resumeGame()}
    if(e.code==='KeyR'&&gameActive&&!paused)reload();
    if(gameActive&&!paused&&e.code==='KeyQ')quickSwapLoadoutSlot();
    if(gameActive&&!paused&&e.code.startsWith('Digit')){const n=Number(e.code.slice(5));if(n>=1&&n<=3)switchLoadoutSlot(n-1)}
    if(e.code==='KeyE'&&gameActive&&!paused&&selectedMode==='domination')showToast('HOLD THE ZONE — STAY INSIDE THE RING');
  });document.addEventListener('keyup',e=>keys[e.code]=false);
  document.addEventListener('mousedown',e=>{if(e.button===0){mouseDown=true;if(gameActive&&!paused){if(!isTouch()&&document.pointerLockElement!==$('gameCanvas'))$('gameCanvas').requestPointerLock?.();fireWeapon()}}});
  document.addEventListener('mouseup',e=>{if(e.button===0)mouseDown=false});
  $('gameCanvas').addEventListener('click',()=>{if(gameActive&&!paused&&!isTouch()&&document.pointerLockElement!==$('gameCanvas'))$('gameCanvas').requestPointerLock?.()});
  $('deployBtn').onclick=()=>startGame();$('loadoutBtn').onclick=()=>openLoadout();$('closeLoadout').onclick=()=>closeLoadout();$('equipBtn').onclick=()=>{if(selectedSlot===1&&!perks.overkill){showToast('OVERKILL PERK REQUIRED');return}if(weaponSlots[selectedSlot]===null||weaponSlots[selectedSlot]===undefined){showToast('SELECT A WEAPON FOR THIS SLOT');return}if(gameActive)saveWeaponAmmo(currentWeapon);currentSlot=selectedSlot;currentWeapon=weaponSlots[currentSlot];config=weaponConfigs[currentWeapon];loadWeaponAmmo(currentWeapon);reloading=false;activeReloadDuration=0;weaponReadyAt=0;buildViewWeapon();updateWeaponHud();closeLoadout();showToast(`${weapons[currentWeapon].name} LOADOUT EQUIPPED`)};
  $('resumeBtn').onclick=resumeGame;$('exitBtn').onclick=()=>exitGame();$('pauseLoadoutBtn').onclick=()=>{openLoadout(true)};
  $('againBtn').onclick=()=>startGame();$('resultExit').onclick=()=>exitGame();
  document.querySelectorAll('.mode-card').forEach(el=>el.onclick=()=>{document.querySelectorAll('.mode-card').forEach(c=>c.classList.remove('selected'));el.classList.add('selected');selectedMode=el.dataset.mode});
  document.querySelectorAll('.loadout-tab').forEach(tab=>tab.onclick=()=>setLoadoutTab(tab.dataset.tab));
  $('touchFire').addEventListener('pointerdown',e=>{e.preventDefault();mouseDown=true;fireWeapon()});$('touchFire').addEventListener('pointerup',()=>mouseDown=false);$('touchFire').addEventListener('pointercancel',()=>mouseDown=false);
  $('touchReload').onclick=()=>reload();
  const pad=$('movePad');let padPointer=null;pad.addEventListener('pointerdown',e=>{padPointer=e.pointerId;pad.setPointerCapture(e.pointerId);updatePad(e)});pad.addEventListener('pointermove',e=>{if(padPointer===e.pointerId)updatePad(e)});pad.addEventListener('pointerup',()=>{padPointer=null;keys.KeyW=keys.KeyA=keys.KeyS=keys.KeyD=false});
  function updatePad(e){const r=pad.getBoundingClientRect(),dx=(e.clientX-r.left-r.width/2)/(r.width/2),dy=(e.clientY-r.top-r.height/2)/(r.height/2);keys.KeyW=dy<-.25;keys.KeyS=dy>.25;keys.KeyA=dx<-.25;keys.KeyD=dx>.25}
  let touchLook=null;document.addEventListener('touchstart',e=>{if(!gameActive||e.target.closest('.touch-controls')||e.target.closest('.modal-layer'))return;for(const t of e.changedTouches){if(t.clientX>innerWidth*.35)touchLook={id:t.identifier,x:t.clientX,y:t.clientY}}},{passive:true});document.addEventListener('touchmove',e=>{if(!touchLook)return;for(const t of e.changedTouches)if(t.identifier===touchLook.id){yaw-=(t.clientX-touchLook.x)*.006;pitch=THREE.MathUtils.clamp(pitch-(t.clientY-touchLook.y)*.006,-1.2,1.2);touchLook.x=t.clientX;touchLook.y=t.clientY}},{passive:true});document.addEventListener('touchend',e=>{for(const t of e.changedTouches)if(t.identifier===touchLook?.id)touchLook=null},{passive:true});
}
function isTouch(){return matchMedia('(pointer:coarse)').matches||innerWidth<700}
function resize(){if(!renderer)return;camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7))}

function startGame(){
  clearRound();
  $('mainMenu').classList.add('hidden');$('pausePanel').classList.add('hidden');$('resultPanel').classList.add('hidden');$('loadoutPanel').classList.add('hidden');$('gameHud').classList.remove('hidden');
  if(weaponSlots[currentSlot]===null||weaponSlots[currentSlot]===undefined||currentSlot===1&&!perks.overkill)currentSlot=weaponSlots[0]!==null&&weaponSlots[0]!==undefined?0:perks.overkill&&weaponSlots[1]!==null&&weaponSlots[1]!==undefined?1:2;currentWeapon=weaponSlots[currentSlot]??weaponSlots[2]??0;config=weaponConfigs[currentWeapon];
  gameActive=true;paused=false;finished=false;elapsed=0;modeClock=modes[selectedMode].time;playerKills=0;rivalKills=0;shotsFired=0;shotsHit=0;health=100;loadWeaponAmmo(currentWeapon);reloading=false;activeReloadDuration=0;weaponReadyAt=0;buildViewWeapon();roundWave=1;domProgress=0;domEnemy=0;spawnTimer=.45;player.pos.set(0,1.68,16);yaw=0;pitch=0;playerRig.position.copy(player.pos);playerRig.rotation.y=yaw;
  for(let i=0;i<5;i++)spawnBot();updateHud();showModeMessage(selectedMode==='survival'?'WAVE 01 — INCOMING':selectedMode==='domination'?'SECURE THE ZONE':'OPERATION START');
  if(!isTouch())$('gameCanvas').requestPointerLock?.();
}
function clearRound(){bots.forEach(b=>scene.remove(b.root));bots=[];for(const t of tracers)scene.remove(t.line);tracers=[];effects.forEach(e=>scene.remove(e.mesh));effects=[]}
function pauseGame(){if(!gameActive||finished)return;paused=true;mouseDown=false;$('pausePanel').classList.remove('hidden');$('pausePanel').setAttribute('aria-hidden','false');document.exitPointerLock?.()}
function resumeGame(){if(!gameActive)return;paused=false;$('pausePanel').classList.add('hidden');if(!isTouch())$('gameCanvas').requestPointerLock?.();clock.getDelta()}
function exitGame(){gameActive=false;paused=false;finished=false;document.exitPointerLock?.();$('pausePanel').classList.add('hidden');$('resultPanel').classList.add('hidden');$('gameHud').classList.add('hidden');$('mainMenu').classList.remove('hidden');clearRound()}
function openLoadout(fromPause=false){if(gameActive&&!paused&&!fromPause)return;selectedSlot=0;selectedWeapon=weaponSlots[selectedSlot]??0;config=weaponConfigs[selectedWeapon];renderLoadout();$('loadoutPanel').classList.remove('hidden');$('loadoutPanel').setAttribute('aria-hidden','false');if(fromPause)$('pausePanel').classList.add('hidden')}
function closeLoadout(){if(gameActive)config=weaponConfigs[currentWeapon];$('loadoutPanel').classList.add('hidden');if(gameActive&&paused){$('pausePanel').classList.remove('hidden')} }
function setLoadoutTab(tab){loadoutTab=tab;document.querySelectorAll('.loadout-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));$('attachmentsView').classList.toggle('hidden',tab!=='attachments');$('perksView').classList.toggle('hidden',tab!=='perks')}
function renderLoadout(){renderWeaponSlots();renderWeaponList();renderWeaponPreview();renderAttachmentList();renderPerks();setLoadoutTab(loadoutTab)}
function renderWeaponSlots(){const host=$('weaponSlots');host.innerHTML='';const slots=[['PRIMARY',0],['OVERKILL',1],['SIDEARM',2]];slots.forEach(([label,index])=>{const weapon=weaponSlots[index],b=document.createElement('button');b.className='weapon-slot'+(selectedSlot===index?' active':'')+((weapon===null||weapon===undefined)?' empty':'');b.disabled=index===1&&!perks.overkill;b.innerHTML=`<span class="weapon-slot-label">${label}</span><strong>${weapon===null?'EMPTY':weapon===undefined?'EMPTY':weapons[weapon].name}</strong><small>${index===0?'1':index===1?'2 / Q':'3'}</small>`;b.onclick=()=>{selectedSlot=index;if(weaponSlots[index]!==null&&weaponSlots[index]!==undefined){selectedWeapon=weaponSlots[index];config=weaponConfigs[selectedWeapon]}renderLoadout()};host.appendChild(b)})}
function weaponFitsSlot(i,slot=selectedSlot){return slot===2?weapons[i].class==='PISTOL':weapons[i].class!=='PISTOL'}
function renderWeaponList(){const list=$('weaponList');list.innerHTML='';weapons.forEach((w,i)=>{const b=document.createElement('button'),fits=weaponFitsSlot(i),inOtherSlot=weaponSlots.some((n,slot)=>slot!==selectedSlot&&n===i);b.className='weapon-item'+(selectedWeapon===i?' active':'')+(!fits?' incompatible':'');b.disabled=!fits;b.innerHTML=`<span class="weapon-index">${String(i+1).padStart(2,'0')}</span><span class="weapon-item-name">${w.name}</span><span class="weapon-item-class">${inOtherSlot?'EQUIPPED':w.class}</span>`;b.onclick=()=>selectWeapon(i);list.appendChild(b)})}
function renderWeaponPreview(){const w=weapons[selectedWeapon];if(!w)return;$('weaponName').textContent=w.name;$('weaponClass').textContent=`${w.type} / ${w.class==='BURST'?'3-RND BURST':w.class==='PISTOL'?'SEMI AUTO':w.class==='SHOTGUN'?'PUMP ACTION':'FULL AUTO'}`;$('weaponFlavor').textContent=w.desc;$('weaponPreviewIcon').textContent=w.icon;const stats=[['IMPACT',w.damage,100],['FIRE RATE',w.rate,14],['CONTROL',100-Math.round(w.spread*700),100],['RANGE',w.range,140]];$('weaponStats').innerHTML=stats.map(([n,v,max])=>`<div class="stat"><span>${n}</span><strong>${n==='FIRE RATE'?v.toFixed(1):v}</strong><div class="stat-track"><i style="width:${Math.min(100,v/max*100)}%"></i></div></div>`).join('');updatePreview()}
function selectWeapon(i){if((selectedSlot===1&&!perks.overkill)||!weaponFitsSlot(i))return;const previous=weaponSlots[selectedSlot],otherSlot=weaponSlots.findIndex((weapon,slot)=>slot!==selectedSlot&&weapon===i);if(otherSlot!==-1)weaponSlots[otherSlot]=previous;weaponSlots[selectedSlot]=i;selectedWeapon=i;config=weaponConfigs[i];renderWeaponSlots();renderWeaponList();renderWeaponPreview();renderAttachmentList()}
function attachmentCount(c=config){return attachmentSlots.filter(s=>s.id!=='finish'&&c[s.id]!==defaultConfig[s.id]).length}
function renderAttachmentList(){const host=$('attachmentList'),max=perks.gunsmith?10:3;host.innerHTML=attachmentSlots.map(slot=>{const selected=config[slot.id],used=attachmentCount(),isDefault=selected===defaultConfig[slot.id],slotNumber=attachmentSlots.filter(s=>s.id!=='finish').findIndex(s=>s.id===slot.id)+1;return `<div class="attachment-row"><div class="attachment-name"><span>${slot.name}</span><small>${slot.id==='finish'?'COSMETIC':'SLOT '+String(slotNumber).padStart(2,'0')}</small></div><div class="attachment-options" data-slot="${slot.id}">${slot.options.map(([value,label])=>{const blocked=slot.id!=='finish'&&value!==defaultConfig[slot.id]&&isDefault&&used>=max;return `<button class="attach-option${selected===value?' active':''}" data-value="${value}" ${blocked?'disabled':''}>${label}</button>`}).join('')}</div></div>`}).join('');$('attachmentCount').textContent=`${attachmentCount()} / ${max} FITTED`;host.querySelectorAll('.attachment-options button').forEach(btn=>btn.onclick=()=>{const group=btn.closest('[data-slot]'),id=group.dataset.slot,value=btn.dataset.value;if(id!=='finish'&&value!==defaultConfig[id]&&config[id]===defaultConfig[id]&&attachmentCount()>=max)return;config[id]=value;syncWeaponAmmoCapacity(selectedWeapon);renderAttachmentList();updatePreview();if(weaponRig&&currentWeapon===selectedWeapon)buildViewWeapon()})}
function renderPerks(){const host=$('perkList');host.innerHTML=perkDetails.map(perk=>`<button class="perk-card${perks[perk.id]?' active':''}" data-perk="${perk.id}"><span class="perk-check">${perks[perk.id]?'✓':'+'}</span><span class="perk-copy"><strong>${perk.name}</strong><small>${perk.desc}</small></span><span class="perk-tag">${perk.tag}</span></button>`).join('');$('perkCount').textContent=`${Object.values(perks).filter(Boolean).length} / 02`;host.querySelectorAll('[data-perk]').forEach(btn=>btn.onclick=()=>{const id=btn.dataset.perk;if(perks[id])perks[id]=false;else if(Object.values(perks).filter(Boolean).length<2)perks[id]=true;else{showToast('SELECT UP TO TWO PERKS');return}if(id==='gunsmith'&&!perks.gunsmith){for(const weaponConfig of weaponConfigs){let kept=0;for(const slot of attachmentSlots){if(slot.id==='finish')continue;if(weaponConfig[slot.id]!==defaultConfig[slot.id]&&++kept>3)weaponConfig[slot.id]=defaultConfig[slot.id]}}weaponConfigs.forEach((_,index)=>syncWeaponAmmoCapacity(index))}if(id==='overkill'&&!perks.overkill&&gameActive&&currentSlot===1){saveWeaponAmmo(currentWeapon);currentSlot=weaponSlots[0]!==null&&weaponSlots[0]!==undefined?0:weaponSlots[2]!==null&&weaponSlots[2]!==undefined?2:0;currentWeapon=weaponSlots[currentSlot]??0;config=weaponConfigs[currentWeapon];loadWeaponAmmo(currentWeapon);reloading=false;activeReloadDuration=0;buildViewWeapon();updateWeaponHud()}renderLoadout()})}
function updatePreview(){$('weaponPreviewIcon').style.color=`#${finishColors[config.finish].toString(16).padStart(6,'0')}`;renderAttachmentList()}
function quickSwapLoadoutSlot(){const primarySlots=[0,1].filter(slot=>weaponSlots[slot]!==null&&weaponSlots[slot]!==undefined&&(slot!==1||perks.overkill));if(currentSlot===2){switchLoadoutSlot(primarySlots[0]??2);return}const otherPrimary=primarySlots.find(slot=>slot!==currentSlot);switchLoadoutSlot(otherPrimary??(weaponSlots[2]!==null&&weaponSlots[2]!==undefined?2:currentSlot))}
function switchLoadoutSlot(slot){if(slot<0||slot>=weaponSlots.length||weaponSlots[slot]===null||weaponSlots[slot]===undefined||slot===1&&!perks.overkill)return;const next=weaponSlots[slot];if(next===currentWeapon&&slot===currentSlot)return;saveWeaponAmmo(currentWeapon);currentSlot=slot;currentWeapon=next;config=weaponConfigs[currentWeapon];loadWeaponAmmo(currentWeapon);reloading=false;activeReloadDuration=0;buildViewWeapon();const now=performance.now(),delay=perks.quickdraw?80:190;weaponRig.userData.swapStart=now;weaponRig.userData.swapDuration=delay;weaponReadyAt=now+delay;updateWeaponHud();showToast(`${slot===1?'OVERKILL':'LOADOUT'} — ${weapons[next].name}`)}
function magazineCapacity(w,c=config){return Math.round(w.mag*(c.magazine==='extended'?1.4:1))}
function reloadDuration(w,c=config){return w.reload*(c.magazine==='fast'?.72:1)*(c.grip==='tape'?.85:1)*(perks.quickdraw?.75:1)}
function loadWeaponAmmo(index){const state=ammoStates[index],capacity=magazineCapacity(weapons[index],weaponConfigs[index]);magAmmo=Math.min(state.mag,capacity);reserveAmmo=state.reserve;state.mag=magAmmo}
function saveWeaponAmmo(index=currentWeapon){if(!ammoStates[index])return;ammoStates[index].mag=magAmmo;ammoStates[index].reserve=reserveAmmo}
function syncWeaponAmmoCapacity(index){const capacity=magazineCapacity(weapons[index],weaponConfigs[index]);ammoStates[index].mag=Math.min(ammoStates[index].mag,capacity);if(index===currentWeapon){magAmmo=Math.min(magAmmo,capacity);ammoStates[index].mag=magAmmo;updateWeaponHud()}}
function updateWeaponHud(){const w=weapons[currentWeapon];$('currentWeaponName').textContent=w.name;$('currentWeaponType').textContent=w.type;$('ammoCurrent').textContent=String(magAmmo).padStart(2,'0');$('ammoReserve').textContent=reserveAmmo;$('fireMode').innerHTML=`${w.class==='BURST'?'BURST':w.class==='PISTOL'?'SEMI':'AUTO'} <i>•</i> ${currentSlot+1}` }
function updateHud(){ $('playerScore').textContent=String(playerKills).padStart(2,'0');$('enemyScore').textContent=String(rivalKills).padStart(2,'0');$('healthValue').textContent=Math.ceil(health);$('healthBar').style.width=`${health}%`;$('healthBar').style.background=health<30?'#ee725e':'var(--acid)';$('ammoCurrent').textContent=String(magAmmo).padStart(2,'0');$('ammoReserve').textContent=reserveAmmo;$('hudMode').textContent=modes[selectedMode].name;$('hudSub').textContent=modes[selectedMode].sub;updateWeaponHud();const secs=selectedMode==='survival'?0:Math.max(0,modeClock);$('timer').textContent=selectedMode==='survival'?`W${String(roundWave).padStart(2,'0')}`:`${String(Math.floor(secs/60)).padStart(2,'0')}:${String(Math.floor(secs%60)).padStart(2,'0')}` }
function showToast(text){const t=$('toast');t.textContent=text;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),1550)}
function showModeMessage(text){const n=$('centerNotice');n.textContent=text;n.classList.remove('show');void n.offsetWidth;n.classList.add('show')}
function addFeed(text){const item=document.createElement('div');item.className='feed-item';item.innerHTML=text;$('killFeed').prepend(item);while($('killFeed').children.length>4)$('killFeed').lastChild.remove();setTimeout(()=>item.remove(),4800)}
function reload(){if(!gameActive||paused||finished)return;const w=weapons[currentWeapon],capacity=magazineCapacity(w,config);if(reloading||magAmmo>=capacity||reserveAmmo<=0)return;activeReloadDuration=reloadDuration(w,config);reloading=true;reloadEnd=performance.now()+activeReloadDuration*1000;showToast('RELOADING…')}
function fireWeapon(){if(!gameActive||paused||finished||!weaponRig)return;const now=performance.now(),w=weapons[currentWeapon];if(now<weaponReadyAt||now-lastShot<1000/w.rate)return;if(reloading){if(now<reloadEnd)return;finishReload()}if(magAmmo<=0){reload();return}lastShot=now;magAmmo--;saveWeaponAmmo(currentWeapon);shotsFired++;updateWeaponHud();weaponRig.userData.recoil=.095;weaponRig.rotation.x=-.04;const cameraDir=new THREE.Vector3();camera.getWorldDirection(cameraDir);const spread=w.spread*(config.optic==='precision'?.46:config.optic==='reflex'?.78:1)*(config.muzzle==='compensator'?.77:1)*(config.barrel==='long'?.92:config.barrel==='light'?1.08:1)*(config.underbarrel==='vertical'?.86:config.underbarrel==='angled'?.94:1)*(config.stock==='tactical'?.94:config.stock==='light'?1.06:1)*(config.grip==='ergonomic'?.94:config.grip==='tape'?1.02:1);cameraDir.x+=(Math.random()-.5)*spread;cameraDir.y+=(Math.random()-.5)*spread;cameraDir.z+=(Math.random()-.5)*spread;cameraDir.normalize();raycaster.set(camera.getWorldPosition(new THREE.Vector3()),cameraDir);const targets=bots.filter(b=>!b.dead).flatMap(b=>b.parts);const hit=raycaster.intersectObjects([...targets,...obstacles],false)[0];let end=raycaster.ray.origin.clone().add(cameraDir.clone().multiplyScalar(70));if(hit){end.copy(hit.point);if(hit.object.userData.bot){const bot=hit.object.userData.bot;const head=hit.object.position.y>1.55;const ammoMultiplier=config.ammo==='hollow'?1.15:config.ammo==='armor'?1.08:1;bot.hp-=w.damage*ammoMultiplier*(head?1.55:1);bot.hitFlash=.11;shotsHit++;showHitmarker();if(bot.hp<=0)killBot(bot);else{hit.object.material.emissive?.setHex(0x581e11);setTimeout(()=>{if(hit.object.material.emissive)hit.object.material.emissive.setHex(0)},100)}}}
  makeTracer(camera.getWorldPosition(new THREE.Vector3()),end,w.color);const muzzle=new THREE.PointLight(w.color,2.4,4);muzzle.position.copy(camera.position);muzzle.position.add(cameraDir.clone().multiplyScalar(.75));camera.add(muzzle);setTimeout(()=>camera.remove(muzzle),45);$('crosshair').style.transform='translate(-50%,-50%) scale(1.35)';setTimeout(()=>$('crosshair').style.transform='translate(-50%,-50%) scale(1)',70);if(magAmmo===0)showToast('MAGAZINE EMPTY — PRESS R');
}
function finishReload(){if(!reloading)return;const capacity=magazineCapacity(weapons[currentWeapon],config),needed=Math.max(0,capacity-magAmmo),take=Math.min(needed,reserveAmmo);magAmmo+=take;reserveAmmo-=take;reloading=false;activeReloadDuration=0;saveWeaponAmmo(currentWeapon);if(weaponRig)weaponRig.rotation.x=-.04;updateWeaponHud()}
function showHitmarker(){const h=$('hitmarker');h.classList.remove('show');void h.offsetWidth;h.classList.add('show')}
function makeTracer(start,end,color){const geo=new THREE.BufferGeometry().setFromPoints([start.clone(),end.clone()]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color,transparent:true,opacity:.8}));scene.add(line);tracers.push({line,life:.07,max:.07})}
function killBot(bot){if(bot.dead)return;bot.dead=true;scene.remove(bot.root);playerKills++;if(selectedMode==='survival'&&bots.filter(b=>!b.dead).length===0){roundWave++;showModeMessage(`WAVE ${String(roundWave).padStart(2,'0')} — INCOMING`);spawnTimer=1.5+Math.min(roundWave*.35,3)}else if(selectedMode!=='survival')spawnTimer=Math.max(.4,1.8-Math.min(elapsed/150,.8));addFeed(`<strong>YOU</strong> &nbsp;▸&nbsp; ${bot.elite?'ELITE HOSTILE':'HOSTILE'} &nbsp; <span style="color:#7d8b81">+100 XP</span>`);updateHud();if(selectedMode==='skirmish'&&playerKills>=modes.skirmish.limit)endGame(true);if(selectedMode==='timeattack')modeClock=Math.min(modes.timeattack.time,modeClock+1.5)}
function enemyFire(bot){if(bot.dead)return;const origin=bot.root.position.clone().add(new THREE.Vector3(0,1.5,0)),target=player.pos.clone();if(origin.distanceTo(target)>29)return;const dir=target.sub(origin).normalize();const blocker=raycaster;blocker.set(origin,dir);const obstruction=blocker.intersectObjects(obstacles,false)[0];if(obstruction&&obstruction.distance<origin.distanceTo(player.pos)-1)return;const miss=Math.random()<.54?1:0;if(miss)return;const distance=origin.distanceTo(player.pos),dmg=(bot.elite?11:7)*(distance<8?1.25:1);health=Math.max(0,health-dmg);damageFlash=Math.min(1,damageFlash+.7);updateHud();makeTracer(origin,player.pos.clone(),0xf08069);if(health<=0){if(selectedMode==='survival'){health=0;updateHud();endGame(false);return}health=100;rivalKills++;player.pos.set((Math.random()-.5)*12,1.68,19);showModeMessage('DOWNED — REDEPLOYING');updateHud();if(selectedMode==='skirmish'&&rivalKills>=modes.skirmish.limit)endGame(false)}}
function endGame(won){if(finished)return;finished=true;gameActive=false;paused=false;document.exitPointerLock?.();const totalSeconds=Math.floor(elapsed);$('resultKicker').textContent=won?'CONTRACT FULFILLED':'CONTRACT FAILED';$('resultTitle').innerHTML=won?'WELL<br><span>PLAYED.</span>':'TRY<br><span>AGAIN.</span>';$('resultKills').textContent=String(playerKills).padStart(2,'0');$('resultAccuracy').textContent=shotsFired?`${Math.round(shotsHit/shotsFired*100)}%`:'0%';$('resultTime').textContent=`${String(Math.floor(totalSeconds/60)).padStart(2,'0')}:${String(totalSeconds%60).padStart(2,'0')}`;$('resultPanel').classList.remove('hidden')}
function updateDomination(dt){const inZone=Math.hypot(player.pos.x,player.pos.z+2)<4.4;const live=bots.filter(b=>!b.dead);const enemyIn=live.some(b=>Math.hypot(b.root.position.x,b.root.position.z+2)<4.6);const before=Math.floor(domProgress/25);if(inZone&&!enemyIn){domProgress=Math.min(100,domProgress+dt*9);domEnemy=Math.max(0,domEnemy-dt*4)}else if(enemyIn&&!inZone){domEnemy=Math.min(100,domEnemy+dt*7);domProgress=Math.max(0,domProgress-dt*3)}if(Math.floor(domProgress/25)>before&&domProgress<100)showModeMessage(`ZONE ${Math.floor(domProgress)}% SECURED`);if(domProgress>=100)endGame(true);if(domEnemy>=100)endGame(false)}

function updatePlayer(dt){
  const forward=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0);
  const side=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0);
  const length=Math.hypot(forward,side)||1,sprint=keys.ShiftLeft||keys.ShiftRight;
  const speed=player.speed*(sprint?1.42:1),sin=Math.sin(yaw),cos=Math.cos(yaw);
  const dx=(side*cos-forward*sin)/length*speed*dt,dz=(-forward*cos-side*sin)/length*speed*dt;
  if(!isBlocked(player.pos.x+dx,player.pos.z,.48))player.pos.x+=dx;
  if(!isBlocked(player.pos.x,player.pos.z+dz,.48))player.pos.z+=dz;
  player.pos.x=THREE.MathUtils.clamp(player.pos.x,-30,30);player.pos.z=THREE.MathUtils.clamp(player.pos.z,-26,26);
  playerRig.position.copy(player.pos);playerRig.rotation.y=yaw;camera.rotation.x=pitch;
  if(weaponRig){const moving=forward!==0||side!==0;const now=performance.now(),t=now*.008;let swapOffset=0,reloadOffset=0;if(weaponRig.userData.swapStart){const progress=Math.min(1,(now-weaponRig.userData.swapStart)/weaponRig.userData.swapDuration);swapOffset=-.16*(1-progress);if(progress>=1)weaponRig.userData.swapStart=0}let reloadProgress=0;if(reloading&&activeReloadDuration>0){reloadProgress=THREE.MathUtils.clamp(1-(reloadEnd-now)/(activeReloadDuration*1000),0,1);reloadOffset=-.08*Math.sin(reloadProgress*Math.PI)}weaponRig.position.y=weaponRig.userData.baseY+(moving?Math.sin(t)*.012:0)+swapOffset+reloadOffset;weaponRig.position.x=.35+(moving?Math.cos(t*.5)*.009:0);if(weaponRig.userData.recoil>0){weaponRig.userData.recoil=Math.max(0,weaponRig.userData.recoil-dt*.65);weaponRig.position.z=-.65+weaponRig.userData.recoil*.36;weaponRig.rotation.x=-.04+weaponRig.userData.recoil*.55}else{weaponRig.position.z=-.65;weaponRig.rotation.x=-.04}if(reloading&&activeReloadDuration>0)weaponRig.rotation.x=-.04-Math.sin(reloadProgress*Math.PI)*.42}
}
function updateBots(dt){
  const live=bots.filter(b=>!b.dead);const target=player.pos;
  for(const bot of live){const pos=bot.root.position,dx=target.x-pos.x,dz=target.z-pos.z,dist=Math.hypot(dx,dz)||.001;
    bot.fire-=dt;bot.hitFlash=Math.max(0,bot.hitFlash-dt);
    if(dist>5.3){const step=bot.speed*dt;const nx=pos.x+dx/dist*step,nz=pos.z+dz/dist*step;if(!isBlocked(nx,pos.z,.55))pos.x=nx;if(!isBlocked(pos.x,nz,.55))pos.z=nz}
    else{const sx=(-dz/dist)*bot.strafe*bot.speed*.48*dt,sz=(dx/dist)*bot.strafe*bot.speed*.48*dt;if(!isBlocked(pos.x+sx,pos.z,.55))pos.x+=sx;if(!isBlocked(pos.x,pos.z+sz,.55))pos.z+=sz;if(Math.random()<dt*.55)bot.strafe*=-1}
    bot.root.rotation.y=Math.atan2(-dx,-dz);
    if(bot.fire<=0){enemyFire(bot);bot.fire=(bot.elite?1.25:1.55)+Math.random()*1.25}
  }
}
function updateEffects(dt){
  for(let i=tracers.length-1;i>=0;i--){const t=tracers[i];t.life-=dt;t.line.material.opacity=Math.max(0,t.life/t.max);if(t.life<=0){scene.remove(t.line);t.line.geometry.dispose();t.line.material.dispose();tracers.splice(i,1)}}
  damageFlash=Math.max(0,damageFlash-dt*1.6);$('gameHud').style.setProperty('--damage',damageFlash.toFixed(2));
}
function updateRound(dt){
  if(!gameActive||paused||finished)return;
  elapsed+=dt;
  if(selectedMode==='survival'){
    spawnTimer-=dt;
    if(spawnTimer<=0){const alive=bots.filter(b=>!b.dead).length;const desired=Math.min(3+roundWave,8);if(alive<desired)spawnBot();spawnTimer=alive<desired?.7:1.1}
  }else{
    modeClock=Math.max(0,modeClock-dt);spawnTimer-=dt;
    if(spawnTimer<=0&&bots.filter(b=>!b.dead).length<5)spawnBot();
    if(selectedMode==='domination')updateDomination(dt);
    if(modeClock<=0){if(selectedMode==='domination')endGame(domProgress>=domEnemy);else if(selectedMode==='skirmish')endGame(playerKills>=rivalKills);else endGame(true)}
  }
  if(selectedMode==='timeattack'){$('playerScore').textContent=String(playerKills).padStart(2,'0');$('enemyScore').textContent=String(Math.max(0,Math.ceil(modeClock))).padStart(2,'0')}
  if(selectedMode==='domination')$('playerScore').textContent=`${Math.floor(domProgress)}%`;
  updateHud();
}
function frame(){
  if(!renderer)return;const dt=Math.min(clock.getDelta(),.05);
  if(gameActive&&!paused&&!finished){updatePlayer(dt);if(mouseDown)fireWeapon();updateBots(dt);if(reloading&&performance.now()>=reloadEnd)finishReload();updateRound(dt)}
  updateEffects(dt);renderer.render(scene,camera);
}
init();

