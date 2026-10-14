import {WIDTH,HEIGHT,makeMap,drawWorld,drawActor,drawGun,drawChest,drawPortal,drawPickup,drawSplash} from './art.js';
import {createRooms,DOORS,roomEntryPosition,areNeighbors,comboRank,comboMultiplier,seedNumber,combineSeed,randomSource} from './rooms.mjs';
import {STORY_SCENES,memoryForRoom,STORY_TITLE} from './story.mjs';
import {setupNarrative} from './narrative.js';
import {drawDragon,drawDragonClues} from './cinematic.js';
import {WEAPONS,TREASURE_WEAPONS,BOSS_WEAPONS,BOSS_DATA,FLOOR_BOSSES,bossHp,isBoss,hitRayPoint,RELICS,draftRelics,applyRelic} from './arsenal.mjs';
const $=id=>document.getElementById(id);
const canvas=$('gameCanvas'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
drawSplash($('splashCanvas'));
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const random=(a,b)=>a+Math.random()*(b-a),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const dom={menu:$('menuOverlay'),help:$('helpOverlay'),state:$('stateOverlay'),reward:$('relicOverlay'),banner:$('banner'),toast:$('toast'),interact:$('interact')};
// Mount the reward dialog at document root so small-screen canvas clipping cannot hide choices.
document.body.appendChild(dom.reward);
let mode='menu',G=null,frame=0,last=performance.now(),audio=null,soundOn=true;
const N=setupNarrative({
  getMode:()=>mode,setMode:v=>{mode=v;
    if(v==='story'||v==='archive'){keys.clear();mouse.down=false;touch.fire=false;}},
  onReturn:()=>{if(mode==='playing')canvas.focus();}
});
function freshSeed(){
  const query=new URLSearchParams(location.search).get('seed');
  if(query!==null&&query.trim()!=='')return seedNumber(query);
  if(globalThis.crypto?.getRandomValues){
    const key=new Uint32Array(1);crypto.getRandomValues(key);return key[0];
  }
  return (Date.now()^Math.floor(Math.random()*0xffffffff))>>>0;
}
const keys=new Set(),mouse={x:652,y:299,down:false},touch={x:0,y:0,fire:false,active:false};
const params=WEAPONS;
let touchMode=window.matchMedia('(pointer:coarse)').matches;
if(touchMode)$('touchControls').classList.add('active');
function sound(freq=310,duration=.08,type='square',volume=.045){
  if(!soundOn)return;
  try{
    audio=audio||new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')audio.resume();
    const osc=audio.createOscillator(),gain=audio.createGain();
    osc.type=type;osc.frequency.setValueAtTime(freq,audio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.62),audio.currentTime+duration);
    gain.gain.setValueAtTime(volume,audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);
    osc.connect(gain);gain.connect(audio.destination);osc.start();osc.stop(audio.currentTime+duration);
  }catch(e){soundOn=false;}
}
function toast(message,sec=2){
  dom.toast.textContent=message;dom.toast.classList.add('show');
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>dom.toast.classList.remove('show'),sec*1000);
}
function banner(title,subtitle='NEW WAVE',sec=1.6){
  dom.banner.querySelector('b').textContent=title;
  dom.banner.querySelector('small').textContent=subtitle;
  dom.banner.classList.add('show');clearTimeout(banner.timer);
  banner.timer=setTimeout(()=>dom.banner.classList.remove('show'),sec*1000);
}
function blankGame(seed=freshSeed()){
  const p={x:480,y:374,r:15,hp:100,maxHp:100,shield:40,maxShield:40,speed:225,
    dir:-.35,hit:0,lastHit:0,invuln:0,dashCd:0,dashTime:0,dashVX:0,dashVY:0,
    skillCd:0,fireCd:0,recoil:0,weapons:['pistol'],slot:0,moving:false,
    power:1,attackSpeed:1,bladePower:1,projectilePower:1,shieldRegen:0,
    magnet:0,dashFactor:1,skillFactor:1,vampireHeal:0,relics:[],
    meleeStage:0,meleeWindow:0,meleeCd:0,meleeFx:0,meleeAngle:0,meleeRange:0};
  const rooms=createRooms(seed,1);
  return {seed,runSeed:seed.toString(16).toUpperCase().padStart(8,'0'),
    floor:1,roomIndex:0,rooms,wave:1,kills:0,coins:0,score:0,
    combo:0,bestCombo:0,comboTimer:0,time:0,player:p,map:makeMap(1,rooms[0]),
    enemies:[],bullets:[],enemyBullets:[],specialShots:[],beams:[],pickups:[],
    particles:[],chest:null,portal:null,shake:0,flash:0,transitionCd:0,
    relicOptions:[],rewardWeapon:null,dragonRemains:null,
    clues:{dress:false,ring:false},dragonStage:1};
}
G=blankGame();
function currentRoom(){return G.rooms[G.roomIndex];}
function newGame(){
  G=blankGame();keys.clear();touch.fire=false;mouse.down=false;
  mode='playing';dom.menu.classList.add('hidden');dom.state.classList.add('hidden');dom.help.classList.add('hidden');dom.reward.classList.add('hidden');
  $('statusText').textContent='EXPEDITION IN PROGRESS';
  $('resumeBtn').style.display='';
  canvas.focus();
  N.play('opening',()=>enterRoom(0));
}
function saveCurrentRoom(){
  const room=currentRoom();
  if(!room)return;
  room.enemies=G.enemies;room.pickups=G.pickups;
  room.chest=G.chest;room.portal=G.portal;
}
function enterRoom(id,fromId=null){
  const g=G;
  if(!g.rooms[id]||(fromId!==null&&!areNeighbors(g.rooms,fromId,id)))return false;
  if(fromId!==null)saveCurrentRoom();
  g.roomIndex=id;g.wave=id+1;
  const room=currentRoom();
  room.visited=true;
  g.map=makeMap(g.floor,room);
  g.enemies=room.enemies;g.pickups=room.pickups;
  g.chest=room.chest;g.portal=room.portal;
  g.bullets=[];g.enemyBullets=[];g.specialShots=[];g.beams=[];g.particles=[];g.transitionCd=.65;
  g.player.dashTime=0;g.player.invuln=Math.max(g.player.invuln,.7);
  const p=roomEntryPosition(g.rooms,fromId,id);
  g.player.x=room.kind==='dragon'?480:p.x;
  g.player.y=room.kind==='dragon'?467:p.y;
  if(!room.spawned)populateRoom(room);
  else banner(room.name,room.cleared?'ROOM CLEARED':'RETURN TO THE FIGHT',1.2);
  updateHud();return true;
}
function populateRoom(room){
  room.spawned=true;
  if(room.kind==='treasure'){
    room.cleared=true;room.chest={x:480,y:302,opened:false};G.chest=room.chest;
    banner('发现秘藏宝室','SECRET CHAMBER',2);
    toast('古老的遗物被遗忘在这里。宝箱就在房间中央。',2.4);
    sound(780,.23,'triangle',.04);return;
  }
  if(room.kind==='memory'||room.kind==='event'){
    room.cleared=true;
    const memoryId=memoryForRoom(G.floor,room.kind);
    if(memoryId&&!room.memoryCollected){
      room.memoryCollected=true;
      N.play(memoryId,()=>{
        banner(room.kind==='memory'?'拾回一段记忆':'发现失落的线索','MEMORY RECOVERED',1.8);
        updateHud();
      });
    }
    updateHud();return;
  }
  if(room.kind==='guardian'){
    const kind=FLOOR_BOSSES[G.floor-1];
    spawnEnemy(kind,480,224);
    banner(BOSS_DATA[kind].name+' · 苏醒','BOSS CHAMBER',2.4);
    toast(BOSS_DATA[kind].hint,2.7);
    sound(155,.46,'sawtooth',.05);return;
  }
  if(room.kind==='dragon'){
    spawnEnemy('dragon',480,315);
    banner('最后的守望者','THE LAST DRAGON',2.5);
    N.play('beforeDragon',()=>toast('打败这条龙，完成国王交付的使命……',2.2));
    return;
  }
  const rand=randomSource(combineSeed(G.seed,G.floor,room.id,'enemies'));
  const count=(room.isMain?3:4)+(G.floor-1)+Math.floor(rand()*4);
  const types=['slime','bat','shooter','slime','bat','shooter'];
  for(let i=0;i<count;i++){
    const pos=freeSpot(170);
    spawnEnemy(types[Math.floor(rand()*types.length)],pos.x,pos.y);
  }
  banner(room.name,'ROOM '+String(room.id+1).padStart(2,'0')+' / '+String(G.rooms.length).padStart(2,'0'));
  sound(620,.13,'triangle',.025);
}
function clearRoom(){
  const room=currentRoom();
  if(room.cleared||!room.spawned)return;
  room.cleared=true;
  G.score+=Math.round(150*G.floor*comboMultiplier(G.combo));
  if(room.kind==='dragon'){
    G.dragonRemains=G.dragonLastPos||{x:480,y:315};
    G.enemyBullets=[];G.specialShots=[];G.beams=[];
    G.combo=0;G.comboTimer=0;
    banner('王命已成。','THE DRAGON HAS FALLEN',2.4);
    N.play('dragonFallen',()=>toast('调查巨龙身旁发光的遗物。',4));
  }else if(room.kind==='guardian'){
    G.portal={x:480,y:208};room.portal=G.portal;
    banner(G.floor===3?'前往最后的王庭':'通往下一层的传送门','FLOOR CLEARED',2.4);
    toast('靠近传送门按 E '+(G.floor===3?'进入龙眠王庭':'进入下一层'),2.9);
  }else{
    banner('房间净化 · 大门开启','ROOM CLEARED',1.8);
    toast('通路已解锁！直接走入发光门即可进入下一房间',2.4);
    if(room.kind==='combat'&&G.rooms.some(r=>r.kind==='treasure'&&!r.visited))
      toast('别忘了探索支路，也许藏着古老的圣物。',2.5);
  }
  sound(790,.19,'sine',.055);updateHud();
}
function nextFloor(){
  if(G.floor>=4)return;
  const last=G.floor;
  G.floor++;G.rooms=createRooms(G.seed,G.floor);G.roomIndex=0;G.wave=1;
  G.enemies=[];G.pickups=[];G.chest=null;G.portal=null;
  G.combo=0;G.comboTimer=0;
  G.player.shield=Math.min(G.player.maxShield,G.player.shield+27);
  G.player.hp=Math.min(G.player.maxHp,G.player.hp+32);G.player.invuln=1;
  enterRoom(0);
  if(G.floor<=3&&last<=2)N.play('floor'+last);
  banner(G.floor===4?'龙眠王庭':'抵达第 '+G.floor+' 层','THE DEPTHS AWAIT',2.2);
  sound(550,.28,'sine',.045);updateHud();
}
function setState(type){
  mode=type;const paused=type==='paused',win=type==='won';
  dom.state.classList.remove('hidden');$('stateIcon').textContent=paused?'Ⅱ':win?'◇':'✕';
  dom.state.querySelector('.state-card').classList.toggle('ending-card',win);
  $('stateLabel').textContent=paused?'GAME PAUSED':win?'THE FORGOTTEN OATH':'ADVENTURE ENDED';
  $('stateTitle').textContent=paused?'冒险暂歇':win?'……我认出你了。':'勇者倒下了';
  $('stateDescription').textContent=paused?'休息一下，记忆仍在等待你。':win?'那枚银色戒指还在。他终于记得，她却再也无法回应。':'下一次迷宫会改变，但遗失的记忆还在。';
  $('resumeBtn').style.display=paused?'':'none';
  $('resultFloor').textContent=String(G.floor).padStart(2,'0');
  $('resultKills').textContent=String(G.kills).padStart(2,'0');
  $('resultCoins').textContent=String(G.coins).padStart(3,'0');
  $('resultCombo').textContent='×'+G.bestCombo;
  $('statusText').textContent=paused?'GAME PAUSED':win?'EXPEDITION COMPLETE':'GAME OVER';
  dom.interact.classList.remove('show');
  if(!paused)sound(win?320:105,.65,win?'sine':'sawtooth',.039);
}
function togglePause(){
  if(mode==='playing'){setState('paused');mouse.down=false;touch.fire=false;}
  else if(mode==='paused'){mode='playing';dom.state.classList.add('hidden');
    canvas.focus();$('statusText').textContent='EXPEDITION IN PROGRESS';}
}
function updateHud(){
  const p=G.player,room=currentRoom();
  $('hpFill').style.width=clamp(p.hp/p.maxHp*100,0,100)+'%';
  $('shieldFill').style.width=clamp(p.shield/p.maxShield*100,0,100)+'%';
  $('hpText').textContent=Math.ceil(Math.max(0,p.hp))+' / '+p.maxHp;
  $('shieldText').textContent=Math.ceil(Math.max(0,p.shield))+' / '+p.maxShield;
  $('playerLevel').textContent='LV. '+String(G.floor).padStart(2,'0');
  $('floorLabel').textContent=G.floor===4?'终章': '第 '+String(G.floor).padStart(2,'0')+' 层';
  $('waveLabel').textContent=room.name+' · '+(G.roomIndex+1)+'/'+G.rooms.length;
  $('coinText').textContent=String(G.coins).padStart(3,'0');
  const active=G.combo>1&&G.comboTimer>0;
  $('comboHud').classList.toggle('active',active);
  $('comboCount').textContent='×'+G.combo;
  $('comboRank').textContent=comboRank(G.combo)+' · '+comboMultiplier(G.combo).toFixed(2)+' 倍';
  $('comboFill').style.width=(clamp(G.comboTimer/4.8,0,1)*100)+'%';
  $('comboFill').style.background=G.combo>=8?'#fd9e73':G.combo>=4?'#f5d18c':'#8ce9ca';
}

