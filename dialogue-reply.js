/* Replies answer the selected question before offering one remembered detail. */
(function(G){
'use strict';
const TOPICS=['authenticity','quality','condition','function','use'];
function setup(o){
 if(o.kind!=='seller')return;
 if(o.dialogue?.version===1&&o.dialogue.itemId===o.itemId)return;
 o.dialogue={version:1,itemId:o.itemId,answered:{authenticity:false,quality:false,condition:false,function:false,use:false,admittedReplica:false},answers:Object.fromEntries(TOPICS.map(k=>[k,[]]))};
}
function admitted(o){return o.evidenceUsed?.authenticity==='defect'&&o.evidence.axes.authenticity.observedActual&&o.evidence.axes.authenticity.actual===0;}
function available(o,topic){
 setup(o);
 if(topic==='use')return !o.dialogue.answered.use;
 if(topic==='authenticity'&&admitted(o)&&!o.dialogue.answered.admittedReplica)return true;
 return topic!=='condition'&&!o.dialogue.answered[topic]||G.PawnDiscovery.available(o,topic).length>0;
}
function detail(clue){
 if(!clue)return '';
 return String(clue.claim).replace(/^([^:.]+):\s*/,(_,site)=>site+' 쪽은 ');
}
function choose(o,topic,variants){let n=0;for(const ch of o.uid+':'+o.character+':'+topic+':'+o.dialogue.answers[topic].length)n=(Math.imul(n,31)+ch.charCodeAt(0))>>>0;return variants[n%variants.length];}
function answer(o,topic,clue,it,p,cautious){
 setup(o);let text,kind,source=cautious?'reported':'experience';const a=o.evidence.axes[topic==='function'?'condition':topic],tail=detail(clue);
 if(topic==='authenticity'){
  source='belief';
  if(admitted(o)){kind='admitted-replica';source='experience';text='앞서 보여 준 근거를 보고 가품이라는 점을 인정한다.';o.dialogue.answered.admittedReplica=true;}
  else if(cautious){kind='uncertain-authenticity';text=a.claimed?'진품이라고 들었지만, 직접 감정받지 않아 확실히는 모른다.':'가품일 수 있다고 들었지만, 직접 감정받지 않아 확실히는 모른다.';source='reported';}
  else {kind=a.claimed?'believed-genuine':'believed-replica';text=choose(o,topic,a.claimed?['진품으로 알고 가져왔다.','진품이라고 알고 있다.','내가 알기로는 진품이다.']:['가품인 것으로 알고 가져왔다.','진품이 아니라 모조품으로 알고 있다.','내가 알기로는 가품이다.']);}
  if(tail)text+=' '+(cautious?'그렇게 들은 특징은 이렇다. ':'그렇게 알고 있는 이유는 이렇다. ')+tail;
 }else if(topic==='use'){
  const use=G.PawnDialogueData.useFor(it.id);kind='use-instruction';source='catalogue';text='원래 쓰는 방법은 이렇다. '+use.instruction;
 }else if(topic==='quality'&&!o.dialogue.answered.quality){
  kind='intended-feature';source='reported';text='이 물건은 「'+it.effect+'」에 쓰인다고 알려져 있다.';
 }else if(topic==='quality'){
  kind='feature-detail';text=(clue.topic==='authenticity'?'이 물건에서 눈에 띄는 특징은 이렇다. ':'만든 솜씨에서 눈에 띄는 점은 이렇다. ')+tail;
 }else if(topic==='function'){
  const remembered=clue||o.discovery.clues.find(x=>x.topic==='function'),functionTail=detail(remembered);
  const unknown=remembered?.reportedProblem===null||remembered?.reportedProblem===undefined&&/작동시킬|기계 부품|움직일 부품|확인할 수 없다/.test(remembered?.claim||'');
  const problem=remembered?.reportedProblem===true||remembered?.reportedProblem===undefined&&remembered?.adverse&&remembered.claim===remembered.full;
  if(unknown||!remembered){kind='untested-function';source='unverified';text=choose(o,topic,['직접 써 보지는 않아 사용 중 문제가 없는지는 모른다.','사용할 때 제대로 되는지까지는 확인하지 못했다.','겉모습은 살폈지만 실제 사용 중 문제까지는 모른다.']);}
  else {kind=problem?'reported-problem':'reported-working';text=problem?(cautious?'사용 중 문제가 있다고 들었다.':'사용할 때 문제가 있다.'):(cautious?'사용에 큰 문제가 없다고 들었다.':'사용에 큰 문제는 없다.');if(functionTail)text+=' '+functionTail;}
 }else if(topic==='condition'){
  const band=a.claimed;kind=band===0?'reported-damage':band===1?'reported-wear':'reported-intact';
  text=band===0?(cautious?'겉에 손상이나 고친 흔적이 있다고 들었다.':'겉에 손상이나 고친 흔적이 있다.'):band===1?(cautious?'겉에 가벼운 사용 흔적이 있다고 들었다.':'겉에 가벼운 사용 흔적은 있다.'):(cautious?'겉은 손상 없이 보관했다고 들었다.':'겉에 눈에 띄는 손상은 없다.');
  if(tail)text+=' '+tail;
 }
 return {text,kind,source,clueId:clue?.id||null};
}
function record(o,topic,result){o.dialogue.answered[topic]=true;o.dialogue.answers[topic].push({...result});}
function valid(o){const d=o.dialogue;if(o.kind!=='seller'||d===undefined)return true;if(d?.version!==1||d.itemId!==o.itemId||!d.answered||!d.answers)return false;return [...TOPICS,'admittedReplica'].every(k=>typeof d.answered[k]==='boolean')&&TOPICS.every(k=>Array.isArray(d.answers[k])&&d.answers[k].length<=12&&d.answers[k].every(x=>x&&['text','kind','source'].every(f=>typeof x[f]==='string'&&x[f].length<3000)&&(x.clueId===null||typeof x.clueId==='string')));}
G.PawnDialogueReply={setup,available,answer,record,valid};
})(globalThis);
