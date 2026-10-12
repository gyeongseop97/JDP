'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
for(const file of ['items.js','characters.js','profiles.js','appraisal-data.js','legacy-item-appraisals.js','item-appraisals.js','guest-data.js','voices.js','trade-voice.js','affinity-voice.js','origin-data.js','customer-goals.js','evolution.js','dialogue-data.js','dialogue-reply.js','discovery-data.js','discovery.js','planning.js','engine.js']){
 vm.runInThisContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{filename:file});
}
const E=PawnEngine,P=PawnPlanning,copy=x=>JSON.parse(JSON.stringify(x));
let tests=0;
function test(name,fn){try{fn();tests++;console.log('PASS '+name)}catch(error){console.error('FAIL '+name);throw error}}
function unchanged(s,fn){const before=JSON.stringify(s),result=fn();assert.equal(result.ok,false);assert.equal(JSON.stringify(s),before)}
function fixture(seed=61301){
 const s=E.create(seed);s.coins=100000;
 s.activeEvent={id:'planning-quiet',day:s.day,kind:'rumor',category:'all',mult:1,gift:0};
 E.prepare(s);P.prepare(s);P.daily(s);assert(P.valid(s));assert(E.validate(s));return s;
}
function closeDay(s){
 if(!s.closing){s.visitor=8;s.current.status='left';assert(E.next(s).ok)}
 assert(s.night&&s.closing);return s;
}
function day(s,n){
 s.day=n;s.closing=false;s.night=null;s.visitor=1;s.current.status='left';s.dayProfit=0;
 s.dayActivity={trades:0,night:0};s.activeEvent={id:'planning-quiet',day:n,kind:'rumor',category:'all',mult:1,gift:0};
 assert(P.daily(s).ok);assert(P.valid(s));assert(E.validate(s));return s;
}
function lot(s,changes={}){
 const entry={uid:'planning-lot-'+(s.fixtureLot=(s.fixtureLot||0)+1),itemId:'clock-01',grade:2,claimedGrade:2,condition:2,genuine:true,value:300,apparent:300,paid:120,displayAt:null,sourceCharacter:0,...changes};
 s.stock.push(entry);return entry;
}
function offered(s){const order=P.opportunities(s)[0];assert(order);return order}
function accepted(s){const order=offered(s);assert(P.acceptOrder(s,order.id).ok);return order}
function orderLot(s,o,changes={}){
 const it=o.itemId?E.item(o.itemId):PAWN_ITEMS.find(it=>it.category===o.category);
 return lot(s,{itemId:it.id,condition:o.minCondition,genuine:o.genuine,...changes});
}
function total(s){return{coins:s.coins,profit:s.profit,dayProfit:s.dayProfit,sold:s.sold,xp:s.xp,stock:copy(s.stock),relationships:copy(s.relationships)}}

