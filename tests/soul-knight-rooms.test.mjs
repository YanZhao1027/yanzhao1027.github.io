import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const inSite=new URL('../public/soul-knight/rooms.mjs',import.meta.url);
const local=new URL('../rooms.mjs',import.meta.url);
const {createRooms,DOORS,VECTORS,roomEntryPosition,comboMultiplier,comboRank,
  areNeighbors,findRoute,generateObstacles,seedNumber}
  =await import(existsSync(inSite)?inSite.href:local.href);

test('1500 random floor graphs are connected with mandatory memories on the boss path',()=>{
  const unique=new Set();
  for(let seed=0;seed<500;seed++)for(let floor=1;floor<=3;floor++){
    const rooms=createRooms(seed,floor);
    assert(rooms.length>=8&&rooms.length<=10);
    assert.equal(rooms[0].kind,'combat');
    for(const k of ['memory','treasure','event','guardian'])assert.equal(rooms.filter(r=>r.kind===k).length,1);
    const boss=rooms.find(r=>r.kind==='guardian'),memory=rooms.find(r=>r.kind==='memory');
    const route=findRoute(rooms,0,boss.id);
    assert(route?.includes(memory.id),'Mandatory memory inaccessible seed='+seed+',floor='+floor);
    for(const r of rooms){
      assert(findRoute(rooms,0,r.id),'unreachable branch');
      for(const [direction,other] of Object.entries(r.exits)){
        assert(areNeighbors(rooms,r.id,other));
        assert(areNeighbors(rooms,other,r.id));
        const v=VECTORS[direction];
        assert.equal(rooms[other].x,r.x+v.x);
        assert.equal(rooms[other].y,r.y+v.y);
      }
    }
    unique.add(rooms.map(r=>r.x+','+r.y+':'+r.kind).join('|'));
  }
  assert(unique.size>500,'Only '+unique.size+' unique layouts');
});
test('same seed and floor always produce same geometry, alternate seeds vary',()=>{
  assert.deepEqual(createRooms('alina',2),createRooms('alina',2));
  assert.notDeepEqual(createRooms('alina',2),createRooms('unrelated',2));
  assert.equal(seedNumber('alina'),seedNumber('alina'));
});
test('hundreds of random obstacle sets leave the doorway cross and chest area open',()=>{
  const origins=[[480,307],[480,202],[480,408],[188,307],[773,307]];
  const variants=new Set();
  for(let i=0;i<600;i++){
    const obstacles=generateObstacles(i+1234,'combat');
    assert(obstacles.length>=3&&obstacles.length<=7);
    for(const p of origins){
      assert(!obstacles.some(o=>p[0]>=o.x-16&&p[0]<=o.x+o.w+16&&
          p[1]>=o.y-16&&p[1]<=o.y+o.h+16),'Doorway or center is blocked');
    }
    variants.add(obstacles.map(o=>String(o.x)+','+o.y).join('|'));
  }
  assert(variants.size>400);
  assert.deepEqual(generateObstacles(1234,'memory'),[]);
  assert.deepEqual(generateObstacles(1234,'dragon'),[]);
});
test('doorway entry spawns on correct side with symmetric paths',()=>{
  const rooms=createRooms('connected',3);
  for(const r of rooms)for(const other of Object.values(r.exits)){
    const pos=roomEntryPosition(rooms,r.id,other);
    const entrance=Object.keys(rooms[other].exits).find(d=>rooms[other].exits[d]===r.id);
    assert.equal(pos.x,DOORS[entrance].spawnX);
    assert.equal(pos.y,DOORS[entrance].spawnY);
  }
  const a=rooms.find(r=>r.kind==='treasure');
  const b=rooms.find(r=>r.kind==='guardian');
  assert.throws(()=>roomEntryPosition(rooms,a.id,b.id),/not connected/);
});
test('fresh runs own independent room state',()=>{
  const first=createRooms(123,1),second=createRooms(123,1);
  first[0].cleared=true;first[1].visited=true;first[2].pickups.push({type:'coin'});
  assert.equal(second[0].cleared,false);assert.equal(second[1].visited,false);
  assert.deepEqual(second[2].pickups,[]);
});
test('the dragon chapter has one hand-crafted room after three random floors',()=>{
  const end=createRooms('anyseed',4);
  assert.equal(end.length,1);
  assert.equal(end[0].kind,'dragon');
  assert.deepEqual(end[0].exits,{});
  assert.equal(end[0].name,'龙眠王庭');
});
test('combo multipliers preserve the existing gameplay progression',()=>{
  assert.equal(comboMultiplier(0),1);assert.equal(comboMultiplier(3),1.25);
  assert.equal(comboMultiplier(12),2);assert.equal(comboMultiplier(999),2.5);
  assert.equal(comboRank(12),'LEGENDARY');
});