function freeSpot(fromPlayer=170){
  for(let i=0;i<150;i++){
    const x=random(92,868),y=random(135,498);
    if(Math.hypot(x-G.player.x,y-G.player.y)<fromPlayer)continue;
    if(G.map.obstacles.some(o=>x>o.x-34&&x<o.x+o.w+34&&y>o.y-34&&y<o.y+o.h+34))continue;
    return{x,y};
  }return{x:120,y:160};
}
function spawnEnemy(type,x,y){
  const normal={
    slime:{hp:43,speed:66,r:15,damage:13,color:'#9be4ba'},
    bat:{hp:29,speed:130,r:13,damage:10,color:'#b2a0e8'},
    shooter:{hp:51,speed:74,r:16,damage:9,color:'#a894e6'},
    seal:{hp:155,speed:0,r:24,damage:0,color:'#eaa3be'}
  };
  const boss=isBoss(type),stats=boss?BOSS_DATA[type]:normal[type];
  if(!stats)throw new Error('Unknown enemy '+type);
  const hp=boss?bossHp(type):Math.round(stats.hp*(1+(G.floor-1)*.22));
  G.enemies.push({...stats,type,x,y,hp,maxHp:hp,shootCd:boss?2.1:random(.4,2),
    attackCd:random(.5,1.3),phase:random(0,TAU),hit:0,dir:0,moving:false,dead:false,
    windup:0,teleportCd:3.6,summonCd:8,shotCount:0,dragonStage:1,
    stage2Shown:false,stage3Shown:false});
}

