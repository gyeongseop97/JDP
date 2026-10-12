/* Optional, DOM-free social layer. Load conversation-data.js before use.
 * Root owns tea payment (+6 affinity), E.refreshRelationship and adventure hooks.
 * startCoffee/choose expose conversation: view(s); view never returns live state.
 */
(function(G){
'use strict';
const LIMIT=3, CAP=3, MAX=1000000;
const RESPONSES={listen:'조용히 끝까지 듣는다',empathize:'그 마음에 공감한다',ask:'조금 더 물어본다',light:'편한 이야기로 돌린다',joke:'가볍게 농담한다'};
const copy=x=>JSON.parse(JSON.stringify(x));
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const integer=x=>Number.isSafeInteger(x)&&x>=0&&x<=MAX;
const text=x=>typeof x==='string'&&x.length>0&&x.length<=2000;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const data=i=>G.PawnConversationData?.people?.[i];
const indexOK=i=>Number.isInteger(i)&&i>=0&&!!data(i)&&!!G.PAWN_CHARACTERS?.[i];
const relation=(s,i)=>G.PawnEngine.relationship(s,i);
const band=n=>n<0?'cold':n<25?'neutral':n<60?'warm':'trusted';
const topic=(i,id)=>data(i)?.topics.find(t=>t.id===id);
const visit=s=>[s.day,s.turn,s.visitor].join(':');
const coffeeContext=(s,i)=>indexOK(i)&&s.closing===true&&s.night?.day===s.day&&Array.isArray(s.night.done)&&s.night.done.includes('tea:'+i)&&s.met?.[i]>0;
const live=(s,a)=>!!a&&a.day===s.day&&coffeeContext(s,a.character);
const tradeContext=s=>s.closing===false&&s.current?.status==='offered'&&['seller','buyer'].includes(s.current.kind)&&indexOK(s.current.character);
function prepare(s){if(record(s)&&s.social===undefined)s.social={version:1,people:{},active:null};return s}
function person(s,i){const people=s.social.people;if(!own(people,String(i)))people[i]={coffeeDay:0,visits:0,topics:{},variants:{},casual:null};return people[i]}
function hash(value){let h=2166136261;for(const ch of value){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function variant(p,key,lines){const n=p.variants[key]||0;p.variants[key]=(n+1)%MAX;return lines[(hash(key)+n)%lines.length]}
function valid(s){
 if(!record(s))return false;if(s.social===undefined)return true;
 const v=s.social;if(!record(v)||v.version!==1||!record(v.people)||!(v.active===null||record(v.active)))return false;
 for(const [key,p] of Object.entries(v.people)){
  const i=Number(key);if(String(i)!==key||!indexOK(i)||!record(p)||!integer(p.coffeeDay)||!integer(p.visits)||!record(p.topics)||!record(p.variants)||!(p.casual===null||record(p.casual)))return false;
  for(const [id,m] of Object.entries(p.topics))if(!topic(i,id)||!record(m)||!integer(m.count)||m.count<1||!integer(m.day)||m.day<1||!['cold','neutral','warm','trusted'].includes(m.band)||!(m.response===null||own(RESPONSES,m.response)))return false;
  const keys=['opening:cold','opening:neutral','opening:warm','opening:trusted','ending','casual:daily','casual:interest'];for(const t of data(i).topics)keys.push(t.id+':low',t.id+':high');
  if(Object.entries(p.variants).some(([k,n])=>!keys.includes(k)||!integer(n)))return false;
  if(p.casual&&(!/^\d+:\d+:\d+$/.test(p.casual.visit)||!['daily','interest'].includes(p.casual.id)||!text(p.casual.message)))return false;
 }
 const a=v.active;if(a===null)return true;
 if(a.context!=='coffee'||!indexOK(a.character)||!integer(a.day)||a.day<1||!integer(a.exchanges)||a.exchanges>LIMIT||!Array.isArray(a.usedTopics)||a.usedTopics.length!==a.exchanges||new Set(a.usedTopics).size!==a.usedTopics.length||a.usedTopics.some(id=>!topic(a.character,id))||!Number.isInteger(a.relationDelta)||Math.abs(a.relationDelta)>CAP||!['topics','response','followup','done'].includes(a.phase)||!text(a.message)||!Array.isArray(a.history)||a.history.length>24)return false;
 const p=own(v.people,String(a.character))?v.people[a.character]:null;
 if(!p||p.coffeeDay!==a.day||!a.usedTopics.every(id=>p.topics[id]?.day===a.day))return false;
 if(a.phase==='topics'&&(a.topicId!==null||a.exchanges>=LIMIT))return false;
 if(a.phase==='done'&&(a.exchanges!==LIMIT||a.topicId!==null))return false;
 if(['response','followup'].includes(a.phase)&&(!topic(a.character,a.topicId)||a.usedTopics.at(-1)!==a.topicId))return false;
 if(a.phase==='response'&&p.topics[a.topicId].response!==null||a.phase==='followup'&&p.topics[a.topicId].response!=='ask')return false;
 if(a.history.some(h=>!record(h)||!['player','customer'].includes(h.speaker)||!text(h.text)||(h.topicId!==undefined&&!topic(a.character,h.topicId))||(h.responseId!==undefined&&!own(RESPONSES,h.responseId))))return false;
 return true;
}
function usable(s){return record(s)&&!!G.PawnEngine&&valid(s)}
function fail(message){return{ok:false,message}}
function topics(s,i,context='coffee'){
 if(!usable(s)||!indexOK(i))return[];
 if(context==='trade')return tradeContext(s)&&s.current.character===i?casualOptions(s):[];
 if(context!=='coffee'||!live(s,s.social?.active)||s.social.active.character!==i)return[];
 const a=s.social.active,n=relation(s,i);
 return data(i).topics.map(t=>{
  if(n<t.gate)return{id:t.id,label:'아직 꺼내기 어려운 이야기',locked:true,hint:t.gate===0?'조금 편안해지면 이야기할 수 있어요.':t.gate===25?'서로 가까워질 시간이 필요해요.':'깊은 신뢰가 쌓이면 이야기할 수 있어요.'};
  const used=a.usedTopics.includes(t.id),busy=['response','followup'].includes(a.phase),full=a.exchanges>=LIMIT;
  return{id:t.id,label:t.label,locked:used||busy||full,hint:used?'오늘 이미 나눈 이야기예요.':busy?'지금 이야기에 먼저 답해 주세요.':full?'오늘 이야기는 여기까지예요.':t.hint};
 });
}
function view(s){
 if(!usable(s)||!live(s,s.social?.active))return null;
 const a=s.social.active,ids=a.phase==='response'?Object.keys(RESPONSES):a.phase==='followup'?['listen','light']:[];
 return{ok:true,context:'coffee',character:a.character,day:a.day,exchanges:a.exchanges,remaining:LIMIT-a.exchanges,topicId:a.topicId,phase:a.phase,message:a.message,done:a.phase==='done',topics:topics(s,a.character),responses:ids.map(id=>({id,label:RESPONSES[id]})),history:copy(a.history)};
}
function success(s,message,extra={}){const conversation=view(s);return{...conversation,ok:true,message:message??conversation.message,...extra,conversation}}
function startCoffee(s,i){
 if(!usable(s)||!coffeeContext(s,i))return fail('마감 후 커피 활동을 먼저 마쳐 주세요.');
 const old=s.social?.active;if(live(s,old))return old.character===i?success(s):fail('지금 함께 앉은 손님과 먼저 인사를 마쳐 주세요.');
 const previous=s.social?.people?.[i];if(previous?.coffeeDay>=s.day)return fail('이 손님과는 오늘 커피를 마셨어요. 다음 밤에 이어 이야기해요.');
 prepare(s);const p=person(s,i);p.coffeeDay=s.day;p.visits=Math.min(MAX,p.visits+1);
 const opening=variant(p,'opening:'+band(relation(s,i)),data(i).opening[band(relation(s,i))]);
 s.social.active={context:'coffee',character:i,day:s.day,exchanges:0,usedTopics:[],topicId:null,phase:'topics',message:opening,history:[{speaker:'customer',text:opening}],relationDelta:0};
 G.PawnLiving?.onCoffee(s,i);return success(s);
}
function append(a,speaker,message,details={}){a.history.push({speaker,text:message,...details});a.message=message}
function change(s,a,delta){
 const before=relation(s,a.character),nextDelta=Math.max(-CAP,Math.min(CAP,a.relationDelta+delta)),after=Math.max(-100,Math.min(100,before+nextDelta-a.relationDelta));
 s.relationships[a.character]=after;a.relationDelta+=after-before;
 if(after>=25&&Array.isArray(s.friendStories)&&!s.friendStories.includes(a.character))s.friendStories.push(a.character);
 return after-before;
}
function choose(s,id,responseId){
 if(!usable(s)||!live(s,s.social?.active))return fail('지금은 함께 커피를 마시는 중이 아니에요.');
 const a=s.social.active,t=topic(a.character,id);if(!t)return fail('그 이야기는 고를 수 없어요.');
 if(responseId===undefined){
  if(G.PawnLiving&&!G.PawnLiving.canDiscuss(s))return fail('손님이 먼저 꺼낸 이야기에 답하거나 잠시 함께 쉬어 주세요.');
  if(a.phase!=='topics'||topics(s,a.character).find(o=>o.id===id)?.locked)return fail('지금은 그 이야기를 새로 시작할 수 없어요.');
  const p=person(s,a.character),old=p.topics[id],b=band(relation(s,a.character)),key=id+':'+(relation(s,a.character)>=t.depth?'high':'low');
  const message=(G.PawnLiving?.beforeTopic(s,id)||'')+(old?.response&&old.day<s.day?t.recall+' ':'')+variant(p,key,key.endsWith(':high')?t.high:t.low);
  p.topics[id]={count:Math.min(MAX,(old?.count||0)+1),day:s.day,band:b,response:null};a.usedTopics.push(id);a.exchanges++;a.topicId=id;a.phase='response';
  append(a,'player',t.label,{topicId:id});append(a,'customer',message,{topicId:id});return success(s,message,{topicId:id});
 }
 if(!own(RESPONSES,responseId)||a.topicId!==id||!['response','followup'].includes(a.phase)||a.phase==='followup'&&!['listen','light'].includes(responseId))return fail('지금 고를 수 없는 답이에요.');
 const followup=a.phase==='followup',p=person(s,a.character),d=data(a.character),sensitive=t.id==='fear',reply=t.replies[relation(s,a.character)>=t.depth?'high':'low'];
 let message,delta=0;
 if(followup)message=responseId==='listen'?reply.listen:reply.light;
 else if(responseId==='listen'){message=reply.listen;delta=1}
 else if(responseId==='empathize'){message=d.reactions.empathize+' '+reply.listen;delta=1}
 else if(responseId==='ask'){message=reply.ask;delta=relation(s,a.character)<0?-1:0}
 else if(responseId==='light')message=reply.light;
 else{message=(sensitive?d.reactions.boundary:d.reactions.joke)+(sensitive?'':' '+reply.light);delta=sensitive||relation(s,a.character)<0?-1:0}
 append(a,'player',RESPONSES[responseId],{topicId:id,responseId});append(a,'customer',message,{topicId:id,responseId});
 if(!followup)p.topics[id].response=responseId;
 const relationChange=change(s,a,delta);
 if(!followup&&responseId==='ask')a.phase='followup';else{a.topicId=null;a.phase=a.exchanges===LIMIT?'done':'topics'}
 G.PawnLiving?.afterResponse(s,id,followup?'ask':responseId,a.topicId===null);return success(s,message,{topicId:id,responseId,relationChange,completed:a.topicId===null});
}
function finish(s){
 if(!usable(s)||!s.social?.active)return fail('마칠 대화가 없어요.');
 const a=s.social.active,p=person(s,a.character),message=variant(p,'ending',data(a.character).ending);s.social.active=null;G.PawnLiving?.finish(s);return{ok:true,message};
}
function casualOptions(s){
 if(!usable(s)||!tradeContext(s))return[];const i=s.current.character,p=s.social?.people?.[i];
 if(p?.casual?.visit===visit(s))return[];
 return[{id:'daily',label:'오늘 하루는 어땠어요?',locked:false,hint:'잠깐 안부를 나눠요.'},{id:'interest',label:data(i).topics[0].label,locked:relation(s,i)<0,hint:relation(s,i)<0?'지금은 가벼운 안부부터 나눠요.':'평소 좋아하는 이야기를 나눠요.'}];
}
function casualTalk(s,id){
 if(!usable(s)||!tradeContext(s))return fail('지금은 거래 중 잠깐 이야기할 수 없어요.');
 const i=s.current.character,old=s.social?.people?.[i]?.casual;
 if(old?.visit===visit(s))return old.id===id?{ok:true,message:old.message,repeated:true}:fail('이번 방문에서는 이미 안부를 나눴어요.');
 const option=casualOptions(s).find(o=>o.id===id);if(!option||option.locked)return fail('지금은 그 이야기를 나누기 어려워요.');
 prepare(s);const p=person(s,i);let message=variant(p,'casual:'+id,data(i).casual[id]);
 if(id==='interest'&&p.topics.interest?.response&&p.topics.interest.day<s.day)message=data(i).topics[0].recall+' '+message;
 p.casual={visit:visit(s),id,message};return{ok:true,message,repeated:false};
}
function decorate(s,o,key,value){
 // Prefix only: preserve every original fact, number, disclaimer and clue verbatim.
 const group=['sellerOpen','buyerOpen'].includes(key)?'greeting':['counter','offerAccepted','rapport'].includes(key)?'negotiation':null;
 if(!group||!record(s)||!record(o)||!indexOK(o.character)||typeof value!=='string'||!value)return value;
 const lines=data(o.character).decorate[group],n=(hash(o.character+':'+key)+(Number.isSafeInteger(s.turn)?s.turn:0)+(Number.isSafeInteger(s.day)?s.day:0))%lines.length;
 return lines[n]+' '+value;
}
G.PawnConversations=Object.freeze({prepare,valid,topics,startCoffee,choose,finish,casualOptions,casualTalk,decorate,view});
})(globalThis);
