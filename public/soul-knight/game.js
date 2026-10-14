import {WIDTH,HEIGHT,makeMap,drawWorld,drawActor,drawGun,drawChest,drawPortal,drawPickup,drawSplash} from './art.js';
import {createRooms,DOORS,roomEntryPosition,areNeighbors,comboRank,comboMultiplier} from './rooms.mjs';
const $=id=>document.getElementById(id);
const canvas=$('gameCanvas'),ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
drawSplash($('splashCanvas'));
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const random=(a,b)=>a+Math.random()*(b-a),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const dom={menu:$('menuOverlay'),help:$('helpOverlay'),state:$('stateOverlay'),banner:$('banner'),toast:$('toast'),interact:$('interact')};
let mode='menu',G=null,frame=0,last=performance.now(),audio=null,soundOn=true;
const keys=new Set(),mouse={x:652,y:299,down:false},touch={x:0,y:0,fire:false,active:false};
const params={
  pistol:{name:'游侠短铳',damage:20,rate:.24,speed:700,shots:1,spread:.035,color:'#f6d48d',label:'I'},
  rifle:{name:'星火连发',damage:10,rate:.09,speed:870,shots:1,spread:.06,color:'#91e5cf',label:'II'},
  shotgun:{name:'破晓霰弹',damage:12,rate:.61,speed:620,shots:6,spread:.3,color:'#f5b08f',label:'II'}
};
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
function blankGame(){
  const p={x:480,y:374,r:15,hp:100,maxHp:100,shield:40,maxShield:40,speed:225,
    dir:-.35,hit:0,lastHit:0,invuln:0,dashCd:0,dashTime:0,dashVX:0,dashVY:0,
    skillCd:0,fireCd:0,recoil:0,weapons:['pistol',null],slot:0,moving:false,
    meleeStage:0,meleeWindow:0,meleeCd:0,meleeFx:0,meleeAngle:0,meleeRange:0};
  return {floor:1,roomIndex:0,rooms:createRooms(),wave:1,kills:0,coins:0,score:0,
    combo:0,bestCombo:0,comboTimer:0,time:0,player:p,map:makeMap(1,0),
    enemies:[],bullets:[],enemyBullets:[],pickups:[],particles:[],chest:null,
    portal:null,shake:0,flash:0};
}
G=blankGame();
function currentRoom(){return G.rooms[G.roomIndex];}
function newGame(){
  G=blankGame();keys.clear();touch.fire=false;mouse.down=false;
  mode='playing';dom.menu.classList.add('hidden');dom.state.classList.add('hidden');dom.help.classList.add('hidden');
  $('statusText').textContent='EXPEDITION IN PROGRESS';
  $('resumeBtn').style.display='';
  canvas.focus();enterRoom(0);
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
  g.map=makeMap(g.floor,id);
  g.enemies=room.enemies;g.pickups=room.pickups;
  g.chest=room.chest;g.portal=room.portal;
  g.bullets=[];g.enemyBullets=[];g.particles=[];
  g.player.dashTime=0;g.player.invuln=Math.max(g.player.invuln,.7);
  const p=roomEntryPosition(g.rooms,fromId,id);
  g.player.x=p.x;g.player.y=p.y;
  if(!room.spawned)populateRoom(room);
  else banner(room.name,room.cleared?'ROOM CLEARED':'RETURN TO THE FIGHT',1.2);
  updateHud();return true;
}
function populateRoom(room){
  room.spawned=true;
  if(room.kind==='treasure'){
    room.cleared=true;room.chest={x:480,y:302,opened:false};G.chest=room.chest;
    banner('发现秘藏宝室','SECRET CHAMBER',2);
    toast('沿北门探索的奖励！宝箱在房间中央',2.4);
    sound(780,.23,'triangle',.04);return;
  }
  if(room.kind==='guardian'){
    spawnEnemy('boss',480,222);
    banner(G.floor===3?'深渊守卫 · 苏醒':'守关者 · 苏醒','BOSS CHAMBER',2.4);
    sound(155,.46,'sawtooth',.05);return;
  }
  const count=(room.id===0?3:room.id===1?5:8)+(G.floor-1);
  const types=room.id===0?['slime','slime','bat','shooter']:
    room.id===1?['slime','bat','shooter','slime','bat']:
    ['bat','shooter','slime','shooter','bat'];
  for(let i=0;i<count;i++){
    const pos=freeSpot(room.id===0?160:180);
    spawnEnemy(types[(i+G.floor-1)%types.length],pos.x,pos.y);
  }
  banner(room.name,'ROOM '+String(room.id+1).padStart(2,'0')+' / 05');
  sound(620,.13,'triangle',.025);
}
function clearRoom(){
  const room=currentRoom();
  if(room.cleared||!room.spawned)return;
  room.cleared=true;
  G.score+=Math.round(150*G.floor*comboMultiplier(G.combo));
  if(room.kind==='guardian'){
    G.portal={x:480,y:208};room.portal=G.portal;
    banner(G.floor===3?'地牢已净化':'通往下一层的传送门','FLOOR CLEARED',2.4);
    toast('靠近传送门按 E '+(G.floor===3?'完成远征':'进入下一层'),2.9);
  }else{
    banner('房间净化 · 大门开启','ROOM CLEARED',1.8);
    toast('通路已解锁！靠近发光门按 E 前进',2.4);
    if(room.id===1)toast('北侧有隐藏宝库，东侧继续主线',3);
  }
  sound(790,.19,'sine',.055);updateHud();
}
function nextFloor(){
  if(G.floor>=3){setState('won');return;}
  G.floor++;G.rooms=createRooms();G.roomIndex=0;G.wave=1;
  G.enemies=[];G.pickups=[];G.chest=null;G.portal=null;
  G.combo=0;G.comboTimer=0;
  G.player.shield=Math.min(G.player.maxShield,G.player.shield+27);
  G.player.hp=Math.min(G.player.maxHp,G.player.hp+32);G.player.invuln=1;
  enterRoom(0);
  banner('抵达第 '+G.floor+' 层','THE DEPTHS AWAIT',2.2);
  sound(550,.28,'sine',.045);updateHud();
}
function setState(type){
  mode=type;const paused=type==='paused',win=type==='won';
  dom.state.classList.remove('hidden');$('stateIcon').textContent=paused?'Ⅱ':win?'✦':'✕';
  $('stateLabel').textContent=paused?'GAME PAUSED':win?'THE DUNGEON IS CLEARED':'ADVENTURE ENDED';
  $('stateTitle').textContent=paused?'冒险暂歇':win?'远征成功！':'勇者倒下了';
  $('stateDescription').textContent=paused?'休息一下，前方还有未知的挑战。':win?'你踏遍三层地牢，成为真正的地牢勇者。':'这次的故事结束了，但冒险永不落幕。';
  $('resumeBtn').style.display=paused?'':'none';
  $('resultFloor').textContent=String(G.floor).padStart(2,'0');
  $('resultKills').textContent=String(G.kills).padStart(2,'0');
  $('resultCoins').textContent=String(G.coins).padStart(3,'0');
  $('resultCombo').textContent='×'+G.bestCombo;
  $('statusText').textContent=paused?'GAME PAUSED':win?'EXPEDITION COMPLETE':'GAME OVER';
  dom.interact.classList.remove('show');
  if(!paused)sound(win?850:105,.5,win?'sine':'sawtooth',.07);
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
  $('floorLabel').textContent='第 '+String(G.floor).padStart(2,'0')+' 层';
  $('waveLabel').textContent=room.name+' · '+(G.roomIndex+1)+'/5';
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
  const stats={
    slime:{hp:43,speed:66,r:15,damage:13,color:'#9be4ba'},
    bat:{hp:29,speed:130,r:13,damage:10,color:'#b2a0e8'},
    shooter:{hp:51,speed:74,r:16,damage:9,color:'#a894e6'},
    boss:{hp:550,speed:65,r:34,damage:17,color:'#d27d8f'}
  }[type];
  const hp=type==='boss'?[205,365,570][G.floor-1]:
    Math.round(stats.hp*(1+(G.floor-1)*.22));
  G.enemies.push({...stats,type,x,y,hp,maxHp:hp,shootCd:random(.4,2),
    attackCd:random(.5,1.3),phase:random(0,TAU),hit:0,dir:0,moving:false,dead:false});
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
  if(e.dead)return;
  e.hp-=dmg;e.hit=.13;
  particle(e.x+random(-8,8),e.y-13,e.color,e.type==='boss'?8:4,90);
  e.x=clamp(e.x+Math.cos(hitAngle)*2,70,890);
  e.y=clamp(e.y+Math.sin(hitAngle)*2,100,515);
  if(e.hp>0)return;
  e.dead=true;G.kills++;G.shake=Math.min(12,G.shake+2);
  G.combo=G.comboTimer>0?G.combo+1:1;
  G.comboTimer=4.8;G.bestCombo=Math.max(G.bestCombo,G.combo);
  const multi=comboMultiplier(G.combo);
  G.score+=Math.round((e.type==='boss'?1200:100)*multi);
  if(G.combo>=3&&G.combo%3===0){
    toast('✦ '+G.combo+' 连击！ '+comboRank(G.combo)+' · ×'+multi.toFixed(2),1.45);
    particle(G.player.x,G.player.y,'#f9d38c',16,120);
    sound(580+G.combo*18,.2,'sine',.03);
  }
  particle(e.x,e.y,e.color,e.type==='boss'?44:18,e.type==='boss'?260:165);
  if(e.type==='boss'){
    for(let i=0;i<14+G.floor*3;i++)addPickup('coin',e.x+random(-85,85),e.y+random(-70,70));
    addPickup('heart',e.x+60,e.y+10);
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
  const p=G.player;if(p.fireCd>0)return;
  const w=params[p.weapons[p.slot]];if(!w)return;
  p.fireCd=w.rate;p.recoil=1;
  for(let i=0;i<w.shots;i++){
    const spread=w.shots>1?(i-(w.shots-1)/2)*w.spread:random(-w.spread,w.spread);
    const a=p.dir+spread+(w.shots>1?random(-.04,.04):0);
    const ox=Math.cos(a)*24,oy=Math.sin(a)*24-7;
    G.bullets.push({x:p.x+ox,y:p.y+oy,vx:Math.cos(a)*w.speed,vy:Math.sin(a)*w.speed,
      r:w.shots>1?4:4.5,damage:Math.round(w.damage*comboMultiplier(G.combo)),
      life:1.15,color:w.color});
  }
  particle(p.x+Math.cos(p.dir)*39,p.y+Math.sin(p.dir)*39-7,
    w.color,w.shots>1?11:4,110);
  G.shake=Math.max(G.shake,w.shots>1?5:1.7);
  sound(p.weapons[p.slot]==='rifle'?490:p.weapons[p.slot]==='shotgun'?175:310,
    .055,p.weapons[p.slot]==='rifle'?'triangle':'square',w.shots>1?.045:.025);
}
function enemyFire(e){
  const a=Math.atan2(G.player.y-e.y,G.player.x-e.x);
  const boss=e.type==='boss',shots=boss?7:1;
  for(let i=0;i<shots;i++){
    const angle=a+(i-(shots-1)/2)*(boss?.19:0);
    const speed=boss?random(210,270):240;
    G.enemyBullets.push({x:e.x,y:e.y-12,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
      r:boss?7:6,damage:boss?16:12,life:4,color:boss?'#fa9e9c':'#c4a1f6'});
  }
  particle(e.x,e.y-12,boss?'#f6a6a5':'#c4a1f6',boss?12:5,80);
  sound(boss?110:240,.13,'sine',boss?.024:.012);
}
function dash(){
  const p=G.player;if(mode!=='playing'||p.dashCd>0)return;
  let dx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+touch.x;
  let dy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+touch.y;
  let n=Math.hypot(dx,dy);
  if(n<.1){dx=Math.cos(p.dir);dy=Math.sin(p.dir);n=1;}
  p.dashVX=dx/n;p.dashVY=dy/n;p.dashTime=.19;p.dashCd=4;p.invuln=.27;
  particle(p.x,p.y,'#a1f2d6',16,190);sound(730,.16,'sine',.04);
}
function skill(){
  const p=G.player;if(mode!=='playing'||p.skillCd>0)return;
  p.skillCd=12;G.shake=13;
  for(const e of G.enemies){
    if(distance(p,e)<148+e.r)damageEnemy(e,Math.round(48*comboMultiplier(G.combo)),p.dir);
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
      damageEnemy(e,Math.round(damage*comboMultiplier(G.combo)),angle);
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
  const p=G.player,room=currentRoom();
  if(G.chest&&!G.chest.opened&&distance(p,G.chest)<75){
    G.chest.opened=true;room.chest=G.chest;
    const weapon=G.floor>=2?'shotgun':'rifle';
    p.weapons[1]=weapon;p.slot=1;
    p.hp=Math.min(p.maxHp,p.hp+24);p.shield=Math.min(p.maxShield,p.shield+25);
    G.coins+=8;G.score+=250;
    particle(G.chest.x,G.chest.y,'#ffdaa2',25,180);
    toast('获得 '+params[weapon].name+'！另得 8 金币与补给',2.5);
    G.shake=6;sound(850,.3,'triangle',.065);updateHud();return;
  }
  if(G.portal&&distance(p,G.portal)<77){nextFloor();return;}
  for(const [direction,nextId] of Object.entries(room.exits)){
    if(distance(p,DOORS[direction])>=77)continue;
    if(!room.cleared){toast('先消灭这个房间的所有敌人',1.4);return;}
    enterRoom(nextId,room.id);return;
  }
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
  p.fireCd=Math.max(0,p.fireCd-dt);p.invuln=Math.max(0,p.invuln-dt);
  p.hit=Math.max(0,p.hit-dt);p.recoil=Math.max(0,p.recoil-dt*8);p.lastHit+=dt;
  p.meleeCd=Math.max(0,p.meleeCd-dt);
  p.meleeFx=Math.max(0,p.meleeFx-dt);
  p.meleeWindow=Math.max(0,p.meleeWindow-dt);
  if(g.comboTimer>0){g.comboTimer=Math.max(0,g.comboTimer-dt);
    if(g.comboTimer===0)g.combo=0;}
  if(p.lastHit>5&&p.shield<p.maxShield)p.shield=Math.min(p.maxShield,p.shield+dt*3);
  let vx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+touch.x;
  let vy=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'))+touch.y;
  const mag=Math.hypot(vx,vy);if(mag>1){vx/=mag;vy/=mag;}
  p.moving=mag>.06||p.dashTime>0;
  if(p.dashTime>0){
    p.dashTime-=dt;moveEntity(p,p.dashVX*750*dt,p.dashVY*750*dt);
    if(Math.random()<.85)particle(p.x,p.y,'#9be8d2',2,60);
  }else moveEntity(p,vx*p.speed*dt,vy*p.speed*dt);
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
    if(e.type==='shooter'){
      if(dist<175){dx*=-1;dy*=-1;}
      else if(dist<285){dx=Math.cos(a+Math.PI/2)*.45;dy=Math.sin(a+Math.PI/2)*.45;}
    }
    if(e.type==='boss'){
      dx=Math.cos(a)*.85+Math.cos(g.time*.7)*.3;
      dy=Math.sin(a)*.85+Math.sin(g.time*.7)*.3;
    }
    e.moving=dist>e.r+p.r+8;
    if(e.moving)moveEntity(e,dx*e.speed*dt,dy*e.speed*dt,e.r);
    if(dist<e.r+p.r+9&&e.attackCd<=0){damagePlayer(e.damage);e.attackCd=e.type==='boss'?.85:1.1;}
    if((e.type==='shooter'||e.type==='boss')&&e.shootCd<=0&&dist<690){
      enemyFire(e);e.shootCd=e.type==='boss'?1.5:random(1.6,2.2);
    }
  }
  for(let i=g.bullets.length-1;i>=0;i--){
    const b=g.bullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
    if(b.life<=0||blocked(b.x,b.y,b.r)){particle(b.x,b.y,'#f2d9a4',3,45);g.bullets.splice(i,1);continue;}
    const enemy=g.enemies.find(e=>!e.dead&&Math.hypot(b.x-e.x,b.y-e.y+9)<e.r+b.r);
    if(enemy){damageEnemy(enemy,b.damage,Math.atan2(b.vy,b.vx));g.bullets.splice(i,1);}
  }
  for(let i=g.enemyBullets.length-1;i>=0;i--){
    const b=g.enemyBullets[i];b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;
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
    if(d<112&&d>1){let force=(112-d)/112;
      item.x+=(p.x-item.x)/d*dt*(120+force*280);
      item.y+=(p.y-item.y)/d*dt*(120+force*280);
    }
    if(d<21){
      if(item.type==='coin'){g.coins+=1;sound(880,.055,'sine',.012);}
      if(item.type==='heart'){p.hp=Math.min(p.maxHp,p.hp+24);toast('♥ 生命值 +24',1.1);}
      if(item.type==='shield'){p.shield=Math.min(p.maxShield,p.shield+18);toast('◆ 护盾值 +18',1.1);}
      if(item.type==='weapon'){p.weapons[1]='rifle';}
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
  if(g.chest&&!g.chest.opened&&distance(p,g.chest)<75)hint='开启神秘宝箱';
  else if(g.portal&&distance(p,g.portal)<81)hint=g.floor===3?'完成远征':'进入下一层';
  else for(const [dir,id] of Object.entries(currentRoom().exits)){
    if(distance(p,DOORS[dir])<77){
      hint=currentRoom().cleared?'前往'+g.rooms[id].name:'清怪后可开启通路';
      break;
    }
  }
  dom.interact.classList.toggle('show',Boolean(hint));
  if(hint)dom.interact.innerHTML=(currentRoom().cleared||g.chest&&!g.chest.opened||g.portal?'按 <kbd>E</kbd> ':'')+hint;
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
      const text=open?'E · '+G.rooms[id].name:'清怪解锁';
      ctx.fillStyle='#091e27e8';ctx.fillRect(pos.x-53,pos.y-62,106,20);
      ctx.fillStyle=open?'#f4e0ac':'#e9ad94';ctx.fillText(text,pos.x,pos.y-51);
    }
    ctx.restore();
  }
}
function drawMinimap(){
  const nodes=G.rooms,x=754,y=508;
  ctx.save();
  ctx.fillStyle='#07151ce8';ctx.fillRect(x,y,192,81);
  ctx.strokeStyle='#54787e';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,191,80);
  ctx.fillStyle='#b6c8c0';ctx.font='bold 10px sans-serif';ctx.textBaseline='middle';
  ctx.textAlign='left';ctx.fillText('探索地图',x+11,y+12);
  ctx.font='9px monospace';ctx.fillStyle='#e9d397';ctx.textAlign='right';
  ctx.fillText(G.roomIndex+1+' / '+nodes.length,x+180,y+12);
  const center=r=>({x:x+29+r.x*42,y:y+33+r.y*32});
  const seen=new Set();
  for(const n of nodes){
    for(const next of Object.values(n.exits)){
      const key=[n.id,next].sort().join('-');if(seen.has(key))continue;seen.add(key);
      const a=center(n),b=center(nodes[next]);
      ctx.strokeStyle=n.visited&&nodes[next].visited?'#8dd1b3':'#5a797e';
      ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }
  for(const n of nodes){
    const c=center(n),isCurrent=n.id===G.roomIndex;
    ctx.fillStyle=isCurrent?'#f0d18e':n.cleared?'#65be9e':n.visited?'#acaaa0':'#273a43';
    ctx.fillRect(c.x-13,c.y-9,26,18);
    ctx.strokeStyle=isCurrent?'#fff4cc':n.visited?'#9db8ac':'#5c6e74';
    ctx.lineWidth=isCurrent?2:1;ctx.strokeRect(c.x-13,c.y-9,26,18);
    ctx.textBaseline='middle';ctx.textAlign='center';
    ctx.font='bold 11px monospace';ctx.fillStyle=isCurrent?'#17313a':n.visited?'#0e2630':'#73888d';
    ctx.fillText(n.kind==='treasure'?'◆':n.kind==='guardian'?'✦':String(n.id+1),c.x,c.y+1);
  }
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
  const x=369,y=540;
  ctx.fillStyle='#07151cdd';ctx.fillRect(x,y,222,49);
  ctx.strokeStyle='#6d91837a';ctx.strokeRect(x+.5,y+.5,221,48);
  for(let i=0;i<2;i++){
    const xx=x+8+i*40,selected=i===p.slot;
    ctx.fillStyle=selected?'#d8c18b':'#253e46';ctx.fillRect(xx,y+7,33,34);
    ctx.fillStyle=selected?'#33434c':'#668383';ctx.fillRect(xx+3,y+10,27,28);
    ctx.fillStyle=selected?'#f3dba3':'#acc2b9';ctx.font='bold 12px monospace';
    ctx.fillText(String(i+1),xx+5,y+17);
    ctx.fillStyle=p.weapons[i]?'#e8c694':'#465963';
    if(p.weapons[i]){ctx.fillRect(xx+12,y+23,14,5);ctx.fillRect(xx+19,y+19,4,5);ctx.fillRect(xx+14,y+28,5,5);}
    else{ctx.font='14px monospace';ctx.fillText('×',xx+17,y+31);}
  }
  ctx.fillStyle='#f3dfb2';ctx.font='bold 13px sans-serif';ctx.fillText(w.name,x+95,y+19);
  ctx.fillStyle='#a5c5b7';ctx.font='10px monospace';ctx.fillText('无限弹药 · '+Math.round(1/w.rate*10)/10+' 发/秒',x+95,y+35);
  const actions=[{x:74,k:'SHIFT',label:'闪避',cool:p.dashCd,max:4}, {x:173,k:'Q',label:'震荡',cool:p.skillCd,max:12},
    {x:272,k:'J',label:'三段斩',cool:p.meleeCd,max:.44}];
  actions.forEach(a=>{
    ctx.fillStyle='#07151cbd';ctx.fillRect(a.x,546,86,37);
    ctx.strokeStyle='#60817974';ctx.strokeRect(a.x+.5,546.5,85,36);
    ctx.fillStyle=a.cool>0?'#879996':'#f2d69d';ctx.font='bold 11px monospace';ctx.fillText(a.k,a.x+7,559);
    ctx.font='10px sans-serif';ctx.fillStyle='#cad4cb';ctx.fillText(a.label,a.x+45,559);
    drawBar(a.x+7,567,72,a.cool>0?1-a.cool/a.max:1,a.cool>0?'#7ea89f':'#e6c57f',5);
  });
  if(G.enemies.some(e=>e.type==='boss'&&!e.dead)){
    const boss=G.enemies.find(e=>e.type==='boss'&&!e.dead);
    ctx.fillStyle='#0a1c24cf';ctx.fillRect(303,102,354,29);
    ctx.fillStyle='#f9cf9a';ctx.textAlign='left';ctx.font='bold 12px sans-serif';ctx.fillText('✦ '+(['石之守卫','夜影守卫','深渊守卫'][G.floor-1]),314,111);
    drawBar(416,110,227,boss.hp/boss.maxHp,'#d37c86',11);
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
function drawProjectiles(){
  for(const b of G.bullets){
    ctx.strokeStyle=b.color+'66';ctx.lineWidth=b.r*1.8;
    ctx.beginPath();ctx.moveTo(b.x-b.vx*.025,b.y-b.vy*.025);
    ctx.lineTo(b.x,b.y);ctx.stroke();
    ctx.fillStyle=b.color;ctx.fillRect(b.x-b.r/2,b.y-b.r/2,b.r*1.7,b.r*1.7);
  }
  for(const b of G.enemyBullets){
    ctx.fillStyle='#4a314c88';ctx.fillRect(b.x-9,b.y-9,18,18);
    ctx.fillStyle=b.color;ctx.fillRect(b.x-b.r,b.y-b.r,b.r*2,b.r*2);
    ctx.fillStyle='#fce8ef';ctx.fillRect(b.x-2,b.y-2,4,4);
  }
}
function render(){
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  ctx.save();
  if(G.shake>0&&mode==='playing')ctx.translate(random(-G.shake,G.shake),random(-G.shake,G.shake));
  drawWorld(ctx,G.map,G.time);
  drawDoors();
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
      drawActor(ctx,e.type,e.x,e.y,G.time+e.phase,e.dir,e.hit,1,e.moving);
      if(e.hp<e.maxHp&&e.type!=='boss')drawBar(e.x-17,e.y-e.r-35,34,e.hp/e.maxHp,e.color,4);
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
window.addEventListener('keydown',e=>{
  const key=e.key.toLowerCase();
  if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(key))e.preventDefault();
  if(key==='escape'&& !dom.help.classList.contains('hidden')){dom.help.classList.add('hidden');return;}
  if(key==='p'||key==='escape'){if(mode==='playing'||mode==='paused')togglePause();return;}
  if(mode!=='playing')return;
  keys.add(key);
  if(!e.repeat&&key==='shift')dash();
  if(!e.repeat&&key==='q')skill();
  if(!e.repeat&&key==='j')melee();
  if(!e.repeat&&key==='e')interact();
  if(!e.repeat&&key==='1')switchWeapon(0);
  if(!e.repeat&&key==='2')switchWeapon(1);
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
window.__pixelDungeon={
  get mode(){return mode;},get floor(){return G.floor;},
  get room(){return G.roomIndex;},get roomName(){return currentRoom().name;},
  get cleared(){return currentRoom().cleared;},
  get rooms(){return G.rooms.map(r=>({id:r.id,name:r.name,kind:r.kind,cleared:r.cleared,visited:r.visited}));},
  get wave(){return G.wave;},get enemies(){return G.enemies.length;},
  get hp(){return G.player.hp;},get coins(){return G.coins;},get score(){return G.score;},
  get combo(){return G.combo;},get multiplier(){return comboMultiplier(G.combo);},
  get bestCombo(){return G.bestCombo;},get meleeStage(){return G.player.meleeStage;},
  get x(){return G.player.x;},get y(){return G.player.y;}
};
// Test-only helpers are unavailable on GitHub Pages or other public hosts.
if(['localhost','127.0.0.1'].includes(location.hostname)&&new URLSearchParams(location.search).has('e2e')){
  window.__pixelDungeonTest={
    eliminateOne(){
      const e=G.enemies.find(e=>!e.dead);
      if(!e)return false;
      damageEnemy(e,e.hp+1000);
      G.enemies=G.enemies.filter(e=>!e.dead);currentRoom().enemies=G.enemies;
      if(!G.enemies.length)clearRoom();
      return true;
    },
    clearRoom(){
      while(this.eliminateOne()){}
      if(!currentRoom().cleared)clearRoom();
    },
    teleport(x,y){G.player.x=x;G.player.y=y;},
    interact(){interact();},
    slash(){melee();},
    setHp(hp){G.player.hp=Math.max(0,Math.min(G.player.maxHp,hp));updateHud();},
    state(){return {floor:G.floor,room:G.roomIndex,combo:G.combo,score:G.score,
      enemies:G.enemies.length,chest:G.chest&&{...G.chest},portal:!!G.portal,
      meleeStage:G.player.meleeStage};}
  };
}
