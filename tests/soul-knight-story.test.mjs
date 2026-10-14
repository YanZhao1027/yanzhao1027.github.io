import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const target=new URL('../public/soul-knight/story.mjs',import.meta.url);
const local=new URL('../story.mjs',import.meta.url);
const {STORY_SCENES,MAIN_MEMORIES,SIDE_MEMORIES,memoryForRoom,readableArchive}
  =await import(existsSync(target)?target.href:local.href);

test('every chapter has required narrative scenes and readable panels',()=>{
  const ids=['opening','memory1','memory2','memory3','event1','event2','event3',
    'beforeDragon','dragonHesitates','dragonSeal','dragonFallen','dress','ring','revelation'];
  for(const key of ids){
    const s=STORY_SCENES[key];
    assert(s&&s.title&&s.kicker,'Missing narrative '+key);
    assert(s.panels.length>=1);
    for(const panel of s.panels)assert(panel.speaker&&panel.text&&panel.art);
  }
});
test('exactly one main memory is anchored to each floor and is required',()=>{
  assert.deepEqual(MAIN_MEMORIES,['memory1','memory2','memory3']);
  assert.deepEqual(SIDE_MEMORIES,['event1','event2','event3']);
  for(let floor=1;floor<=3;floor++){
    assert.equal(memoryForRoom(floor,'memory'),MAIN_MEMORIES[floor-1]);
    assert.equal(memoryForRoom(floor,'event'),SIDE_MEMORIES[floor-1]);
    assert.equal(memoryForRoom(floor,'combat'),null);
  }
});
test('dragon-as-princess revelation stays exclusively in the final montage',()=>{
  for(const key of ['opening','memory1','memory2','memory3','beforeDragon']){
    const text=STORY_SCENES[key].panels.map(p=>p.text).join('');
    assert(!text.includes('她就是那条'),key+' spoils the tragedy');
  }
  assert(STORY_SCENES.revelation.panels.some(p=>p.text.includes('她就是那条')));
  assert(STORY_SCENES.dress.panels.some(p=>p.text.includes('浅蓝色')));
  assert(STORY_SCENES.ring.panels.some(p=>p.text.includes('戒指')));
});
test('archive hides future reveals but persists collected memory descriptors',()=>{
  const initial=readableArchive([]);
  assert.equal(initial.length,9);
  assert(initial.every(x=>!x.collected));
  const found=readableArchive(['memory1','event2','dress','ring','truth']);
  assert.equal(found.filter(x=>x.collected).length,5);
  assert.equal(found.filter(x=>x.final).length,3);
  assert(found.some(x=>x.id==='dress'&&x.collected));
  assert(found.some(x=>x.id==='memory3'&&!x.collected));
});