function blocked(x,y,r=13){
  if(x-r<64||x+r>896||y-r<94||y+r>527)return true;
  return G.map.obstacles.some(o=>{
    let px=clamp(x,o.x,o.x+o.w),py=clamp(y,o.y,o.y+o.h);
    return (x-px)**2+(y-py)**2<(r+3)**2;
  });
}
function moveEntity(e,dx,dy,r=e.r){
  if(!blocked(e.x+dx,e.y,r))e.x+=dx;
  if(!blocked(e.x,e.y+dy,r))e.y+=dy;
}
function particle(x,y,color,count=10,power=135){
  for(let i=0;i<count;i++){let a=random(0,TAU),s=random(20,power),life=random(.23,.67);
    G.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-20,life,maxLife:life,size:random(2,5),color});
  }
  if(G.particles.length>320)G.particles.splice(0,G.particles.length-320);
}
function addPickup(type,x,y){
  G.pickups.push({type,x,y,phase:random(0,TAU),life:23});
}
function grantWeapon(kind){
  if(!kind||!params[kind])return false;
  const p=G.player;
  if(p.weapons.includes(kind))return false;
  p.weapons.push(kind);p.slot=p.weapons.length-1;p.fireCd=.12;
  particle(p.x,p.y,params[kind].color,23,170);
  toast('✦ 新武器解锁：'+params[kind].name+'（按 '+p.weapons.length+' 切换）',3.2);
  sound(950,.28,'triangle',.06);updateHud();return true;
}
function showRelicChoice(){
  if(mode!=='playing'||!G.chest||G.chest.opened)return;
  mode='reward';mouse.down=false;touch.fire=false;keys.clear();
  G.relicOptions=draftRelics(G.player.relics);
  G.rewardWeapon=TREASURE_WEAPONS[G.floor-1];
  $('relicFloor').textContent='第 '+String(G.floor).padStart(2,'0')+' 层 · 秘藏宝室';
  $('rewardWeaponName').textContent=params[G.rewardWeapon].name;
  $('relicChoices').replaceChildren();
  G.relicOptions.forEach((item,index)=>{
    const btn=document.createElement('button');
    btn.type='button';btn.className='relic-card';btn.dataset.relic=item.id;
    const icon=document.createElement('span');icon.className='relic-card-icon';icon.textContent=item.icon;
    icon.style.color=item.color;
    const code=document.createElement('small');code.textContent='RELIC 0'+(index+1);
    const name=document.createElement('strong');name.textContent=item.name;
    const desc=document.createElement('span');desc.className='relic-description';desc.textContent=item.desc;
    const hint=document.createElement('em');hint.textContent=(index+1)+' · 选择这个';
    btn.append(code,icon,name,desc,hint);
    btn.addEventListener('click',()=>chooseRelic(item.id));
    $('relicChoices').appendChild(btn);
  });
  dom.interact.classList.remove('show');
  dom.reward.classList.remove('hidden');
  $('statusText').textContent='CHOOSE AN UPGRADE';
  sound(710,.22,'triangle',.05);
}
function chooseRelic(id){
  if(mode!=='reward'||!G.relicOptions.some(r=>r.id===id))return false;
  if(!applyRelic(G.player,id))return false;
  G.chest.opened=true;currentRoom().chest=G.chest;
  G.coins+=8;G.score+=250;
  const rewardWeapon=G.rewardWeapon;
  G.rewardWeapon=null;G.relicOptions=[];
  dom.reward.classList.add('hidden');mode='playing';
  $('statusText').textContent='EXPEDITION IN PROGRESS';
  particle(G.chest.x,G.chest.y,'#ffdaa2',36,180);
  sound(850,.25,'triangle',.065);
  grantWeapon(rewardWeapon);
  const relic=RELICS.find(r=>r.id===id);
  toast('获得 '+relic.name+'：'+relic.desc+' · 金币 +8',3.2);
  updateHud();canvas.focus();
  return true;
}
function cycleWeapon(step=1){
  if(mode!=='playing'||G.player.weapons.length<2)return;
  const n=G.player.weapons.length;
  switchWeapon((G.player.slot+step+n)%n);
}
function autoDoor(vx,vy){
  if(G.transitionCd>0||!currentRoom().cleared||mode!=='playing')return false;
  const p=G.player;
  for(const [dir,nextId] of Object.entries(currentRoom().exits)){
    const gate=DOORS[dir];
    if(distance(p,gate)>51)continue;
    const toward=dir==='right'?vx>.18:dir==='left'?vx<-.18:
      dir==='up'?vy<-.18:vy>.18;
    if(toward){
      return enterRoom(nextId,G.roomIndex);
    }
  }
  return false;
}
function laserShot(){
  const p=G.player,w=params.laser;
  const origin={x:p.x+Math.cos(p.dir)*19,y:p.y+Math.sin(p.dir)*19-8};
  let len=570;
  for(let d=10;d<=570;d+=7){
    if(blocked(origin.x+Math.cos(p.dir)*d,origin.y+Math.sin(p.dir)*d,3)){len=d-7;break;}
  }
  len=Math.max(0,len);
  const endX=origin.x+Math.cos(p.dir)*len,endY=origin.y+Math.sin(p.dir)*len;
  G.beams.push({...origin,x2:endX,y2:endY,life:.22,maxLife:.22,width:14,color:w.color});
  let hits=0;
  for(const e of G.enemies){
    if(e.dead)continue;
    const ray=hitRayPoint(origin.x,origin.y,p.dir,len,e.x,e.y-8,e.r+8);
    if(ray.hit){damageEnemy(e,Math.round(w.damage*p.power*p.projectilePower*comboMultiplier(G.combo)),p.dir);hits++;}
  }
  G.enemyBullets=G.enemyBullets.filter(b=>!hitRayPoint(origin.x,origin.y,p.dir,len,b.x,b.y,b.r+5).hit);
  for(let i=0;i<11;i++){
    const t=(i+Math.random())/11;
    particle(origin.x+(endX-origin.x)*t,origin.y+(endY-origin.y)*t,w.color,2,55);
  }
  G.shake=Math.max(G.shake,6);
  sound(640,.19,'sawtooth',.055);
  if(hits>1)toast('✦ 激光贯穿 '+hits+' 个目标',1.1);
}
function boomerangShot(){
  const p=G.player,w=params.boomerang;
  G.specialShots.push({kind:'boomerang',x:p.x+Math.cos(p.dir)*20,y:p.y+Math.sin(p.dir)*20-9,
    dir:p.dir,spin:0,elapsed:0,life:2,phase:'out',hits:new Set(),
    speed:w.speed,damage:Math.round(w.damage*p.power*p.projectilePower*comboMultiplier(G.combo)),
    r:17,color:w.color});
  particle(p.x,p.y,w.color,5,95);sound(440,.12,'triangle',.034);
}
function swordShot(){
  const p=G.player,w=params.sword;
  const target=G.enemies.filter(e=>!e.dead)
    .sort((a,b)=>distance(p,a)-distance(p,b))[0]||null;
  const a=target?Math.atan2(target.y-p.y,target.x-p.x):p.dir;
  G.specialShots.push({kind:'sword',x:p.x+Math.cos(a)*15,y:p.y+Math.sin(a)*15-8,
    dir:a,spin:0,elapsed:0,life:1.55,phase:'seek',target,
    damage:Math.round(w.damage*p.power*p.projectilePower*comboMultiplier(G.combo)),
    speed:w.speed,r:13,color:w.color});
  particle(p.x,p.y,'#c8baff',8,105);sound(910,.14,'sine',.04);
}
function updateSpecialShots(dt){
  const g=G,p=g.player;
  for(let i=g.beams.length-1;i>=0;i--){
    g.beams[i].life-=dt;if(g.beams[i].life<=0)g.beams.splice(i,1);
  }
  for(let i=g.specialShots.length-1;i>=0;i--){
    const s=g.specialShots[i];s.life-=dt;s.elapsed+=dt;s.spin+=dt*18;
    if(s.life<=0){g.specialShots.splice(i,1);continue;}
    if(s.kind==='boomerang'){
      if(s.phase==='out'&&s.elapsed>.53){s.phase='back';s.hits.clear();}
      if(s.phase==='out'){
        s.x+=Math.cos(s.dir)*s.speed*dt;
        s.y+=Math.sin(s.dir)*s.speed*dt;
      }else{
        const a=Math.atan2(p.y-8-s.y,p.x-s.x);
        s.dir=a;s.x+=Math.cos(a)*s.speed*1.4*dt;
        s.y+=Math.sin(a)*s.speed*1.4*dt;
        if(Math.hypot(p.x-s.x,p.y-8-s.y)<24){g.specialShots.splice(i,1);continue;}
      }
      for(const e of g.enemies){
        if(e.dead||s.hits.has(e))continue;
        if(Math.hypot(e.x-s.x,e.y-8-s.y)<e.r+s.r){
          s.hits.add(e);damageEnemy(e,s.damage,s.dir);
          particle(s.x,s.y,s.color,5,80);
        }
      }
    }else if(s.kind==='sword'){
      if(s.phase==='seek'){
        if(!s.target||s.target.dead){
          s.target=g.enemies.filter(e=>!e.dead)
            .sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0]||null;
        }
        if(s.target){
          s.dir=Math.atan2(s.target.y-8-s.y,s.target.x-s.x);
        }else if(s.elapsed>.5){s.phase='back';}
        if(s.elapsed>1.08)s.phase='back';
      }
      if(s.phase==='back')s.dir=Math.atan2(p.y-8-s.y,p.x-s.x);
      s.x+=Math.cos(s.dir)*s.speed*dt;
      s.y+=Math.sin(s.dir)*s.speed*dt;
      if(s.phase==='seek'){
        const enemy=g.enemies.find(e=>!e.dead&&Math.hypot(e.x-s.x,e.y-8-s.y)<e.r+s.r);
        if(enemy){
          damageEnemy(enemy,s.damage,s.dir);
          particle(enemy.x,enemy.y,s.color,17,140);
          s.phase='back';sound(860,.1,'triangle',.025);
        }
      }else if(Math.hypot(p.x-s.x,p.y-8-s.y)<22){
        g.specialShots.splice(i,1);continue;
      }
    }
  }
}
function enemyShot(e,angle,speed,color,r=6,damage=13,curve=0){
  G.enemyBullets.push({x:e.x,y:e.y-11,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
    r,damage,life:4.0,color,curve});
}
function enemyFire(e){
  const a=Math.atan2(G.player.y-e.y,G.player.x-e.x);
  if(e.type==='dragon'){
    const stage=e.dragonStage;
    if(stage===1){
      // Dragonflame: a broad, telegraphed cone, then a delayed tail wave.
      for(let i=-4;i<=4;i++)enemyShot(e,a+i*.135,205,'#f3a07d',8,15);
      particle(e.x,e.y-42,'#f9ac90',26,185);
      sound(170,.28,'sawtooth',.065);
    }else if(stage===2){
      // The dragon hesitates. The curse releases slow tears of silver flame.
      for(let i=-3;i<=3;i++)enemyShot(e,a+i*.18,188,'#c1caff',7,13,i*.035);
      for(let i=0;i<8;i++)enemyShot(e,TAU*i/8+G.time*.4,154,'#e9b6df',7,12);
      particle(e.x,e.y-35,'#bdcde7',23,150);
      sound(300,.23,'sine',.055);
    }else{
      // The king's curse yanks the dragon into an uncontrolled spiral.
      for(let i=0;i<15;i++)enemyShot(e,TAU*i/15+G.time*.7,170,'#fa929f',8,14,.08);
      for(let i=-3;i<=3;i++)enemyShot(e,a+i*.12,240,'#e1a6fd',7,17);
      particle(e.x,e.y-30,'#ec8baf',29,200);
      sound(125,.3,'sawtooth',.075);
    }
    return;
  }
  if(e.type==='boss_fire'){
    // Magma giant: slow circular nova interwoven with a three-shot aimed burst.
    const n=14,offset=G.time*.58;
    for(let i=0;i<n;i++)enemyShot(e,offset+i*TAU/n,165,'#ffad69',8,13);
    for(let i=-1;i<=1;i++)enemyShot(e,a+i*.19,240,'#ffd7a0',6,16);
    particle(e.x,e.y-18,'#f0a45e',24,175);
    sound(135,.23,'sawtooth',.055);
  }else if(e.type==='boss_arcane'){
    // Frost mage: teleportation and a dense, slightly spiralling frost fan.
    for(let i=-4;i<=4;i++)enemyShot(e,a+i*.19,240,'#9beeff',6,12,i*.055);
    if(++e.shotCount%2===0){
      for(let i=0;i<5;i++)enemyShot(e,TAU*i/5+G.time*.5,185,'#d4b5ff',7,12,-.09);
    }
    particle(e.x,e.y-12,'#c8a6ff',15,130);
    sound(430,.16,'triangle',.043);
  }else if(e.type==='boss'){
    // Abyss guardian: wide fan, stronger late-stage ring and periodic summoned bats.
    for(let i=-4;i<=4;i++)enemyShot(e,a+i*.175,265,'#f58fac',7,15);
    if(e.hp/e.maxHp<.61){
      for(let i=0;i<12;i++)enemyShot(e,TAU*i/12+G.time*.32,185,'#e6aceb',6,12);
    }
    particle(e.x,e.y-15,'#e2a0c5',19,170);
    sound(185,.24,'sawtooth',.053);
  }else{
    enemyShot(e,a,240,'#c4a1f6',6,12);
    particle(e.x,e.y-12,'#c4a1f6',5,80);
    sound(240,.13,'sine',.012);
  }
}
function updateBossAI(e,dt,dist,a){
  if(e.type==='dragon'){
    e.x=Math.max(155,Math.min(675,e.x));
    e.y=Math.max(226,Math.min(365,e.y));
    if(e.warning){
      e.windup-=dt;
      if(e.windup<=0){
        enemyFire(e);e.warning=false;e.windup=0;
        e.shootCd=e.dragonStage===3?1.48:e.dragonStage===2?2.32:2.1;
      }
    }else if(e.shootCd<=0&&dist<730){
      e.warning=true;e.windup=e.dragonStage===3?.55:.83;
      e.shootCd=e.windup;particle(e.x,e.y-40,e.color,12,100);
    }
    return;
  }
  e.teleportCd-=dt;e.summonCd-=dt;
  if(e.type==='boss_arcane'&&e.teleportCd<=0){
    particle(e.x,e.y-22,'#b5dafa',30,180);
    const spot=freeSpot(230);
    e.x=spot.x;e.y=spot.y;e.teleportCd=3.9;
    particle(e.x,e.y-18,'#dab9ff',26,160);
    sound(750,.23,'triangle',.044);
  }
  if(e.type==='boss'&&e.summonCd<=0&&G.enemies.length<12){
    for(let i=0;i<2;i++){
      const spot=freeSpot(150);
      spawnEnemy(i===0?'bat':'slime',spot.x,spot.y);
      particle(spot.x,spot.y,'#f5a2bf',12,110);
    }
    e.summonCd=e.hp/e.maxHp<.5?6:8.5;
    toast('深渊守卫召唤了暗影随从！',1.3);
  }
  if(e.warning){
    e.windup-=dt;
    if(e.windup<=0){
      enemyFire(e);
      e.warning=false;e.windup=0;e.shootCd=e.shootRate;
    }
  }else if(e.shootCd<=0&&dist<700){
    e.warning=true;e.windup=.68;
    e.shootCd=.68;
    particle(e.x,e.y-14,e.color,7,70);
  }
}
function damagePlayer(amount){
  const p=G.player;if(p.invuln>0||mode!=='playing')return;
  p.invuln=.58;p.hit=.17;p.lastHit=0;G.flash=.3;G.shake=8;
  const absorbed=Math.min(p.shield,amount);
  p.shield-=absorbed;p.hp-=amount-absorbed;
  if(G.combo>=3)toast('受到攻击 · 连击中断',1.2);
  G.combo=0;G.comboTimer=0;p.meleeStage=0;p.meleeWindow=0;
  particle(p.x,p.y,absorbed>0?'#a3dfff':'#f2a1a4',11,140);
  sound(130,.16,'sawtooth',.055);updateHud();
  if(p.hp<=0){p.hp=0;setState('dead');}
}
function damageEnemy(e,dmg,hitAngle=0){
  if(e.dead||mode!=='playing')return;
  if(e.type==='dragon'){
    const max=e.maxHp;
    if(e.dragonStage===3&&G.enemies.some(x=>x.type==='seal'&&!x.dead))
      dmg=Math.max(1,Math.round(dmg*.12));
    if(e.dragonStage===1&&e.hp-dmg<=max*.65){
      e.hp=Math.floor(max*.65);e.dragonStage=2;e.stage2Shown=true;e.shootCd=2.4;
      G.enemyBullets=[];G.shake=14;
      N.play('dragonHesitates',()=>toast('它似乎不愿继续战斗……',2.4));
      return;
    }
    if(e.dragonStage===2&&e.hp-dmg<=max*.30){
      e.hp=Math.floor(max*.30);e.dragonStage=3;e.stage3Shown=true;e.shootCd=2;
      G.enemyBullets=[];G.shake=18;
      for(const pos of [[292,284],[670,283],[484,448]])spawnEnemy('seal',...pos);
      N.play('dragonSeal',()=>toast('打碎 3 枚王之诅咒水晶！',3.5));
      return;
    }
  }
  e.hp-=dmg;e.hit=.13;
  particle(e.x+random(-8,8),e.y-13,e.color,isBoss(e.type)?8:4,90);
  e.x=clamp(e.x+Math.cos(hitAngle)*2,70,890);
  e.y=clamp(e.y+Math.sin(hitAngle)*2,100,515);
  if(e.hp>0)return;
  e.dead=true;
  if(e.type==='dragon')G.dragonLastPos={x:clamp(e.x,170,650),y:clamp(e.y,235,360)};
  G.kills++;G.shake=Math.min(12,G.shake+2);
  const hero=G.player;
  if(hero.vampireHeal>0)hero.hp=Math.min(hero.maxHp,hero.hp+hero.vampireHeal);
  G.combo=G.comboTimer>0?G.combo+1:1;
  G.comboTimer=4.8;G.bestCombo=Math.max(G.bestCombo,G.combo);
  const multi=comboMultiplier(G.combo);
  G.score+=Math.round((isBoss(e.type)?1200:100)*multi);
  if(G.combo>=3&&G.combo%3===0){
    toast('✦ '+G.combo+' 连击！ '+comboRank(G.combo)+' · ×'+multi.toFixed(2),1.45);
    particle(G.player.x,G.player.y,'#f9d38c',16,120);
    sound(580+G.combo*18,.2,'sine',.03);
  }
  particle(e.x,e.y,e.color,isBoss(e.type)?44:18,isBoss(e.type)?260:165);
  if(e.type==='dragon'){
    G.pickups=[];G.enemyBullets=[];G.bullets=[];G.beams=[];G.specialShots=[];
    particle(e.x,e.y-32,'#d5bac9',80,95);
    sound(117,.7,'sine',.05);
  }else if(e.type==='seal'){
    particle(e.x,e.y,'#f3c5db',35,180);
    sound(870,.31,'triangle',.06);
    if(!G.enemies.some(s=>s.type==='seal'&&!s.dead))
      toast('王之锁链已全部断裂！',2.4);
  }else if(isBoss(e.type)){
    for(let i=0;i<14+G.floor*3;i++)addPickup('coin',e.x+random(-85,85),e.y+random(-70,70));
    addPickup('heart',e.x+60,e.y+10);
    grantWeapon(BOSS_WEAPONS[G.floor-1]);
    sound(230,.52,'sawtooth',.08);
  }else{
    const drop=G.combo>=8?3:G.combo>=4?2:1;
    for(let i=0;i<drop;i++)addPickup('coin',e.x+random(-10,10),e.y+random(-10,10));
    if(Math.random()<.12)addPickup('heart',e.x+10,e.y);
    if(Math.random()<.08)addPickup('shield',e.x-10,e.y);
    sound(random(180,270),.09,'triangle',.026);
  }
  updateHud();
}
function shoot(){
  const p=G.player,kind=p.weapons[p.slot],w=params[kind];
  if(!w||p.fireCd>0)return;
  p.fireCd=Math.max(.055,w.rate/p.attackSpeed);p.recoil=1;
  if(kind==='laser'){laserShot();return;}
  if(kind==='boomerang'){boomerangShot();return;}
  if(kind==='sword'){swordShot();return;}
  const dmg=Math.round(w.damage*p.power*p.projectilePower*comboMultiplier(G.combo));
  for(let i=0;i<w.shots;i++){
    const spread=w.shots>1?(i-(w.shots-1)/2)*w.spread:random(-w.spread,w.spread);
    const a=p.dir+spread+(w.shots>1?random(-.04,.04):0);
    const ox=Math.cos(a)*24,oy=Math.sin(a)*24-7;
    G.bullets.push({x:p.x+ox,y:p.y+oy,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,
      r:w.shots>1?4:4.5,damage:dmg,life:1.15,color:w.color});
  }
  particle(p.x+Math.cos(p.dir)*39,p.y+Math.sin(p.dir)*39-7,
    w.color,w.shots>1?11:4,110);
  G.shake=Math.max(G.shake,w.shots>1?5:1.7);
  sound(kind==='rifle'?490:kind==='shotgun'?175:310,.055,
    kind==='rifle'?'triangle':'square',w.shots>1?.045:.025);
}
function dash(){
  const p=G.player;if(mode!=='playing'||p.dashCd>0)return;
  let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+touch.x;
  let dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+touch.y;
  let n=Math.hypot(dx,dy);
  if(n<.1){dx=Math.cos(p.dir);dy=Math.sin(p.dir);n=1;}
  p.dashVX=dx/n;p.dashVY=dy/n;p.dashTime=.19;p.dashCd=4*p.dashFactor;p.invuln=.27;
  particle(p.x,p.y,'#a1f2d6',16,190);sound(730,.16,'sine',.04);
}
function skill(){
  const p=G.player;if(mode!=='playing'||p.skillCd>0)return;
  p.skillCd=12*p.skillFactor;G.shake=13;
  for(const e of G.enemies){
    if(distance(p,e)<148+e.r)damageEnemy(e,Math.round(48*p.power*comboMultiplier(G.combo)),p.dir);
  }
  G.enemyBullets=G.enemyBullets.filter(b=>distance(p,b)>153);
  for(let i=0;i<62;i++){let a=i*TAU/62,r=random(25,130);
    G.particles.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,
      vx:Math.cos(a)*random(40,145),vy:Math.sin(a)*random(40,145),
      life:.49,maxLife:.49,size:random(3,6),color:i%3?'#a9edd7':'#fff0b9'});
  }
  sound(660,.32,'sine',.08);
}
function melee(){
  const p=G.player;if(mode!=='playing'||p.meleeCd>0)return;
  const stage=p.meleeWindow>0?(p.meleeStage%3)+1:1;
  const range=stage===1?82:stage===2?92:115;
  const arc=stage===1?Math.PI*.78:stage===2?Math.PI*1.12:TAU;
  const damage=[0,22,31,53][stage];
  p.meleeStage=stage;p.meleeWindow=stage===3?0:.83;
  p.meleeCd=stage===3?.44:.245;
  p.meleeFx=.22;p.meleeAngle=p.dir;p.meleeRange=range;
  for(const e of G.enemies){
    if(e.dead||distance(p,e)>range+e.r)continue;
    const angle=Math.atan2(e.y-p.y,e.x-p.x);
    const diff=Math.atan2(Math.sin(angle-p.dir),Math.cos(angle-p.dir));
    if(stage===3||Math.abs(diff)<arc/2){
      damageEnemy(e,Math.round(damage*p.power*p.bladePower*comboMultiplier(G.combo)),angle);
      if(!e.dead)moveEntity(e,Math.cos(angle)*12,Math.sin(angle)*12,e.r);
    }
  }
  G.enemyBullets=G.enemyBullets.filter(b=>{
    const angle=Math.atan2(b.y-p.y,b.x-p.x);
    const diff=Math.atan2(Math.sin(angle-p.dir),Math.cos(angle-p.dir));
    return distance(p,b)>range||(stage!==3&&Math.abs(diff)>arc/2);
  });
  particle(p.x+Math.cos(p.dir)*37,p.y+Math.sin(p.dir)*37-7,
    stage===3?'#fbe3a5':'#a6f6d6',stage===3?30:12,stage===3?240:120);
  G.shake=Math.max(G.shake,stage===3?8:3);
  if(stage===3)toast('✦ 三段终结技 · 旋刃斩！',1.1);
  sound([0,580,760,320][stage],stage===3?.21:.1,stage===3?'sawtooth':'triangle',.045);
}
function interact(){
  if(mode!=='playing')return;
  const p=G.player;
  if(G.dragonRemains){
    const d=G.dragonRemains;
    const dress={x:d.x+126,y:d.y+65},ring={x:d.x+84,y:d.y+30};
    if(!G.clues.dress&&distance(p,dress)<86){
      G.clues.dress=true;
      N.play('dress',()=>toast('另一道微弱的光，在龙的前爪上闪烁。',3.3));
      return;
    }
    if(G.clues.dress&&!G.clues.ring&&distance(p,ring)<84){
      G.clues.ring=true;
      N.play('ring',()=>N.play('revelation',()=>setState('won')));
      return;
    }
  }
  if(G.chest&&!G.chest.opened&&distance(p,G.chest)<76){
    showRelicChoice();return;
  }
  if(G.portal&&distance(p,G.portal)<78)nextFloor();
}
function switchWeapon(slot){
  if(mode!=='playing'||!G.player.weapons[slot])return;
  G.player.slot=slot;G.player.fireCd=.15;
  toast('已装备 '+params[G.player.weapons[slot]].name,1.2);sound(520,.08,'triangle',.023);
}
function update(dt){
  const g=G,p=g.player;g.time+=dt;
  g.shake=Math.max(0,g.shake-dt*25);g.flash=Math.max(0,g.flash-dt*1.4);
  if(mode!=='playing')return;
  p.dashCd=Math.max(0,p.dashCd-dt);p.skillCd=Math.max(0,p.skillCd-dt);
  g.transitionCd=Math.max(0,g.transitionCd-dt);
  p.fireCd=Math.max(0,p.fireCd-dt);p.invuln=Math.max(0,p.invuln-dt);
  p.hit=Math.max(0,p.hit-dt);p.recoil=Math.max(0,p.recoil-dt*8);p.lastHit+=dt;
  p.meleeCd=Math.max(0,p.meleeCd-dt);
  p.meleeFx=Math.max(0,p.meleeFx-dt);
  p.meleeWindow=Math.max(0,p.meleeWindow-dt);
  if(g.comboTimer>0){g.comboTimer=Math.max(0,g.comboTimer-dt);
    if(g.comboTimer===0)g.combo=0;}
  if(p.lastHit>5&&p.shield<p.maxShield)p.shield=Math.min(p.maxShield,p.shield+dt*(3+p.shieldRegen));
  let vx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+touch.x;
  let vy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+touch.y;
  const mag=Math.hypot(vx,vy);if(mag>1){vx/=mag;vy/=mag;}
  p.moving=mag>.06||p.dashTime>0;
  if(p.dashTime>0){
    p.dashTime-=dt;moveEntity(p,p.dashVX*750*dt,p.dashVY*750*dt);
    if(Math.random()<.85)particle(p.x,p.y,'#9be8d2',2,60);
  }else moveEntity(p,vx*p.speed*dt,vy*p.speed*dt);
  if(autoDoor(vx,vy))return;
  if(touchMode){
    const near=g.enemies.filter(e=>!e.dead).sort((a,b)=>distance(p,a)-distance(p,b))[0];
    if(near)p.dir=Math.atan2(near.y-p.y,near.x-p.x);
    else if(mag>.1)p.dir=Math.atan2(vy,vx);
  }else if(Math.hypot(mouse.x-p.x,mouse.y-p.y)>5)p.dir=Math.atan2(mouse.y-p.y,mouse.x-p.x);
  if(mouse.down||keys.has(' ')||touch.fire)shoot();
  for(const e of g.enemies){
    if(e.dead)continue;
    e.hit=Math.max(0,e.hit-dt);e.shootCd-=dt;e.attackCd-=dt;
    const dist=distance(e,p),a=Math.atan2(p.y-e.y,p.x-e.x);e.dir=a;
    let dx=Math.cos(a),dy=Math.sin(a);
    if(e.type==='seal'){
      e.moving=false;continue;
    }
    if(e.type==='shooter'){
      if(dist<175){dx*=-1;dy*=-1;}
      else if(dist<285){dx=Math.cos(a+Math.PI/2)*.45;dy=Math.sin(a+Math.PI/2)*.45;}
    }
    if(isBoss(e.type)){
      if(e.type==='dragon'){
        dx=Math.cos(a)*.45+Math.sin(G.time*.7)*.25;
        dy=Math.sin(a)*.32+Math.cos(G.time*.6)*.14;
      }else if(e.type==='boss_arcane'){
        dx=dist<190?-Math.cos(a):Math.cos(a)*.55;
        dy=dist<190?-Math.sin(a):Math.sin(a)*.55;
      }else{
        dx=Math.cos(a)*.85+Math.cos(g.time*.7)*.3;
        dy=Math.sin(a)*.85+Math.sin(g.time*.7)*.3;
      }
    }
    e.moving=dist>e.r+p.r+8;
    if(e.moving)moveEntity(e,dx*e.speed*dt,dy*e.speed*dt,e.r);
    if(dist<e.r+p.r+9&&e.attackCd<=0){damagePlayer(e.damage);e.attackCd=isBoss(e.type)?.85:1.1;}
    if(isBoss(e.type))updateBossAI(e,dt,dist,a);
    else if(e.type==='shooter'&&e.shootCd<=0&&dist<690){
      enemyFire(e);e.shootCd=random(1.6,2.2);
    }
  }
  for(let i=g.bullets.length-1;i>=0;i--){
    const b=g.bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(b.life<=0||blocked(b.x,b.y,b.r)){particle(b.x,b.y,'#f2d9a4',3,45);g.bullets.splice(i,1);continue;}
    const enemy=g.enemies.find(e=>!e.dead&&Math.hypot(b.x-e.x,b.y-e.y+9)<e.r+b.r);
    if(enemy){damageEnemy(enemy,b.damage,Math.atan2(b.vy,b.vx));g.bullets.splice(i,1);}
  }
  updateSpecialShots(dt);
  for(let i=g.enemyBullets.length-1;i>=0;i--){
    const b=g.enemyBullets[i];
    if(b.curve){const turn=b.curve*dt,c=Math.cos(turn),s=Math.sin(turn);
      const vx=b.vx*c-b.vy*s,vy=b.vx*s+b.vy*c;b.vx=vx;b.vy=vy;}
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(b.life<=0||blocked(b.x,b.y,b.r)){g.enemyBullets.splice(i,1);continue;}
    if(Math.hypot(b.x-p.x,b.y-p.y+8)<p.r+b.r){
      damagePlayer(b.damage);g.enemyBullets.splice(i,1);
    }
  }
  g.enemies=g.enemies.filter(e=>!e.dead);
  currentRoom().enemies=g.enemies;
  if(!currentRoom().cleared&&currentRoom().spawned&&g.enemies.length===0)clearRoom();
  for(let i=g.pickups.length-1;i>=0;i--){
    const item=g.pickups[i];item.life-=dt;
    let d=distance(item,p);
    const pickupRange=112+p.magnet;
    if(d<pickupRange&&d>1){let force=(pickupRange-d)/pickupRange;
      item.x+=(p.x-item.x)/d*dt*(120+force*280);
      item.y+=(p.y-item.y)/d*dt*(120+force*280);
    }
    if(d<21){
      if(item.type==='coin'){g.coins+=1;sound(880,.055,'sine',.012);}
      if(item.type==='heart'){p.hp=Math.min(p.maxHp,p.hp+24);toast('♥ 生命值 +24',1.1);}
      if(item.type==='shield'){p.shield=Math.min(p.maxShield,p.shield+18);toast('◆ 护盾值 +18',1.1);}
      if(item.type==='weapon'&&item.weapon)grantWeapon(item.weapon);
      particle(item.x,item.y,item.type==='coin'?'#f9d27a':'#add4e3',6,60);
      g.pickups.splice(i,1);
    }else if(item.life<0)g.pickups.splice(i,1);
  }
  for(let i=g.particles.length-1;i>=0;i--){
    const s=g.particles[i];s.life-=dt;
    if(s.life<=0){g.particles.splice(i,1);continue;}
    s.x+=s.vx*dt;s.y+=s.vy*dt;s.vx*=Math.pow(.13,dt);s.vy*=Math.pow(.13,dt);
  }
  let hint='';
  if(g.dragonRemains){
    const d=g.dragonRemains;
    const nearDress=distance(p,{x:d.x+126,y:d.y+65})<93;
    const nearRing=distance(p,{x:d.x+84,y:d.y+30})<93;
    if(!g.clues.dress&&nearDress)hint='调查残破的浅蓝礼服';
    else if(g.clues.dress&&!g.clues.ring&&nearRing)hint='调查巨龙爪上的戒指';
  }
  if(!hint&&g.chest&&!g.chest.opened&&distance(p,g.chest)<75)hint='开启神秘宝箱';
  else if(!hint&&g.portal&&distance(p,g.portal)<81)hint=g.floor===3?'前往龙眠王庭':'进入下一层';
  else if(!hint)for(const [dir,id] of Object.entries(currentRoom().exits)){
    if(distance(p,DOORS[dir])<90){
      hint=currentRoom().cleared?'走入发光门 → '+g.rooms[id].name:'消灭敌人后大门开启';
      break;
    }
  }
  dom.interact.classList.toggle('show',Boolean(hint));
  if(hint)dom.interact.innerHTML=(g.dragonRemains||g.chest&&!g.chest.opened||g.portal?
    '按 <kbd>E</kbd> ':'')+hint;
  if(Math.floor(g.time*10)!==Math.floor((g.time-dt)*10))updateHud();
}

