'use strict';
/* Optional state-only expansion. Load before or after engine.js (dependencies are
 * read at call time). Root must call mutations/hooks inside A.run, after successful
 * engine transactions; this module has no DOM, persistence, timers or NPC rolls.
 *
 * Public API: prepare(s)->s; valid(s)->boolean; daily(s)->{ok,message};
 * stories(s)->Card[]; chooseStory(s,id,choiceId)->Result;
 * onVisit(s,current), onBought(s,current,stockLot), onSale(s,removedLot,buyerIndex),
 * observeCoffee(s,index,topic)->Result. Coffee observes an already paid tea/coffee
 * night action. Topics: story (any arc), shelter, memory, work, books.
 * auction(s)->AuctionView|null; inspectAuction(s,lotId), bid(s,lotId,max)->Result.
 * Views are detached allowlists. Save data, including auction.hidden, is private
 * game state, never a UI/model-context payload. IDs in choices are stage-specific.
 */
(function(G){
const MAX=999999999, clone=x=>JSON.parse(JSON.stringify(x));
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const int=x=>Number.isSafeInteger(x)&&x>=0;
const chars=()=>G.PAWN_CHARACTERS||[], items=()=>G.PAWN_ITEMS||[];
const item=id=>items().find(x=>x.id===id);
const engine=()=>G.PawnEngine;
const fail=message=>({ok:false,message});
const ARC_DEFS=[
 {id:'mocha-clock',character:0,title:'골목의 밥시간',category:'clock',topic:'shelter',
  intro:'모카는 겨울 집세를 마련할 시계와 골목 고양이들의 밥시간을 지킬 시계 사이에서 망설인다냥.',
  revisit:'다시 온 모카가 골목 급식 시간을 적은 종이를 펼쳤다. 시계가 있으면 배고픈 친구들이 같은 시간에 모일 수 있지만, 그 시계를 팔면 겨울 상자집을 마련할 수 있다냥.',
  finale:'세 번째 만남을 기다리며 모카가 두 자리를 남겨 두었다. 골목의 밥상 옆, 그리고 겨울 집세 장부 옆이다. 시계 한 점으로 두 자리를 모두 채울 수는 없다.',
  paths:[['shelter','골목에 줄 시계를 찾기',1],['trade','겨울 집세를 위한 거래 준비',0]],
  plan:'골목에 남길지, 집세로 바꿀지 결정할 시계 한 점을 골랐다. 예약하면 판매 기회를 미루게 됩니다.'},
 {id:'yuri-bell',character:2,title:'돌아갈 집의 종소리',category:'relic',topic:'memory',
  intro:'유리는 현관 종소리는 기억하지만 집의 주소는 잊었다. 유물을 돌려받을지, 가게에 기억의 자리를 남길지 함께 생각해 달라고 한다.',
  revisit:'두 번째 만남에서 유리는 종이 울리던 현관에 두 사람의 신발이 있었다고 떠올렸다. 값을 더 받을 수 있는 물건도 누군가에게는 돌아갈 집의 단서일 수 있다.',
  finale:'유리는 기억을 모두 되찾기보다 남은 기억을 어디에 둘지 고르고 싶어 한다. 물건을 돌려주면 가게는 원가를 돌려받지 못하고, 보관하면 유리는 여기로 찾아와야 한다.',
  paths:[['home','집의 기억을 돌려주기',1],['museum','가게에 기억의 자리 만들기',0]],
  plan:'유리에게 매입한 유물은 이 이야기의 물건으로 기록됩니다. 다른 진품 유물을 직접 골라도 됩니다. 매입한 가격과 감정 결과는 바뀌지 않습니다.'},
 {id:'gear-order',character:18,title:'다시 울릴 시계탑',category:'tool',topic:'work',
  intro:'기어는 동네 시계탑을 고칠 도구가 필요하다. 공공 수리에 보탤지, 충분한 공임을 받는 주문을 맡을지 묻는다.',
  revisit:'기어가 다시 와서 시계탑의 멈춘 톱니 도면을 보여 준다. 낮은 예산을 받으면 동네가 먼저 고쳐지고, 정식 주문으로 받으면 충분한 공임을 마련한 뒤 작업한다.',
  finale:'기어는 준비한 도구를 인도받을 날을 기다린다. 좋은 도구를 예약해 두는 동안 다른 판매 기회는 미뤄진다. 마지막 결정에서 도구와 정확한 인도 대금을 함께 확인한다.',
  paths:[['civic','동네 수리의 낮은 예산에 맞추기',1],['commission','공임을 포함한 정식 주문 준비',0]],
  plan:'보존 상태가 좋은 진품 도구가 필요합니다. 확정일에서 7일 뒤까지의 제안이며, 기한을 넘기면 예약만 풀리고 제시액이 낮아집니다. 벌금은 없습니다.'},
 {id:'seoga-book',character:20,title:'마지막 대출자의 이름',category:'book',topic:'books',
  intro:'서가는 마지막 대출자를 기억하는 책을 찾는다. 더 많은 독자에게 건넬지, 책을 온전히 보존할 수집가에게 넘길지 고민한다.',
  revisit:'서가가 다시 와서 대출카드의 마지막 빈칸을 보여 준다. 여러 사람이 읽으면 책은 조금씩 닳고, 개인 서가에서 보존하면 새 독자의 이름을 적기 어렵다.',
  finale:'서가는 새 독자 명단과 보존 수집가의 제안을 나란히 놓았다. 기증하면 가게는 원가를 포기하고, 양도하면 보존 비용을 댈 수 있지만 동네 대출 목록에서는 빠진다.',
  paths:[['readers','동네 독자에게 책 건네기',1],['collector','보존할 수집가와 거래 준비',0]],
  plan:'서가의 책은 읽는 사람에게 보내면 수입을 포기하고, 수집가에게 보내면 더 높은 값을 받습니다. 어느 쪽에도 강제 비용은 없습니다.'}
];
const def=id=>ARC_DEFS.find(d=>d.id===id);
const forCharacter=i=>ARC_DEFS.find(d=>d.character===i);
const relation=(s,i)=>engine()?.relationship(s,i)??(s.relationships?.[i]||0);
const eligible=(s,d)=>s.day>=2&&(s.met?.[d.character]||0)>=1&&relation(s,d.character)>=0;
function prepare(s){
 if(s.adventures===undefined)s.adventures={version:1,lastDay:0,auctionWeek:-1,arcs:{},auction:null};
 return s;
}
function unlock(s,d){
 if(!eligible(s,d))return null;
 prepare(s);
 return s.adventures.arcs[d.id]||(s.adventures.arcs[d.id]={
  id:d.id,character:d.character,stage:0,status:'active',startedDay:s.day,
  stageDay:0,path:null,deadline:null,late:false,pledged:false,
  visits:[],trades:[],coffee:[],lotUid:null,custody:'none',saleBuyer:null,
  settled:false,outcome:null,history:[]
 });
}
function recordDay(list,day){if(list.includes(day))return false;list.push(day);if(list.length>32)list.shift();return true}
function remember(s,a,text){a.history.push({day:s.day,text});a.history=a.history.slice(-12);log(s,chars()[a.character].name+' · '+text)}
function log(s,text){if(Array.isArray(s.log)){s.log.unshift({day:s.day,text,type:'normal'});s.log=s.log.slice(0,40)}}
function changeRelation(s,index,delta){
 const before=relation(s,index),after=Math.max(-100,Math.min(100,before+delta));
 s.relationships[index]=after;
 if(after>=25&&Array.isArray(s.friendStories)&&!s.friendStories.includes(index))s.friendStories.push(index);
 engine()?.refreshRelationship?.(s);
 return after-before;
}
function activeCurrent(s,o,status){return !!o&&!s.closing&&s.current===o&&o.status===status&&int(o.character)&&o.character<chars().length&&['seller','buyer'].includes(o.kind)}
function onVisit(s,o){
 if(!activeCurrent(s,o,'offered'))return fail('실제로 찾아온 손님만 기록합니다.');
 const d=forCharacter(o.character);if(!d)return fail('이 손님의 연속 이야기는 없습니다.');
 const a=s.adventures?.arcs[d.id]||unlock(s,d);
 if(!a||a.status!=='active')return fail('아직 열리지 않았거나 끝난 이야기입니다.');
 const added=recordDay(a.visits,s.day);
 return {ok:true,repeated:!added,message:added?'직접 만난 날을 기록했습니다.':'오늘의 만남은 이미 기록했습니다.'};
}
function lockedByBuyer(s,lot){return !s.closing&&s.current?.kind==='buyer'&&s.current.status==='offered'&&s.current.stockUid===lot.uid}
function suitable(s,d,lot){return !!lot&&item(lot.itemId)?.category===d.category&&lot.genuine&&
  (d.id!=='gear-order'||lot.condition>=2)&&(!lot.orderId||lot.orderId==='story:'+d.id)&&
  (!lot.storyId||lot.storyId===d.id)&&!lockedByBuyer(s,lot)}
function storyLot(s,a){return s.stock.find(l=>l?.uid===a.lotUid)}
function candidate(s,d,a){return a.lotUid?storyLot(s,a):s.stock.find(l=>suitable(s,d,l))}
function attach(a,lot){a.lotUid=lot.uid;a.custody='held';lot.storyId=a.id}
function onBought(s,o,lot){
 if(!activeCurrent(s,o,'bought')||o.kind!=='seller'||!lot||lot.uid!==o.uid||lot.itemId!==o.itemId||!s.stock.includes(lot))return fail('완료한 실제 매입만 기록합니다.');
 const d=forCharacter(o.character);if(!d)return fail('이 손님의 연속 이야기는 없습니다.');
 const a=s.adventures?.arcs[d.id]||unlock(s,d);
 if(!a||a.status!=='active')return fail('진행 중인 이야기가 없습니다.');
 recordDay(a.visits,s.day);const added=recordDay(a.trades,s.day);
 if(d.id==='yuri-bell'&&a.stage>=1&&!a.lotUid&&suitable(s,d,lot)){
  attach(a,lot);remember(s,a,'매입한 '+item(lot.itemId).name+'을 집의 기억이 담긴 물건으로 기록했습니다. 보관 또는 판매는 직접 결정합니다.');
 }
 return {ok:true,repeated:!added,storyId:a.id,message:'거래를 이야기의 만남 기록에 남겼습니다.'};
}
function onSale(s,lot,buyerIndex){
 if(!lot||s.stock.some(l=>l.uid===lot.uid)||!(buyerIndex===null||int(buyerIndex)&&buyerIndex<chars().length))return fail('판매가 끝난 실제 물건만 기록합니다.');
 let changed=false;
 const a=s.adventures?.arcs[lot.storyId];
 if(a?.status==='active'&&a.lotUid===lot.uid&&a.custody==='held'){
  a.custody='sold';a.saleBuyer=buyerIndex;changed=true;
  remember(s,a,'이야기의 물건을 판매했습니다. 추가 청구는 없으며 다음 결정을 할 때 판매 사실을 함께 확인합니다.');
 }
 const d=forCharacter(buyerIndex),b=d&&s.adventures?.arcs[d.id];
 if(b?.status==='active')changed=recordDay(b.trades,s.day)||changed;
 return {ok:true,repeated:!changed,message:changed?'판매 사실을 기록했습니다. 추가 비용은 없습니다.':'추가로 기록할 판매 사실이 없습니다.'};
}
function observeCoffee(s,index,topic){
 const d=forCharacter(index),n=s.night;
 if(!d||!['story',d.topic].includes(topic)||!s.closing||n?.day!==s.day||
  !n.done?.some(k=>k==='tea:'+index||k==='coffee:'+index||k==='coffee:'+index+':'+topic))return fail('차나 커피를 실제로 마친 뒤 이야기 주제를 기록할 수 있습니다.');
 const a=s.adventures?.arcs[d.id]||unlock(s,d);
 if(!a||a.status!=='active')return fail('진행 중인 이야기가 없습니다.');
 const added=recordDay(a.coffee,s.day);
 return {ok:true,repeated:!added,message:added?'함께 나눈 이야기의 날을 기록했습니다.':'오늘 나눈 이야기는 이미 기록했습니다.'};
}
function waiting(s,a){
 if(!a.visits.length)return '영업 중 이 손님을 실제로 다시 만나야 시작할 수 있습니다.';
 if(a.stage===0)return '';
 if(s.day<=a.stageDay)return '다음 날 이후 실제 재방문이 필요합니다. 오늘 연속으로 다음 장을 넘길 수 없습니다.';
 if(a.visits.length<a.stage+1||!a.visits.some(day=>day>a.stageDay))return '이전 결정 뒤 다른 날의 실제 재방문이 필요합니다. 커피만으로 방문을 대신할 수 없습니다.';
 if(a.stage===2&&![...a.trades,...a.coffee].some(day=>day>a.stageDay))return '예약 뒤 다른 날에 이 손님과 실제 거래 또는 이야기 주제의 차·커피를 한 번 나눠야 합니다.';
 return '';
}
function choice(s,a,id,label,opts={}){
 const delta=opts.relationship||0,actual=Math.max(-100,Math.min(100,relation(s,a.character)+delta))-relation(s,a.character);
 return {id,label,cost:0,reward:0,relationship:actual,consumesItem:false,enabled:true,reason:'',effects:'',...opts,relationship:actual};
}
function finalChoices(s,d,a,lot){
 if(!lot)return [choice(s,a,'finish-account','판매한 사실을 이야기하고 마무리',{
  relationship:a.pledged?-3:0,effects:'물건과 수입은 다시 지급하지 않습니다. '+(a.pledged?'약속을 바꾼 일을 설명하며 호감도 -3.':'추가 비용이나 호감도 손실이 없습니다.')})];
 const sell=(id,label,factor,delta)=>choice(s,a,id,label,{reward:Math.round(lot.value*factor),relationship:delta,consumesItem:true,effects:'이 물건을 인도하고 '+Math.round(lot.value*factor)+'G를 받습니다. 원가 '+lot.paid+'G를 판매 손익에 반영합니다.'});
 const give=(id,label,delta)=>choice(s,a,id,label,{relationship:delta,consumesItem:true,effects:'이 물건을 무상으로 건넵니다. 원가 '+lot.paid+'G는 손실로 기록됩니다. 현금 청구는 없습니다.'});
 const keep=choice(s,a,'finish-keep','물건을 가게에 남기고 예약 풀기',{relationship:1,effects:'물건을 보관하며 예약을 풉니다. 수입과 비용은 없습니다. 호감도 +1.'});
 if(d.id==='mocha-clock')return [a.path==='shelter'?give('finish-give','골목의 밥시간을 위한 시계 기증',10):sell('finish-deliver','집세 마련을 위한 정식 거래',1.08,3),keep];
 if(d.id==='yuri-bell')return a.path==='home'?[give('finish-return','유리에게 집의 기억을 돌려주기',12),keep]:[
  choice(s,a,'finish-exhibit','가게에 기억의 자리를 남기기',{relationship:6,effects:'물건은 보관하고 예약을 풉니다. 무료 도록 등록이나 판매 수입은 발생하지 않습니다. 호감도 +6.'}),
  sell('finish-collector','기억을 기록하고 수집가에게 양도',1.25,0)];
 if(d.id==='gear-order')return [sell('finish-deliver',a.late?'낮아진 제시액으로 다시 합의':'시계탑 수리 주문 인도',a.path==='civic'?(a.late?.65:.85):(a.late?.95:1.25),a.path==='civic'?9:3),keep];
 return a.path==='readers'?[give('finish-library','동네 도서관에 책 기증',10),keep]:[
  sell('finish-collector','보존 수집가에게 책 양도',1.4,1),give('finish-library','수입 대신 독자에게 책 기증',8)];
}
function card(s,d,a){
 const wait=waiting(s,a),lot=candidate(s,d,a);
 let choices;
 if(a.stage===0)choices=d.paths.map(([path,label,delta])=>choice(s,a,'start-'+path,label,{relationship:delta,effects:'방향을 기록합니다. 물건이나 돈은 자동으로 이동하지 않습니다. 다른 날의 재방문이 필요합니다.'}));
 else if(a.stage===1)choices=[
  choice(s,a,'plan-reserve','이 물건을 예약해 두기',{effects:'판매 가격표를 내리고 예약 물건을 다른 손님에게 팔지 않습니다. 물건은 보관함 한 칸을 차지합니다.'}),
  choice(s,a,'plan-open','판매 가능 상태로 이야기를 이어가기',{effects:'물건은 계속 판매할 수 있습니다. 팔면 돌려주거나 다시 인도할 수 없고 추가 보상도 없습니다.'})
 ];
 else choices=finalChoices(s,d,a,lot);
 const missing=a.stage===1&&!lot&&a.custody!=='sold';
 const bad=lot&&!suitable(s,d,lot);
 for(const c of choices){
  const reason=wait||(missing?'다른 거래로 진품 '+(engine()?.CATEGORIES[d.category]||d.category)+(d.id==='gear-order'?' · 좋은 상태 이상':'')+' 한 점을 먼저 확보하세요.':bad?'현재 협상 중이거나 다른 예약에 속한 물건입니다.':a.stage===1&&c.id==='plan-reserve'&&!lot?'이미 판매한 물건은 예약할 수 없습니다.':'');
  c.enabled=!reason;c.reason=reason;
  if(a.stage===1&&d.id==='gear-order')c.effects+=' 제안 기한은 '+(s.day+7)+'일입니다. 기한이 지나면 예약이 풀리고 수령액이 낮아지며 벌금은 없습니다.';
  c.effects+=' 실제 호감도 변화 '+(c.relationship>=0?'+':'')+c.relationship+'.';
 }
 const narrative=a.stage===0?d.intro:a.stage===1?(wait?d.intro:d.revisit):
  (wait?'물건의 보관·판매 기록과 이전 결정을 남겨 두었습니다. 다음 실제 만남과 거래·커피가 이어지면 마지막 결정을 할 수 있습니다.':d.finale);
 let text='직접 만난 '+chars()[d.character].name+'의 이야기입니다. '+narrative+' '+(a.stage>0?d.plan+' ':'');
 if(lot)text+='대상: '+item(lot.itemId).name+' · 매입 원가 '+lot.paid+'G. ';
 if(a.custody==='sold')text+='대상 물건은 이미 판매했습니다. 추가 비용이나 자동 보상은 없습니다. ';
 if(a.deadline!==null)text+='제안 기한 '+a.deadline+'일. '+(a.late?'기한을 지나 예약이 풀렸고 제시액이 낮아졌습니다. 벌금은 없습니다. ':'');
 const available=choices.some(c=>c.enabled);
 return {id:a.id,character:a.character,title:d.title,text,stage:a.stage,
  available,waiting:available?'':wait||choices.find(c=>!c.enabled)?.reason||'',
  deadline:a.deadline,late:a.late,custody:a.custody,lotUid:a.lotUid,coffeeTopic:d.topic,choices};
}
function stories(s){return ARC_DEFS.flatMap(d=>{const a=s.adventures?.arcs[d.id];return a?.status==='active'?[card(s,d,a)]:[]})}
function activity(s,kind){
 if(G.PawnEvolution?.activity)G.PawnEvolution.activity(s,kind);
 else if(s.dayActivity)s.dayActivity[kind]=Math.min(kind==='night'?2:32,(s.dayActivity[kind]||0)+1);
}
function release(s,a){const lot=storyLot(s,a);if(lot?.orderId==='story:'+a.id)delete lot.orderId}
function chooseStory(s,id,choiceId){
 const d=def(id),a=s.adventures?.arcs[id];
 if(!d||!a||a.status!=='active'||a.settled)return fail('진행 중인 이야기가 없습니다.');
 const c=card(s,d,a).choices.find(x=>x.id===choiceId);
 if(!c||!c.enabled)return fail(c?.reason||'지금 고를 수 없는 결정입니다.');
 const lot=candidate(s,d,a);
 if(a.stage===0){a.path=choiceId.slice(6);a.stage=1;}
 else if(a.stage===1){
  if(lot&&!a.lotUid)attach(a,lot);
  a.pledged=choiceId==='plan-reserve';
  if(a.pledged){lot.orderId='story:'+a.id;lot.displayAt=null;delete lot.displayPrice;}
  if(d.id==='gear-order')a.deadline=s.day+7;
  a.stage=2;
 }else{
  // Mark settlement before bookkeeping; callbacks and repeated UI clicks cannot pay twice.
  a.stage=3;a.status='complete';a.settled=true;a.outcome=choiceId;release(s,a);
  if(c.consumesItem){
   s.stock.splice(s.stock.indexOf(lot),1);s.coins+=c.reward;
   s.profit+=c.reward-lot.paid;s.dayProfit+=c.reward-lot.paid;
   if(c.reward>0){s.sold++;s.xp+=8;activity(s,'trades');}
   if(s.current?.uid===lot.uid){s.current.status='sold';s.current.sale=c.reward;}
   a.custody=c.reward>0?'delivered':choiceId==='finish-return'?'returned':'donated';
  }else if(lot)a.custody='kept';
 }
 const delta=changeRelation(s,a.character,c.relationship);a.stageDay=s.day;
 remember(s,a,c.label+' · '+c.effects);
 engine()?.achievements?.(s);
 return {ok:true,message:c.label+' · '+c.effects,storyId:id,stage:a.stage,reward:c.reward,relationship:delta,completed:a.settled};
}
function hash(text){let n=2166136261;for(const ch of text){n^=ch.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
function makeAuction(s,week){
 let seed=hash('pawn-auction:'+s.seed+':'+week);
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const pool=items(),used=new Set(),id='auction-'+(week+1);
 const lots=Array.from({length:3},(_,i)=>{
  const options=pool.filter(it=>!used.has(it.id)&&(i!==0||it.base<=180)),available=options.length?options:pool.filter(it=>!used.has(it.id));
  const it=available[Math.floor(rand()*available.length)];used.add(it.id);
  const grade=2+Math.floor(rand()*(i===2?5:3)),claimedGrade=grade,condition=Math.floor(rand()*5),genuine=rand()>=.26;
  const apparent=Math.max(8,Math.round(it.base*engine().GRADES[claimedGrade][2]*engine().CONDITIONS[condition][1]));
  const fakeFactor=.055+rand()*.16;
  const value=Math.max(5,Math.round(genuine?it.base*engine().GRADES[grade][2]*engine().CONDITIONS[condition][1]:apparent*fakeFactor));
  const opening=Math.max(20,Math.round(it.base*(.6+rand()*.8))),step=Math.max(5,Math.round(opening*.1));
  const rivalMax=rand()<.2?0:Math.round(opening*(.8+rand()*2.4));
  return {id:id+'-'+(i+1),itemId:it.id,opening,step,status:'open',inspected:false,traces:[],result:null,
   hidden:{grade,claimedGrade,condition,genuine,apparent,value,rivalMax}};
 });
 return {id,title:'골목의 주간 봉인 경매',day:s.day,week,actionSpent:false,inspections:0,lots};
}
function daily(s){
 prepare(s);const state=s.adventures;
 if(state.lastDay>=s.day)return {ok:true,repeated:true,message:'오늘의 이야기와 경매는 이미 준비했습니다.'};
 state.lastDay=s.day;
 for(const d of ARC_DEFS){
  const a=state.arcs[d.id]||unlock(s,d);
  if(a?.status==='active'&&a.deadline!==null&&s.day>a.deadline&&!a.late){
   a.late=true;release(s,a);remember(s,a,'안내한 제안 기한이 지났습니다. 예약을 풀고 제시액을 낮춥니다. 물건과 돈은 그대로이며 벌금은 없습니다.');
  }
 }
 if(s.day>=3){const week=Math.floor((s.day-3)/7);if(state.auctionWeek<week){state.auctionWeek=week;state.auction=makeAuction(s,week);}}
 return {ok:true,message:'이야기의 기다림과 주간 경매를 확인했습니다.'};
}
function auctionOpen(s,a){return !!a&&s.closing&&s.night?.day===s.day&&a.day===s.day}
function revealedLot(l){return {uid:l.uid,itemId:l.itemId,grade:l.grade,claimedGrade:l.claimedGrade,condition:l.condition,
 genuine:l.genuine,value:l.value,apparent:l.apparent,paid:l.paid,displayAt:l.displayAt,sourceCharacter:l.sourceCharacter,auctionId:l.auctionId}}
function auction(s){
 const a=s.adventures?.auction;if(!a)return null;
 const open=auctionOpen(s,a),time=a.actionSpent||s.night?.actions>0;
 return {id:a.id,title:a.title,day:a.day,open,inspectionsLeft:2-a.inspections,
  actionSpent:a.actionSpent,actionCost:a.actionSpent?0:1,
  rules:'마감 뒤에만 참여합니다. 전체 물건에서 무료 조사 2회. 첫 낙찰 때만 밤 시간 1칸을 씁니다. 최대 예산으로 한 번 응찰하며 동률은 경쟁자 우선입니다. 낙찰가는 시작가 또는 경쟁자 최대가+호가 중 큰 값이며 내 최대 예산을 넘지 않습니다. 유찰은 돈과 시간을 쓰지 않고 재응찰은 불가합니다. 낙찰 전 제작 등급·가치·진위는 미확인입니다.',
  lots:a.lots.map(l=>({id:l.id,itemId:l.itemId,title:item(l.itemId).name,opening:l.opening,step:l.step,status:l.status,
   inspected:l.inspected,traces:[...l.traces],canInspect:open&&l.status==='open'&&(l.inspected||a.inspections<2),
   canBid:open&&l.status==='open'&&time&&s.stock.length<engine().capacity(s)&&s.coins>=l.opening,
   result:l.result?(l.result.won?{won:true,cost:l.result.cost,lot:revealedLot(l.result.lot)}:{won:false}):null}))};
}
function inspectAuction(s,lotId){
 const a=s.adventures?.auction,l=a?.lots.find(x=>x.id===lotId);
 if(!auctionOpen(s,a)||!l||l.status!=='open')return fail('오늘 마감 뒤 아직 결론이 나지 않은 경매 물건을 살필 수 있습니다.');
 if(l.inspected)return {ok:true,repeated:true,message:'이미 확인한 실제 흔적입니다.',traces:[...l.traces]};
 if(a.inspections>=2)return fail('이번 경매의 무료 조사 2회를 모두 썼습니다.');
 const it=item(l.itemId),catalog=G.PAWN_ITEM_APPRAISALS?.[it.id]||G.PAWN_APPRAISAL_CATALOG?.[it.category],h=l.hidden;
 l.traces=[catalog?.authenticity?.[h.genuine?'observedGenuine':'observedReplica']||
  (h.genuine?it.clue:'표면의 특징이 안쪽으로 이어지지 않고 서로 다른 재료의 경계가 보인다.'),
  catalog?.condition?.observations[h.condition<=1?0:h.condition<=3?1:2]||engine().CONDITIONS[h.condition][0]];
 l.inspected=true;a.inspections++;
 return {ok:true,message:'이 물건에서 직접 확인한 흔적만 기록했습니다.',traces:[...l.traces]};
}
function bid(s,lotId,amount){
 const a=s.adventures?.auction,l=a?.lots.find(x=>x.id===lotId);
 if(!auctionOpen(s,a)||!l||l.status!=='open')return fail('오늘 마감 뒤 미결 경매 물건에 한 번 응찰할 수 있습니다.');
 if(!Number.isSafeInteger(amount)||amount<l.opening||amount>MAX)return fail('시작가 이상 999,999,999G 이하의 정수로 최대 예산을 정하세요.');
 if(s.coins<amount)return fail('최대 예산만큼의 소지금이 필요합니다. 돈을 빌리거나 강제로 청구하지 않습니다.');
 if(s.stock.length>=engine().capacity(s))return fail('보관함에 낙찰 물건을 둘 자리가 필요합니다.');
 if(!a.actionSpent&&s.night.actions<1)return fail('첫 낙찰에 쓸 밤 시간 한 칸이 필요합니다.');
 const h=l.hidden;
 if(amount<=h.rivalMax){l.status='lost';l.result={won:false};return {ok:true,won:false,message:'경쟁자의 최대 예산을 넘지 못했습니다. 돈과 밤 시간은 쓰지 않았습니다.'};}
 const cost=Math.min(amount,Math.max(l.opening,h.rivalMax+l.step));
 const lot={uid:'adventure-'+l.id,itemId:l.itemId,grade:h.grade,claimedGrade:h.claimedGrade,condition:h.condition,
  genuine:h.genuine,value:h.value,apparent:h.apparent,paid:cost,displayAt:null,sourceCharacter:0,auctionId:a.id};
 s.coins-=cost;s.stock.push(lot);l.status='won';l.result={won:true,cost,lot:clone(lot)};
 if(!a.actionSpent){
  a.actionSpent=true;s.night.actions--;s.night.done.push('auction:'+a.id);
  s.night.report.push('주간 경매 참여 · 첫 낙찰에 밤 시간 1칸 사용.');activity(s,'night');
 }
 const report=s.night.done.indexOf('auction:'+a.id);
 s.night.report[report]+=' '+item(l.itemId).name+' '+cost+'G 낙찰.';
 s.bought++;s.dayBought++;s.xp+=12+lot.grade*3;
 if(lot.grade>=3)s.rare++;if(lot.grade>=6)s.legend++;
 const prev=s.discovered[lot.itemId];s.discovered[lot.itemId]={grade:Math.max(prev?.grade||0,lot.grade),count:(prev?.count||0)+1,genuine:!!(prev?.genuine||lot.genuine)};
 activity(s,'trades');engine()?.achievements?.(s);
 log(s,'주간 경매 · '+item(l.itemId).name+' 낙찰 −'+cost+'G. 실제 가치 '+lot.value+'G · '+(lot.genuine?'진품':'모조품')+'.');
 return {ok:true,won:true,cost,lot:clone(lot),message:cost+'G에 낙찰했습니다. 실제 제작 등급과 진위가 공개되었습니다.'};
}
function valid(s){
 if(!object(s))return false;
 if(s.adventures===undefined)return true;
 const x=s.adventures;
 if(!int(s.day)||s.day<1||!object(x)||x.version!==1||!int(x.lastDay)||x.lastDay>s.day||!Number.isSafeInteger(x.auctionWeek)||x.auctionWeek< -1||
  x.auctionWeek>Math.floor((s.day-3)/7)||!object(x.arcs)||!Array.isArray(s.stock))return false;
 const days=list=>Array.isArray(list)&&list.length<=32&&list.every((n,i)=>int(n)&&n>=2&&n<=s.day&&(i===0||n>list[i-1]));
 const custody=['none','held','sold','kept','returned','donated','delivered'];
 for(const [id,a] of Object.entries(x.arcs)){
  const d=def(id);
  if(!d||!object(a)||a.id!==id||a.character!==d.character||!int(a.stage)||a.stage>3||!['active','complete'].includes(a.status)||
   !int(a.startedDay)||a.startedDay<2||a.startedDay>s.day||!int(a.stageDay)||a.stageDay>s.day||
   (a.stage===0?a.stageDay!==0:a.stageDay<a.startedDay)||
   !(a.path===null&&a.stage===0||d.paths.some(p=>p[0]===a.path)&&a.stage>0)||
   !(a.deadline===null||d.id==='gear-order'&&int(a.deadline)&&a.deadline>=a.startedDay)||
   typeof a.late!=='boolean'||a.late&&(a.deadline===null||s.day<=a.deadline)||typeof a.pledged!=='boolean'||a.pledged&&a.stage<2||typeof a.settled!=='boolean'||
   a.settled!==(a.stage===3)||a.settled!==(a.status==='complete')||!days(a.visits)||!days(a.trades)||!days(a.coffee)||
   [...a.visits,...a.trades,...a.coffee].some(n=>n<a.startedDay)||a.stage>0&&a.visits.length<Math.min(a.stage,3)||
   !(a.lotUid===null||typeof a.lotUid==='string'&&a.lotUid.length>0&&a.lotUid.length<200)||!custody.includes(a.custody)||
   (a.lotUid===null)!==(a.custody==='none')||a.stage>=2&&a.lotUid===null||!(a.saleBuyer===null||int(a.saleBuyer)&&a.saleBuyer<chars().length)||
   !(a.outcome===null&&!a.settled||a.settled&&typeof a.outcome==='string'&&a.outcome.startsWith('finish-'))||
   !Array.isArray(a.history)||a.history.length>12||a.history.some(h=>!object(h)||!int(h.day)||h.day>s.day||typeof h.text!=='string'||h.text.length>3000))return false;
  if(a.status==='active'&&a.custody==='held'){
   const lot=storyLot(s,a);
   if(!object(lot)||lot.storyId!==id||!lot.genuine||item(lot.itemId)?.category!==d.category||a.pledged&&!a.late&&lot.orderId!=='story:'+id)return false;
  }
 }
 for(const lot of s.stock){
  if(!object(lot))return false;
  if(lot.storyId!==undefined){const a=x.arcs[lot.storyId];if(!a||a.lotUid!==lot.uid||!['held','kept'].includes(a.custody))return false;}
  if(typeof lot.orderId==='string'&&lot.orderId.startsWith('story:')){const a=x.arcs[lot.orderId.slice(6)];if(!a||a.status!=='active'||a.stage!==2||!a.pledged||a.late||a.lotUid!==lot.uid||lot.storyId!==a.id||lot.displayAt!==null||lot.displayPrice!==undefined)return false;}
 }
 const a=x.auction;
 if(a===null)return x.auctionWeek===-1;
 if(!object(a)||!int(a.week)||a.week!==x.auctionWeek||a.id!=='auction-'+(a.week+1)||typeof a.title!=='string'||
  !int(a.day)||a.day<3||a.day>s.day||Math.floor((a.day-3)/7)!==a.week||typeof a.actionSpent!=='boolean'||
  !int(a.inspections)||a.inspections>2||!Array.isArray(a.lots)||a.lots.length!==3)return false;
 let inspected=0,wins=0;
 for(let i=0;i<a.lots.length;i++){
  const l=a.lots[i],h=l?.hidden,it=item(l?.itemId);
  if(!object(l)||l.id!==a.id+'-'+(i+1)||!it||!int(l.opening)||l.opening<1||l.opening>MAX||!int(l.step)||l.step<1||
   !['open','won','lost'].includes(l.status)||typeof l.inspected!=='boolean'||!Array.isArray(l.traces)||
   l.traces.length!==(l.inspected?2:0)||l.traces.some(t=>typeof t!=='string'||t.length>3000)||!object(h)||
   !int(h.grade)||h.grade>=engine().GRADES.length||h.claimedGrade!==h.grade||!int(h.condition)||h.condition>=engine().CONDITIONS.length||
   typeof h.genuine!=='boolean'||!int(h.apparent)||!int(h.value)||h.value<5||!int(h.rivalMax)||h.rivalMax>MAX)return false;
  const apparent=Math.max(8,Math.round(it.base*engine().GRADES[h.grade][2]*engine().CONDITIONS[h.condition][1]));
  if(h.apparent!==apparent||(h.genuine?h.value!==Math.max(5,Math.round(it.base*engine().GRADES[h.grade][2]*engine().CONDITIONS[h.condition][1])):
   h.value<Math.max(5,Math.round(apparent*.055))||h.value>Math.max(5,Math.round(apparent*.215))))return false;
  if(l.inspected)inspected++;
  if(l.status==='open'){if(l.result!==null)return false;}
  else if(l.status==='lost'){if(!object(l.result)||l.result.won!==false||Object.keys(l.result).length!==1)return false;}
  else{
   wins++;const r=l.result,v=r?.lot;
   if(!object(r)||r.won!==true||!int(r.cost)||r.cost<l.opening||r.cost<=h.rivalMax||r.cost>Math.max(l.opening,h.rivalMax+l.step)||
    !object(v)||v.uid!=='adventure-'+l.id||v.itemId!==l.itemId||v.paid!==r.cost||v.sourceCharacter!==0||v.auctionId!==a.id||
    ['grade','claimedGrade','condition','genuine','apparent','value'].some(k=>v[k]!==h[k]))return false;
  }
 }
 if(inspected!==a.inspections||a.actionSpent!==(wins>0))return false;
 if(a.day===s.day&&s.closing){
  const n=s.night,marker='auction:'+a.id;
  if(!n||!int(n.actions)||n.actions>2||!Array.isArray(n.done)||!Array.isArray(n.report)||n.done.length+n.actions!==2||
   n.report.length!==n.done.length||n.done.filter(k=>k===marker).length!==(a.actionSpent?1:0))return false;
 }
 return true;
}
G.PawnAdventures={prepare,valid,daily,stories,chooseStory,onVisit,onBought,onSale,observeCoffee,auction,inspectAuction,bid};
})(globalThis);
