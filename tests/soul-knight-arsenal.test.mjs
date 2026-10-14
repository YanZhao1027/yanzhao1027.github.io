import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
const inSite=new URL('../public/soul-knight/arsenal.mjs',import.meta.url);
const local=new URL('../arsenal.mjs',import.meta.url);
const {WEAPONS,TREASURE_WEAPONS,BOSS_WEAPONS,BOSS_DATA,FLOOR_BOSSES,bossHp,isBoss,
  hitRayPoint,RELICS,draftRelics,applyRelic}=await import(existsSync(inSite)?inSite.href:local.href);
function hero(){
 return {hp:68,maxHp:100,shield:16,maxShield:40,speed:225,power:1,attackSpeed:1,
  bladePower:1,projectilePower:1,shieldRegen:0,magnet:0,dashFactor:1,
  skillFactor:1,vampireHeal:0,relics:[]};
}
test('six distinct weapon designs include laser, returning boomerang and tracking sword',()=>{
 const kinds=Object.keys(WEAPONS);
 assert.equal(kinds.length,6);
 for(const id of ['laser','boomerang','sword']){
   assert(kinds.includes(id));assert(WEAPONS[id].damage>0);
   assert(WEAPONS[id].rate>0);
 }
 assert.equal(WEAPONS.laser.kind,'laser');
 assert.equal(WEAPONS.boomerang.kind,'boomerang');
 assert.equal(WEAPONS.sword.kind,'sword');
 assert.deepEqual(TREASURE_WEAPONS,['laser','boomerang','sword']);
 assert.deepEqual(BOSS_WEAPONS,['rifle','shotgun',null]);
});
test('three individually themed bosses have exactly quadrupled HP',()=>{
 assert.deepEqual(FLOOR_BOSSES,['boss_fire','boss_arcane','boss']);
 assert.deepEqual(FLOOR_BOSSES.map(bossHp),[820,1460,2280]);
 for(const type of FLOOR_BOSSES){
   assert(isBoss(type));assert(BOSS_DATA[type].name);
   assert(BOSS_DATA[type].shootRate>1);
 }
 assert(!isBoss('slime'));
 assert.throws(()=>bossHp('does_not_exist'),/Unknown boss/);
});
test('laser line collision honors angle, enemy radius, forward distance',()=>{
 assert(hitRayPoint(10,10,0,180,100,12,7).hit);
 assert(!hitRayPoint(10,10,0,180,100,30,7).hit);
 assert(!hitRayPoint(10,10,0,70,100,12,7).hit);
 assert(!hitRayPoint(10,10,0,180,-70,12,7).hit);
 assert(hitRayPoint(10,10,Math.PI/2,120,10,88,7).hit);
});
test('random relic draft has three unique offers and excludes owned relics',()=>{
 const options=draftRelics(['heart','shield','dash'],()=>.117,3);
 assert.equal(options.length,3);
 assert.equal(new Set(options.map(x=>x.id)).size,3);
 assert(!options.some(x=>['heart','shield','dash'].includes(x.id)));
 const second=draftRelics(['heart'],()=>.887,3);
 assert.notDeepEqual(options.map(x=>x.id),second.map(x=>x.id));
});
test('all 12 relics persist one-time and produce a real stat upgrade',()=>{
 assert(RELICS.length>=10);
 for(const relic of RELICS){
   const p=hero(),prev=JSON.stringify(p);
   assert.equal(applyRelic(p,relic.id),true,relic.id);
   assert.equal(p.relics.length,1);
   assert.notEqual(JSON.stringify(p),prev,relic.id);
   assert.equal(applyRelic(p,relic.id),false);
   assert.equal(p.relics.length,1);
 }
});
test('specific combat and resource bonuses scale in the expected direction',()=>{
 const p=hero();
 applyRelic(p,'heart');assert.equal(p.maxHp,135);assert.equal(p.hp,103);
 applyRelic(p,'shield');assert.equal(p.maxShield,70);assert.equal(p.shield,46);
 applyRelic(p,'power');assert(p.power>1.2);
 applyRelic(p,'speed');assert(p.speed>250);
 applyRelic(p,'haste');assert(p.attackSpeed>1);
 applyRelic(p,'blade');assert(p.bladePower>1);
 applyRelic(p,'regen');assert.equal(p.shieldRegen,3);
 applyRelic(p,'magnet');assert.equal(p.magnet,75);
 applyRelic(p,'dash');assert(p.dashFactor<1);
 applyRelic(p,'focus');assert(p.skillFactor<1);
 applyRelic(p,'vampire');assert.equal(p.vampireHeal,4);
 applyRelic(p,'pierce');assert(p.projectilePower>1);
});
