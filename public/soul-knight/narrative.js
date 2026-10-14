import {STORY_SCENES,readableArchive} from './story.mjs';
import {paintCinematic} from './cinematic.js';

const $=id=>document.getElementById(id);
const ARCHIVE_KEY='little-arcade-forgotten-oath-archive-v1';
function loadArchive(){
  try{
    const value=JSON.parse(localStorage.getItem(ARCHIVE_KEY)||'[]');
    return Array.isArray(value)?new Set(value.filter(id=>Object.hasOwn(STORY_SCENES,id)||id==='truth')):new Set();
  }catch{return new Set();}
}
export function setupNarrative({getMode,setMode,onReturn}){
  const archive=loadArchive();
  let active=null,archivePrevious='menu';
  const story=$('storyOverlay'),journal=$('archiveOverlay');
  function updateCount(){
    $('fragmentCount').textContent=archive.size+'/9';
    $('archiveCount').textContent=archive.size+' / 9';
  }
  function collect(id){
    if(!id||archive.has(id))return;
    archive.add(id);
    try{localStorage.setItem(ARCHIVE_KEY,JSON.stringify([...archive]));}catch{}
    updateCount();
  }
  function renderPanel(){
    if(!active)return;
    const {data,index}=active,panel=data.panels[index];
    $('storyKicker').textContent=data.kicker;
    $('storyTitle').textContent=data.title;
    $('storyStep').textContent=String(index+1).padStart(2,'0')+' / '+String(data.panels.length).padStart(2,'0');
    $('storySpeaker').textContent=panel.speaker;
    $('storyText').textContent=panel.text;
    $('storyNext').innerHTML=index===data.panels.length-1?
      '收起记忆 <span>➜</span>':'继续 <span>➜</span>';
    paintCinematic($('storyCanvas'),panel.art);
  }
  function play(id,onFinish){
    if(!Object.hasOwn(STORY_SCENES,id))throw Error('Unknown story scene: '+id);
    if(active||getMode()==='archive')return false;
    const previous=getMode();setMode('story');
    story.classList.remove('hidden');
    active={id,data:STORY_SCENES[id],index:0,previous,after:onFinish};
    renderPanel();return true;
  }
  function advance(){
    if(!active)return false;
    const task=active;
    if(task.index<task.data.panels.length-1){task.index++;renderPanel();return true;}
    active=null;
    story.classList.add('hidden');setMode(task.previous==='menu'?'menu':'playing');
    if(task.data.fragment)collect(task.data.fragment);
    onReturn?.();
    task.after?.();
    return true;
  }
  function renderArchive(){
    const node=$('archiveItems');node.replaceChildren();
    readableArchive(archive).forEach((entry,index)=>{
      const card=document.createElement('div');
      card.className='archive-item'+(entry.collected?'':' locked');
      const symbol=document.createElement('span');symbol.className='archive-glyph';
      symbol.textContent=entry.collected?'✧':'?';
      const text=document.createElement('div');
      const header=document.createElement('small');
      header.textContent='FRAGMENT '+String(index+1).padStart(2,'0')+(entry.collected?' · RECOVERED':' · UNKNOWN');
      const title=document.createElement('strong');
      title.textContent=entry.collected?entry.title:'尚未找回的记忆';
      text.append(header,title);card.append(symbol,text);node.appendChild(card);
    });
    updateCount();
  }
  function openArchive(){
    if(active||getMode()==='reward'||getMode()==='archive')return false;
    archivePrevious=getMode();setMode('archive');
    journal.classList.remove('hidden');renderArchive();return true;
  }
  function closeArchive(){
    if(getMode()!=='archive')return;
    journal.classList.add('hidden');
    setMode(archivePrevious);onReturn?.();
  }
  $('storyNext').addEventListener('click',advance);
  $('journalBtn').addEventListener('click',()=>getMode()==='archive'?closeArchive():openArchive());
  $('archiveClose').addEventListener('click',closeArchive);
  $('archiveBack').addEventListener('click',closeArchive);
  updateCount();
  return {play,advance,openArchive,closeArchive,collect,has:id=>archive.has(id),
    get collected(){return [...archive];},get activeId(){return active?.id||null;}};
}
