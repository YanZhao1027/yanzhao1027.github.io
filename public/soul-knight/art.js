// All artwork is created at runtime. No copyrighted game assets are used.
export const WIDTH=960, HEIGHT=600;
const TAU=Math.PI*2;
const spriteCache=new Map();
const rand=(a,b)=>a+Math.random()*(b-a);
const hash=(n)=>{let x=Math.sin(n*127.1+48.3)*43758.5453;return x-Math.floor(x);};
function tile(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function line(ctx,x1,y1,x2,y2,col,width=1){ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=width;ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
export function makeMap(floor,room=0){
  const layouts=[
    [{x:205,y:202,w:95,h:58},{x:666,y:350,w:97,h:59},{x:430,y:135,w:84,h:40}],
    [{x:245,y:195,w:92,h:67},{x:636,y:193,w:95,h:66},{x:286,y:414,w:73,h:58},{x:618,y:410,w:74,h:55}],
    [{x:273,y:202,w:65,h:60},{x:627,y:201,w:65,h:60},{x:270,y:407,w:66,h:58},{x:627,y:407,w:66,h:58}],
    [{x:206,y:234,w:79,h:80},{x:681,y:234,w:79,h:80},{x:443,y:140,w:75,h:46},{x:445,y:402,w:75,h:48}],
    [{x:215,y:265,w:78,h:70},{x:672,y:265,w:78,h:70},{x:430,y:135,w:90,h:42}]
  ];
  const obstacles=layouts[room%layouts.length].map(o=>({...o}));
  const theme=floor===3?2:floor===2?1:0;
  const colors=[
    {base:'#1b363f',alt:'#203d44',dark:'#142b34',edge:'#345762',wall:'#405c64',rim:'#60807b',moss:'#45695b'},
    {base:'#223b3d',alt:'#284345',dark:'#193335',edge:'#4b6663',wall:'#556c66',rim:'#7a8672',moss:'#607b60'},
    {base:'#313541',alt:'#373d47',dark:'#242a35',edge:'#625b67',wall:'#655c6c',rim:'#91817f',moss:'#716476'}
  ][theme];
  const buffer=document.createElement('canvas');buffer.width=WIDTH;buffer.height=HEIGHT;
  const c=buffer.getContext('2d');c.imageSmoothingEnabled=false;
  tile(c,0,0,WIDTH,HEIGHT,'#0c1d28');tile(c,22,20,916,558,'#0c1a24');
  tile(c,30,24,900,551,'#4a6469');tile(c,39,33,882,536,'#162d34');
  tile(c,50,77,860,455,colors.base);
  for(let y=77,yi=0;y<532;y+=35,yi++){
    for(let x=50,xi=0;x<910;x+=35,xi++){
      let q=hash(xi*17+yi*41+floor*121+room*379);
      tile(c,x+1,y+1,33,33,q>.75?colors.alt:colors.base);
      tile(c,x+1,y+1,33,2,q>.58?'#34545a':colors.edge+'40');
      tile(c,x+2,y+2,2,32,'#0e28304a');
      if(q>.78){tile(c,x+7,y+9,3,3,colors.moss);tile(c,x+11,y+12,6,2,colors.moss);}
      if(q<.11){tile(c,x+18,y+18,12,2,'#112b33');tile(c,x+24,y+18,2,9,'#112b33');}
      if(q>.38&&q<.47){tile(c,x+11,y+20,2,2,'#60817c80');tile(c,x+26,y+8,2,3,'#53726e85');}
    }
  }
  // Decorative hexagonal rune in the middle of each dungeon.
  c.save();c.translate(480,325);c.strokeStyle=theme===2?'#8c748165':'#7ea18a49';c.lineWidth=2;
  for(const r of [87,99]){c.beginPath();for(let i=0;i<6;i++){let a=Math.PI/3*i+Math.PI/6;if(i===0)c.moveTo(Math.cos(a)*r,Math.sin(a)*r);else c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath();c.stroke();}
  line(c,-58,0,58,0,c.strokeStyle,1);line(c,0,-58,0,58,c.strokeStyle,1);
  for(let i=0;i<8;i++){let a=i*Math.PI/4;tile(c,Math.cos(a)*70-3,Math.sin(a)*70-3,6,6,'#b6b78e48');}c.restore();
  // Outside walls, seam lines and riveted columns.
  tile(c,38,35,886,30,colors.wall);tile(c,38,35,886,8,colors.rim);tile(c,38,64,886,9,colors.dark);
  tile(c,38,532,886,35,colors.wall);tile(c,38,532,886,9,colors.dark);tile(c,38,560,886,7,colors.rim);
  tile(c,38,35,14,532,colors.wall);tile(c,910,35,14,532,colors.wall);
  for(let x=48;x<922;x+=56){tile(c,x,44,30,4,'#7d918a6b');tile(c,x+3,550,25,4,'#91a09365');}
  for(let y=75;y<520;y+=59){tile(c,41,y,7,31,'#62777b');tile(c,912,y,7,31,'#62777b');}
  for(const ob of obstacles)drawPillar(c,ob,colors);
  return {canvas:buffer,obstacles,colors,theme};
}
function drawPillar(c,o,col){
  c.fillStyle='#061a258c';c.fillRect(o.x-8,o.y+8,o.w+17,o.h+10);
  tile(c,o.x-3,o.y+4,o.w+7,o.h+5,col.dark);
  tile(c,o.x,o.y,o.w,o.h,col.wall);
  tile(c,o.x,o.y,o.w,7,col.rim);tile(c,o.x,o.y,7,o.h,col.rim);
  tile(c,o.x+8,o.y+9,o.w-16,o.h-20,col.edge);
  for(let x=o.x+19;x<o.x+o.w-10;x+=35){tile(c,x,o.y+13,22,3,col.rim);tile(c,x+4,o.y+27,10,2,col.moss);}
  tile(c,o.x,o.y+o.h-10,o.w,10,col.dark);
  tile(c,o.x+4,o.y+o.h-9,o.w-8,3,col.wall);
  tile(c,o.x+o.w-12,o.y+8,8,o.h-19,'#263a44a8');
}
export function drawWorld(ctx,map,time){
  ctx.drawImage(map.canvas,0,0);
  let torches=[[91,88],[866,88],[90,517],[865,517]];
  for(let i=0;i<torches.length;i++){
    const [x,y]=torches[i],f=Math.sin(time*10+i*2)*2;
    const glow=ctx.createRadialGradient(x,y,1,x,y,78);glow.addColorStop(0,'#efb66d44');glow.addColorStop(1,'#efb66d00');
    ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,78,0,TAU);ctx.fill();
    tile(ctx,x-8,y-5,16,15,'#1a262e');tile(ctx,x-5,y-7,10,7,'#785747');
    tile(ctx,x-4,y-15+f,8,11,'#e9995e');tile(ctx,x-2,y-19+f,4,11,'#ffd488');tile(ctx,x-1,y-15+f,2,6,'#fff6c4');
  }
}

const SPRITES={
hero:{
colors:{o:'#193646',h:'#b87d4f',s:'#f4c89b',e:'#24485a',t:'#378b89',c:'#78ccac',g:'#f6d389',p:'#334b62',b:'#202f47',f:'#f6edce'},
pixels:[
'.....oooo.....','....ohhhho....','...oohhhhho...','...osssssso...','...oseese so...','...osssssso...','....oggggo....','...octtttco...','..octtttttco..','..ocgttttgco..','...otttttto...','...otpppp to...','....op..po....','....ob..bo....'
]},
slime:{
colors:{o:'#204c54',s:'#69c4a1',b:'#91e2ba',e:'#113c49',p:'#d1f5c6'},
pixels:['....oooo....','..oossssoo..','.osssssssso.','osssbbbbb sso','osssbeebbsso','osssbbbbb sso','.osssppssso.','..osssssso..','...oooooo...']
},
bat:{
colors:{o:'#372d54',v:'#986bba',b:'#654789',e:'#ffd18d',p:'#d3a5c7'},
pixels:['o...oooo...o','oo.ovvvvo.oo','obovvvvvvobo','obvvvvvvvvbo','.ovvevvevvo.','..ovvvvvvo..','...ovppvo...','....oooo....']
},
shooter:{
colors:{o:'#2d3152',v:'#8f82d6',b:'#544785',e:'#f4c784',p:'#d6a3d0'},
pixels:['.....oo.....','....obbo....','..oobbbboo..','..ovvvvvvo..','..ovevvevo..','..ovvvvvvo..','..ovvppvvo..','.ovvvvvvvvo.','ovvovvvvovvo','oooovvvvoooo','...ovvvvo...','...obbbbo...']
},
boss:{
colors:{o:'#3d243d',v:'#b04c5d',b:'#772f51',e:'#ffd98e',p:'#db9b8a',g:'#f0c17b'},
pixels:['oo..........oo','ovoo......oovo','ovvboooooobvvo','.ovbvvvvvvbvo.','..obvvvvvvbo..','..ovvevvevvo..','..ovvvvvvvvo..','..ovvggggvvo..','.obvvvvvvvvbo.','obvvvvvvvvvvbo','ovvovvvvvvovvo','oooovvvvvvoooo','...ovvvvvvo...','...obbbbbbo...','...obboobbo...']
}};
function getSprite(kind){
  if(spriteCache.has(kind))return spriteCache.get(kind);
  const info=SPRITES[kind]||SPRITES.slime;
  const w=Math.max(...info.pixels.map(v=>v.length)),h=info.pixels.length,p=3;
  const c=document.createElement('canvas');c.width=w*p;c.height=h*p;
  const k=c.getContext('2d');k.imageSmoothingEnabled=false;
  info.pixels.forEach((row,y)=>[...row].forEach((ch,x)=>{
    if(info.colors[ch])tile(k,x*p,y*p,p,p,info.colors[ch]);
  }));
  spriteCache.set(kind,c);return c;
}
export function drawActor(ctx,kind,x,y,t,dir=0,flash=0,scale=1,moving=false){
  const sprite=getSprite(kind);const s=(kind==='boss'?1.65:1)*scale;
  const width=sprite.width*s,height=sprite.height*s;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));
  ctx.globalAlpha=.28;ctx.fillStyle='#000e17';ctx.beginPath();ctx.ellipse(0,8,width*.39,8,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
  let bob=moving?Math.sin(t*15)*2:Math.sin(t*2.6)*1.1;
  ctx.translate(0,-height*.63+bob);
  ctx.scale(Math.cos(dir)<-.1?-1:1,1);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(sprite,-width/2,0,width,height);
  if(flash>0){ctx.globalAlpha=Math.min(.75,flash*5);ctx.globalCompositeOperation='source-atop';tile(ctx,-width/2,0,width,height,'#ffffff');}
  ctx.restore();
}
export function drawGun(ctx,x,y,angle,type='pistol',t=0,recoil=0){
  const long=type==='rifle'?33:type==='shotgun'?30:25;
  ctx.save();ctx.translate(x,y-7);ctx.rotate(angle);
  let side=Math.cos(angle)<0?-1:1;
  tile(ctx,6-recoil*5,-5,Math.max(8,long-7),10,'#172d3e');
  tile(ctx,10-recoil*5,-3,long-12,5,type==='rifle'?'#aab6b6':'#c8aa7e');
  tile(ctx,long-4-recoil*5,-4,6,7,'#253e51');
  tile(ctx,8,-1,7,9,'#815953');
  if(type==='rifle'){tile(ctx,13,-6,9,3,'#90beb2');tile(ctx,long-9,2,4,5,'#699d99');}
  if(type==='shotgun'){tile(ctx,11,-8,17,4,'#7a98a0');tile(ctx,13,1,16,4,'#998f79');}
  tile(ctx,3,-3,11,7,'#eed0a0');ctx.restore();
}
export function drawChest(ctx,x,y,t,opened=false){
  ctx.save();ctx.translate(x,y+Math.sin(t*2)*1.3);
  ctx.fillStyle='#07151b77';ctx.fillRect(-21,13,44,9);
  tile(ctx,-23,-12,46,31,'#322d44');tile(ctx,-20,-15,40,29,opened?'#584939':'#9e6e43');
  tile(ctx,-20,-15,40,7,opened?'#483b35':'#e8b16d');
  tile(ctx,-23,-6,46,9,'#4b3b4b');tile(ctx,-17,-3,34,3,'#cda46c');
  tile(ctx,-4,-7,8,12,opened?'#534944':'#f8d18a');tile(ctx,-2,-4,4,5,'#704b37');
  tile(ctx,-19,12,9,6,'#2c2937');tile(ctx,10,12,9,6,'#2c2937');
  if(!opened){ctx.globalAlpha=.5+.3*Math.sin(t*4);tile(ctx,0,-27,4,4,'#ffe6a6');tile(ctx,-14,-22,3,3,'#fff2c2');}
  ctx.restore();
}
export function drawPortal(ctx,x,y,t){
  ctx.save();ctx.translate(x,y);
  const pulse=Math.sin(t*2.7)*3;
  let g=ctx.createRadialGradient(0,0,8,0,0,70+pulse);g.addColorStop(0,'#62e6d94f');g.addColorStop(1,'#4ccdb500');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,72+pulse,0,TAU);ctx.fill();
  ctx.save();ctx.scale(1,.45);ctx.strokeStyle='#92ecc8';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,0,38+pulse,0,TAU);ctx.stroke();
  ctx.strokeStyle='#f3d98e';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,27-pulse*.3,0,TAU);ctx.stroke();
  for(let i=0;i<6;i++){const a=t*.8+i*TAU/6;tile(ctx,Math.cos(a)*45-3,Math.sin(a)*45-3,6,6,'#f4dcac');}ctx.restore();
  for(let i=0;i<11;i++){let a=i*2.399+t*.55;let r=(i*23+t*12)%39;tile(ctx,Math.cos(a)*r-2,-18-r*.5-Math.sin(a+t)*9,4,4,i%2?'#a9fae2':'#fbe3a4');}
  ctx.restore();
}
export function drawPickup(ctx,p,t){
  ctx.save();ctx.translate(p.x,p.y+Math.sin(t*4+p.phase)*4);
  ctx.globalAlpha=.2;ctx.fillStyle='#001419';ctx.beginPath();ctx.ellipse(0,14,16,6,0,0,TAU);ctx.fill();ctx.globalAlpha=1;
  const color=p.type==='coin'?'#f7d67b':p.type==='heart'?'#f58588':p.type==='shield'?'#90cff2':'#c9b8fa';
  if(p.type==='coin'){
    ctx.rotate(Math.sin(t*3+p.phase)*.1);tile(ctx,-8,-10,16,18,'#a56b46');tile(ctx,-7,-12,14,18,color);tile(ctx,-3,-8,6,10,'#d79d49');tile(ctx,-2,-7,4,7,'#fff2b7');
  }else if(p.type==='heart'){
    tile(ctx,-11,-8,10,9,color);tile(ctx,1,-8,10,9,color);tile(ctx,-8,0,16,8,color);tile(ctx,-4,8,8,4,color);tile(ctx,-6,-6,3,3,'#ffd6c6');
  }else if(p.type==='shield'){
    tile(ctx,-10,-9,20,12,'#447fa7');tile(ctx,-7,2,14,9,color);tile(ctx,-3,11,6,4,color);tile(ctx,-6,-6,12,6,'#b9f0fa');
  }else{tile(ctx,-11,-11,22,22,'#655c95');tile(ctx,-8,-8,16,16,'#ae96e7');tile(ctx,-3,-6,6,13,'#f6dcae');}
  ctx.restore();
}

export function drawSplash(canvas){
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  c.save();c.translate(170,192);
  c.fillStyle='#e8bd7975';c.beginPath();c.ellipse(0,103,106,26,0,0,TAU);c.fill();
  c.strokeStyle='#f2d28e9f';c.lineWidth=4;
  for(let r of [72,102]){c.beginPath();c.ellipse(0,98,r,r*.31,0,0,TAU);c.stroke();}
  c.fillStyle='#4b8f86';c.fillRect(-74,76,148,21);c.fillStyle='#73b9aa';c.fillRect(-60,70,120,8);
  c.restore();
  drawActor(c,'hero',170,260,3,0,0,3.2,false);
  drawGun(c,193,208,-.5,'rifle',0,0);
  for(const [x,y,r] of [[41,111,5],[288,76,5],[269,282,4],[65,287,3],[290,180,3]]){
    c.fillStyle='#f6db9a';c.fillRect(x-r/2,y-9,r,18);c.fillRect(x-9,y-r/2,18,r);
  }
  c.fillStyle='#9bd6c8';c.fillRect(55,208,8,8);c.fillRect(70,194,4,4);c.fillRect(277,218,9,9);
}
