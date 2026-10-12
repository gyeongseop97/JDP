'use strict';
(function(G){
/* Public API is independent of the UI. Read getters return detached data.
 * Call prepare on creation/load, daily after the first arrival and each new day.
 * Stored planning: {version,seed,lastDay,researchDay,forecasts,orders}.
 * Forecast: {id,category,startDay,endDay,mult,title,detail,researched}.
 * Order: {id,character,category,itemId,minCondition,genuine,dueDay,price,
 *   offeredDay,offerUntil,status,acceptedDay,lotUid,completedDay,result}.
 * Terminal result: {kind,day,uid,amount,profit,relationDelta}.
 * A category request has itemId:null; genuine is an exact actual requirement.
 * Lot metadata: orderId while held; restorationMode/restorationDay after work.
 * Upcoming public mult is null until researched; active prices are public.
 */
const LIMITS=Object.freeze({offers:2,accepted:3,history:20,upcoming:2,grace:2});
const MODES=['preserve','practical','cosmetic'];
const STATUS=['offered','accepted','fulfilled','cancelled','expired'];
const CONDITION=[.72,.88,1,1.15,1.3];
const MAX_PRICE=999999999;
const E=()=>G.PawnEngine;
const catalog=()=>G.PAWN_ITEMS||[];
const roster=()=>G.PAWN_CHARACTERS||[];
const item=id=>catalog().find(it=>it.id===id);
const categories=()=>[...new Set(catalog().map(it=>it.category))].sort();
const label=category=>E()?.CATEGORIES?.[category]||category;
const clone=x=>JSON.parse(JSON.stringify(x));
const integer=x=>Number.isSafeInteger(x)&&x>=0;
const money=x=>Number.isFinite(x)&&Math.abs(x)<1e13;
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const text=x=>typeof x==='string'&&x.length>0&&x.length<=1000;
const fail=message=>({ok:false,message});
const ok=(message,extra={})=>({ok:true,message,...extra});
const terminal=o=>!['offered','accepted'].includes(o.status);
function hash(seed,salt){
 let h=(2166136261^seed)>>>0;
 for(const c of String(salt)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}
 h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;
 return h>>>0;
}
function seedOf(s){return hash(Number.isInteger(s.seed)?s.seed>>>0:0,'pawn-planning-v1')}
function customer(index){
 const p=E()?.profile?.(index)||G.PAWN_PROFILES?.[index]||{};
 return{likes:[],dislikes:[],temperament:'practical',expertise:.5,frugality:.5,...p};
}
function log(s,message,type='normal'){
 s.log=s.log||[];s.log.unshift({day:s.day,text:message,type});s.log=s.log.slice(0,40);
}
function activity(s,kind){
 // Keep the engine's bounded activity/gift rules when they are present.
 if(G.PawnEvolution?.activity)G.PawnEvolution.activity(s,kind);
 else{
  s.dayActivity=s.dayActivity||{trades:0,night:0};
  s.dayActivity[kind]=Math.min(kind==='night'?2:32,(s.dayActivity[kind]||0)+1);
 }
}
function relation(s,index,delta){
 s.relationships=s.relationships||{};
 const before=Number(s.relationships[index])||0;
 s.relationships[index]=Math.max(-100,Math.min(100,before+delta));
 if(s.relationships[index]>=25){
  s.friendStories=s.friendStories||[];
  if(!s.friendStories.includes(index))s.friendStories.push(index);
 }
 E()?.refreshRelationship?.(s);
 // prepare also refreshes the last closed encounter; keep reloads identical.
 const current=s.current;
 if(current?.loopVersion===2&&E()?.questionCapacity){
  current.questionMax=E().questionCapacity(Number(s.relationships[current.character])||0);
  current.talkLeft=Math.max(0,current.questionMax-current.questionSpent);
 }
 if(current?.offerVersion===1&&E()?.offerCapacity){
  current.offerMax=E().offerCapacity(Number(s.relationships[current.character])||0);
  current.offerLeft=Math.max(0,current.offerMax-current.offerSpent);
 }
 return s.relationships[index]-before;
}
function market(seed,index){
 const cs=categories(),category=cs[hash(seed,'category:'+index)%cs.length];
 const startDay=2+index*4,mult=[1.15,1.2,1.25,1.3][hash(seed,'mult:'+index)%4];
 return{id:'forecast:'+index,category,startDay,endDay:startDay+1,mult,
  title:label(category)+' 수집 장터',
  detail:startDay+'~'+(startDay+1)+'일에 '+label(category)+' 수요가 늘어 시장 가격이 '+Math.round((mult-1)*100)+'% 높아집니다.',
  researched:false};
}
function schedule(s){
 if(!s||!integer(s.day)||s.day<1)return[];
 const p=s.planning,seed=p?.seed??seedOf(s),out=[];
 const known=new Map((p?.forecasts||[]).map(f=>[f.id,f.researched]));
 if(!categories().length)return out;
 const index=Math.max(0,Math.floor((s.day-2)/4));
 let upcoming=0;
 for(let i=index;i<=index+LIMITS.upcoming+1&&upcoming<LIMITS.upcoming;i++){
  const f=market(seed,i);if(f.endDay<s.day)continue;
  f.researched=known.get(f.id)===true;out.push(f);
  if(f.startDay>s.day)upcoming++;
 }
 return out;
}
function prepare(s){
 if(!s||!integer(s.day)||s.day<1||s.planning!==undefined)return s;
 s.planning={version:1,seed:seedOf(s),lastDay:0,researchDay:0,forecasts:[],orders:[]};
 s.planning.forecasts=schedule(s);
 return s;
}
function valid(s){
 if(!s||s.planning===undefined)return !!s;
 const p=s.planning;
 if(!object(p)||p.version!==1||!integer(s.day)||s.day<1||!integer(p.seed)||p.seed>0xffffffff||
  !integer(p.lastDay)||p.lastDay>s.day||!integer(p.researchDay)||p.researchDay>s.day||
  !Array.isArray(p.forecasts)||p.forecasts.length>LIMITS.upcoming+1||
  !Array.isArray(p.orders)||p.orders.length>LIMITS.offers+LIMITS.accepted+LIMITS.history||!Array.isArray(s.stock))return false;
 const cs=categories(),ids=new Set(),held=new Set(),lots=new Map();
 for(const f of p.forecasts){
  if(!object(f)||!/^forecast:\d+$/.test(f.id)||ids.has(f.id)||!cs.includes(f.category)||
   !integer(f.startDay)||f.startDay<2||!integer(f.endDay)||f.endDay!==f.startDay+1||
   !Number.isFinite(f.mult)||f.mult<1||f.mult>1.5||!text(f.title)||!text(f.detail)||typeof f.researched!=='boolean')return false;
  const expected=market(p.seed,Number(f.id.split(':')[1]));
  if(f.category!==expected.category||f.startDay!==expected.startDay||f.mult!==expected.mult)return false;
  ids.add(f.id);
 }
 ids.clear();
 for(const lot of s.stock){
  if(!object(lot)||typeof lot.uid!=='string'||lots.has(lot.uid))return false;
  lots.set(lot.uid,lot);
  if(lot.restorationMode!==undefined&&(!MODES.includes(lot.restorationMode)||!integer(lot.restorationDay)||lot.restorationDay<1||lot.restorationDay>s.day))return false;
  if(lot.restorationDay!==undefined&&lot.restorationMode===undefined)return false;
 }
 let offered=0,accepted=0,completed=0;
 for(const o of p.orders){
  if(!object(o)||!/^order:\d+:[01]$/.test(o.id)||ids.has(o.id)||!integer(o.character)||o.character>=roster().length||
   !cs.includes(o.category)||!(o.itemId===null||item(o.itemId)?.category===o.category)||
   !integer(o.minCondition)||o.minCondition>4||typeof o.genuine!=='boolean'||!integer(o.offeredDay)||o.offeredDay<1||
   o.offeredDay>s.day||o.id!=='order:'+o.offeredDay+':'+o.id.split(':')[2]||o.offerUntil!==o.offeredDay||
   !integer(o.dueDay)||o.dueDay<o.offeredDay+2||o.dueDay>o.offeredDay+3||
   !integer(o.price)||o.price<1||o.price>MAX_PRICE||!STATUS.includes(o.status)||
   !(o.lotUid===null||text(o.lotUid))||!(o.acceptedDay===null||integer(o.acceptedDay)&&o.acceptedDay>=o.offeredDay&&o.acceptedDay<=o.offerUntil)||
   !(o.completedDay===null||integer(o.completedDay)&&o.completedDay>=o.offeredDay&&o.completedDay<=s.day))return false;
  ids.add(o.id);
  if(o.status==='offered'){
   offered++;if(o.acceptedDay!==null||o.lotUid!==null)return false;
  }else if(o.status==='accepted'){
   accepted++;if(o.acceptedDay===null)return false;
   if(o.lotUid!==null){
    const lot=lots.get(o.lotUid);
    if(!lot||held.has(o.lotUid)||lot.orderId!==o.id||!matches(o,lot,false)||lot.displayAt!==null||lot.displayPrice!==undefined)return false;
    held.add(o.lotUid);
   }
  }else{
   completed++;const r=o.result;
   if(o.lotUid!==null||o.completedDay===null||!object(r)||r.kind!==o.status||r.day!==o.completedDay||
    !(r.uid===null||text(r.uid))||!integer(r.amount)||!money(r.profit)||!Number.isInteger(r.relationDelta)||Math.abs(r.relationDelta)>100)return false;
   if(o.status==='fulfilled'){
    if(o.acceptedDay===null||r.uid===null||r.amount!==o.price||r.day<o.dueDay||r.day>o.dueDay+LIMITS.grace||r.relationDelta<0||r.relationDelta>6)return false;
   }else if(r.uid!==null||r.amount!==0||r.profit!==0||r.relationDelta>0||r.relationDelta< -2)return false;
   if(o.status==='cancelled'&&r.relationDelta!==0)return false;
   if(o.status==='expired'&&r.day<=(o.acceptedDay===null?o.offerUntil:o.dueDay+LIMITS.grace))return false;
  }
  if(!terminal(o)&&(o.completedDay!==null||o.result!==null))return false;
 }
 if(offered>LIMITS.offers||accepted>LIMITS.accepted||completed>LIMITS.history)return false;
 for(const lot of s.stock)if(lot.orderId!==undefined){
  if(!text(lot.orderId))return false;
  if(held.has(lot.uid))continue;
  if(!lot.orderId.startsWith('story:'))return false;
  const arcId=lot.orderId.slice(6),arc=s.adventures?.arcs?.[arcId];
  // Validate the foreign hold locally; B.valid owns the remaining arc schema.
  if(!arc||arc.id!==arcId||arc.status!=='active'||arc.stage!==2||arc.pledged!==true||arc.late!==false||
   arc.lotUid!==lot.uid||lot.displayAt!==null||lot.displayPrice!==undefined)return false;
 }
 return true;
}
function ready(s){return !!s?.planning&&valid(s)}
function matches(order,lot,condition=true){
 const it=item(lot?.itemId);
 return !!it&&it.category===order.category&&(order.itemId===null||order.itemId===it.id)&&
  lot.genuine===order.genuine&&(!condition||integer(lot.condition)&&lot.condition>=order.minCondition);
}
function negotiated(s,uid){return s.current?.kind==='buyer'&&s.current.status==='offered'&&s.current.stockUid===uid}
function unmark(s,o){
 for(const lot of s.stock)if(lot.orderId===o.id)delete lot.orderId;
 o.lotUid=null;
}
function finish(s,o,status,extra={}){
 unmark(s,o);o.status=status;o.completedDay=s.day;
 o.result={kind:status,day:s.day,uid:null,amount:0,profit:0,relationDelta:0,...extra};
}
function prune(s){
 const history=s.planning.orders.filter(terminal).sort((a,b)=>b.completedDay-a.completedDay||b.offeredDay-a.offeredDay).slice(0,LIMITS.history);
 const keep=new Set(history.map(o=>o.id));
 s.planning.orders=s.planning.orders.filter(o=>!terminal(o)||keep.has(o.id));
}
function makeOrder(s,character,slot){
 const p=customer(character),seed=s.planning.seed,salt='order:'+s.day+':'+slot;
 let cs=[...new Set([...p.likes,...(G.PawnCustomerGoals?.specialties?.[character]||[])])]
  .filter(c=>categories().includes(c)&&!p.dislikes.includes(c));
 if(!cs.length)cs=categories().filter(c=>!p.dislikes.includes(c));
 if(!cs.length)return null;
 const category=cs[hash(seed,salt+':category')%cs.length];
 const choices=catalog().filter(it=>it.category===category),it=choices[hash(seed,salt+':item')%choices.length];
 const named=hash(seed,salt+':named')%5<2;
 const minCondition=p.temperament==='collector'||p.expertise>=.8?3:1+hash(seed,salt+':condition')%2;
 const bases=choices.map(it=>it.base).sort((a,b)=>a-b),base=named?it.base:bases[Math.floor(bases.length/2)];
 const price=Math.min(MAX_PRICE,Math.max(1,Math.round(base*1.6*CONDITION[minCondition]*(1.08+(1-p.frugality)*.12))));
 return{id:salt,character,category,itemId:named?it.id:null,minCondition,genuine:true,
  dueDay:s.day+2+hash(seed,salt+':due')%2,price,offeredDay:s.day,offerUntil:s.day,
  status:'offered',acceptedDay:null,lotUid:null,completedDay:null,result:null};
}
function daily(s){
 prepare(s);if(!ready(s))return fail('계획 기록을 읽을 수 없습니다.');
 const p=s.planning;if(p.lastDay===s.day)return ok('오늘의 계획은 이미 갱신했습니다.',{repeated:true});
 for(const o of p.orders){
  if(o.status==='offered'&&s.day>o.offerUntil){finish(s,o,'expired');continue}
  if(o.status!=='accepted')continue;
  if(s.day>o.dueDay+LIMITS.grace){
   const delta=relation(s,o.character,-2);finish(s,o,'expired',{relationDelta:delta});
   log(s,(roster()[o.character]?.name||'손님')+'의 예약 기한이 지났습니다. 예약 표시를 해제했습니다.','warn');
  }
 }
 p.forecasts=schedule(s);
 const met=roster().map((_,i)=>i).filter(i=>(s.met?.[i]||0)>0);
 // Creation may run before the first arrival. Allow that arrival's later daily call.
 if(!met.length){prune(s);return ok('만난 손님이 생기면 예약 요청이 도착합니다.')}
 const offset=hash(p.seed,'customers:'+s.day)%met.length;
 for(let slot=0;slot<LIMITS.offers;slot++){
  const o=makeOrder(s,met[(offset+slot)%met.length],slot);if(o)p.orders.push(o);
 }
 p.lastDay=s.day;prune(s);
 return ok('시장 소식과 예약 요청을 갱신했습니다.');
}
function forecast(s){
 if(!s||!integer(s.day)||s.day<1)return{active:[],upcoming:[]};
 const active=[],upcoming=[];
 for(const f of schedule(s)){
  const isActive=f.startDay<=s.day;
  const visible=isActive||f.researched;
  const view={...f,mult:visible?f.mult:null,detail:visible?f.detail:label(f.category)+' 장터가 '+f.startDay+'일에 열릴 예정입니다. 밤에 소식을 조사하면 정확한 시세를 알 수 있습니다.'};
  (isActive?active:upcoming).push(view);
 }
 return{active,upcoming};
}
function factor(s,it){
 if(!s||!integer(s.day)||s.day<2||!it)return 1;
 const f=market(s.planning?.seed??seedOf(s),Math.floor((s.day-2)/4));
 return s.day<=f.endDay&&it.category===f.category?f.mult:1;
}
function nightAvailable(s){
 const n=s.night;
 return s.closing===true&&n?.day===s.day&&integer(n.actions)&&n.actions>0&&
  Array.isArray(n.done)&&Array.isArray(n.report)&&n.done.length+n.actions===2&&n.report.length===n.done.length;
}
function spendNight(s,key,message){
 s.night.actions--;s.night.done.push(key);s.night.report.push(message);
 activity(s,'night');log(s,message,'good');
}
function research(s){
 if(!ready(s)||!nightAvailable(s))return fail('마감 뒤 자유 시간이 남아 있을 때 조사할 수 있습니다.');
 if(s.planning.researchDay===s.day||s.night.done.includes('planning:research'))return fail('오늘 밤 시장 소식은 이미 조사했습니다.');
 const f=s.planning.forecasts.find(f=>f.startDay>s.day&&!f.researched);
 if(!f)return fail('새로 조사할 시장 소식이 없습니다.');
 f.researched=true;s.planning.researchDay=s.day;
 spendNight(s,'planning:research','시장 조사 · '+f.detail);
 return ok(f.detail,{forecast:clone(f)});
}
function orders(s){return clone(s?.planning?.orders||[])}
function opportunities(s){return orders(s).filter(o=>o.status==='offered'&&s.day<=o.offerUntil)}
function findOrder(s,id){return s.planning.orders.find(o=>o.id===id)}
function acceptOrder(s,id){
 if(!ready(s))return fail('예약 기록을 읽을 수 없습니다.');
 const o=findOrder(s,id);
 if(!o||o.status!=='offered'||s.day>o.offerUntil||(s.met?.[o.character]||0)<=0)return fail('지금 받을 수 없는 예약입니다.');
 if(s.planning.orders.filter(o=>o.status==='accepted').length>=LIMITS.accepted)return fail('동시에 받을 수 있는 예약은 세 건입니다.');
 o.status='accepted';o.acceptedDay=s.day;
 const message=(roster()[o.character]?.name||'손님')+'의 예약을 받았습니다. '+o.dueDay+'~'+(o.dueDay+LIMITS.grace)+'일에 전달하면 '+o.price+'G를 받습니다.';
 log(s,message);return ok(message,{order:clone(o)});
}
function assign(s,id,uid){
 if(!ready(s))return fail('예약 기록을 읽을 수 없습니다.');
 const o=findOrder(s,id),lot=s.stock.find(lot=>lot.uid===uid);
 if(!o||o.status!=='accepted'||s.day>o.dueDay+LIMITS.grace)return fail('진행 중인 예약이 아닙니다.');
 if(!lot||!matches(o,lot,false))return fail('예약한 품목과 실제 진위가 맞는 재고를 골라 주세요.');
 if(negotiated(s,uid))return fail('지금 구매 손님에게 제안한 물건은 예약할 수 없습니다.');
 if(lot.orderId&&lot.orderId!==id)return fail('다른 예약에 배정한 물건입니다.');
 if(o.lotUid===uid)return fail('이미 이 예약에 배정한 물건입니다.');
 unmark(s,o);o.lotUid=uid;lot.orderId=id;lot.displayAt=null;delete lot.displayPrice;
 const message=item(lot.itemId).name+'을 예약용으로 보관합니다. 상태가 부족하면 전달 전에 복원해 주세요.';
 log(s,message);return ok(message,{order:clone(o),uid});
}
function release(s,id){
 if(!ready(s))return fail('예약 기록을 읽을 수 없습니다.');
 const o=findOrder(s,id);if(!o||o.status!=='accepted'||o.lotUid===null)return fail('해제할 예약 물건이 없습니다.');
 unmark(s,o);const message='물건의 예약 표시를 해제했습니다. 예약 약속은 남아 있습니다.';
 log(s,message);return ok(message,{order:clone(o)});
}
function fulfill(s,id,uid){
 if(!ready(s))return fail('예약 기록을 읽을 수 없습니다.');
 const o=findOrder(s,id);
 if(!o||o.status!=='accepted')return fail('이미 끝났거나 받지 않은 예약입니다.');
 if(s.day<o.dueDay||s.day>o.dueDay+LIMITS.grace)return fail('예약은 '+o.dueDay+'~'+(o.dueDay+LIMITS.grace)+'일에 전달할 수 있습니다.');
 const selected=uid??o.lotUid,ix=s.stock.findIndex(lot=>lot.uid===selected),lot=s.stock[ix];
 if(!lot||!matches(o,lot))return fail('실제 품목, 진위, 보존 상태가 예약 조건에 맞지 않습니다.');
 if(negotiated(s,selected))return fail('지금 구매 손님에게 제안한 물건은 전달할 수 없습니다.');
 if(lot.orderId&&lot.orderId!==id)return fail('다른 예약에 배정한 물건입니다.');
 if(!money(lot.paid)||lot.paid<0||!money(s.coins+o.price)||
  !money(s.profit+o.price-lot.paid)||!money(s.dayProfit+o.price-lot.paid)||
  !integer(s.sold)||!integer(s.sold+1)||!integer(s.xp)||!integer(s.xp+8))return fail('판매 정산을 확인할 수 없습니다.');
 const profit=o.price-lot.paid;
 finish(s,o,'fulfilled',{uid:selected,amount:o.price,profit});
 s.coins+=o.price;s.profit+=profit;s.dayProfit+=profit;s.sold++;s.xp+=8;s.stock.splice(ix,1);
 o.result.relationDelta=relation(s,o.character,6);
 if(s.current?.uid===selected){s.current.status='sold';s.current.sale=o.price}
 // Same optional narrative hook as an ordinary engine sale, with the actual buyer.
 G.PawnAdventures?.onSale?.(s,lot,o.character);
 activity(s,'trades');
 const message='예약 전달 · '+item(lot.itemId).name+' +'+o.price+'G (이익 '+(profit>=0?'+':'')+profit+'G)';
 log(s,message,profit>=0?'good':'warn');E()?.achievements?.(s);prune(s);
 return ok(message,{order:clone(o),amount:o.price,profit,relationDelta:o.result.relationDelta});
}
function cancel(s,id){
 if(!ready(s))return fail('예약 기록을 읽을 수 없습니다.');
 const o=findOrder(s,id);if(!o||terminal(o))return fail('이미 끝났거나 없는 예약입니다.');
 finish(s,o,'cancelled');prune(s);
 const message='예약을 취소하고 보관 표시를 해제했습니다. 취소 비용은 없습니다.';
 log(s,message);return ok(message,{order:clone(o)});
}
function restorationOptions(s,lot){
 if(!ready(s)||!lot||!nightAvailable(s)||negotiated(s,lot.uid)||
  !s.stock.includes(lot)&&!s.stock.some(x=>x.uid===lot.uid))return[];
 // Use actual stock, never a stale/detached UI copy's price or condition.
 lot=s.stock.find(x=>x.uid===lot.uid);
 if(!item(lot.itemId)||!integer(lot.condition)||lot.condition>=4||!money(lot.value)||lot.value<0||
  !money(lot.paid)||lot.paid<0||lot.restorationDay===s.day||
  s.night.done.includes('repair:'+lot.uid)||s.night.done.includes('restore:'+lot.uid))return[];
 const specs=[
  {mode:'preserve',step:1,rate:.10,floor:20,description:'원래의 세공과 오래된 결을 지키며 한 단계 보존합니다.',buyerEffect:'좋아하는 품목의 수집가·전문가는 원형 보존을 12% 더 높이 평가합니다.'},
  {mode:'practical',step:2,rate:.22,floor:35,description:'사용과 내구성을 중심으로 최대 두 단계 수리합니다.',buyerEffect:'좋아하는 품목의 실용적인 손님은 사용 수리를 10% 더 높이 평가합니다.'},
  {mode:'cosmetic',step:1,rate:.08,floor:15,description:'표면과 겉모습을 다듬어 한 단계 손질합니다.',buyerEffect:'좋아하는 품목의 격식을 중시하는 손님은 겉손질을 10% 더 높이 평가합니다.'}
 ];
 return specs.map(spec=>{
  const condition=Math.min(4,lot.condition+spec.step),cost=Math.max(spec.floor,Math.round(lot.value*spec.rate));
  const value=Math.round(lot.value*CONDITION[condition]/CONDITION[lot.condition]);
  const after={...lot,condition,value,paid:lot.paid+cost,restorationMode:spec.mode};
  const resale=E()?.quote?E().quote(s,after,'display'):Math.round(value*(1+(s.upgrades?.word||0)*.035)*factor(s,item(lot.itemId)));
  return{mode:spec.mode,cost,condition,value,resale,description:spec.description,buyerEffect:spec.buyerEffect};
 }).filter(opt=>money(opt.cost)&&money(opt.value)&&money(lot.paid+opt.cost));
}
function restore(s,uid,mode){
 if(!ready(s))return fail('복원 기록을 읽을 수 없습니다.');
 const lot=s.stock.find(lot=>lot.uid===uid),option=restorationOptions(s,lot).find(opt=>opt.mode===mode);
 if(!option)return fail('지금 복원할 수 없는 물건이나 복원 방식입니다.');
 if(!money(s.coins)||s.coins<option.cost)return fail('복원 비용이 부족합니다.');
 const before=lot.value,oldCondition=lot.condition;
 const apparent=lot.apparent??lot.value;
 if(!money(apparent)||apparent<0||!money(apparent*CONDITION[option.condition]/CONDITION[oldCondition]))return fail('물건의 가치 기록을 확인할 수 없습니다.');
 s.coins-=option.cost;lot.paid+=option.cost;
 lot.condition=option.condition;lot.value=option.value;
 lot.apparent=Math.round(apparent*CONDITION[option.condition]/CONDITION[oldCondition]);
 lot.restorationMode=mode;lot.restorationDay=s.day;
 const message=item(lot.itemId).name+' '+({preserve:'원형 보존',practical:'사용 수리',cosmetic:'겉손질'})[mode]+' 완료 · 가치 '+before+' → '+lot.value+'G · 비용 '+option.cost+'G를 매입 원가에 포함했습니다.';
 // Share the generic repair key, so the legacy route cannot repeat work tonight.
 spendNight(s,'repair:'+uid,message);
 return ok(message,{uid,mode,cost:option.cost,condition:lot.condition,value:lot.value,resale:option.resale});
}
function buyerMultiplier(s,lot,profile){
 if(!lot||!MODES.includes(lot.restorationMode))return 1;
 const p=typeof profile==='number'?customer(profile):profile||{};
 const category=item(lot.itemId)?.category;
 if(!category||!Array.isArray(p.likes)||!p.likes.includes(category)||p.dislikes?.includes(category))return 1;
 if(lot.restorationMode==='preserve'&&lot.genuine&&(p.temperament==='collector'||p.expertise>=.8))return 1.12;
 if(lot.restorationMode==='practical'&&p.temperament==='practical')return 1.10;
 if(lot.restorationMode==='cosmetic'&&p.temperament==='proud')return 1.10;
 return 1;
}
G.PawnPlanning={LIMITS,prepare,valid,daily,forecast,research,factor,opportunities,orders,
 acceptOrder,assign,release,fulfill,cancel,restorationOptions,restore,buyerMultiplier};
})(globalThis);
