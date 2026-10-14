// Deterministic five-room dungeon topology used on every floor.
// The treasure branch is optional, but the guardian chamber is required.
export const ROOM_LAYOUT = Object.freeze([
  {id:0,name:'初醒前厅',kind:'combat',x:0,y:1,exits:{right:1}},
  {id:1,name:'回声回廊',kind:'combat',x:1,y:1,exits:{left:0,up:2,right:3}},
  {id:2,name:'秘藏宝室',kind:'treasure',x:1,y:0,exits:{down:1}},
  {id:3,name:'试炼长廊',kind:'combat',x:2,y:1,exits:{left:1,right:4}},
  {id:4,name:'守关祭坛',kind:'guardian',x:3,y:1,exits:{left:3}},
]);
export const DOORS=Object.freeze({
  left:{x:94,y:307,spawnX:183,spawnY:307},
  right:{x:866,y:307,spawnX:785,spawnY:307},
  up:{x:480,y:113,spawnX:480,spawnY:202},
  down:{x:480,y:497,spawnX:480,spawnY:382},
});
export function createRooms(){
  return ROOM_LAYOUT.map(r=>({...r,exits:{...r.exits},visited:false,cleared:false,
    spawned:false,enemies:[],pickups:[],chest:null,portal:null}));
}
export function roomEntryPosition(rooms,fromRoom,toRoom){
  if(fromRoom==null)return{x:480,y:374};
  const target=rooms[toRoom];
  const entrance=Object.keys(target.exits).find(d=>target.exits[d]===fromRoom);
  if(!entrance)throw new Error('Rooms are not connected: '+fromRoom+' -> '+toRoom);
  return{x:DOORS[entrance].spawnX,y:DOORS[entrance].spawnY};
}
export function comboMultiplier(streak){
  return Math.min(2.5,1+Math.floor(Math.max(0,streak)/3)*.25);
}
export function comboRank(streak){
  return streak>=12?'LEGENDARY':streak>=8?'UNSTOPPABLE':streak>=5?'FRENZY':streak>=3?'GREAT':'CHAIN';
}
export function areNeighbors(rooms,a,b){
  return Object.values(rooms[a]?.exits||{}).includes(b);
}
