/* Broad questions reveal one detail; observations remain independent evidence. */
(function(G){
'use strict';
const TOPICS={authenticity:'진품의 특징',quality:'이 물건의 특징',condition:'겉의 상태',function:'사용할 때의 상태'};
function fragments(text){
 const raw=String(text||'').trim(),colon=raw.indexOf(': '),prefix=colon>=0?raw.slice(0,colon+2):'',body=prefix?raw.slice(colon+2):raw;
 return (body.match(/[^.!?。]+[.!?。]?/g)||[body]).map(x=>prefix+x.trim()).filter(x=>x.trim());
}
function setup(o,c,it){
 if(o.kind!=='seller')return;
 if(o.discovery?.version===1&&o.discovery.itemId===o.itemId)return;
 const legacy=o.discovery===undefined,clues=[];
 for(const axis of ['authenticity','quality','condition']){
  const a=o.evidence.axes[axis],actual=fragments(a.full),claims=fragments(a.claim),count=actual.length;
  for(let n=0;n<count;n++){
   const id=axis+'-'+n,inspection=n===0||axis!=='condition'?a.tool+'-'+a.site:'detail-'+id;
   clues.push({id,topic:axis,axis,claim:claims[n]||(c.sites[a.site].label+'의 다른 면도 문제 없다고 알고 있다.'),full:actual[n],tool:a.tool,site:a.site,inspection,
    siteLabel:c.sites[a.site].label+(n?' · '+(axis==='condition'?'이음과 안쪽':'다른 면'):'') ,
    heard:legacy&&(o.talked.includes(axis)||o.openingTopic===axis),observed:legacy&&o.inspectionResults[a.tool+'-'+a.site]===a.full});
  }
 }
 for(const extra of G.PawnDiscoveryData.build(o,c,it))clues.push({...extra,inspection:'detail-'+extra.id,heard:false,observed:false});
 // Legacy inspections revealed the whole old observation. Retain exactly that evidence.
 o.discovery={version:1,itemId:o.itemId,clues};
}
function available(o,topic){return o.discovery.clues.filter(x=>(x.topic===topic||topic==='quality'&&x.topic==='authenticity')&&!x.heard&&!x.observed);}
function next(o,topic){const clue=available(o,topic)[0];if(clue)clue.heard=true;return clue;}
function inspect(o,id,clear=true){for(const x of o.discovery?.clues||[])if(x.inspection===id)x.observed=clear;}
function extraOptions(o){return(o.discovery?.clues||[]).filter(x=>x.inspection.startsWith('detail-')).map(x=>({id:x.inspection,label:x.siteLabel,tool:x.tool,hint:x.topic==='function'?'쓰임새와 반응을 관찰':'다른 면과 안쪽을 관찰'}));}
function notebook(o){return Object.entries(TOPICS).map(([topic,title])=>{
 const clues=o.discovery.clues.filter(x=>x.topic===topic),a=o.evidence.axes[topic==='function'?'condition':topic];
 return {key:topic==='function'?'condition':topic,recordKey:topic,title,site:clues[0]?.siteLabel||'',tool:clues[0]?.tool||a.tool,reference:topic==='function'?'사용할 때의 이상은 겉모습과 따로 확인합니다. 손님의 말과 직접 관찰한 반응을 비교하세요.':a.reference,
  claim:o.dialogue?.answers[topic]?.length?o.dialogue.answers[topic].map(x=>x.text).join('\n'):clues.filter(x=>x.heard).map(x=>x.claim).join('\n')||null,
  observation:clues.filter(x=>x.observed).map(x=>x.full).join('\n')||o.inspectionResults[clues[0]?.inspection]||null,
  ids:clues.map(x=>x.inspection),extra:''};
 }).concat({key:'condition',recordKey:'use',title:'사용법',site:'물건의 쓰임새',tool:'lens',reference:'알려진 사용법과 실제 작동 여부는 구분해서 판단합니다.',claim:o.dialogue?.answers.use.map(x=>x.text).join('\n')||null,observation:null,ids:[],extra:''});}
function valid(o){const d=o.discovery;if(o.kind!=='seller'||d===undefined)return true;if(d?.version!==1||d.itemId!==o.itemId||!Array.isArray(d.clues)||d.clues.length>30)return false;const ids=new Set();return d.clues.every(x=>{if(!x||typeof x.id!=='string'||ids.has(x.id))return false;ids.add(x.id);return Object.hasOwn(TOPICS,x.topic)&&['authenticity','quality','condition'].includes(x.axis)&&['lens','light'].includes(x.tool)&&['mark','material','wear'].includes(x.site)&&['claim','full','siteLabel','inspection'].every(k=>typeof x[k]==='string'&&x[k].length<2000)&&typeof x.heard==='boolean'&&typeof x.observed==='boolean';});}
G.PawnDiscovery={setup,available,next,inspect,extraOptions,notebook,valid,fragments};
})(globalThis);
