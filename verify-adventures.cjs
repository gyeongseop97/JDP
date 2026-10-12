'use strict';
// Run: node verify-adventures.cjs. Only this file and adventures.js belong to this module.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const files=['items.js','characters.js','profiles.js','appraisal-data.js','legacy-item-appraisals.js','item-appraisals.js','guest-data.js','voices.js','trade-voice.js','affinity-voice.js','origin-data.js','customer-goals.js','evolution.js','dialogue-data.js','dialogue-reply.js','discovery-data.js','discovery.js','adventures.js','engine.js'];
for(const file of files)vm.runInThisContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{filename:file});
const E=PawnEngine,B=PawnAdventures,copy=x=>JSON.parse(JSON.stringify(x));let passed=0;
function test(name,fn){try{fn();passed++;console.log('PASS '+name)}catch(e){console.error('FAIL '+name);throw e}}
function unchanged(s,fn){const before=JSON.stringify(s);assert.equal(fn().ok,false);assert.equal(JSON.stringify(s),before)}
function stable(s){E.prepare(s);const before=JSON.stringify(s);B.prepare(s);B.stories(s);B.auction(s);B.valid(s);assert.equal(JSON.stringify(s),before);const restored=E.prepare(copy(s));assert.equal(JSON.stringify(restored),before,'reload must be byte-stable');assert(B.valid(restored),'adventure save validity');assert(E.validate(restored),'engine save validity');return restored}
function fixture(seed=61312){const s=E.create(seed);s.coins=100000;s.claimed=E.ACHIEVEMENTS.map(a=>a.id);s.activeEvent={id:'adventure-test',day:s.day,kind:'rumor',category:'all',mult:1,gift:0};B.prepare(s);return s}
function day(s,n){s.day=n;s.visitor=1;s.activeEvent.day=n;s.closing=false;s.night=null;s.dayActivity={trades:0,night:0};s.dayBought=0;s.dayProfit=0;B.daily(s)}
function visit(s,index,itemId){
 const fresh=copy(E.create(81819).current);Object.assign(fresh,{uid:'test-visit-'+s.day+'-'+s.serial++,character:index});
 if(itemId)Object.assign(fresh,{itemId,grade:3,claimedGrade:3,condition:2,genuine:true,value:Math.round(E.item(itemId).base*E.GRADES[3][2]),apparent:Math.round(E.item(itemId).base*E.GRADES[3][2]),price:80,asking:80,baseFloor:50,floor:50});
 delete fresh.investigationVersion;s.current=fresh;s.met[index]=(s.met[index]||0)+1;s.relationships[index]=s.relationships[index]||0;E.prepare(s);B.onVisit(s,s.current);assert(B.valid(s));return s.current;
}
function close(s){s.closing=true;s.night={day:s.day,actions:2,done:[],report:[]};s.dayActivity.night=0}
function coffee(s,index,topic='story'){close(s);assert(E.nightAction(s,'tea',String(index)).ok);assert(B.observeCoffee(s,index,topic).ok)}
const definitions=[
 {id:'mocha-clock',index:0,itemId:'clock-01',paths:['shelter','trade'],finish:['finish-give','finish-deliver']},
 {id:'yuri-bell',index:2,itemId:'relic-01',paths:['home','museum'],finish:['finish-return','finish-exhibit']},
 {id:'gear-order',index:18,itemId:'tool-01',paths:['civic','commission'],finish:['finish-deliver','finish-deliver']},
 {id:'seoga-book',index:20,itemId:'book-01',paths:['readers','collector'],finish:['finish-library','finish-collector']}
];
function card(s,id){return B.stories(s).find(c=>c.id===id)}
function begin(d,pathIndex=0,reserve=true){
 let s=fixture();day(s,2);visit(s,d.index,d.itemId);
 assert(B.chooseStory(s,d.id,'start-'+d.paths[pathIndex]).ok);
 const evidence=copy(s.current.evidence),uid=s.current.uid,price=s.current.price;
 assert(E.accept(s).ok);const lot=s.stock.find(l=>l.uid===uid);assert(lot);assert.equal(lot.paid,price);assert.deepEqual(s.current.evidence,evidence);
 B.onBought(s,s.current,lot); // Hooks are deliberately safe to repeat.
 if(d.id==='yuri-bell')assert.equal(lot.storyId,d.id);
 day(s,3);visit(s,d.index);assert(B.chooseStory(s,d.id,reserve?'plan-reserve':'plan-open').ok);
 s=stable(s);return {s,lot:s.stock.find(l=>l.uid===uid)};
}
function ready(d,pathIndex=0,reserve=true){const r=begin(d,pathIndex,reserve);day(r.s,4);visit(r.s,d.index);coffee(r.s,d.index);return r}
function auctionFixture(seed=61312){const s=fixture(seed);day(s,3);close(s);assert(B.auction(s).open);return s}

