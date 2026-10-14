// Original procedural cutscene illustrations and the tragic dragon. Canvas only.
const TAU=Math.PI*2;
const block=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
function shape(c,points,color){
  c.fillStyle=color;c.beginPath();c.moveTo(...points[0]);
  for(const p of points.slice(1))c.lineTo(...p);c.closePath();c.fill();
}
function glow(c,x,y,r,color){
  const gradient=c.createRadialGradient(x,y,3,x,y,r);
  gradient.addColorStop(0,color);gradient.addColorStop(1,'transparent');
  c.fillStyle=gradient;c.fillRect(x-r,y-r,r*2,r*2);
}
function rand(n){return (Math.sin(n*127.1+32)*43634.463)%1;}
function rectScene(c,w,h,kind){
  const pal=kind==='garden'||kind==='ring'?['#203c50','#365966','#54736d']:
    kind==='dragon'||kind==='dragonRing'||kind==='ashes'?['#191a30','#473341','#3a333f']:
    kind==='throne'||kind==='ritual'?['#221c2e','#422d43','#65404e']:
    ['#142834','#294455','#526873'];
  const g=c.createLinearGradient(0,0,0,h);
  g.addColorStop(0,pal[0]);g.addColorStop(.56,pal[1]);g.addColorStop(1,pal[2]);
  c.fillStyle=g;c.fillRect(0,0,w,h);
  for(let i=0;i<110;i++){
    const x=(i*173+37)%w,y=(i*79+29)%h;
    const a=Math.abs(rand(i+2));
    if(a>.18){c.globalAlpha=.18+a*.32;block(c,x,y,i%7===0?6:3,2,i%3?'#b8d1c8':'#ebd6aa');}
  }
  c.globalAlpha=1;
  block(c,0,h-40,w,40,kind==='garden'||kind==='ring'?'#263d46':'#222b3c');
  for(let x=0;x<w;x+=36){block(c,x,h-38,33,2,'#74808745');block(c,x+17,h-16,14,3,'#85959b35');}
  glow(c,w*.48,h*.35,150,kind==='garden'||kind==='ring'?'#b2debf22':'#dfabaf15');
}
function character(c,x,y,role='prince',scale=1){
  c.save();c.translate(x,y);c.scale(scale,scale);
  const princess=role==='princess',king=role==='king';
  block(c,-9,-60,18,22,'#eacda8');
  block(c,-13,-64,27,8,king?'#d7b66b':princess?'#a5a1b5':'#c9a17b');
  if(king){for(let i=-2;i<=2;i++)block(c,i*6-3,-74+(Math.abs(i)%2)*4,6,13,'#e2cb84');}
  if(princess){
    shape(c,[[-14,-39],[14,-39],[28,17],[-28,17]],'#a4c4d5');
    shape(c,[[-8,-33],[8,-33],[18,16],[-17,16]],'#c6dbe8');
    block(c,-18,-38,8,32,'#e1bb9e');block(c,10,-38,8,32,'#e1bb9e');
    block(c,-17,-63,7,31,'#8b7691');block(c,11,-63,8,35,'#8b7691');
  }else{
    shape(c,[[-14,-37],[14,-37],[20,0],[-19,0]],king?'#763c4d':'#517486');
    block(c,-10,0,8,23,'#263d4c');block(c,4,0,8,23,'#263d4c');
    block(c,-20,-35,8,33,'#d6b998');block(c,13,-35,8,33,'#d6b998');
    if(king)shape(c,[[-20,-38],[20,-38],[26,25],[-26,25]],'#61324b');
  }
  block(c,-5,-55,3,3,'#314150');block(c,6,-55,3,3,'#314150');c.restore();
}
function ringShape(c,x,y,r=33){
  c.save();c.translate(x,y);
  c.shadowColor='#ffe5a0';c.shadowBlur=20;
  c.strokeStyle='#b6cccf';c.lineWidth=Math.max(4,r*.19);
  c.beginPath();c.ellipse(0,4,r*.66,r,0,0,TAU);c.stroke();
  c.strokeStyle='#f6efd3';c.lineWidth=Math.max(2,r*.08);
  c.beginPath();c.ellipse(0,4,r*.66,r,0,0,TAU);c.stroke();
  shape(c,[[-r*.55,-r*.92],[0,-r*1.42],[r*.55,-r*.92],[0,-r*.57]],'#9febde');
  shape(c,[[-r*.3,-r*.99],[0,-r*1.26],[r*.3,-r*.99],[0,-r*.8]],'#f7ffff');
  c.restore();
}
function drawGarden(c,w,h){
  const moonX=w*.77,moonY=59;
  c.fillStyle='#e7e6c4';c.beginPath();c.arc(moonX,moonY,34,0,TAU);c.fill();
  glow(c,moonX,moonY,85,'#dde3b931');
  for(const side of [0,1]){
    const x=side?w-100:83;
    block(c,x-9,45,17,175,'#3e4a43');
    for(let b=0;b<5;b++){
      shape(c,[[x,92+b*14],[x+(side?-1:1)*65,27+b*23],[x+(side?-1:1)*44,44+b*22]],'#475b53');
    }
    for(let b=0;b<18;b++){
      const px=x+(side?-1:1)*((b*29)%82),py=46+((b*47)%110);
      block(c,px,py,6,5,b%2?'#cdabc0':'#f5d4ce');
    }
  }
  for(let x=0;x<w;x+=31){
    block(c,x,h-65,7,52,'#7e8d83');block(c,x,h-58,30,5,'#92a6a0');
  }
  character(c,w*.42,h*.69,'prince',1.38);
  character(c,w*.57,h*.69,'princess',1.38);
  block(c,w*.49,h*.52,33,4,'#e6c2a3');ringShape(c,w*.507,h*.49,5);
}
function drawThrone(c,w,h,ritual=false){
  for(let x=35;x<w;x+=140){
    block(c,x,45,27,h-80,'#4f5057');block(c,x-9,36,45,14,'#897079');
    glow(c,x+12,99,58,ritual?'#e7998244':'#d8c78a23');
  }
  if(ritual){
    shape(c,[[w/2-127,h-53],[w/2+127,h-53],[w/2+95,h-130],[w/2-95,h-130]],'#3c3648');
    c.strokeStyle='#d28d77';c.lineWidth=6;c.beginPath();c.ellipse(w/2,h-82,135,41,0,0,TAU);c.stroke();
    for(let i=0;i<8;i++){const a=i*TAU/8;block(c,w/2+Math.cos(a)*115-4,h-79+Math.sin(a)*30,8,8,'#f0bb91');}
    glow(c,w/2,h-138,122,'#e5838b55');
    character(c,w*.5,h*.66,'princess',1.48);
  }else{
    block(c,w/2-65,h-161,130,174,'#9a7075');
    block(c,w/2-50,h-149,100,151,'#332b42');
    block(c,w/2-87,h-65,170,19,'#ad8b76');
    character(c,w/2,h*.76,'king',1.6);
  }
}
export function paintCinematic(canvas,art='garden'){
  if(!canvas)return;
  const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  c.imageSmoothingEnabled=false;rectScene(c,w,h,art);
  if(['garden','ring'].includes(art)){
    drawGarden(c,w,h);
    if(art==='ring'){
      block(c,0,0,w,h,'#192337c4');ringShape(c,w/2,h/2+33,64);
      block(c,w/2-93,h-36,187,2,'#d5c59b');
    }
  }else if(['throne','ritual'].includes(art))drawThrone(c,w,h,art==='ritual');
  else if(art==='mirror'||art==='portrait'){
    for(const x of [130,w-168]){block(c,x,28,17,h-64,'#536a79');block(c,x-9,28,35,13,'#92a29b');}
    block(c,w/2-78,27,156,h-65,'#aa9b86');
    block(c,w/2-69,35,138,h-83,'#304d62');
    block(c,w/2-57,44,115,h-100,'#6f8b9d76');
    character(c,w/2,h*.68,'prince',1.85);
    if(art==='portrait')character(c,w*.67,h*.68,'princess',1.25);
    for(let i=0;i<6;i++){
      c.strokeStyle='#cfddd8ab';c.lineWidth=2;c.beginPath();
      c.moveTo(w/2-30+i*14,35);c.lineTo(w/2-70+i*17,158+i*13);c.stroke();
    }
  }else if(art==='archive'){
    block(c,w*.18,37,w*.64,h*.78,'#736d61');block(c,w*.2,47,w*.60,h*.7,'#d2bf9c');
    block(c,w/2,48,3,h*.68,'#a48b72');
    for(let i=0;i<11;i++){block(c,w*.24,73+i*16,165,3,'#755c60');block(c,w*.55,73+i*16,130,3,'#755c60');}
    block(c,w*.55,100,130,5,'#bf555f');glow(c,w*.68,122,80,'#a4515355');
  }else if(art==='grave'){
    for(let i=0;i<9;i++){
      const x=48+i*82,y=h-65+(i%2)*14;
      block(c,x,y-70,45,70,'#788882');block(c,x+5,y-65,34,5,'#b1b7a1');
      block(c,x+13,y-42,19,4,'#c9cabb');
    }
    glow(c,w*.51,h*.42,130,'#accfc345');
  }else if(art==='awakening'){
    for(let x=70;x<w-50;x+=155){block(c,x,62,28,h-110,'#586b72');block(c,x+5,76,18,h-145,'#243b4b');}
    character(c,w/2,h*.73,'prince',1.72);glow(c,w/2,h*.37,120,'#c4cfb72d');
  }else if(art==='castle'){
    for(let x=25;x<w;x+=90){
      block(c,x,100,67,135+(x%3)*21,'#576a74');block(c,x+10,87,47,19,'#77908d');
      for(let j=0;j<3;j++)block(c,x+14+j*15,126,8,30,'#263a50');
    }
    glow(c,w/2,h*.73,120,'#9de6e029');
  }else if(['dragon','dragonRing','ashes','dress'].includes(art)){
    drawDragon(c,w/2+15,h*.84,0,false,true,1.05);
    block(c,w*.66,h-60,73,17,'#8fb5d1');block(c,w*.7,h-64,35,8,'#a8d3e6');
    if(art==='dragonRing')ringShape(c,w*.63,h*.74,32);
    if(art==='dress'){
      shape(c,[[w*.66,h-58],[w*.7,h-117],[w*.74,h-59],[w*.82,h-24],[w*.61,h-24]],'#abcbe1');
      block(c,w*.68,h-50,60,6,'#e7d5c5');
    }
  }
  const shade=c.createLinearGradient(0,0,w,0);
  shade.addColorStop(0,'#08152198');shade.addColorStop(.22,'transparent');
  shade.addColorStop(.76,'transparent');shade.addColorStop(1,'#08152198');
  c.fillStyle=shade;c.fillRect(0,0,w,h);
}
export function drawDragon(ctx,x,y,t=0,alive=true,prone=false,scale=1,phase=1){
  // Rendered as layered, snapped polygons (pixelated without external sprites).
  const c=ctx;c.save();c.translate(Math.round(x),Math.round(y));
  c.scale(scale,scale);c.imageSmoothingEnabled=false;
  const bob=prone?23:Math.sin(t*2)*4;
  c.translate(0,bob);
  const color=prone?'#555565':phase>=3?'#a54f70':'#6a608b';
  const pale=prone?'#7e7481':phase>=3?'#c77b85':'#9e93c3';
  // Wing silhouettes cast backward, asymmetrical enchanted chains.
  shape(c,[[-20,-55],[-70,-128],[-166,-131],[-136,-82],[-174,-63],[-115,-45],[-73,-19]],'#302f50');
  shape(c,[[17,-57],[91,-144],[183,-107],[136,-82],[171,-50],[110,-23],[75,0]],'#323051');
  shape(c,[[-22,-57],[-76,-111],[-136,-114],[-110,-86],[-155,-64],[-78,-35]],prone?'#494656':'#525077');
  shape(c,[[22,-57],[83,-121],[153,-101],[116,-77],[156,-53],[74,-28]],prone?'#544858':'#594b77');
  for(let i=0;i<6;i++){
    c.strokeStyle='#8d889d';c.lineWidth=3;c.beginPath();
    const a=-150+i*13;c.moveTo(a,-82);c.lineTo(a+34,-54);c.stroke();
  }
  // Tail, armoured torso, sapphire ventral scales.
  shape(c,[[0,-22],[64,14],[116,40],[157,14],[141,64],[79,63],[30,43]],'#3a3256');
  shape(c,[[-72,-63],[-34,-94],[46,-87],[87,-28],[75,23],[22,61],[-52,42],[-89,-2]],color);
  shape(c,[[-44,-48],[8,-72],[62,-29],[49,28],[11,44],[-37,17]],pale);
  for(let i=0;i<5;i++){
    block(c,-19+i*5,-40+i*12,44-i*5,4,i%2?'#e0acc2':'#b3a4cf');
  }
  // Long neck, haunted head, white crown-shaped horns.
  shape(c,[[-21,-79],[2,-137],[48,-128],[59,-91],[47,-58]],color);
  shape(c,[[-2,-139],[-37,-163],[-18,-190],[5,-173],[24,-184],[50,-169],[56,-145]],pale);
  shape(c,[[-29,-164],[-40,-206],[-13,-184]],'#dce0ea');
  shape(c,[[28,-169],[48,-207],[54,-162]],'#dce0ea');
  shape(c,[[-15,-166],[7,-183],[42,-162],[33,-145],[1,-139],[-27,-151]],color);
  block(c,4,-166,12,6,prone?'#667a8e':'#a8e9ef');
  block(c,7,-164,4,4,'#e7fcfb');
  shape(c,[[12,-141],[57,-136],[43,-124],[-5,-129]],'#4c415f');
  for(let i=0;i<7;i++)block(c,14+i*5,-132+(i%2)*2,4,7,'#eee2d8');
  // Front paws, one bound in a human-sized ring.
  shape(c,[[-58,-23],[-95,33],[-66,51],[-31,30]],'#53446e');
  shape(c,[[48,-21],[100,35],[73,49],[32,18]],'#55476f');
  for(const xx of [-83,-74,-64,77,87,96])block(c,xx,43,11,10,'#e1d9e3');
  // A very small ring on an oversized right digit; subtle in combat.
  c.strokeStyle='#e6d9b1';c.lineWidth=3;
  c.beginPath();c.ellipse(82,41,7,4,-.3,0,TAU);c.stroke();
  block(c,80,35,5,5,'#a5ece5');
  if(phase>=3&&!prone){
    for(let i=0;i<3;i++){
      c.strokeStyle='#db696d';c.lineWidth=5;c.beginPath();
      c.moveTo(-73+i*64,-170);c.lineTo(-31+i*32,24);c.stroke();
    }
    glow(c,6,-102,90,'#f0696b38');
  }
  if(prone){c.globalAlpha=.45;block(c,-170,-180,354,245,'#101b28');}
  c.restore();
}
export function drawDragonClues(ctx,remains,time,dressFound=false){
  if(!remains)return;
  const p=.55+Math.sin(time*3)*.23;
  // Broken blue dress near the dragon's fallen shoulder.
  const x=remains.x+126,y=remains.y+65;
  ctx.save();ctx.globalAlpha=1;
  shape(ctx,[[x-25,y-19],[x+10,y-26],[x+21,y-7],[x+45,y+21],[x-41,y+25],[x-20,y-4]],'#9ebdd7');
  shape(ctx,[[x-13,y-15],[x+7,y-14],[x+15,y+22],[x-30,y+20]],'#c7d7df');
  block(ctx,x-18,y+12,43,3,'#eadcbf');
  block(ctx,x+9,y-26,6,11,'#d7d4db');
  if(!dressFound){glow(ctx,x,y,61,'#abdef2'+Math.floor(p*110).toString(16).padStart(2,'0'));}
  // Only after the dress is examined does the ring's anomaly become obvious.
  if(dressFound){
    const rx=remains.x+84,ry=remains.y+30;
    ctx.strokeStyle='#f3d99b';ctx.lineWidth=4;
    ctx.beginPath();ctx.ellipse(rx,ry,11,7,-.3,0,TAU);ctx.stroke();
    block(ctx,rx-3,ry-10,6,6,'#baf7ed');
    glow(ctx,rx,ry,46,'#f3e09a55');
  }
  ctx.restore();
}
