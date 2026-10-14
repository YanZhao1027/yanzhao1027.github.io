import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const fromSite=new URL('../public/soul-knight/rooms.mjs',import.meta.url);
const fromLocal=new URL('../rooms.mjs',import.meta.url);
const {createRooms,DOORS,roomEntryPosition,comboMultiplier,comboRank,areNeighbors}
  =await import(existsSync(fromSite)?fromSite.href:fromLocal.href);
test('five rooms with an optional treasure branch',()=>{
  const r=createRooms();
  assert.equal(r.length,5);
  assert.deepEqual(r.map(x=>x.kind),['combat','combat','treasure','combat','guardian']);
  assert.deepEqual(Object.values(r[1].exits).sort(),[0,2,3]);
});
test('all door links have reverse connections',()=>{
  const rooms=createRooms();
  for(const r of rooms)for(const [direction,to] of Object.entries(r.exits)){
    assert(areNeighbors(rooms,r.id,to));
    assert(areNeighbors(rooms,to,r.id));
    assert(DOORS[direction]);
  }
  assert.equal(areNeighbors(rooms,0,4),false);
});
test('floor state is isolated between runs',()=>{
  const first=createRooms(),second=createRooms();
  first[0].cleared=true;first[2].visited=true;first[2].pickups.push({type:'coin'});
  assert.equal(second[0].cleared,false);
  assert.equal(second[2].visited,false);
  assert.equal(second[2].pickups.length,0);
});
test('transitions land near the correct side of the doorway',()=>{
  const r=createRooms();
  assert(roomEntryPosition(r,0,1).x<270);
  assert(roomEntryPosition(r,1,0).x>690);
  assert(roomEntryPosition(r,1,2).y>340);
  assert(roomEntryPosition(r,2,1).y<260);
  assert.throws(()=>roomEntryPosition(r,0,4),/not connected/);
});
test('kill streak multiplier and grade scaling',()=>{
  assert.equal(comboMultiplier(0),1);
  assert.equal(comboMultiplier(2),1);
  assert.equal(comboMultiplier(3),1.25);
  assert.equal(comboMultiplier(6),1.5);
  assert.equal(comboMultiplier(12),2);
  assert.equal(comboMultiplier(999),2.5);
  assert.equal(comboRank(12),'LEGENDARY');
  assert.equal(comboRank(3),'GREAT');
});