function drawDoors(){
  const room=currentRoom();
  for(const [dir,id] of Object.entries(room.exits)){
    const pos=DOORS[dir],open=room.cleared,near=distance(G.player,pos)<84;
    const isSide=dir==='left'||dir==='right';
    const wide=isSide?35:72,high=isSide?68:37;
    const x=pos.x-wide/2,y=pos.y-high/2;
    ctx.save();
    ctx.fillStyle=open?'#62bda838':'#b3786736';
    ctx.fillRect(x-8,y-9,wide+16,high+18);
    ctx.fillStyle='#182d36';ctx.fillRect(x-4,y-5,wide+8,high+10);
    ctx.fillStyle=open?'#6fcbb2':'#c38a77';ctx.fillRect(x,y,wide,high);
    ctx.fillStyle=open?'#234d50':'#513944';ctx.fillRect(x+5,y+5,wide-10,high-10);
    ctx.fillStyle=open?'#a5f5cd':'#e4a17d';
    if(isSide){ctx.fillRect(pos.x-4,y+10,8,high-20);}
    else{ctx.fillRect(x+10,pos.y-4,wide-20,8);}
    ctx.font='bold 20px monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    const label=dir==='left'?'◀':dir==='right'?'▶':dir==='up'?'▲':'▼';
    ctx.fillText(open?label:'×',pos.x,pos.y+1);
    if(near){
      ctx.font='bold 12px sans-serif';
      const text=open?'→ '+G.rooms[id].name:'清怪解锁';
      ctx.fillStyle='#091e27e8';ctx.fillRect(pos.x-53,pos.y-62,106,20);
      ctx.fillStyle=open?'#f4e0ac':'#e9ad94';ctx.fillText(text,pos.x,pos.y-51);
    }
    ctx.restore();
  }
}
function drawMinimap(){
  const nodes=G.rooms,x=746,y=436,w=202,h=152;
  ctx.save();
  ctx.fillStyle='#07151ce8';ctx.fillRect(x,y,w,h);
  ctx.strokeStyle='#54787e';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  ctx.fillStyle='#c5d9cc';ctx.font='bold 11px sans-serif';ctx.textBaseline='middle';
  ctx.textAlign='left';ctx.fillText(G.floor===4?'龙眠王庭':'迷宫探索',x+12,y+13);
  ctx.font='9px monospace';ctx.fillStyle='#e9d397';ctx.textAlign='right';
  ctx.fillText('SEED '+G.runSeed,x+w-10,y+14);
  const minX=Math.min(...nodes.map(n=>n.x)),maxX=Math.max(...nodes.map(n=>n.x));
  const minY=Math.min(...nodes.map(n=>n.y)),maxY=Math.max(...nodes.map(n=>n.y));
  const step=Math.min(27,143/Math.max(1,maxX-minX),84/Math.max(1,maxY-minY));
  const originX=x+(w-(maxX-minX)*step)/2;
  const originY=y+39+(88-(maxY-minY)*step)/2;
  const center=r=>({x:originX+(r.x-minX)*step,y:originY+(r.y-minY)*step});
  const seen=new Set();
  for(const n of nodes){
    for(const otherId of Object.values(n.exits)){
      const key=[n.id,otherId].sort((a,b)=>a-b).join('-');
      if(seen.has(key))continue;seen.add(key);
      const a=center(n),b=center(nodes[otherId]);
      ctx.strokeStyle=n.visited&&nodes[otherId].visited?'#a0ddc8':'#546e73';
      ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }
  for(const n of nodes){
    const c=center(n),current=n.id===G.roomIndex;
    ctx.fillStyle=current?'#efd397':n.cleared?'#74c5a6':n.visited?'#8da4a1':'#263d46';
    const d=Math.max(12,Math.min(19,step*.73));
    ctx.fillRect(c.x-d/2,c.y-d/2,d,d);
    ctx.strokeStyle=current?'#fef0c8':n.visited?'#9bbab2':'#62777d';
    ctx.lineWidth=current?2:1;ctx.strokeRect(c.x-d/2,c.y-d/2,d,d);
    ctx.textAlign='center';ctx.font='bold 12px monospace';
    ctx.textBaseline='middle';ctx.fillStyle=current?'#102d39':n.visited?'#173541':'#54717b';
    ctx.fillText(n.kind==='treasure'?'◆':n.kind==='memory'?'◈':n.kind==='event'?'?':
      n.kind==='guardian'?'✦':n.kind==='dragon'?'♜':'·',c.x,c.y+1);
  }
  ctx.fillStyle='#8db5aa';ctx.font='9px monospace';ctx.textAlign='left';
  ctx.fillText(nodes.filter(n=>n.visited).length+'/'+nodes.length+' ROOMS · ◈ MEMORY',x+10,y+h-10);
  ctx.restore();
}
function drawMeleeSlash(){
  const p=G.player;if(p.meleeFx<=0)return;
  const alpha=Math.min(1,p.meleeFx/.22);
  const stage=p.meleeStage;
  ctx.save();ctx.translate(p.x,p.y-8);
  ctx.globalAlpha=alpha;
  ctx.shadowBlur=16;ctx.shadowColor=stage===3?'#ffe1a1':'#92f3df';
  const radius=p.meleeRange*.67;
  const arc=stage===1?Math.PI*.83:stage===2?Math.PI*1.2:TAU*1.85;
  ctx.beginPath();ctx.arc(0,0,radius,p.meleeAngle-arc/2,p.meleeAngle+arc/2);
  ctx.lineWidth=stage===3?17:12;ctx.strokeStyle=stage===3?'#fbe1a6':'#9cedd4';ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,radius+10,p.meleeAngle-arc/2,p.meleeAngle+arc/2);
  ctx.lineWidth=3;ctx.strokeStyle='#ffffff';ctx.stroke();
  ctx.restore();
}
function drawBar(x,y,w,value,color,height=6){
  ctx.fillStyle='#071722';ctx.fillRect(x-1,y-1,w+2,height+2);
  ctx.fillStyle='#40535a';ctx.fillRect(x,y,w,height);
  ctx.fillStyle=color;ctx.fillRect(x,y,Math.max(0,w*clamp(value,0,1)),height);
}
function drawGameUI(){
  const p=G.player,w=params[p.weapons[p.slot]];
  ctx.save();ctx.textBaseline='middle';
  // Weapon inventory, integrated into the dungeon floor.
  const x=365,y=534;
  ctx.fillStyle='#07151cdd';ctx.fillRect(x,y,262,55);
  ctx.strokeStyle='#6d91837a';ctx.strokeRect(x+.5,y+.5,261,54);
  for(let i=0;i<6;i++){
    const xx=x+9+i*41,selected=i===p.slot,weapon=p.weapons[i];
    ctx.fillStyle=selected?'#d8c18b':'#253e46';ctx.fillRect(xx,y+5,34,30);
    ctx.fillStyle=selected?'#33434c':'#122b37';ctx.fillRect(xx+2,y+7,30,26);
    ctx.font='bold 9px monospace';ctx.fillStyle=selected?'#fceabf':'#8ca9a3';
    ctx.fillText(String(i+1),xx+3,y+13);
    if(weapon){
      ctx.textAlign='center';ctx.font='bold 17px sans-serif';
      ctx.fillStyle=params[weapon].color;ctx.fillText(params[weapon].icon,xx+19,y+23);
      ctx.textAlign='left';
    }else{
      ctx.fillStyle='#4b6269';ctx.font='13px monospace';ctx.fillText('·',xx+18,y+25);
    }
  }
  ctx.font='bold 11px sans-serif';ctx.fillStyle='#f3dfb2';
  ctx.fillText(w.name,x+10,y+46);
  ctx.textAlign='right';ctx.font='9px monospace';ctx.fillStyle='#a5c5b7';
  ctx.fillText('F / 滚轮切枪 · '+p.relics.length+' 圣物',x+253,y+46);ctx.textAlign='left';
  const actions=[{x:74,k:'SHIFT',label:'闪避',cool:p.dashCd,max:4}, {x:173,k:'Q',label:'震荡',cool:p.skillCd,max:12},
    {x:272,k:'J',label:'三段斩',cool:p.meleeCd,max:.44}];
  actions.forEach(a=>{
    ctx.fillStyle='#07151cbd';ctx.fillRect(a.x,546,86,37);
    ctx.strokeStyle='#60817974';ctx.strokeRect(a.x+.5,546.5,85,36);
    ctx.fillStyle=a.cool>0?'#879996':'#f2d69d';ctx.font='bold 11px monospace';ctx.fillText(a.k,a.x+7,559);
    ctx.font='10px sans-serif';ctx.fillStyle='#cad4cb';ctx.fillText(a.label,a.x+45,559);
    drawBar(a.x+7,567,72,a.cool>0?1-a.cool/a.max:1,a.cool>0?'#7ea89f':'#e6c57f',5);
  });
  const boss=G.enemies.find(e=>isBoss(e.type)&&!e.dead);
  if(boss){
    ctx.fillStyle='#0a1c24e7';ctx.fillRect(288,104,384,34);
    ctx.strokeStyle='#647a82';ctx.strokeRect(288.5,104.5,383,33);
    ctx.fillStyle=BOSS_DATA[boss.type].color;ctx.font='bold 13px sans-serif';
    ctx.fillText('✦ '+BOSS_DATA[boss.type].name,302,116);
    ctx.font='bold 11px monospace';ctx.textAlign='right';
    ctx.fillStyle='#ffe1bf';ctx.fillText(Math.ceil(boss.hp)+' / '+boss.maxHp,658,117);
    ctx.textAlign='left';
    drawBar(302,124,354,boss.hp/boss.maxHp,BOSS_DATA[boss.type].color,8);
  }
  ctx.fillStyle='#101f2bd9';ctx.fillRect(634,541,105,42);
  ctx.fillStyle='#9bbaaf';ctx.font='bold 10px monospace';ctx.fillText('SCORE',642,552);
  ctx.fillStyle='#f7dc9f';ctx.font='bold 17px monospace';
  ctx.fillText(String(G.score).padStart(6,'0'),642,570);
  ctx.restore();
}
function drawCrosshair(x,y,t){
  ctx.save();ctx.translate(x,y);ctx.strokeStyle='#fae5b7';
  ctx.lineWidth=2;ctx.globalAlpha=.65+Math.sin(t*5)*.2;
  ctx.beginPath();ctx.arc(0,0,11,0,TAU);ctx.stroke();
  for(let i=0;i<4;i++){let a=i*TAU/4;
    ctx.beginPath();ctx.moveTo(Math.cos(a)*15,Math.sin(a)*15);
    ctx.lineTo(Math.cos(a)*22,Math.sin(a)*22);ctx.stroke();
  }
  ctx.fillStyle='#c2ede3';ctx.fillRect(-2,-2,4,4);ctx.restore();
}
function drawBossTelegraphs(){
  ctx.save();
  for(const e of G.enemies){
    if(!isBoss(e.type)||e.dead)continue;
    const c=e.type==='boss_fire'?'#f2a269':e.type==='boss_arcane'?'#96ddff':
      e.type==='dragon'?'#eeb7d2':'#f1a6bb';
    const pulse=Math.sin(G.time*3)*.5+.5;
    ctx.strokeStyle=c;ctx.globalAlpha=.28+pulse*.17;ctx.lineWidth=2.5;
    ctx.beginPath();ctx.ellipse(e.x,e.y+5,e.r+19,e.r*.41,0,0,TAU);ctx.stroke();
    if(!e.warning)continue;
    const progress=clamp(1-Math.max(0,e.windup)/
      (e.type==='dragon'?(e.dragonStage===3?.55:.83):.68),0,1);
    ctx.globalAlpha=.15+.28*progress;
    ctx.fillStyle=c;ctx.beginPath();ctx.arc(e.x,e.y-12,e.r+31+progress*17,0,TAU);ctx.fill();
    ctx.globalAlpha=.93;ctx.lineWidth=4;ctx.strokeStyle=c;
    ctx.beginPath();ctx.arc(e.x,e.y-12,e.r+37,-Math.PI/2,-Math.PI/2+TAU*progress);ctx.stroke();
    ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.fillStyle='#ffecc8';
    ctx.fillText('!',e.x,e.y-e.r-42);
  }
  ctx.restore();
}
function drawProjectiles(){
  for(const b of G.beams){
    const alpha=Math.max(0,b.life/b.maxLife),width=b.width*(.35+.65*alpha);
    ctx.save();ctx.globalAlpha=alpha;ctx.lineCap='round';
    ctx.strokeStyle=b.color;ctx.lineWidth=width*2.6;ctx.shadowBlur=24;ctx.shadowColor=b.color;
    ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x2,b.y2);ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle='#d6ffff';ctx.lineWidth=width*.58;
    ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x2,b.y2);ctx.stroke();
    ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  for(const s of G.specialShots){
    ctx.save();ctx.translate(s.x,s.y);
    ctx.shadowBlur=12;ctx.shadowColor=s.color;ctx.rotate(s.kind==='boomerang'?s.spin:s.dir+Math.PI/2);
    if(s.kind==='boomerang'){
      ctx.lineCap='square';ctx.lineJoin='miter';
      ctx.strokeStyle='#ad724c';ctx.lineWidth=11;
      ctx.beginPath();ctx.moveTo(-13,11);ctx.lineTo(0,-14);ctx.lineTo(13,11);ctx.stroke();
      ctx.strokeStyle='#f9de9b';ctx.lineWidth=6;
      ctx.beginPath();ctx.moveTo(-13,11);ctx.lineTo(0,-14);ctx.lineTo(13,11);ctx.stroke();
      ctx.fillStyle='#fff6c5';ctx.fillRect(-3,-11,6,5);
    }else{
      ctx.fillStyle='#564c8e';ctx.fillRect(-5,-22,10,13);
      ctx.fillStyle='#e4c8ab';ctx.fillRect(-12,-13,24,6);
      ctx.fillStyle='#a3b4f7';ctx.fillRect(-5,-9,10,29);
      ctx.fillStyle='#f2f8ff';ctx.fillRect(-2,-8,4,33);
      ctx.fillStyle='#dde6ff';ctx.fillRect(-3,21,6,4);
    }
    ctx.restore();
  }
  for(const b of G.bullets){
    ctx.strokeStyle=b.color+'66';ctx.lineWidth=b.r*1.8;
    ctx.beginPath();ctx.moveTo(b.x-b.vx*.025,b.y-b.vy*.025);
    ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.fillStyle=b.color;ctx.fillRect(b.x-b.r/2,b.y-b.r/2,b.r*1.7,b.r*1.7);
  }
  for(const b of G.enemyBullets){
    ctx.fillStyle=b.color+'44';ctx.fillRect(b.x-b.r*1.75,b.y-b.r*1.75,b.r*3.5,b.r*3.5);
    ctx.fillStyle=b.color;ctx.fillRect(b.x-b.r,b.y-b.r,b.r*2,b.r*2);
    ctx.fillStyle='#fff3df';ctx.fillRect(b.x-2,b.y-2,4,4);
  }
}
function render(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  ctx.save();
  if(G.shake>0&&mode==='playing')ctx.translate(random(-G.shake,G.shake),random(-G.shake,G.shake));
  drawWorld(ctx,G.map,G.time);
  drawDoors();
  if(G.dragonRemains){
    drawDragon(ctx,G.dragonRemains.x,G.dragonRemains.y,G.time,false,true,.92);
    drawDragonClues(ctx,G.dragonRemains,G.time,G.clues.dress);
    ctx.save();
    const dress={x:G.dragonRemains.x+126,y:G.dragonRemains.y+65};
    const target=G.clues.dress?{x:G.dragonRemains.x+84,y:G.dragonRemains.y+30}:dress;
    if(!G.clues.ring){
      ctx.fillStyle='#f6e5b0';ctx.textAlign='center';ctx.font='bold 12px sans-serif';
      ctx.fillText(G.clues.dress?'调查戒指 [E]':'调查残破礼服 [E]',target.x,target.y-43);
    }
    ctx.restore();
  }
  if(['memory','event'].includes(currentRoom().kind)){
    ctx.save();ctx.textAlign='center';ctx.font='bold 12px sans-serif';
    ctx.fillStyle='#b7e8de';ctx.fillText(currentRoom().kind==='memory'?'◈ 记忆封印':'✧ 失落的文字',480,246);
    ctx.restore();
  }
  drawBossTelegraphs();
  if(G.portal)drawPortal(ctx,G.portal.x,G.portal.y,G.time);
  if(G.chest)drawChest(ctx,G.chest.x,G.chest.y,G.time,G.chest.opened);
  for(const pickup of G.pickups)drawPickup(ctx,pickup,G.time);
  drawProjectiles();
  const p=G.player;
  const actors=G.enemies.map(e=>({type:'enemy',value:e})).concat([{type:'player',value:p}]);
  actors.sort((a,b)=>a.value.y-b.value.y);
  for(const item of actors){
    const e=item.value;
    if(item.type==='player'){
      if(p.dashTime>0||p.invuln>0){
        ctx.save();ctx.globalAlpha=p.dashTime>0?.8:.36;
        ctx.strokeStyle='#aaeedb';ctx.lineWidth=3;
        ctx.beginPath();ctx.ellipse(p.x,p.y-4,23,17,0,0,TAU);ctx.stroke();ctx.restore();
      }
      if(p.invuln<=0||Math.floor(G.time*16)%2===0){
        drawActor(ctx,'hero',p.x,p.y,G.time,p.dir,p.hit,1.03,p.moving);
        drawGun(ctx,p.x+Math.cos(p.dir)*3,p.y-3,p.dir,p.weapons[p.slot],G.time,p.recoil);
      }
    }else{
      if(e.type==='dragon')drawDragon(ctx,e.x,e.y,G.time,true,false,1,e.dragonStage);
      else if(e.type==='seal'){
        ctx.save();ctx.translate(e.x,e.y-9);
        ctx.shadowBlur=19;ctx.shadowColor='#e68da5';
        ctx.fillStyle='#744a78';
        ctx.beginPath();ctx.moveTo(0,-29);ctx.lineTo(24,0);ctx.lineTo(0,30);ctx.lineTo(-24,0);ctx.closePath();ctx.fill();
        ctx.fillStyle='#f6bdd0';
        ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(14,0);ctx.lineTo(0,20);ctx.lineTo(-14,0);ctx.closePath();ctx.fill();
        ctx.fillStyle='#fff3f0';ctx.fillRect(-3,-8,6,16);ctx.restore();
        drawBar(e.x-23,e.y-49,46,e.hp/e.maxHp,'#f4afcf',5);
      }else drawActor(ctx,e.type,e.x,e.y,G.time+e.phase,e.dir,e.hit,1,e.moving);
      if(e.hp<e.maxHp&&!isBoss(e.type)&&e.type!=='seal')
        drawBar(e.x-17,e.y-e.r-35,34,e.hp/e.maxHp,e.color,4);
    }
  }
  drawMeleeSlash();
  for(const part of G.particles){
    ctx.globalAlpha=clamp(part.life/part.maxLife,0,1);
    ctx.fillStyle=part.color;ctx.fillRect(Math.round(part.x),Math.round(part.y),Math.ceil(part.size),Math.ceil(part.size));
  }
  ctx.globalAlpha=1;
  if(G.flash>0){ctx.fillStyle='rgba(255,96,112,'+(G.flash*.35)+')';ctx.fillRect(0,0,WIDTH,HEIGHT);}
  ctx.restore();
  if(mode==='playing'){
    drawGameUI();
    drawMinimap();
    if(!touchMode)drawCrosshair(mouse.x,mouse.y,G.time);
  }
}
function loop(now){
  const dt=Math.min(.036,(now-last)/1000||.016);last=now;
  update(dt);render();frame=requestAnimationFrame(loop);
}
frame=requestAnimationFrame(loop);