test('API exports exactly the agreed twelve state-only functions',()=>{
 assert.deepEqual(Object.keys(B).sort(),['prepare','valid','daily','stories','chooseStory','onVisit','onBought','onSale','observeCoffee','auction','inspectAuction','bid'].sort());
 const source=fs.readFileSync(path.join(__dirname,'adventures.js'),'utf8');assert(!/\b(document|localStorage|setInterval|setTimeout)\b/.test(source));
});
test('Missing expansion state and legacy fixtures validate; preparation never rerolls or changes engine data',()=>{
 const s=fixture();delete s.adventures;assert(B.valid(s));const before=copy(s);assert.equal(B.prepare(s),s);const after=copy(s);delete after.adventures;assert.deepEqual(after,before);stable(s);
 for(const file of ['migration-v4-fixture.json','migration-v5-fixture.json','migration-v6-fixture.json']){const legacy=JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8'));assert(B.valid(legacy));E.prepare(legacy);assert(B.valid(legacy));assert(E.validate(legacy));stable(legacy)}
 assert.equal(B.valid(null),false);
});
test('Daily unlock needs day 2, a met character and nonnegative relationship, and never invents encounters',()=>{
 const s=fixture();assert.equal(B.stories(s).length,0);s.met={0:1,2:1,18:1};s.relationships={0:0,2:-1,18:0};day(s,2);
 assert.deepEqual(B.stories(s).map(c=>c.id),['mocha-clock','gear-order']);assert(B.stories(s).every(c=>!c.available));
 const before=JSON.stringify(s);assert(B.daily(s).repeated);assert.equal(JSON.stringify(s),before);
 unchanged(s,()=>B.chooseStory(s,'mocha-clock','start-shelter'));assert.equal(B.auction(s),null);
});
test('Unrelated, stale, closed and fabricated encounter callbacks cannot add visits',()=>{
 const s=fixture();day(s,2);const o=visit(s,0);const a=s.adventures.arcs['mocha-clock'];const before=copy(a.visits);
 unchanged(s,()=>B.onVisit(s,copy(o)));close(s);unchanged(s,()=>B.onVisit(s,o));assert.deepEqual(a.visits,before);
 s.closing=false;s.night=null;o.status='left';unchanged(s,()=>B.onVisit(s,o));
 o.status='offered';const snapshot=JSON.stringify(s);assert(B.onVisit(s,o).repeated);assert.equal(JSON.stringify(s),snapshot);
});
test('Three separate visit days and a later real trade or coffee are required, even through save/load',()=>{
 const d=definitions[0];let {s}=begin(d);
 const a=s.adventures.arcs[d.id];assert.equal(a.stage,2);assert.equal(a.visits.length,2);
 unchanged(s,()=>B.chooseStory(s,d.id,'finish-give'));unchanged(s,()=>B.chooseStory(s,d.id,'plan-open'));
 day(s,4);coffee(s,d.index);assert(!card(s,d.id).available);unchanged(s,()=>B.chooseStory(s,d.id,'finish-give'));
 s.closing=false;s.night=null;visit(s,d.index);assert(card(s,d.id).available);s=stable(s);
 assert.equal(s.adventures.arcs[d.id].visits.length,3);assert(B.chooseStory(s,d.id,'finish-give').completed);assert.equal(s.adventures.arcs[d.id].stage,3);stable(s);
});
test('All four arcs, both authored paths and every ending have real consequences and no duplicate rewards',()=>{
 for(const d of definitions)for(let pathIndex=0;pathIndex<2;pathIndex++)for(const reserve of [false,true]){
  const preview=ready(d,pathIndex,reserve);const options=card(preview.s,d.id).choices;assert(options.length>=2);
  for(const option of options){const s=copy(preview.s),lot=s.stock.find(l=>l.uid===preview.lot.uid),cash=s.coins,profit=s.profit,sold=s.sold,beforeRelation=E.relationship(s,d.index);
   assert(option.enabled);const result=B.chooseStory(s,d.id,option.id);assert(result.ok&&result.completed);assert.equal(result.stage,3);
   assert.equal(s.coins,cash+option.reward);assert.equal(E.relationship(s,d.index),beforeRelation+option.relationship);
   assert.equal(s.stock.some(l=>l.uid===lot.uid),!option.consumesItem);assert.equal(s.profit,profit+(option.consumesItem?option.reward-lot.paid:0));
   assert.equal(s.sold,sold+(option.reward>0?1:0));assert(!s.stock.find(l=>l.uid===lot.uid)?.orderId);assert(!card(s,d.id));
   unchanged(s,()=>B.chooseStory(s,d.id,option.id));unchanged(s,()=>B.chooseStory(s,d.id,'start-'+d.paths[pathIndex]));stable(s);
  }
 }
});
test('Yuri heirloom association preserves paid price, identity, evidence and all previous stock',()=>{
 const d=definitions[1],s=fixture();day(s,2);visit(s,d.index,d.itemId);B.chooseStory(s,d.id,'start-home');const o=s.current;
 const seed=s.seed,evidence=copy(o.evidence),identity={uid:o.uid,itemId:o.itemId,value:o.value,genuine:o.genuine,grade:o.grade};
 assert(E.accept(s).ok);const lot=s.stock.find(l=>l.uid===o.uid),paid=lot.paid;const before=JSON.stringify(s);assert(B.onBought(s,o,lot).repeated);assert.equal(JSON.stringify(s),before);
 assert.equal(lot.storyId,d.id);assert.equal(s.adventures.arcs[d.id].lotUid,lot.uid);assert.equal(lot.paid,paid);assert.equal(s.seed,seed);assert.deepEqual(o.evidence,evidence);
 for(const [key,value] of Object.entries(identity))assert.equal(o[key],value);stable(s);
});
test('Wrong-item, unsold and fake callback objects cannot associate or sell an heirloom',()=>{
 const s=fixture();day(s,2);visit(s,2,'relic-01');B.chooseStory(s,'yuri-bell','start-home');const o=s.current;
 unchanged(s,()=>B.onBought(s,o,{uid:o.uid,itemId:o.itemId}));assert(E.accept(s).ok);const lot=s.stock[0];
 unchanged(s,()=>B.onSale(s,lot,null));unchanged(s,()=>B.onSale(s,lot,-1));stable(s);
});
test('Active buyer negotiation, wrong categories, replicas and damaged repair tools block reservation without mutation',()=>{
 const d=definitions[2],s=fixture();day(s,2);visit(s,d.index,d.itemId);B.chooseStory(s,d.id,'start-civic');assert(E.accept(s).ok);day(s,3);visit(s,d.index);
 const lot=s.stock[0];lot.condition=1;unchanged(s,()=>B.chooseStory(s,d.id,'plan-reserve'));lot.condition=2;lot.genuine=false;unchanged(s,()=>B.chooseStory(s,d.id,'plan-reserve'));lot.genuine=true;
 lot.itemId='clock-01';unchanged(s,()=>B.chooseStory(s,d.id,'plan-reserve'));lot.itemId=d.itemId;
 s.current.kind='buyer';s.current.stockUid=lot.uid;unchanged(s,()=>B.chooseStory(s,d.id,'plan-reserve'));
});
test('Story reservations reserve real stock, clear price tags, and coexist with unrelated planning orders',()=>{
 const {s,lot}=begin(definitions[2]);assert.equal(lot.orderId,'story:gear-order');assert.equal(lot.displayAt,null);assert(B.valid(s));
 const unrelated={...copy(lot),uid:'planning-test',itemId:'clock-01',orderId:'planning-order-1'};delete unrelated.storyId;s.stock.push(unrelated);assert(B.valid(s));
 for(const mutate of [x=>delete x.stock[0].orderId,x=>delete x.stock[0].storyId,x=>x.stock[0].orderId='story:missing',x=>x.adventures.arcs['gear-order'].pledged=false]){const invalid=copy(s);mutate(invalid);assert.equal(B.valid(invalid),false)}
});
test('Disclosed repair deadline releases custody lock and lowers only the voluntary offer, with no cash or relation penalty',()=>{
 const d=definitions[2],{s,lot}=begin(d,1),a=s.adventures.arcs[d.id],deadline=a.deadline,cash=s.coins,rel=E.relationship(s,d.index),paid=lot.paid;
 assert.equal(deadline,10);assert(card(s,d.id).text.includes('10일'));day(s,deadline);assert(lot.orderId);day(s,deadline+1);
 assert(a.late);assert(!lot.orderId);assert.equal(s.coins,cash);assert.equal(lot.paid,paid);assert.equal(E.relationship(s,d.index),rel);
 visit(s,d.index);coffee(s,d.index);const option=card(s,d.id).choices.find(c=>c.id==='finish-deliver');assert.equal(option.reward,Math.round(lot.value*.95));assert(card(s,d.id).text.includes('벌금은 없습니다'));stable(s);
 const before=JSON.stringify(s);B.daily(s);assert.equal(JSON.stringify(s),before);
});
test('Passive, quick and customer sales record lost custody without fees; finale cannot pay for a sold item',()=>{
 for(const buyer of [null,0,2,18,20]){
  const d=definitions[1],{s,lot}=begin(d,0,false),cash=s.coins,relation=E.relationship(s,d.index);
  s.stock.splice(s.stock.indexOf(lot),1);assert(B.onSale(s,lot,buyer).ok);assert.equal(s.coins,cash);assert.equal(E.relationship(s,d.index),relation);
  const before=JSON.stringify(s);assert(B.onSale(s,lot,buyer).repeated);assert.equal(JSON.stringify(s),before);
  day(s,4);visit(s,d.index);coffee(s,d.index);const option=card(s,d.id).choices[0];assert.equal(option.reward,0);assert(!option.consumesItem);assert(B.chooseStory(s,d.id,option.id).ok);stable(s);
 }
 // Verify the real engine settleSale callback when present; older engines can call it explicitly.
 const {s,lot}=begin(definitions[1],0,false);assert(E.sell(s,lot.uid).ok);B.onSale(s,lot,null);assert.equal(s.adventures.arcs['yuri-bell'].custody,'sold');stable(s);
});
test('Coffee observes only a paid correct-character action, costs no extra action, and cannot fabricate revisits',()=>{
 const s=fixture();day(s,2);visit(s,0);B.chooseStory(s,'mocha-clock','start-shelter');close(s);
 unchanged(s,()=>B.observeCoffee(s,0,'shelter'));assert(E.nightAction(s,'tea','0').ok);const before=JSON.stringify(s.night),cash=s.coins;
 assert(B.observeCoffee(s,0,'shelter').ok);assert.equal(JSON.stringify(s.night),before);assert.equal(s.coins,cash);assert.equal(s.adventures.arcs['mocha-clock'].visits.length,1);
 const saved=JSON.stringify(s);assert(B.observeCoffee(s,0,'story').repeated);assert.equal(JSON.stringify(s),saved);unchanged(s,()=>B.observeCoffee(s,2,'memory'));unchanged(s,()=>B.observeCoffee(s,0,'unknown'));stable(s);
});
test('Several arrivals in one day cannot advance stages; an actual later purchase can replace coffee at the finale',()=>{
 const d=definitions[0],s=fixture();day(s,2);visit(s,d.index,d.itemId);B.chooseStory(s,d.id,'start-shelter');assert(E.accept(s).ok);
 visit(s,d.index);visit(s,d.index);assert.equal(s.adventures.arcs[d.id].visits.length,1);unchanged(s,()=>B.chooseStory(s,d.id,'plan-open'));
 day(s,3);visit(s,d.index);assert(B.chooseStory(s,d.id,'plan-open').ok);day(s,4);visit(s,d.index,d.itemId);
 assert(!card(s,d.id).available);unchanged(s,()=>B.chooseStory(s,d.id,'finish-give'));assert(E.accept(s).ok);
 assert(card(s,d.id).available);assert.equal(s.adventures.arcs[d.id].coffee.length,0);assert(B.chooseStory(s,d.id,'finish-give').completed);stable(s);
});
test('Planning and adventure validators independently accept genuine foreign story reservations',()=>{
 const {s}=begin(definitions[2]);const sandbox={PawnEngine:E,PAWN_ITEMS,PAWN_CHARACTERS,PAWN_PROFILES,PawnAdventures:B};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'planning.js'),'utf8'),sandbox,{filename:'planning.js'});
 sandbox.PawnPlanning.prepare(s);sandbox.PawnPlanning.daily(s);assert(sandbox.PawnPlanning.valid(s));assert(B.valid(s));
 s.stock[0].displayAt=0;s.stock[0].displayPrice=100;assert.equal(sandbox.PawnPlanning.valid(s),false);assert.equal(B.valid(s),false);
});
test('Auction first appears on day 3, stays read-only in shop, and is created once per seven-day game week',()=>{
 const s=fixture();day(s,2);assert.equal(B.auction(s),null);day(s,3);const first=B.auction(s),seed=s.seed;assert.equal(first.day,3);assert(!first.open);
 unchanged(s,()=>B.inspectAuction(s,first.lots[0].id));unchanged(s,()=>B.bid(s,first.lots[0].id,1000));
 for(let n=4;n<=9;n++){day(s,n);assert.equal(B.auction(s).id,first.id);close(s);assert(!B.auction(s).open)}
 day(s,10);assert.notEqual(B.auction(s).id,first.id);assert.equal(B.auction(s).day,10);assert.equal(s.seed,seed);stable(s);
});
test('Two free inspections across the whole auction reveal only inspected actual traces and survive reload',()=>{
 const s=auctionFixture(),a=s.adventures.auction,ids=a.lots.map(l=>l.id),cash=s.coins,night=copy(s.night);
 assert(B.auction(s).lots.every(l=>!l.inspected&&l.traces.length===0));const first=B.inspectAuction(s,ids[0]);assert(first.ok&&first.traces.length===2);
 assert(B.inspectAuction(s,ids[0]).repeated);assert.equal(B.auction(s).inspectionsLeft,1);assert(B.inspectAuction(s,ids[1]).ok);assert.equal(B.auction(s).inspectionsLeft,0);
 unchanged(s,()=>B.inspectAuction(s,ids[2]));assert.equal(s.coins,cash);assert.deepEqual(s.night,night);assert.equal(B.auction(s).lots[2].traces.length,0);
 const lot=a.lots[0],catalog=PAWN_ITEM_APPRAISALS[lot.itemId];assert.equal(first.traces[0],catalog.authenticity[lot.hidden.genuine?'observedGenuine':'observedReplica']);stable(s);
});
test('Public views never leak hidden grade, condition, authenticity, value, rival budget or references',()=>{
 const s=auctionFixture();let view=B.auction(s);const forbidden=['hidden','grade','claimedGrade','genuine','condition','value','apparent','rivalMax'];
 for(const lot of view.lots)for(const key of forbidden)assert(!Object.hasOwn(lot,key));
 view.lots[0].traces.push('injected');view.lots[0].opening=1;assert.equal(B.auction(s).lots[0].traces.length,0);assert.notEqual(B.auction(s).lots[0].opening,1);
 B.inspectAuction(s,view.lots[0].id);view=B.auction(s);for(const lot of view.lots)for(const key of forbidden)assert(!Object.hasOwn(lot,key));assert.equal(view.lots[1].traces.length,0);stable(s);
});
test('Insufficient maximum cash, full stock, invalid bids and exhausted first-night resources are immutable',()=>{
 const s=auctionFixture(),id=B.auction(s).lots[0].id,opening=B.auction(s).lots[0].opening;
 for(const amount of [NaN,Infinity,undefined,'100',0,-1,1.2,opening-1,1000000000])unchanged(s,()=>B.bid(s,id,amount));
 unchanged(s,()=>B.bid(s,'missing',1000));s.coins=opening-1;unchanged(s,()=>B.bid(s,id,opening));s.coins=100000;
 const it=PAWN_ITEMS[0];while(s.stock.length<E.capacity(s))s.stock.push({uid:'full-'+s.stock.length,itemId:it.id,grade:1,claimedGrade:1,condition:2,genuine:true,value:it.base,apparent:it.base,paid:80,sourceCharacter:0,displayAt:null});
 unchanged(s,()=>B.bid(s,id,1000));s.stock=[];s.night={day:s.day,actions:0,done:['tea:0','tea:2'],report:['tea','tea']};s.dayActivity.night=2;unchanged(s,()=>B.bid(s,id,1000));
 assert(B.inspectAuction(s,id).ok);stable(s);
});
test('Hidden rival resolves deterministic second-price cost capped at maximum; ties lose free and cannot retry',()=>{
 for(const mode of ['abstain','step','cap','tie','lose']){
  const s=auctionFixture(),l=s.adventures.auction.lots[0];l.hidden.rivalMax=mode==='abstain'?0:l.opening+37;
  const max=mode==='abstain'?l.opening:mode==='cap'?l.hidden.rivalMax+1:mode==='tie'?l.hidden.rivalMax:mode==='lose'?l.opening:l.hidden.rivalMax+l.step+100;
  const cash=s.coins,night=copy(s.night),result=B.bid(s,l.id,max),won=!['tie','lose'].includes(mode);assert(result.ok);assert.equal(result.won,won);
  if(won){const cost=Math.min(max,Math.max(l.opening,l.hidden.rivalMax+l.step));assert.equal(result.cost,cost);assert.equal(result.lot.paid,cost);assert.equal(s.coins,cash-cost);assert.equal(s.night.actions,1);assert.equal(s.stock[0].sourceCharacter,0);}
  else{assert.equal(s.coins,cash);assert.deepEqual(s.night,night);assert.deepEqual(B.auction(s).lots[0].result,{won:false});assert(!Object.hasOwn(result,'lot'));}
  unchanged(s,()=>B.bid(s,l.id,100000));unchanged(s,()=>B.inspectAuction(s,l.id));stable(s);
 }
});
test('Whole auction consumes one night action even for three wins, with matching reports and day activity',()=>{
 const s=auctionFixture();for(const l of s.adventures.auction.lots)l.hidden.rivalMax=0;
 const before=E.dayBonus(s).activity;for(const l of s.adventures.auction.lots)assert(B.bid(s,l.id,l.opening).won);
 assert.equal(s.night.actions,1);assert.equal(s.night.done.length,1);assert.equal(s.night.report.length,1);assert.equal(s.dayActivity.night,1);assert.equal(s.dayActivity.trades,3);
 assert.equal(E.dayBonus(s).activity-before,44);assert.equal(s.bought,3);assert.equal(s.dayBought,3);assert.equal(s.stock.length,3);assert(B.auction(s).actionSpent);assert.equal(B.auction(s).actionCost,0);stable(s);
 s.met[0]=1;assert(E.nightAction(s,'tea','0').ok);assert.equal(s.night.actions,0);assert.equal(s.night.done.length,2);assert.equal(s.night.report.length,2);assert.equal(s.dayActivity.night,2);stable(s);
});
test('Other night activity can precede the auction without breaking report indexes, budgets or rereads',()=>{
 const s=auctionFixture();s.met[0]=1;assert(E.nightAction(s,'tea','0').ok);const original=s.night.report[0],l=s.adventures.auction.lots[0];l.hidden.rivalMax=0;
 assert(B.bid(s,l.id,l.opening).won);assert.equal(s.night.actions,0);assert.equal(s.night.report[0],original);assert(s.night.report[1].includes('낙찰'));stable(s);
});
test('Save/reload cannot reroll rivals, resolve a lost lot again, or duplicate discovery or achievements',()=>{
 let s=auctionFixture();const first=s.adventures.auction.lots[0];first.hidden.rivalMax=first.opening+1;assert.equal(B.bid(s,first.id,first.opening).won,false);
 s=stable(s);unchanged(s,()=>B.bid(s,first.id,100000));const l=s.adventures.auction.lots[1],hidden=copy(l.hidden),id=l.id,cash=s.coins;
 const replay=copy(s),a=B.bid(s,id,10000),b=B.bid(replay,id,10000);assert.deepEqual(a,b);assert.deepEqual(s,replay);assert.deepEqual(s.adventures.auction.lots[1].hidden,hidden);
 assert.equal(s.coins,cash-a.cost);const saved=JSON.stringify(s);stable(s);assert.equal(JSON.stringify(s),saved);assert.equal(s.discovered[l.itemId].count,1);
});
test('Winning view reveals only the purchased lot and never private result extensions or mutable references',()=>{
 const s=auctionFixture(),l=s.adventures.auction.lots[0];l.hidden.rivalMax=0;assert(B.bid(s,l.id,l.opening).won);
 l.result.rivalMax=987654;l.result.lot.privateNote='hidden';const v=B.auction(s).lots[0].result;
 assert(v.won);assert.equal(v.lot.grade,l.hidden.grade);assert.equal(v.lot.genuine,l.hidden.genuine);assert.equal(v.lot.value,l.hidden.value);
 assert(!Object.hasOwn(v,'rivalMax'));assert(!Object.hasOwn(v.lot,'privateNote'));v.lot.value=0;assert.equal(l.result.lot.value,l.hidden.value);
 delete l.result.rivalMax;delete l.result.lot.privateNote;stable(s);
});
test('Hundreds of seeded auctions use engine grades, conditions and item-based fake values with hidden pre-win views',()=>{
 let fakes=0,real=0;
 for(let seed=1;seed<=150;seed++){
  const s=auctionFixture(seed);assert(B.valid(s));
  for(const l of s.adventures.auction.lots){
   const h=l.hidden,it=E.item(l.itemId),apparent=Math.max(8,Math.round(it.base*E.GRADES[h.grade][2]*E.CONDITIONS[h.condition][1]));assert.equal(h.apparent,apparent);
   if(h.genuine){real++;assert.equal(h.value,Math.round(it.base*E.GRADES[h.grade][2]*E.CONDITIONS[h.condition][1]));}else{fakes++;assert(h.value>=Math.round(apparent*.055)&&h.value<=Math.round(apparent*.215));}
   assert.equal(B.auction(s).lots.find(v=>v.id===l.id).result,null);
  }
  assert.equal(s.seed,E.create(seed).seed);
 }
 assert(fakes>50&&real>200);
});
test('Malformed story, auction and resource saves reject without mutation, while unrelated stock orders remain valid',()=>{
 const {s}=begin(definitions[2]);
 const mutations=[x=>x.stock.push(null),x=>x.day=NaN,x=>x.adventures.version=2,x=>x.adventures.lastDay=x.day+1,x=>x.adventures.arcs['unknown']={},x=>x.adventures.arcs['gear-order'].visits.push(3),x=>x.adventures.arcs['gear-order'].stage=9,
  x=>x.adventures.arcs['gear-order'].path='missing',x=>x.adventures.arcs['gear-order'].settled=true,x=>x.adventures.auction.inspections=3,x=>x.adventures.auction.lots[0].hidden.grade=99,
  x=>x.adventures.auction.lots[0].hidden.value=1,x=>x.adventures.auction.actionSpent=true,x=>x.adventures.auction.lots[0].traces.push('leak')];
 for(const mutate of mutations){const invalid=copy(s);mutate(invalid);const before=JSON.stringify(invalid);assert.equal(B.valid(invalid),false);assert.equal(JSON.stringify(invalid),before)}
});
test('Real engine roll hooks record only actual arrivals and never alter the normal random visitor sequence',()=>{
 const source=fs.readFileSync(path.join(__dirname,'engine.js'),'utf8');if(!source.includes('PawnAdventures?.onVisit'))return;
 const sandbox={console:{log(){}}};vm.createContext(sandbox);for(const file of files.filter(f=>f!=='adventures.js'))vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),sandbox,{filename:file});
 let s=fixture(91637),plain=sandbox.PawnEngine.create(91637);s.coins=plain.coins=100000;
 for(let i=0;i<120;i++){assert.equal(s.current.uid,plain.current.uid);assert.equal(s.current.character,plain.current.character);assert.equal(s.current.itemId,plain.current.itemId);assert.equal(s.seed,plain.seed);if(s.closing){E.nextDay(s);sandbox.PawnEngine.nextDay(plain)}else{E.next(s);sandbox.PawnEngine.next(plain)}assert(B.valid(s));assert(E.validate(s))}
});
console.log(JSON.stringify({adventureTests:passed}));
