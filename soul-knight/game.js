import {WIDTH,HEIGHT,makeMap,drawWorld,drawActor,drawGun,drawChest,drawPortal,drawPickup,drawSplash} from './art.js';
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
  const p={x:480,y:377,r:15,hp:100,maxHp:100,shield:40,maxShield:40,speed:225,
    dir:-.35,hit:0,lastHit:0,invuln:0,dashCd:0,dashTime:0,dashVX:0,dashVY:0,
    skillCd:0,fireCd:0,recoil:0,weapons:['pistol',null],slot:0,moving:false};
  return {floor:1,wave:0,kills:0,coins:0,time:0,player:p,map:makeMap(1),
    enemies:[],bullets:[],enemyBullets:[],pickups:[],particles:[],chest:null,
    portal:null,shake:0,flash:0,nextWave:0,waveActive:false,waveDone:false};
}
G=blankGame();
function newGame(){
  G=blankGame();keys.clear();touch.fire=false;mouse.down=false;
  mode='playing';dom.menu.classList.add('hidden');dom.state.classList.add('hidden');dom.help.classList.add('hidden');
  $('statusText').textContent='EXPEDITION IN PROGRESS';
  $('resumeBtn').style.display='';
  canvas.focus();updateHud();startWave();
}
function startWave(){
  const g=G;g.wave++;g.waveActive=true;g.waveDone=false;g.nextWave=0;g.portal=null;
  if(g.floor===3&&g.wave===2){
    spawnEnemy('boss',480,181);banner('深渊守卫 · 苏醒','BOSS INCOMING',2.4);
    sound(155,.55,'sawtooth',.055);updateHud();return;
  }
  const count=3+g.floor*2+g.wave*2;
  for(let i=0;i<count;i++){
    const type=g.floor===1?(['slime','slime','bat','shooter'][i%4]):
      (['slime','bat','shooter','bat','shooter'][i%5]);
    let pos=freeSpot(190);spawnEnemy(type,pos.x,pos.y);
  }
  banner('第 '+String(g.wave).padStart(2,'0')+' 波 · 来袭', 'ENEMIES APPROACHING');
  sound(620,.13,'triangle',.025);updateHud();
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
  const hp=Math.round(stats.hp*(1+(G.floor-1)*.23));
  G.enemies.push({...stats,type,x,y,hp,maxHp:hp,shootCd:random(.4,2),
    attackCd:random(.5,1.3),phase:random(0,TAU),hit:0,dir:0,moving:false,dead:false});
}
function setState(type){
  mode=type;const paused=type==='paused',win=type==='won';
  dom.state.classList.remove('hidden');$('stateIcon').textContent=paused?'Ⅱ':win?'✦':'✕';
  $('stateLabel').textContent=paused?'GAME PAUSED':win?'THE DUNGEON IS CLEARED':'ADVENTURE ENDED';
  $('stateTitle').textContent=paused?'冒险暂歇':win?'远征成功！':'勇者倒下了';
  $('stateDescription').textContent=paused?'休息一下，前方还有未知的挑战。':win?'你守住了最后一丝光，成为传说中的勇者。':'这次的故事结束了，但冒险永不落幕。';
  $('resumeBtn').style.display=paused?'':'none';$('resultFloor').textContent=String(G.floor).padStart(2,'0');
  $('resultKills').textContent=String(G.kills).padStart(2,'0');$('resultCoins').textContent=String(G.coins).padStart(3,'0');
  $('statusText').textContent=paused?'GAME PAUSED':win?'EXPEDITION COMPLETE':'GAME OVER';
  dom.interact.classList.remove('show');
  if(!paused)sound(win?850:105,.5,win?'sine':'sawtooth',.07);
}
function togglePause(){
  if(mode==='playing'){setState('paused');mouse.down=false;touch.fire=false;}
  else if(mode==='paused'){mode='playing';dom.state.classList.add('hidden');canvas.focus();$('statusText').textContent='EXPEDITION IN PROGRESS';}
}
function nextFloor(){
  if(G.floor>=3){setState('won');return;}
  G.floor++;G.wave=0;G.map=makeMap(G.floor);G.enemies=[];G.bullets=[];G.enemyBullets=[];
  G.pickups=[];G.chest=null;G.portal=null;G.waveActive=false;G.waveDone=false;
  G.player.x=480;G.player.y=380;G.player.shield=Math.min(G.player.maxShield,G.player.shield+20);
  G.player.hp=Math.min(G.player.maxHp,G.player.hp+25);G.player.invuln=1.1;
  banner('抵达第 '+G.floor+' 层','DESCENDING...',2);sound(540,.2,'sine',.045);
  G.nextWave=2.4;updateHud();
}
function finishWave(){
  if(G.waveDone||!G.waveActive)return;
  G.waveActive=false;G.waveDone=true;
  if(G.wave===1&&!G.chest){
    G.chest={x:798,y:173,opened:false};
    toast('宝箱出现了！靠近按 E 开启',2.8);
  }
  if(G.wave<2){G.nextWave=4;banner('区域暂时安全','WAVE CLEARED',1.8);}
  else{
    G.portal={x:480,y:205};
    banner(G.floor===3?'地牢已净化':'传送门已开启','FLOOR CLEARED',2.3);
    toast('靠近传送门，按 E '+(G.floor===3?'完成远征':'进入下一层'),3.2);
  }
  sound(790,.18,'sine',.055);updateHud();
}
function updateHud(){
  const p=G.player;
  $('hpFill').style.width=clamp(p.hp/p.maxHp*100,0,100)+'%';
  $('shieldFill').style.width=clamp(p.shield/p.maxShield*100,0,100)+'%';
  $('hpText').textContent=Math.ceil(Math.max(0,p.hp))+' / '+p.maxHp;
  $('shieldText').textContent=Math.ceil(Math.max(0,p.shield))+' / '+p.maxShield;
  $('playerLevel').textContent='LV. '+String(G.floor).padStart(2,'0');
  $('floorLabel').textContent='第 '+String(G.floor).padStart(2,'0')+' 层';
  $('waveLabel').textContent=G.portal?'区域已净化':'波次 '+G.wave+' / 2';
  $('coinText').textContent=String(G.coins).padStart(3,'0');
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
  let absorbed=Math.min(p.shield,amount);p.shield-=absorbed;p.hp-=amount-absorbed;
  particle(p.x,p.y,absorbed>0?'#a3dfff':'#f2a1a4',11,140);
  sound(130,.16,'sawtooth',.055);updateHud();
  if(p.hp<=0){p.hp=0;setState('dead');}
}
function damageEnemy(e,dmg,hitAngle=0){
  if(e.dead)return;
  e.hp-=dmg;e.hit=.13;
  const s=e.type==='boss'?8:4;
  particle(e.x+random(-8,8),e.y-13,e.color,s,90);
  e.x=clamp(e.x+Math.cos(hitAngle)*2,70,890);
  e.y=clamp(e.y+Math.sin(hitAngle)*2,100,515);
  if(e.hp>0)return;
  e.dead=true;G.kills++;G.shake=Math.min(12,G.shake+2);
  particle(e.x,e.y,e.color,e.type==='boss'?44:18,e.type==='boss'?260:165);
  if(e.type==='boss'){
    for(let i=0;i<20;i++)addPickup('coin',e.x+random(-85,85),e.y+random(-70,70));
    addPickup('heart',e.x+60,e.y+10);
    sound(230,.52,'sawtooth',.08);
  }else{
    for(let i=0;i<(Math.random()<.55?2:1);i++)addPickup('coin',e.x+random(-10,10),e.y+random(-10,10));
    if(Math.random()<.09)addPickup('heart',e.x+10,e.y);
    if(Math.random()<.07)addPickup('shield',e.x-10,e.y);
    sound(random(180,270),.09,'triangle',.026);
  }
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
      r:w.shots>1?4:4.5,damage:w.damage,life:1.15,color:w.color});
  }
  const fx=p.x+Math.cos(p.dir)*39,fy=p.y+Math.sin(p.dir)*39-7;
  particle(fx,fy,w.color,w.shots>1?11:4,110);
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
    if(distance(p,e)<148+e.r)damageEnemy(e,48,p.dir);
  }
  G.enemyBullets=G.enemyBullets.filter(b=>distance(p,b)>153);
  for(let i=0;i<62;i++){let a=i*TAU/62,r=random(25,130);
    G.particles.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r,
      vx:Math.cos(a)*random(40,145),vy:Math.sin(a)*random(40,145),
      life:.49,maxLife:.49,size:random(3,6),color:i%3?'#a9edd7':'#fff0b9'});
  }
  sound(660,.32,'sine',.08);
}
function interact(){
  if(mode!=='playing')return;const p=G.player;
  if(G.chest&&!G.chest.opened&&distance(p,G.chest)<69){
    G.chest.opened=true;
    const weapon=G.floor>=2?'shotgun':'rifle';
    p.weapons[1]=weapon;p.slot=1;
    p.hp=Math.min(p.maxHp,p.hp+18);p.shield=Math.min(p.maxShield,p.shield+20);
    particle(G.chest.x,G.chest.y,'#ffdaa2',25,180);
    toast('获得 '+params[weapon].name+'！生命与护盾已恢复');
    G.shake=6;sound(850,.3,'triangle',.065);updateHud();return;
  }
  if(G.portal&&distance(p,G.portal)<75)nextFloor();
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
  if(g.nextWave>0){g.nextWave-=dt;if(g.nextWave<=0&&g.wave<2)startWave();}
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
  if(g.waveActive&&g.enemies.length===0)finishWave();
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
  if(g.chest&&!g.chest.opened&&distance(p,g.chest)<72)hint='开启神秘宝箱';
  else if(g.portal&&distance(p,g.portal)<81)hint=g.floor===3?'完成远征':'进入下一层';
  dom.interact.classList.toggle('show',Boolean(hint));
  if(hint)dom.interact.innerHTML='按 <kbd>E</kbd> '+hint;
  if(Math.floor(g.time*10)!==Math.floor((g.time-dt)*10))updateHud();
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
  const actions=[{x:74,k:'SHIFT',label:'闪避',cool:p.dashCd,max:4},{x:173,k:'Q',label:'震荡',cool:p.skillCd,max:12}];
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
    ctx.fillStyle='#f9cf9a';ctx.textAlign='left';ctx.font='bold 12px sans-serif';ctx.fillText('✦ 深渊守卫',314,111);
    drawBar(416,110,227,boss.hp/boss.maxHp,'#d37c86',11);
  }
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
  for(const part of G.particles){
    ctx.globalAlpha=clamp(part.life/part.maxLife,0,1);
    ctx.fillStyle=part.color;ctx.fillRect(Math.round(part.x),Math.round(part.y),Math.ceil(part.size),Math.ceil(part.size));
  }
  ctx.globalAlpha=1;
  if(G.flash>0){ctx.fillStyle='rgba(255,96,112,'+(G.flash*.35)+')';ctx.fillRect(0,0,WIDTH,HEIGHT);}
  ctx.restore();
  if(mode==='playing'){
    drawGameUI();
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
window.__pixelDungeon={get mode(){return mode;},get floor(){return G.floor;},get wave(){return G.wave;},get enemies(){return G.enemies.length;},get hp(){return G.player.hp;},get coins(){return G.coins;},get x(){return G.player.x;},get y(){return G.player.y;}};