test('Migration changes only planning, is idempotent, and accepts legacy saves',()=>{
 for(const name of ['migration-v4-fixture.json','migration-v5-fixture.json','migration-v6-fixture.json','migration-v64-fixture.json','migration-v610-dialogue-fixture.json']){
  const data=JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8'));
  for(const s of data.day?[data]:[data.seller,data.buyer]){
  delete s.planning;
  const before=copy(s);assert(P.valid(s));assert.equal(P.prepare(s),s);assert.equal(s.planning.version,1);
  const without=copy(s);delete without.planning;assert.deepEqual(without,before);
  assert(P.valid(s));const save=JSON.stringify(s);P.prepare(s);assert.equal(JSON.stringify(s),save);
  E.prepare(s);assert(P.valid(s));assert(E.validate(s));
  const current=JSON.stringify(s);E.prepare(s);P.daily(s);assert.equal(JSON.stringify(s),current);
  }
 }
});
test('Day one exposes actionable day-two clues without changing engine random state',()=>{
 const s=fixture(),before=JSON.stringify(s),seed=s.seed,f=P.forecast(s);
 assert.equal(f.active.length,0);assert.equal(f.upcoming.length,2);assert.equal(f.upcoming[0].startDay,2);
 for(const entry of f.upcoming){assert(PAWN_ITEMS.some(it=>it.category===entry.category));assert.equal(entry.mult,null);assert.equal(entry.researched,false);assert(entry.title&&entry.detail)}
 for(let i=0;i<30;i++){P.forecast(s);P.opportunities(s);P.orders(s);P.factor(s,E.item('clock-01'))}
 assert.equal(JSON.stringify(s),before);assert.equal(s.seed,seed);
 f.upcoming[0].category='bogus';assert.notEqual(P.forecast(s).upcoming[0].category,'bogus');
});
test('Forecast turns on and off at exact game days and combines with the existing market factor',()=>{
 const s=fixture(),f=copy(s.planning.forecasts[0]),it=PAWN_ITEMS.find(it=>it.category===f.category),other=PAWN_ITEMS.find(it=>it.category!==f.category);
 assert.equal(P.factor(s,it),1);day(s,f.startDay);
 assert.equal(P.factor(s,it),f.mult);assert.equal(P.factor(s,other),1);
 assert.equal(P.forecast(s).active[0].mult,f.mult);
 s.activeEvent={id:'test-market',day:s.day,kind:'market',category:it.category,mult:1.4,gift:0};
 assert(Math.abs(E.marketFactor(s,it)-1.4*f.mult)<1e-12);
 day(s,f.endDay);assert.equal(P.factor(s,it),f.mult);
 day(s,f.endDay+1);assert.equal(P.factor(s,it),1);assert.equal(P.forecast(s).active.length,0);
});
test('Forecast and daily generation ignore unrelated RNG draws, render calls and wall time',()=>{
 const a=fixture(1771),b=copy(a),seed=a.seed;
 b.seed=987654321;b.turn+=51;b.serial+=51;
 day(a,2);day(b,2);
 assert.deepEqual(a.planning,b.planning);assert.deepEqual(P.forecast(a),P.forecast(b));assert.equal(a.seed,seed);
 const before=JSON.stringify(a);for(let i=0;i<10;i++){assert(P.daily(a).repeated);P.prepare(a)}assert.equal(JSON.stringify(a),before);
 const saved=JSON.stringify(a);E.prepare(a);assert.equal(JSON.stringify(a),saved);
});
test('Research spends exactly one shared night action, persists, and cannot be farmed',()=>{
 const s=closeDay(fixture()),coins=s.coins,seed=s.seed;
 assert(P.research(s).ok);assert.equal(s.coins,coins);assert.equal(s.seed,seed);assert.equal(s.night.actions,1);
 assert.equal(s.night.done.length,1);assert.equal(s.night.report.length,1);assert.equal(s.dayActivity.night,1);
 assert(s.log.some(entry=>entry.text.includes('시장 조사')));assert(P.forecast(s).upcoming[0].researched);assert(Number.isFinite(P.forecast(s).upcoming[0].mult));
 unchanged(s,()=>P.research(s));const saved=JSON.stringify(s);E.prepare(s);assert.equal(JSON.stringify(s),saved);
 const restored=copy(s);unchanged(restored,()=>P.research(restored));assert(E.validate(restored));
 day(s,2);assert(P.forecast(s).active[0].researched);closeDay(s);assert(P.research(s).ok);assert(E.validate(s));
});
test('Research requires a real night slot and cannot repeat a gift event payment',()=>{
 const s=fixture();unchanged(s,()=>P.research(s));closeDay(s);
 s.activeEvent={id:'gift',day:s.day,kind:'gift',category:'all',mult:1,gift:50};s.eventDone=false;
 const coins=s.coins;assert(P.research(s).ok);assert.equal(s.coins,coins+50);assert.equal(s.eventDone,true);
 unchanged(s,()=>P.research(s));s.night.actions=0;s.night.done.push('tea:0');s.night.report.push('tea');
 unchanged(s,()=>P.research(s));
});
test('Offers use met customers and real liked categories/items; getters are detached',()=>{
 for(let seed=1;seed<=20;seed++){
  const s=fixture(seed),os=P.opportunities(s);assert.equal(os.length,2);
  for(const o of os){assert(s.met[o.character]>0);assert(E.profile(o.character).likes.includes(o.category)||PawnCustomerGoals.specialties[o.character].includes(o.category));assert(o.itemId===null||E.item(o.itemId).category===o.category);assert(o.dueDay>=3);assert(o.price>0)}
  os[0].price=0;const all=P.orders(s);all[0].status='fulfilled';assert(P.opportunities(s).every(o=>o.price>0&&o.status==='offered'));
 }
});
test('Accepting is a promise with no money, stock, experience or sale payment',()=>{
 const s=fixture(),o=offered(s),before=total(s);assert(P.acceptOrder(s,o.id).ok);assert.deepEqual(total(s),before);
 assert.equal(P.orders(s).find(order=>order.id===o.id).status,'accepted');
 unchanged(s,()=>P.acceptOrder(s,o.id));unchanged(s,()=>P.acceptOrder(s,'missing'));assert(E.validate(s));
});
test('Only three active promises fit and cancelling does not regenerate offers today',()=>{
 const s=fixture();for(const o of P.opportunities(s))assert(P.acceptOrder(s,o.id).ok);
 day(s,2);const os=P.opportunities(s);assert(P.acceptOrder(s,os[0].id).ok);unchanged(s,()=>P.acceptOrder(s,os[1].id));
 assert(P.cancel(s,os[0].id).ok);assert(P.cancel(s,os[1].id).ok);
 const before=JSON.stringify(s);P.daily(s);assert.equal(JSON.stringify(s),before);assert.equal(P.opportunities(s).length,0);
});
test('Assignment protects passive listings and sales, and swapping/releasing clears exactly its hold',()=>{
 const s=fixture(),o=accepted(s),a=orderLot(s,o),b=orderLot(s,o);
 assert(E.setListing(s,a.uid,100).ok);assert(P.assign(s,o.id,a.uid).ok);
 assert.equal(a.orderId,o.id);assert.equal(a.displayAt,null);assert.equal(a.displayPrice,undefined);assert.equal(E.listingChance(s,a),0);
 unchanged(s,()=>E.setListing(s,a.uid,120));unchanged(s,()=>E.sell(s,a.uid));unchanged(s,()=>P.assign(s,o.id,a.uid));
 assert(P.assign(s,o.id,b.uid).ok);assert.equal(a.orderId,undefined);assert.equal(b.orderId,o.id);
 assert(P.release(s,o.id).ok);assert.equal(b.orderId,undefined);assert.equal(P.orders(s).find(x=>x.id===o.id).status,'accepted');
 unchanged(s,()=>P.release(s,o.id));assert(E.validate(s));
});
test('Assign and fulfill reject the currently selected buyer lot without mutating a trade',()=>{
 const s=fixture(),o=accepted(s),a=orderLot(s,o);day(s,o.dueDay);
 Object.assign(s.current,{kind:'buyer',status:'offered',stockUid:a.uid});
 unchanged(s,()=>P.assign(s,o.id,a.uid));unchanged(s,()=>P.fulfill(s,o.id,a.uid));
 s.current.status='left';assert(P.assign(s,o.id,a.uid).ok);
 closeDay(s);s.current.kind='buyer';s.current.status='offered';s.current.stockUid=a.uid;
 unchanged(s,()=>P.restore(s,a.uid,'preserve'));assert.deepEqual(P.restorationOptions(s,a),[]);
});
test('Reservation holds cannot cross orders and assignment checks actual category/item/authenticity',()=>{
 const s=fixture(),o=accepted(s),other=P.opportunities(s)[0];assert(P.acceptOrder(s,other.id).ok);
 const a=orderLot(s,o),bad=orderLot(s,o,{genuine:false}),wrong=lot(s,{itemId:PAWN_ITEMS.find(it=>it.category!==o.category).id});
 unchanged(s,()=>P.assign(s,o.id,bad.uid));unchanged(s,()=>P.assign(s,o.id,wrong.uid));unchanged(s,()=>P.assign(s,o.id,'missing'));
 assert(P.assign(s,o.id,a.uid).ok);unchanged(s,()=>P.assign(s,other.id,a.uid));assert(P.valid(s));
});
test('Delivery checks due day, actual hidden condition and authenticity, not apparent claims',()=>{
 const s=fixture(),o=accepted(s),a=orderLot(s,o);unchanged(s,()=>P.fulfill(s,o.id,a.uid));
 day(s,o.dueDay);a.genuine=false;a.apparent=999999;unchanged(s,()=>P.fulfill(s,o.id,a.uid));
 a.genuine=true;a.condition=o.minCondition-1;unchanged(s,()=>P.fulfill(s,o.id,a.uid));
 a.condition=o.minCondition;a.itemId=PAWN_ITEMS.find(it=>it.category!==o.category).id;unchanged(s,()=>P.fulfill(s,o.id,a.uid));
});
test('Reservation delivery settles accounting and optional narrative/activity/achievement hooks once',()=>{
 const s=fixture(),o=accepted(s),a=orderLot(s,o,{paid:100});assert(P.assign(s,o.id,a.uid).ok);day(s,o.dueDay);
 s.relationships[o.character]=24;s.claimed=E.ACHIEVEMENTS.map(a=>a.id);
 const before=total(s),narrative=[],original=globalThis.PawnAdventures;
 globalThis.PawnAdventures={prepare(){},daily(){},valid(){return true},onSale(state,entry,buyer){narrative.push({uid:entry.uid,buyer,sold:state.sold})}};
 try{
  const result=P.fulfill(s,o.id,a.uid);assert(result.ok);assert.equal(result.profit,o.price-a.paid);
  assert.equal(s.coins,before.coins+o.price);assert.equal(s.profit,before.profit+o.price-a.paid);assert.equal(s.dayProfit,before.dayProfit+o.price-a.paid);
  assert.equal(s.sold,before.sold+1);assert.equal(s.xp,before.xp+8);assert(!s.stock.includes(a));assert.equal(s.dayActivity.trades,1);
  assert.equal(s.relationships[o.character],30);assert(s.friendStories.includes(o.character));assert.equal(narrative.length,1);assert.equal(narrative[0].buyer,o.character);
  unchanged(s,()=>P.fulfill(s,o.id,a.uid));unchanged(s,()=>P.acceptOrder(s,o.id));unchanged(s,()=>P.cancel(s,o.id));unchanged(s,()=>P.release(s,o.id));
  const save=JSON.stringify(s);E.prepare(s);assert.equal(JSON.stringify(s),save);unchanged(s,()=>P.fulfill(s,o.id,a.uid));
  assert.equal(narrative.length,1);assert.equal(P.orders(s).find(x=>x.id===o.id).result.kind,'fulfilled');assert(E.validate(s));
 }finally{if(original===undefined)delete globalThis.PawnAdventures;else globalThis.PawnAdventures=original}
});
test('Delivery works at full inventory capacity and achievements are claimed at most once',()=>{
 const s=fixture(),o=accepted(s),a=orderLot(s,o,{paid:0});day(s,o.dueDay);s.profit=499;
 while(s.stock.length<E.capacity(s))lot(s);const before=s.coins;
 assert(P.fulfill(s,o.id,a.uid).ok);assert.equal(s.stock.length,E.capacity(s)-1);assert(s.claimed.includes('profit'));
 assert.equal(s.coins,before+o.price+E.ACHIEVEMENTS.find(a=>a.id==='profit').reward);unchanged(s,()=>P.fulfill(s,o.id,a.uid));assert(E.validate(s));
});
test('Unassigned delivery is supported and delivery releases an unused assigned candidate',()=>{
 const s=fixture(),o=accepted(s),a=orderLot(s,o),b=orderLot(s,o);assert(P.assign(s,o.id,a.uid).ok);day(s,o.dueDay+2);
 assert(P.fulfill(s,o.id,b.uid).ok);assert.equal(a.orderId,undefined);assert(s.stock.includes(a));assert(!s.stock.includes(b));assert(P.valid(s));
});
test('Cancellation is free, clears holds and permanently prevents duplicate settlement',()=>{
 const s=fixture(),o=accepted(s),a=orderLot(s,o);assert(P.assign(s,o.id,a.uid).ok);const before=total(s);
 assert(P.cancel(s,o.id).ok);assert.equal(a.orderId,undefined);
 delete before.stock[0].orderId;assert.deepEqual(total(s),before);
 unchanged(s,()=>P.cancel(s,o.id));unchanged(s,()=>P.acceptOrder(s,o.id));day(s,o.dueDay);unchanged(s,()=>P.fulfill(s,o.id,a.uid));assert(P.valid(s));
});
test('Expiry after the two-day grace clears holds and records exactly one consequence',()=>{
 const s=fixture(),o=accepted(s),a=orderLot(s,o);assert(P.assign(s,o.id,a.uid).ok);const coins=s.coins,rel=s.relationships[o.character]||0;
 day(s,o.dueDay+2);assert.equal(a.orderId,o.id);day(s,o.dueDay+3);
 const record=P.orders(s).find(x=>x.id===o.id);assert.equal(record.status,'expired');assert.equal(record.result.relationDelta,-2);
 assert.equal(a.orderId,undefined);assert.equal(s.coins,coins);assert.equal(s.relationships[o.character],rel-2);
 unchanged(s,()=>P.fulfill(s,o.id,a.uid));unchanged(s,()=>P.acceptOrder(s,o.id));unchanged(s,()=>P.cancel(s,o.id));
 const saved=JSON.stringify(s);P.daily(s);assert.equal(JSON.stringify(s),saved);day(s,s.day+1);assert.equal(s.relationships[o.character],rel-2);
});
test('Unaccepted requests expire without a fine or relationship change',()=>{
 const s=fixture(),o=offered(s),before=copy(s.relationships),coins=s.coins;day(s,2);
 assert.equal(P.orders(s).find(x=>x.id===o.id).status,'expired');assert.deepEqual(s.relationships,before);assert.equal(s.coins,coins);unchanged(s,()=>P.acceptOrder(s,o.id));
});
test('Restoration returns three choices with exact condition, value and resale previews',()=>{
 const s=closeDay(fixture()),a=lot(s),before=JSON.stringify(s),options=P.restorationOptions(s,a);
 assert.equal(options.length,3);assert.deepEqual(options.map(x=>x.mode),['preserve','practical','cosmetic']);
 for(const opt of options){assert(opt.cost>0);assert(opt.description&&opt.buyerEffect);assert(opt.condition>a.condition);assert.equal(opt.value,Math.round(a.value*E.CONDITIONS[opt.condition][1]/E.CONDITIONS[a.condition][1]));assert.equal(opt.resale,E.quote(s,{...a,value:opt.value,paid:a.paid+opt.cost},'display'))}
 assert.equal(JSON.stringify(s),before);const stale={...a,value:999999,condition:0};assert.deepEqual(P.restorationOptions(s,stale),options);
});
test('Invalid, unaffordable, daytime and perfect restorations leave every byte unchanged',()=>{
 const s=fixture(),a=lot(s);unchanged(s,()=>P.restore(s,a.uid,'cosmetic'));closeDay(s);
 for(const mode of ['bogus','',null])unchanged(s,()=>P.restore(s,a.uid,mode));unchanged(s,()=>P.restore(s,'missing','preserve'));
 s.coins=0;for(const opt of P.restorationOptions(s,a))unchanged(s,()=>P.restore(s,a.uid,opt.mode));s.coins=10000;
 a.condition=4;assert.deepEqual(P.restorationOptions(s,a),[]);for(const mode of ['preserve','practical','cosmetic'])unchanged(s,()=>P.restore(s,a.uid,mode));
 const legacy=copy(s);delete legacy.planning;unchanged(legacy,()=>P.restore(legacy,a.uid,'preserve'));
});
test('Each restoration spends one shared slot and adds its entire cost to paid',()=>{
 for(const mode of ['preserve','practical','cosmetic']){
  const s=closeDay(fixture()),a=lot(s,{condition:1}),opt=P.restorationOptions(s,a).find(o=>o.mode===mode),coins=s.coins,paid=a.paid,apparent=a.apparent;
  assert(P.restore(s,a.uid,mode).ok);assert.equal(s.coins,coins-opt.cost);assert.equal(a.paid,paid+opt.cost);assert.equal(a.value,opt.value);assert.equal(a.condition,opt.condition);
  assert.equal(a.apparent,Math.round(apparent*E.CONDITIONS[a.condition][1]/E.CONDITIONS[1][1]));assert.equal(a.restorationMode,mode);assert.equal(a.restorationDay,s.day);
  assert.equal(s.night.actions,1);assert(s.night.done.includes('repair:'+a.uid));assert.equal(s.night.report.length,1);assert.equal(s.dayActivity.night,1);
  assert(E.validate(s));const saved=JSON.stringify(s);E.prepare(s);assert.equal(JSON.stringify(s),saved);
 }
});
test('Night work shares slots with research and cannot repeat by switching mode or legacy repair',()=>{
 const s=closeDay(fixture()),a=lot(s,{condition:0}),b=lot(s);assert(P.restore(s,a.uid,'preserve').ok);
 for(const mode of ['preserve','practical','cosmetic'])unchanged(s,()=>P.restore(s,a.uid,mode));unchanged(s,()=>E.nightAction(s,'repair',a.uid));
 assert(P.research(s).ok);unchanged(s,()=>P.restore(s,b.uid,'practical'));assert(E.validate(s));
 const t=closeDay(fixture()),c=lot(t,{condition:0});assert(E.nightAction(t,'repair',c.uid).ok);unchanged(t,()=>P.restore(t,c.uid,'preserve'));assert(E.validate(t));
});
test('Held damaged goods can be restored and actual conditions are rechecked at delivery',()=>{
 const s=fixture(),o=accepted(s),a=orderLot(s,o,{condition:Math.max(0,o.minCondition-1)});assert(P.assign(s,o.id,a.uid).ok);
 closeDay(s);assert.equal(P.restorationOptions(s,a).length,3);const paid=a.paid,coins=s.coins,opt=P.restorationOptions(s,a).find(x=>x.mode==='preserve');
 assert(P.restore(s,a.uid,'preserve').ok);assert.equal(a.orderId,o.id);assert.equal(a.paid,paid+opt.cost);assert.equal(s.coins,coins-opt.cost);
 day(s,o.dueDay);s.claimed=E.ACHIEVEMENTS.map(a=>a.id);const before=s.coins;
 assert(P.fulfill(s,o.id).ok);assert.equal(s.coins,before+o.price);assert.equal(s.dayProfit,o.price-paid-opt.cost);assert(E.validate(s));
});
test('Repeated restoration cannot stack a permanent value multiplier or improve intact originals',()=>{
 const s=fixture(),a=lot(s,{condition:0,value:720,apparent:720});const original=lot(s,{condition:4,value:1300});
 const profile={likes:['clock'],dislikes:[],temperament:'collector',expertise:1};assert.equal(P.buyerMultiplier(s,original,profile),1);
 for(let n=1;n<=4;n++){
  if(n>1)day(s,n);closeDay(s);assert(P.restore(s,a.uid,n%2?'preserve':'cosmetic').ok);assert.equal(a.condition,n);
  assert(P.buyerMultiplier(s,a,profile)<=1.12);for(const mode of ['preserve','practical','cosmetic'])unchanged(s,()=>P.restore(s,original.uid,mode));
 }
 assert(Math.abs(a.value-1300)<=2);day(s,5);closeDay(s);assert.deepEqual(P.restorationOptions(s,a),[]);unchanged(s,()=>P.restore(s,a.uid,'preserve'));
});
test('Buyer multipliers are one selected taste bonus, independent of market and paid costs',()=>{
 const s=fixture(),a=lot(s),profile={likes:['clock'],dislikes:[],temperament:'collector',expertise:.9};
 assert.equal(P.buyerMultiplier(s,a,profile),1);a.restorationMode='preserve';a.restorationDay=1;assert.equal(P.buyerMultiplier(s,a,profile),1.12);
 assert.equal(P.buyerMultiplier(s,a,{...profile,likes:['book']}),1);a.genuine=false;assert.equal(P.buyerMultiplier(s,a,profile),1);a.genuine=true;
 a.restorationMode='practical';assert.equal(P.buyerMultiplier(s,a,profile),1);assert.equal(P.buyerMultiplier(s,a,{...profile,temperament:'practical'}),1.1);
 a.restorationMode='cosmetic';assert.equal(P.buyerMultiplier(s,a,{...profile,temperament:'proud'}),1.1);assert.equal(P.buyerMultiplier(s,a,{...profile,temperament:'practical'}),1);
});
test('Malformed module state and dangling or double holds are rejected without repair mutations',()=>{
 const original=fixture();
 for(const modify of [s=>s.planning.version=2,s=>s.planning.seed=-1,s=>s.planning.lastDay=s.day+1,s=>s.planning.forecasts[0].mult=3,s=>s.planning.forecasts[0].category='bogus',s=>s.planning.orders[0].price=-1,s=>s.planning.orders[0].genuine='yes',s=>s.planning.orders.push(copy(s.planning.orders[0]))]){
  const s=copy(original);modify(s);assert.equal(P.valid(s),false);assert.equal(E.validate(s),false);const before=JSON.stringify(s);P.prepare(s);assert.equal(JSON.stringify(s),before);unchanged(s,()=>P.cancel(s,'missing'));
 }
 const s=fixture(),a=lot(s);a.orderId='missing';assert.equal(P.valid(s),false);delete a.orderId;a.restorationMode='bogus';a.restorationDay=1;assert.equal(P.valid(s),false);
});
test('Verified adventure story holds coexist with planning and orphan or corrupt story holds fail',()=>{
 const s=fixture(),a=lot(s);a.orderId='story:test-arc';
 s.adventures={version:1,arcs:{'test-arc':{id:'test-arc',status:'active',stage:2,pledged:true,late:false,lotUid:a.uid}}};
 assert(P.valid(s));const before=JSON.stringify(s);P.prepare(s);P.daily(s);assert.equal(JSON.stringify(s),before);
 for(const [key,value] of [['status','complete'],['stage',1],['pledged',false],['late',true],['lotUid','missing'],['id','other']]){
  const invalid=copy(s);invalid.adventures.arcs['test-arc'][key]=value;assert.equal(P.valid(invalid),false);
 }
 const o=accepted(s);unchanged(s,()=>P.assign(s,o.id,a.uid));closeDay(s);assert(P.restore(s,a.uid,'preserve').ok);
 delete s.adventures.arcs['test-arc'];assert.equal(P.valid(s),false);
});
test('Malformed days do not create forecasts, migrate, or loop',()=>{
 for(const badDay of [undefined,null,NaN,-1,0,Infinity,'1']){
  const s={day:badDay,stock:[]},before=JSON.stringify(s);P.prepare(s);assert.equal(JSON.stringify(s),before);assert.deepEqual(P.forecast(s),{active:[],upcoming:[]});assert.equal(P.daily(s).ok,false);
 }
});
if(fs.existsSync(path.join(__dirname,'adventures.js'))){
 test('Real adventure reservations validate alongside planning and remain restorable',()=>{
  const original=globalThis.PawnAdventures;
  vm.runInThisContext(fs.readFileSync(path.join(__dirname,'adventures.js'),'utf8'),{filename:'adventures.js'});
  try{
   const B=PawnAdventures,s=fixture();s.met[0]=1;day(s,2);B.daily(s);
   s.current.character=0;s.current.status='offered';assert(B.onVisit(s,s.current).ok);assert(B.chooseStory(s,'mocha-clock','start-trade').ok);
   day(s,3);B.daily(s);s.current.status='offered';assert(B.onVisit(s,s.current).ok);
   const a=lot(s);assert(B.chooseStory(s,'mocha-clock','plan-reserve').ok);assert.equal(a.orderId,'story:mocha-clock');
   assert(P.valid(s));assert(B.valid(s));assert(E.validate(s));closeDay(s);assert(P.restore(s,a.uid,'preserve').ok);assert(E.validate(s));
   const saved=JSON.stringify(s);E.prepare(s);assert.equal(JSON.stringify(s),saved);
  }finally{if(original===undefined)delete globalThis.PawnAdventures;else globalThis.PawnAdventures=original}
 });
 test('Real adventure narrative lots record the reservation buyer exactly once on delivery',()=>{
  const original=globalThis.PawnAdventures;
  vm.runInThisContext(fs.readFileSync(path.join(__dirname,'adventures.js'),'utf8'),{filename:'adventures.js'});
  try{
   const B=PawnAdventures;let s,o;
   for(let seed=1;seed<50;seed++){
    const candidate=fixture(seed);candidate.met={0:1};day(candidate,2);B.daily(candidate);
    candidate.current.character=0;candidate.current.status='offered';B.onVisit(candidate,candidate.current);B.chooseStory(candidate,'mocha-clock','start-trade');
    day(candidate,3);B.daily(candidate);candidate.current.status='offered';B.onVisit(candidate,candidate.current);
    const request=P.opportunities(candidate).find(o=>o.category==='clock');if(request){s=candidate;o=request;break}
   }
   assert(s&&o);const a=orderLot(s,o);assert(B.chooseStory(s,'mocha-clock','plan-open').ok);assert.equal(a.storyId,'mocha-clock');
   assert(P.acceptOrder(s,o.id).ok);assert(P.assign(s,o.id,a.uid).ok);day(s,o.dueDay);B.daily(s);assert(P.fulfill(s,o.id,a.uid).ok);
   const arc=s.adventures.arcs['mocha-clock'];assert.equal(arc.custody,'sold');assert.equal(arc.saleBuyer,o.character);assert(E.validate(s));
   unchanged(s,()=>P.fulfill(s,o.id,a.uid));assert.equal(arc.custody,'sold');
  }finally{if(original===undefined)delete globalThis.PawnAdventures;else globalThis.PawnAdventures=original}
 });
}
test('Long-running daily history, forecast and orders remain bounded and save-stable',()=>{
 const s=fixture(),seed=s.seed;
 for(let n=1;n<=180;n++){
  if(n>1)day(s,n);
  for(const o of P.opportunities(s)){
   if(n%2&&P.orders(s).filter(o=>o.status==='accepted').length<P.LIMITS.accepted)assert(P.acceptOrder(s,o.id).ok);
   else assert(P.cancel(s,o.id).ok);
  }
  assert(s.planning.orders.length<=25);assert(s.planning.forecasts.length<=3);assert(P.orders(s).filter(o=>['fulfilled','expired','cancelled'].includes(o.status)).length<=20);
  assert(P.valid(s));assert(E.validate(s));const before=JSON.stringify(s);P.daily(s);P.prepare(s);assert.equal(JSON.stringify(s),before);
 }
 assert.equal(s.seed,seed);const saved=JSON.stringify(s);E.prepare(s);assert.equal(JSON.stringify(s),saved);
 const earlier='order:1:0';unchanged(s,()=>P.fulfill(s,earlier,'missing'));unchanged(s,()=>P.acceptOrder(s,earlier));
});
console.log(JSON.stringify({tests,limits:P.LIMITS},null,2));
