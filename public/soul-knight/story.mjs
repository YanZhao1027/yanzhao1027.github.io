// The prince's memories are intentionally incomplete until after the dragon's death.
export const STORY_TITLE='像素远征：遗忘的誓约';
export const STORY_SCENES=Object.freeze({
  opening:{
    kicker:'PROLOGUE · 被遗忘的人',title:'勇者，醒来。',
    panels:[
      {speaker:'？？？',text:'醒来吧，勇者。王国的光明被一条邪恶的巨龙夺走了。',art:'throne'},
      {speaker:'王的声音',text:'穿过遗忘墓园、沉没王城和龙血禁地。找到它，杀死它。',art:'throne'},
      {speaker:'？？？',text:'我……是谁？为什么我连自己的名字都想不起来？',art:'awakening'},
      {speaker:'王的声音',text:'你不需要名字。记住你的使命。',art:'throne'}
    ]
  },
  memory1:{
    kicker:'MEMORY 01 / 月光下的花园',title:'第一片记忆',
    fragment:'memory1',label:'月光花园 · 银色戒指',
    panels:[
      {speaker:'？？？',text:'闪烁的光芒中，一座洒满月光的花园缓缓浮现。',art:'garden'},
      {speaker:'少女',text:'你答应过我，无论发生什么，都不会忘记我。',art:'garden'},
      {speaker:'少年',text:'当然。我会一直认出你。',art:'ring'},
      {speaker:'勇者',text:'……那枚戒指。为什么想起它时，心会这么痛？',art:'awakening'}
    ]
  },
  event1:{
    kicker:'LOST NOTE / 墓志铭',title:'风中墓志',
    fragment:'event1',label:'一块被刮去名字的墓碑',
    panels:[
      {speaker:'无名墓志',text:'碑上的名字全被凿去了。唯有一句残存：『她从未背叛自己的誓言。』',art:'grave'},
      {speaker:'勇者',text:'“她”是谁？这座墓园埋葬的又是谁的秘密？',art:'grave'}
    ]
  },
  memory2:{
    kicker:'MEMORY 02 / 封存的王室密档',title:'被篡改的历史',
    fragment:'memory2',label:'王室密档 · 龙血仪式',
    panels:[
      {speaker:'王室档案',text:'王历七百三十一年，奉国王之命，举行龙血仪式。',art:'archive'},
      {speaker:'王室档案',text:'祭品身份——封存。参与者的记忆必须清除。',art:'archive'},
      {speaker:'勇者',text:'祭品？为什么档案里有我佩戴过的王室徽章？',art:'mirror'},
      {speaker:'王的声音',text:'不要回忆。继续往前。杀死巨龙。',art:'throne'}
    ]
  },
  event2:{
    kicker:'LOST NOTE / 断裂的画框',title:'未完成的肖像',
    fragment:'event2',label:'被撕去半张脸的王室肖像',
    panels:[
      {speaker:'旧日画师的落款',text:'『王子殿下与那位公主的婚礼，本应在春天举行。』',art:'portrait'},
      {speaker:'勇者',text:'为什么这张画里的少年，和我如此相似？',art:'mirror'}
    ]
  },
  memory3:{
    kicker:'MEMORY 03 / 失名之镜',title:'镜中是谁？',
    fragment:'memory3',label:'失名之镜 · 王子的身份',
    panels:[
      {speaker:'镜中的影子',text:'镜面中的不是流浪勇者，而是穿着王室礼服的年轻王子。',art:'mirror'},
      {speaker:'破碎的回声',text:'你不是勇者。你曾拥有一个名字，也曾深深爱过一个人。',art:'mirror'},
      {speaker:'王子',text:'我……是王子？她去了哪里？难道也是被那条龙带走的？',art:'awakening'},
      {speaker:'王的声音',text:'那怪物正在王庭等你。完成你的使命，一切都会结束。',art:'throne'}
    ]
  },
  event3:{
    kicker:'LOST NOTE / 祭司的遗言',title:'被烧毁的仪式记录',
    fragment:'event3',label:'龙血祭坛 · 王命不可违',
    panels:[
      {speaker:'祭司遗言',text:'陛下以爱为锁，以血为钥。仪式从不是为了保护王国。',art:'ritual'},
      {speaker:'祭司遗言',text:'只要那个见证者仍记得真相，王的谎言就永远无法成立。',art:'ritual'}
    ]
  },
  floor1:{
    kicker:'CHAPTER I / 遗忘墓园',title:'通向王城的道路',
    panels:[{speaker:'勇者',text:'墓园的尽头，是一座被水淹没的旧王城。为什么我的脚步会记得这里？',art:'castle'}]
  },
  floor2:{
    kicker:'CHAPTER II / 沉没王城',title:'王的命令',
    panels:[{speaker:'勇者',text:'我一定来过这里。那面碎裂的王室镜子，仿佛在呼唤我的名字。',art:'mirror'}]
  },
  floor3:{
    kicker:'CHAPTER III / 龙血禁地',title:'通往最后的王庭',
    panels:[{speaker:'勇者',text:'那个声音一直催促我去杀死巨龙……可它究竟在害怕我想起什么？',art:'ritual'}]
  },
  beforeDragon:{
    kicker:'FINAL CHAPTER / 龙眠王庭',title:'誓约的尽头',
    panels:[
      {speaker:'王的声音',text:'你已经走得足够远了。它就在前方。杀死巨龙，你便自由了。',art:'throne'},
      {speaker:'王子',text:'它为什么被锁在王座下面？……为什么它看起来如此悲伤？',art:'dragon'}
    ]
  },
  dragonHesitates:{
    kicker:'DRAGON / 迟疑',title:'不愿落下的利爪',
    panels:[
      {speaker:'？？？',text:'……你答应过我的……',art:'garden'},
      {speaker:'王子',text:'这个声音……在哪里听见过？',art:'dragon'},
      {speaker:'王的声音',text:'不要被它欺骗！杀了它！',art:'throne'}
    ]
  },
  dragonSeal:{
    kicker:'DRAGON / 王之诅咒',title:'锁链正在收紧',
    panels:[
      {speaker:'古老的封印',text:'金红色的王印刺入龙的鳞片。三枚诅咒水晶自地面升起。',art:'ritual'},
      {speaker:'王子',text:'它在挣扎……这是国王留下的锁链。只有毁掉水晶，才能让它平息。',art:'dragon'}
    ]
  },
  dragonFallen:{
    kicker:'AFTER THE BATTLE / 寂静',title:'王命已成。',
    panels:[
      {speaker:'王的声音',text:'……很好。你终于完成了使命。',art:'ashes'},
      {speaker:'王子',text:'巨龙没有留下宝藏。地上只有一片灰烬，以及……什么东西？',art:'ashes'}
    ]
  },
  dress:{
    kicker:'EVIDENCE 01 / 破碎的衣裳',title:'浅蓝色的礼服',
    fragment:'dress',label:'巨龙身旁 · 浅蓝色的残破礼服',
    panels:[
      {speaker:'王子',text:'这是……一件被火焰撕碎的浅蓝色礼服。',art:'dress'},
      {speaker:'被遗忘的回忆',text:'月光下，她就是穿着这样的裙子，向我伸出了手。',art:'garden'},
      {speaker:'王子',text:'为什么……为什么它会在巨龙的身边？',art:'dress'}
    ]
  },
  ring:{
    kicker:'EVIDENCE 02 / 指节上的誓约',title:'银色戒指',
    fragment:'ring',label:'巨龙右前爪 · 不成比例的银色戒指',
    panels:[
      {speaker:'王子',text:'它的前爪上，有一枚小得不成比例的戒指。紧紧卡在粗大的指节之间。',art:'dragonRing'},
      {speaker:'王子',text:'这枚戒指的内侧……刻着我亲手写下的誓言。',art:'ring'},
      {speaker:'回忆',text:'「无论发生什么，你都能认出我吗？」',art:'garden'},
      {speaker:'王子',text:'……',art:'dragonRing'}
    ]
  },
  revelation:{
    kicker:'THE TRUTH / 不被允许的记忆',title:'终于想起来了。',
    fragment:'truth',label:'最终真相 · 王的谎言',
    panels:[
      {speaker:'往昔 · 月光花园',text:'王子把银色戒指轻轻戴在公主的无名指上。',art:'ring'},
      {speaker:'公主',text:'「无论我变成什么样子，你都会认出我吗？」',art:'garden'},
      {speaker:'王子',text:'「当然。我会一直认出你。」',art:'garden'},
      {speaker:'往昔 · 王室祭坛',text:'国王为获取龙血的力量，秘密把公主推上了祭坛。',art:'ritual'},
      {speaker:'祭司',text:'仪式失控，公主在烈焰中变成了一条被封印的巨龙。',art:'dragon'},
      {speaker:'往昔 · 王座前',text:'王子试图阻止国王。国王却抹去他的记忆，扭曲他的意志。',art:'throne'},
      {speaker:'国王',text:'「去吧，勇者。替我杀死那条知道真相的龙。」',art:'throne'},
      {speaker:'真相',text:'巨龙从未夺走公主。她就是那条被锁链囚禁的巨龙。',art:'dragonRing'},
      {speaker:'王子',text:'……我认出你了。',art:'ashes'}
    ]
  }
});
export const MAIN_MEMORIES=['memory1','memory2','memory3'];
export const SIDE_MEMORIES=['event1','event2','event3'];
export function memoryForRoom(floor,kind){
  if(kind==='memory')return MAIN_MEMORIES[floor-1];
  if(kind==='event')return SIDE_MEMORIES[floor-1];
  return null;
}
export function readableArchive(collected=[]){
  const owned=new Set(collected);
  const list=[...MAIN_MEMORIES,...SIDE_MEMORIES,'dress','ring','truth'];
  return list.map(id=>({id,title:(STORY_SCENES[id]||STORY_SCENES.revelation).label||(STORY_SCENES[id]||STORY_SCENES.revelation).title,
    collected:owned.has(id),final:['dress','ring','truth'].includes(id)}));
}