function updatePointer(e){
  const box=canvas.getBoundingClientRect();
  mouse.x=clamp((e.clientX-box.left)*WIDTH/box.width,0,WIDTH);
  mouse.y=clamp((e.clientY-box.top)*HEIGHT/box.height,0,HEIGHT);
}
canvas.addEventListener('pointermove',e=>{updatePointer(e);});
canvas.addEventListener('pointerdown',e=>{
  if(mode!=='playing')return;
  e.preventDefault();updatePointer(e);canvas.focus();
  if(e.button===2){dash();return;}
  mouse.down=true;if(touchMode)touch.fire=true;
});
window.addEventListener('pointerup',()=>{mouse.down=false;if(touchMode)touch.fire=false;});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{
  if(mode!=='playing')return;
  e.preventDefault();cycleWeapon(e.deltaY>0?1:-1);
},{passive:false});
window.addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();
  if(mode==='reward'){
    if(['1','2','3'].includes(key)&&!e.repeat){
      e.preventDefault();chooseRelic(G.relicOptions[Number(key)-1]?.id);
    }
    return;
  }
  if(mode==='story'){
    if(!e.repeat&&['enter',' ','arrowright'].includes(key)){e.preventDefault();N.advance();}
    return;
  }
  if(mode==='archive'){
    if(!e.repeat&&(key==='m'||key==='escape')){e.preventDefault();N.closeArchive();}
    return;
  }
  if(!e.repeat&&key==='m'&&['playing','paused','menu'].includes(mode)){
    e.preventDefault();N.openArchive();return;
  }
  if(key==='escape'&& !dom.help.classList.contains('hidden')){dom.help.classList.add('hidden');return;}
  if(key==='p'||key==='escape'){if(mode==='playing'||mode==='paused')togglePause();return;}
  if(mode!=='playing')return;
  keys.add(key);
  if(!e.repeat&&key==='shift')dash();
  if(!e.repeat&&key==='q')skill();
  if(!e.repeat&&key==='j')melee();
  if(!e.repeat&&key==='e')interact();
  if(!e.repeat&&/^[1-6]$/.test(key))switchWeapon(Number(key)-1);
  if(!e.repeat&&key==='f')cycleWeapon(1);
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();mouse.down=false;touch.fire=false;if(mode==='playing')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')togglePause();});
$('startBtn').addEventListener('click',newGame);
$('helpBtn').addEventListener('click',()=>dom.help.classList.remove('hidden'));
$('closeHelp').addEventListener('click',()=>dom.help.classList.add('hidden'));
$('helpStartBtn').addEventListener('click',newGame);
$('resumeBtn').addEventListener('click',togglePause);
$('restartBtn').addEventListener('click',newGame);
$('pauseBtn').addEventListener('click',()=>{if(mode==='playing'||mode==='paused')togglePause();});
$('soundBtn').addEventListener('click',()=>{
  soundOn=!soundOn;$('soundBtn').textContent=soundOn?'♫':'♪';
  $('soundBtn').setAttribute('aria-label',soundOn?'关闭音效':'开启音效');
  if(soundOn)sound(700,.08,'sine',.03);
});
const stick=$('virtualStick'),knob=$('stickKnob');
function setStick(e){
  const rect=stick.getBoundingClientRect(),mid=rect.width/2,max=rect.width*.32;
  let dx=e.clientX-rect.left-mid,dy=e.clientY-rect.top-mid;
  let r=Math.hypot(dx,dy);if(r>max){dx=dx/r*max;dy=dy/r*max;}
  touch.x=dx/max;touch.y=dy/max;
  knob.style.left=mid+dx-knob.offsetWidth/2+'px';
  knob.style.top=mid+dy-knob.offsetHeight/2+'px';
}
stick.addEventListener('pointerdown',e=>{e.preventDefault();touch.active=true;stick.setPointerCapture(e.pointerId);setStick(e);});
stick.addEventListener('pointermove',e=>{if(touch.active)setStick(e);});
function resetStick(){touch.active=false;touch.x=0;touch.y=0;knob.style.left='';knob.style.top='';}
stick.addEventListener('pointerup',resetStick);stick.addEventListener('pointercancel',resetStick);
const fire=$('touchFire');
fire.addEventListener('pointerdown',e=>{e.preventDefault();fire.setPointerCapture(e.pointerId);touch.fire=true;});
fire.addEventListener('pointerup',()=>touch.fire=false);fire.addEventListener('pointercancel',()=>touch.fire=false);
$('touchDash').addEventListener('pointerdown',e=>{e.preventDefault();dash();});
$('touchSkill').addEventListener('pointerdown',e=>{e.preventDefault();skill();});
$('touchMelee').addEventListener('pointerdown',e=>{e.preventDefault();melee();});
$('touchNext').addEventListener('pointerdown',e=>{e.preventDefault();cycleWeapon(1);});
window.__pixelDungeon={
  get mode(){return mode;},get floor(){return G.floor;},
  get room(){return G.roomIndex;},get roomName(){return currentRoom().name;},
  get cleared(){return currentRoom().cleared;},
  get rooms(){return G.rooms.map(r=>({id:r.id,name:r.name,kind:r.kind,cleared:r.cleared,visited:r.visited}));},
  get wave(){return G.wave;},get enemies(){return G.enemies.length;},
  get hp(){return G.player.hp;},get coins(){return G.coins;},get score(){return G.score;},
  get combo(){return G.combo;},get multiplier(){return comboMultiplier(G.combo);},
  get bestCombo(){return G.bestCombo;},get meleeStage(){return G.player.meleeStage;},
  get x(){return G.player.x;},get y(){return G.player.y;},
  get seed(){return G.runSeed;},get map(){return G.rooms.map(r=>({id:r.id,x:r.x,y:r.y,
    kind:r.kind,name:r.name,exits:{...r.exits},mapSeed:r.mapSeed,visited:r.visited,cleared:r.cleared}));},
  get story(){return N.activeId;},get memories(){return N.collected;},
  get dragonRemains(){return G.dragonRemains&&{...G.dragonRemains};},
  get clues(){return {...G.clues};},get dragonStage(){return G.enemies.find(e=>e.type==='dragon')?.dragonStage||null},
  get weapon(){return G.player.weapons[G.player.slot];},get weapons(){return [...G.player.weapons];},
  get relics(){return [...G.player.relics];},get relicOptions(){return G.relicOptions.map(it=>it.id);},
  get stats(){const p=G.player;return {maxHp:p.maxHp,maxShield:p.maxShield,speed:p.speed,power:p.power,
    attackSpeed:p.attackSpeed,bladePower:p.bladePower,projectilePower:p.projectilePower,
    shieldRegen:p.shieldRegen,magnet:p.magnet,dashFactor:p.dashFactor,skillFactor:p.skillFactor,
    vampireHeal:p.vampireHeal};},
  get boss(){const e=G.enemies.find(e=>isBoss(e.type)&&!e.dead);
    return e?{type:e.type,name:BOSS_DATA[e.type].name,hp:e.hp,maxHp:e.maxHp,warning:!!e.warning}:null;}
};
// Test-only helpers are unavailable on GitHub Pages or other public hosts.
if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('e2e')){
  window.__pixelDungeonTest={
    eliminateOne(){
      if(mode!=='playing')return false;
      const e=G.enemies.find(e=>!e.dead&&e.type!=='dragon');
      if(!e)return false;
      damageEnemy(e,e.hp+1000);
      G.enemies=G.enemies.filter(e=>!e.dead);currentRoom().enemies=G.enemies;
      if(!G.enemies.length)clearRoom();
      return true;
    },
    clearRoom(){
      if(mode!=='playing')return false;
      let attempts=0;
      while(this.eliminateOne()&&attempts++<60){}
      if(G.enemies.length===0&&!currentRoom().cleared)clearRoom();
      return currentRoom().cleared;
    },
    advanceStory(){return N.advance();},
    closeArchive(){return N.closeArchive();},
    openArchive(){return N.openArchive();},
    travel(next){
      if(mode!=='playing'||!currentRoom().cleared||
        !areNeighbors(G.rooms,G.roomIndex,next))return false;
      return enterRoom(next,G.roomIndex);
    },
    bossDamageTo(percent){
      const e=G.enemies.find(e=>e.type==='dragon'&&!e.dead);
      if(!e||mode!=='playing')return null;
      const target=Math.ceil(e.maxHp*percent);
      const attack=Math.max(1,e.hp-target+1);
      damageEnemy(e,attack);return {hp:e.hp,stage:e.dragonStage,scene:N.activeId};
    },
    destroySeals(){
      if(mode!=='playing')return false;
      for(const e of G.enemies.filter(e=>e.type==='seal'&&!e.dead))damageEnemy(e,e.hp+1000);
      G.enemies=G.enemies.filter(e=>!e.dead);currentRoom().enemies=G.enemies;
      return true;
    },
    finishDragon(){
      if(mode!=='playing')return false;
      this.destroySeals();
      const e=G.enemies.find(e=>e.type==='dragon'&&!e.dead);
      if(!e||e.dragonStage!==3)return false;
      damageEnemy(e,e.hp+1000);
      G.enemies=G.enemies.filter(e=>!e.dead);currentRoom().enemies=G.enemies;
      if(!G.enemies.length)clearRoom();
      return !!G.dragonRemains;
    },
    inspectDress(){if(!G.dragonRemains)return false;
      G.player.x=G.dragonRemains.x+126;G.player.y=G.dragonRemains.y+65;
      interact();return G.clues.dress;},
    inspectRing(){if(!G.dragonRemains)return false;
      G.player.x=G.dragonRemains.x+84;G.player.y=G.dragonRemains.y+30;
      interact();return G.clues.ring;},
    teleport(x,y){G.player.x=x;G.player.y=y;},
    interact(){interact();},
    slash(){melee();},
    equip(kind){return grantWeapon(kind);},
    setDirection(angle){G.player.dir=angle;},
    shoot(){G.player.fireCd=0;shoot();},
    chooseRelic(id){return chooseRelic(id);},
    openChest(){return showRelicChoice();},
    getSpecial(){return {beams:G.beams.length,special:G.specialShots.map(s=>s.kind)};},
    forceBossAttack(){const b=G.enemies.find(e=>isBoss(e.type)&&!e.dead);
      if(!b)return null;enemyFire(b);return b.type;},
    getEnemyShots(){return G.enemyBullets.length;},
    moveInput(dx,dy){return autoDoor(dx,dy);},
    setReady(){G.transitionCd=0;G.player.fireCd=0;G.player.invuln=999;},
    inspect(){return {mode,Gfloor:G.floor,room:G.roomIndex,weapon:G.player.weapons[G.player.slot],
      inventory:[...G.player.weapons],relics:[...G.player.relics],enemyShots:G.enemyBullets.length,
      beams:G.beams.length,special:G.specialShots.map(x=>x.kind)};},
    setHp(hp){G.player.hp=Math.max(0,Math.min(G.player.maxHp,hp));updateHud();},
    state(){return {floor:G.floor,room:G.roomIndex,combo:G.combo,score:G.score,
      enemies:G.enemies.length,chest:G.chest&&{...G.chest},portal:!!G.portal,
      kinds:G.enemies.map(e=>e.type),dragonRemains:G.dragonRemains,clues:{...G.clues},
      boss:G.enemies.filter(e=>isBoss(e.type)).map(e=>({type:e.type,hp:e.hp,maxHp:e.maxHp,stage:e.dragonStage})),
      scene:N.activeId,mode,memories:N.collected,
      meleeStage:G.player.meleeStage};}
  };
}
