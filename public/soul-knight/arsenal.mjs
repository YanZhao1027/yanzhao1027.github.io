// The game uses original data and render-only assets. Pure mechanics are tested with node:test.
export const WEAPONS=Object.freeze({
  pistol:{name:'游侠短铳',kind:'bullet',damage:20,rate:.24,speed:700,shots:1,spread:.035,color:'#f6d48d',icon:'⌁',hint:'稳定精准'},
  rifle:{name:'星火连发',kind:'bullet',damage:10,rate:.09,speed:870,shots:1,spread:.06,color:'#91e5cf',icon:'⋙',hint:'高速连射'},
  shotgun:{name:'破晓霰弹',kind:'bullet',damage:12,rate:.61,speed:620,shots:6,spread:.3,color:'#f5b08f',icon:'✹',hint:'散射冲击'},
  laser:{name:'棱镜激光炮',kind:'laser',damage:62,rate:.52,speed:0,shots:1,spread:0,color:'#9af4ff',icon:'⟡',hint:'穿透直线上的敌人'},
  boomerang:{name:'回响回旋镖',kind:'boomerang',damage:42,rate:.62,speed:400,shots:1,spread:0,color:'#f4ce84',icon:'◒',hint:'飞出又飞回，可二次命中'},
  sword:{name:'御风飞剑',kind:'sword',damage:54,rate:.4,speed:560,shots:1,spread:0,color:'#bbadff',icon:'⚔',hint:'自动追踪最近的敌人'}
});
export const TREASURE_WEAPONS=['laser','boomerang','sword'];
export const BOSS_WEAPONS=['rifle','shotgun',null];
export const BOSS_DATA=Object.freeze({
  boss_fire:{name:'熔核巨像',baseHp:205,speed:48,r:36,damage:17,color:'#f4a064',shootRate:2.45,hint:'熔岩轮舞 · 环形弹幕'},
  boss_arcane:{name:'霜镜法师',baseHp:365,speed:88,r:29,damage:14,color:'#9be0fa',shootRate:1.85,hint:'幻影瞬移 · 寒霜扇形'},
  boss:{name:'深渊守卫',baseHp:570,speed:69,r:35,damage:19,color:'#e28caa',shootRate:1.52,hint:'深渊齐射 · 呼唤暗影'},
  dragon:{name:'誓约之龙',baseHp:900,speed:48,r:53,damage:21,color:'#c0a4da',
    shootRate:2.25,hint:'龙焰扇击 · 破碎的誓言'}
});
export const FLOOR_BOSSES=['boss_fire','boss_arcane','boss'];
export function bossHp(type){const data=BOSS_DATA[type];if(!data)throw new Error('Unknown boss '+type);return data.baseHp*4;}
export function isBoss(type){return Object.prototype.hasOwnProperty.call(BOSS_DATA,type);}
export function hitRayPoint(ox,oy,angle,length,x,y,r=0){
  const dx=Math.cos(angle),dy=Math.sin(angle);
  const along=Math.max(0,Math.min(length,(x-ox)*dx+(y-oy)*dy));
  const px=ox+dx*along,py=oy+dy*along;
  return {hit:Math.hypot(px-x,py-y)<=r,distance:along,closestX:px,closestY:py};
}
export const RELICS=Object.freeze([
  {id:'heart',name:'生命之种',desc:'最大生命 +35，并回复 35',icon:'♥',color:'#f4a29b'},
  {id:'shield',name:'星辉护符',desc:'最大护盾 +30，并恢复护盾',icon:'◆',color:'#a9dfff'},
  {id:'power',name:'猛攻徽记',desc:'全部伤害 +22%',icon:'✹',color:'#f5c987'},
  {id:'speed',name:'疾风长靴',desc:'移动速度 +16%',icon:'➜',color:'#9ce1b7'},
  {id:'haste',name:'迅捷扳机',desc:'所有武器攻速 +20%',icon:'≫',color:'#d0b7f9'},
  {id:'blade',name:'剑舞纹章',desc:'三段近战伤害 +30%',icon:'⚔',color:'#f8b8ac'},
  {id:'regen',name:'守望水晶',desc:'护盾恢复速度 +3 / 秒',icon:'✧',color:'#99d8f5'},
  {id:'magnet',name:'寻宝磁石',desc:'拾取范围 +75',icon:'◎',color:'#edd29c'},
  {id:'dash',name:'羽翼斗篷',desc:'冲刺冷却缩短 25%',icon:'➤',color:'#a8e6e0'},
  {id:'focus',name:'奥术核心',desc:'范围技能冷却缩短 25%',icon:'✦',color:'#bdb0fa'},
  {id:'vampire',name:'赤月勋章',desc:'每次击杀恢复 4 点生命',icon:'☾',color:'#ed9c9e'},
  {id:'pierce',name:'苍穹透镜',desc:'投射物伤害 +16%',icon:'◇',color:'#aeeaff'}
]);
export function draftRelics(owned=[],rng=Math.random,count=3){
  const seen=new Set(owned);
  let choices=RELICS.filter(it=>!seen.has(it.id));
  if(choices.length<count)choices=[...RELICS];
  choices=choices.slice();
  for(let i=choices.length-1;i>0;i--){
    const j=Math.floor(Math.max(0,Math.min(.999999999,rng()))*(i+1));
    [choices[i],choices[j]]=[choices[j],choices[i]];
  }
  return choices.slice(0,count);
}
export function applyRelic(player,id){
  const item=RELICS.find(it=>it.id===id);
  if(!item)throw new Error('Unknown relic '+id);
  if(!player.relics)player.relics=[];
  if(player.relics.includes(id))return false;
  player.relics.push(id);
  switch(id){
    case 'heart':player.maxHp+=35;player.hp=Math.min(player.maxHp,player.hp+35);break;
    case 'shield':player.maxShield+=30;player.shield=Math.min(player.maxShield,player.shield+30);break;
    case 'power':player.power*=1.22;break;
    case 'speed':player.speed*=1.16;break;
    case 'haste':player.attackSpeed*=1.20;break;
    case 'blade':player.bladePower*=1.30;break;
    case 'regen':player.shieldRegen+=3;break;
    case 'magnet':player.magnet+=75;break;
    case 'dash':player.dashFactor*=.75;break;
    case 'focus':player.skillFactor*=.75;break;
    case 'vampire':player.vampireHeal+=4;break;
    case 'pierce':player.projectilePower*=1.16;break;
  }
  return true;
}
