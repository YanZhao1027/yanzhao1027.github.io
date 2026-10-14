// Procedural room graph / deterministic geometry shared by browser and node:test.
export const DOORS=Object.freeze({
  left:{x:94,y:307,spawnX:187,spawnY:307},
  right:{x:866,y:307,spawnX:773,spawnY:307},
  up:{x:480,y:113,spawnX:480,spawnY:201},
  down:{x:480,y:497,spawnX:480,spawnY:410}
});
export const VECTORS=Object.freeze({up:{x:0,y:-1},right:{x:1,y:0},down:{x:0,y:1},left:{x:-1,y:0}});
const REVERSE=Object.freeze({up:'down',right:'left',down:'up',left:'right'});
export function seedNumber(seed){
  if(typeof seed==='number'&&Number.isFinite(seed))return seed>>>0;
  let h=2166136261;for(const ch of String(seed)){h=Math.imul(h^ch.charCodeAt(0),16777619);}
  return h>>>0;
}
export function randomSource(seed){
  let x=seedNumber(seed);
  return ()=>{
    x+=0x6D2B79F5;let t=x;
    t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
}
export function combineSeed(...parts){
  return seedNumber(parts.join(':'));
}
const pick=(list,rand)=>list[Math.floor(rand()*list.length)];
const key=(x,y)=>x+','+y;
function shuffled(xs,r){
  let arr=xs.slice();for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(r()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];
  }return arr;
}
function neighbors(x,y,occupied){
  return Object.entries(VECTORS).map(([dir,v])=>({dir,x:x+v.x,y:y+v.y}))
    .filter(p=>p.x>=0&&p.x<6&&p.y>=0&&p.y<5&&!occupied.has(key(p.x,p.y)));
}
const NAMES={
  1:{combat:['苔痕墓道','守墓人的回廊','残钟墓室','无名者之厅','灰烬庭院'],treasure:'遗物密室',memory:'月光花园的回声',event:'风中墓志',guardian:'墓园禁门'},
  2:{combat:['沉没长廊','碎冠画廊','王城武库','积水书库','旧王座侧殿'],treasure:'尘封王室珍库',memory:'王室密档',event:'破碎的誓约碑',guardian:'冰镜王座'},
  3:{combat:['血纹祭廊','封印长阶','龙血祭坛外壁','失序镜厅','王之密室'],treasure:'誓约秘库',memory:'失名之镜',event:'祭司的遗言',guardian:'深渊祭坛'}
};
function makeMain(floor,rng){
  // Rejection-sampled self avoiding trail. The last node is always the guardian.
  const length=6+(floor===3?1:0);
  for(let attempt=0;attempt<120;attempt++){
    const path=[{x:0,y:2}];const used=new Set([key(0,2)]);
    for(let i=1;i<length;i++){
      let opts=neighbors(path.at(-1).x,path.at(-1).y,used);
      if(!opts.length)break;
      // Progress outward, occasionally divert up and down for a genuine maze.
      const weights=opts.map(o=>o.dir==='right'?5:o.dir==='left'?.32:2.2);
      const total=weights.reduce((a,b)=>a+b,0);let needle=rng()*total,chosen=opts.at(-1);
      for(let j=0;j<opts.length;j++){needle-=weights[j];if(needle<=0){chosen=opts[j];break;}}
      path.push({x:chosen.x,y:chosen.y});used.add(key(chosen.x,chosen.y));
    }
    if(path.length===length&&path.at(-1).x>=2)return path;
  }
  // Deterministic fallback is only for unusual unlucky seeds, never loops forever.
  return [{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:2,y:1},{x:3,y:1},{x:4,y:1},
    ...(floor===3?[{x:4,y:2}]:[])];
}
export function createRooms(seed=2026,floor=1){
  if(floor===4){
    return [{id:0,x:0,y:0,name:'龙眠王庭',kind:'dragon',isMain:true,mapSeed:combineSeed(seed,'dragon'),
      visited:false,cleared:false,spawned:false,exits:{},enemies:[],pickups:[],chest:null,portal:null,investigated:[]}];
  }
  const rng=randomSource(combineSeed(seed,'floor',floor));
  const main=makeMain(floor,rng);
  const nodes=main.map((pos,i)=>({...pos,id:i,isMain:true,
    kind:i===main.length-1?'guardian':i===main.length-3?'memory':'combat'}));
  const used=new Set(main.map(x=>key(x.x,x.y)));
  // One treasure branch, one lore/event room and one extra battle/elite branch.
  for(const kind of ['treasure','event','combat']){
    const parents=shuffled(nodes.filter(n=>n.kind!=='guardian'),rng);
    const possible=[];
    for(const p of parents)for(const o of neighbors(p.x,p.y,used))
      possible.push({from:p,option:o});
    if(!possible.length)break;
    const selected=pick(shuffled(possible,rng),rng);
    const id=nodes.length;
    nodes.push({id,x:selected.option.x,y:selected.option.y,kind,isMain:false,parent:selected.from.id});
    used.add(key(selected.option.x,selected.option.y));
  }
  // Rare unusual layout with no branch space gets another rejection pass? The
  // five by six grid has enough cells under the fixed main trail; assert here.
  if(nodes.length!==main.length+3)throw new Error('Maze has no space for essential branches');
  const map=new Map(nodes.map(n=>[key(n.x,n.y),n]));
  const roomNames=NAMES[floor];
  const combatNames=shuffled(roomNames.combat,rng);
  let ci=0;
  const rooms=nodes.map(node=>{
    const exits={};
    if(node.isMain){
      // Only connect consecutive main-trail rooms, not adjacent strangers.
      for(const other of [nodes[node.id-1],nodes[node.id+1]].filter(Boolean)){
        if(!other.isMain)continue;
        for(const [dir,v] of Object.entries(VECTORS))
          if(node.x+v.x===other.x&&node.y+v.y===other.y)exits[dir]=other.id;
      }
    }else{
      const parent=nodes[node.parent];
      for(const [dir,v] of Object.entries(VECTORS))
        if(node.x+v.x===parent.x&&node.y+v.y===parent.y)exits[dir]=parent.id;
    }
    const kind=node.kind;
    return {...node,name:kind==='combat'?combatNames[ci++%combatNames.length]+' '+(node.id+1):
        roomNames[kind]||'无名房间',exits,mapSeed:combineSeed(seed,floor,node.id,'geometry'),
      visited:false,cleared:false,spawned:false,enemies:[],pickups:[],chest:null,portal:null,
      memoryCollected:false,eventDone:false};
  });
  // Attach branches to their parent as a reciprocal link.
  for(const r of rooms.filter(n=>!n.isMain)){
    const parent=rooms[r.parent];
    const entrance=Object.entries(r.exits)[0][0];
    parent.exits[REVERSE[entrance]]=r.id;
  }
  return rooms;
}
export function roomEntryPosition(rooms,fromRoom,toRoom){
  if(fromRoom==null)return{x:480,y:374};
  const target=rooms[toRoom];
  const entrance=Object.keys(target.exits).find(d=>target.exits[d]===fromRoom);
  if(!entrance)throw new Error('Rooms are not connected: '+fromRoom+' -> '+toRoom);
  return{x:DOORS[entrance].spawnX,y:DOORS[entrance].spawnY};
}
export function areNeighbors(rooms,a,b){return Object.values(rooms[a]?.exits||{}).includes(b);}
export function findRoute(rooms,start,goal){
  const q=[[start]],seen=new Set([start]);
  while(q.length){
    const path=q.shift(),id=path.at(-1);
    if(id===goal)return path;
    for(const n of Object.values(rooms[id]?.exits||{}))
      if(!seen.has(n)){seen.add(n);q.push([...path,n]);}
  }return null;
}
export function generateObstacles(seed,kind='combat'){
  if(['dragon','memory','event','treasure'].includes(kind))return [];
  const rng=randomSource(seed),target=kind==='guardian'?4:3+Math.floor(rng()*5);
  const obstacles=[];
  for(let i=0;i<260&&obstacles.length<target;i++){
    const w=42+Math.floor(rng()*45),h=35+Math.floor(rng()*35);
    const x=160+Math.floor(rng()*(780-160-w)),y=154+Math.floor(rng()*(454-154-h));
    const midX=x+w/2,midY=y+h/2;
    // A 148px horizontal, 150px vertical cross remains open for every doorway.
    if(Math.abs(midX-480)<112||Math.abs(midY-307)<92)continue;
    if(obstacles.some(o=>x<o.x+o.w+25&&x+w+25>o.x&&y<o.y+o.h+23&&y+h+23>o.y))continue;
    obstacles.push({x,y,w,h});
  }
  return obstacles;
}
export function comboMultiplier(streak){return Math.min(2.5,1+Math.floor(Math.max(0,streak)/3)*.25);}
export function comboRank(streak){return streak>=12?'LEGENDARY':streak>=8?'UNSTOPPABLE':streak>=5?'FRENZY':streak>=3?'GREAT':'CHAIN';}
