'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
for(const file of ['items.js','characters.js','profiles.js','appraisal-data.js','legacy-item-appraisals.js','item-appraisals.js','guest-data.js','voices.js','trade-voice.js','affinity-voice.js','origin-data.js','customer-goals.js','evolution.js','dialogue-data.js','dialogue-reply.js','discovery-data.js','discovery.js','engine.js'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{filename:file});
const E=PawnEngine,copy=x=>JSON.parse(JSON.stringify(x));let tests=0;
function test(name,fn){try{fn();tests++;console.log('PASS '+name)}catch(error){console.error('FAIL '+name);throw error}}
function unchanged(s,fn){const before=JSON.stringify(s);assert.equal(fn().ok,false);assert.equal(JSON.stringify(s),before)}
function quiet(s){s.activeEvent={id:'market-check-quiet',day:s.day,kind:'rumor',category:'all',mult:1,gift:0};return s}
function fixture(seed=61201){const s=quiet(E.create(seed));s.coins=100000;s.eventDone=false;return s}
function lot(s,changes={}){const entry={uid:'market-lot-'+s.stock.length,itemId:'clock-01',grade:3,claimedGrade:3,condition:2,genuine:true,value:100,apparent:100,paid:80,displayAt:null,sourceCharacter:0,...changes};s.stock.push(entry);return entry}
function advance(s){if(s.closing)E.nextDay(s);else E.next(s)}
function closeDay(s){s.visitor=8;s.current.status='left';E.next(s);assert(s.closing)}
function buyer(s,selected){const o=s.current;Object.assign(o,{kind:'buyer',character:0,uid:'market-buyer',itemId:selected.itemId,stockUid:selected.uid,grade:selected.grade,claimedGrade:selected.claimedGrade,condition:selected.condition,genuine:selected.genuine,value:selected.value,apparent:selected.apparent,paid:selected.paid,price:120,asking:120,baseFloor:0,floor:0,patience:6,mood:0,status:'offered',acceptedOffer:false,talked:[],history:[],notes:[],buyerQuotes:{},purchasePurpose:{version:1,category:E.item(selected.itemId).category,itemId:selected.itemId,requestedUid:selected.uid,legacy:false,use:'연습에 쓸',name:E.item(selected.itemId).name,minCondition:0,minGrade:0}});for(const entry of s.stock)o.buyerQuotes[entry.uid]={uid:entry.uid,price:120,initialPrice:120,maxBase:200,perceivedValue:160,detected:false,disclosed:false,acceptedOffer:false,lastOffer:null,taste:1,assertRoll:1,asserted:false};s.relationships[0]=0;s.met[0]=1;return E.prepare(s)}
// Invert the game's LCG so a real seeded draw lies just below or above the sale threshold.
const MOD=1n<<32n,A=1664525n,C=1013904223n;
function inverse(a,m){let x=0n,y=1n,b=m;while(a){const q=b/a;[b,a]=[a,b-q*a];[x,y]=[y,x-q*y]}return (x+m)%m}
const INV=inverse(A,MOD);
function seedFor(raw){return Number(((BigInt(raw)-C)*INV%MOD+MOD)%MOD)}
function setDraw(s,ratio){s.seed=seedFor(Math.floor(ratio*Number(MOD)))}
function close(a,b){assert(Math.abs(a-b)<1e-12,a+' != '+b)}

test('Unpriced stock never sells automatically across repeated visitors and reloads',()=>{
 const s=fixture(),entry=lot(s),cash=s.coins,profit=s.profit;for(let n=0;n<240;n++){advance(s);assert(s.stock.some(x=>x.uid===entry.uid));if(n%17===0){const saved=JSON.stringify(s);assert.equal(JSON.stringify(E.prepare(copy(s))),saved);}}
 assert.equal(s.profit,profit);assert.equal(s.sold,0);assert(s.coins>=cash);assert.equal(entry.displayAt,null);assert.equal(E.listingChance(s,entry),0);assert(E.validate(s));
});
test('Listing prices can be set, changed and removed without transferring money or rerolling evidence',()=>{
 const s=fixture(),entry=lot(s),cash=s.coins,seed=s.seed,history=copy(s.current.history),evidence=copy(s.current.evidence);assert(E.setListing(s,entry.uid,150).ok);assert.equal(entry.displayAt,s.turn);assert.equal(entry.displayPrice,150);assert(E.setListing(s,entry.uid,125).ok);assert.equal(entry.displayPrice,125);assert(E.setListing(s,entry.uid,null).ok);assert.equal(entry.displayAt,null);assert.equal(E.listingChance(s,entry),0);assert.equal(s.coins,cash);assert.equal(s.profit,0);assert.equal(s.seed,seed);assert.deepEqual(s.current.history,history);assert.deepEqual(s.current.evidence,evidence);assert(E.validate(s));
});
test('Invalid prices and unknown stock reject without changing any state',()=>{
 const s=fixture(),entry=lot(s);for(const price of [0,-1,1.5,NaN,Infinity,'100',undefined,1000000000])unchanged(s,()=>E.setListing(s,entry.uid,price));unchanged(s,()=>E.setListing(s,'missing',100));assert(E.setListing(s,entry.uid,999999999).ok);assert.equal(entry.displayPrice,999999999);assert(E.setListing(s,entry.uid,null).ok);
});
test('Display capacity limits price tags alone and listed stock stays available to visiting buyers',()=>{
 const s=fixture(),entries=Array.from({length:4},()=>lot(s));for(const entry of entries.slice(0,3))assert(E.setListing(s,entry.uid,999999999).ok);unchanged(s,()=>E.setListing(s,entries[3].uid,100));assert(E.setListing(s,entries[0].uid,120).ok);assert(E.setListing(s,entries[0].uid,null).ok);assert(E.setListing(s,entries[3].uid,999999999).ok);assert.equal(s.stock.length,4);assert.equal(s.stock.filter(x=>x.displayAt!==null).length,3);assert(E.upgrade(s,'shelves').ok);assert(E.setListing(s,entries[0].uid,999999999).ok);assert.equal(s.stock.filter(x=>x.displayAt!==null).length,4);
 buyer(s,entries[0]);assert(E.chooseStock(s,entries[3].uid).ok);assert.equal(s.current.stockUid,entries[3].uid);assert(E.validate(s));
});
test('Listing chance follows price suitability, market demand and reputation without read-side mutations',()=>{
 const s=fixture(),entry=lot(s),before=JSON.stringify(s);assert.equal(E.quote(s,entry,'display'),100);close(E.listingChance(s,entry,25),.30);close(E.listingChance(s,entry,50),.30);close(E.listingChance(s,entry,75),.21);close(E.listingChance(s,entry,100),.12);close(E.listingChance(s,entry,150),.03);assert.equal(E.listingChance(s,entry,200),0);assert.equal(E.listingChance(s,entry,999999999),0);assert.equal(JSON.stringify(s),before);
 s.upgrades.word=2;s.activeEvent={id:'market-check-demand',day:s.day,kind:'market',category:'clock',mult:1.4,gift:0};const fair=Math.round(100*1.4*1.07);assert.equal(E.quote(s,entry,'display'),fair);close(E.listingChance(s,entry,fair),.12);assert.equal(E.listingChance(s,entry,fair*2),0);
});
test('Appraisal value ranges use the same reputation and market basis as fair price tags',()=>{
 const s=fixture(),it=E.item(s.current.itemId);s.current.judgment={authenticity:1,quality:1,condition:1};
 for(const word of [0,2])for(const matching of [true,false]){
  s.upgrades.word=word;s.activeEvent={id:'valuation-demand',day:s.day,kind:'market',category:matching?it.category:it.category==='clock'?'book':'clock',mult:1.4,gift:0};
  const factor=(1+word*.035)*(matching?1.4:1),before=JSON.stringify(s),value=E.valuation(s);
  // Genuine, middle quality and middle condition span grades 2..4 and conditions 2..3.
  assert.equal(value.ordinary,Math.round(it.base*factor));assert.equal(value.min,Math.round(it.base*1.6*factor));assert.equal(value.max,Math.round(it.base*4.2*1.15*factor));
  assert.equal(value.ordinary,E.quote(s,{itemId:it.id,value:it.base,paid:0},'display'));assert.equal(value.profitMin,value.min-s.current.price);assert.equal(value.profitMax,value.max-s.current.price);assert.equal(value.complete,true);assert.equal(JSON.stringify(s),before);
 }
});
test('Real seeded draws immediately below and above the threshold cause sale and no sale respectively',()=>{
 for(const success of [true,false]){const s=fixture(),entry=lot(s),cash=s.coins;assert(E.setListing(s,entry.uid,100).ok);const probability=E.listingChance(s,entry),raw=success?Math.floor(probability*Number(MOD)):Math.ceil(probability*Number(MOD));s.seed=seedFor(raw);assert.equal((Math.imul(s.seed,1664525)+1013904223)>>>0,raw);E.next(s);assert.equal(!s.stock.some(x=>x.uid===entry.uid),success);assert.equal(s.coins,cash+(success?100:0));assert.equal(s.profit,success?20:0);assert.equal(s.sold,success?1:0);assert(E.validate(s));}
});
test('There is no two-visitor deadline and the same price can sell on a later random attempt',()=>{
 const s=fixture(),entry=lot(s),cash=s.coins;assert(E.setListing(s,entry.uid,100).ok);for(let n=0;n<2;n++){setDraw(s,.5);E.next(s);assert(s.stock.some(x=>x.uid===entry.uid));assert.equal(s.coins,cash);}setDraw(s,0);E.next(s);assert(!s.stock.some(x=>x.uid===entry.uid));assert.equal(s.coins,cash+100);assert.equal(s.profit,20);assert(E.validate(s));
});
test('An impossible price remains unsold for many turns and a loaded save preserves its waiting state',()=>{
 let s=fixture(),entry=lot(s);assert(E.setListing(s,entry.uid,999999999).ok);const price=entry.displayPrice;for(let n=0;n<500;n++){advance(s);assert(s.stock.some(x=>x.uid===entry.uid));assert.equal(E.listingChance(s,s.stock[0]),0);if(n%31===0)s=E.prepare(copy(s));}assert.equal(s.stock[0].displayPrice,price);assert.equal(s.sold,0);assert.equal(s.profit,0);assert(E.validate(s));
});
test('Price sales settle the exact asking amount and ledger only once, including a profitable price sale',()=>{
 const s=fixture(),entry=lot(s,{paid:20}),cash=s.coins;assert(E.setListing(s,entry.uid,150).ok);setDraw(s,0);E.next(s);assert.equal(s.coins,cash+150);assert.equal(s.profit,130);assert.equal(s.dayProfit,130);assert.equal(s.sold,1);assert(s.log.some(x=>x.text.includes('150G')&&x.text.includes('+130G')));for(const mode of ['quick','display','complete','request'])unchanged(s,()=>E.sell(s,entry.uid,mode));unchanged(s,()=>E.setListing(s,entry.uid,50));const after=s.coins;E.next(s);assert.equal(s.coins,after);assert.equal(s.sold,1);assert(E.validate(s));
});
test('One visitor advance can settle multiple independent listings and returns each result once',()=>{
 const s=fixture(),first=lot(s),second=lot(s),cash=s.coins;for(const entry of [first,second])assert(E.setListing(s,entry.uid,50).ok);setDraw(s,0);const result=E.next(s);assert.equal(result.sales.length,2);assert.equal(new Set(result.sales.map(x=>x.uid)).size,2);assert(result.sales.every(x=>x.amount===50&&x.profit===-30));assert.equal(s.coins,cash+100);assert.equal(s.profit,-60);assert.equal(s.sold,2);assert.equal(s.stock.length,0);const next=E.next(s);assert.deepEqual(next.sales,[]);assert.equal(s.coins,cash+100);assert.equal(s.sold,2);assert(E.validate(s));
});
test('An active visiting buyer locks price edits, removal and immediate sale until the deal ends',()=>{
 const s=fixture(),entry=lot(s);assert(E.setListing(s,entry.uid,999999999).ok);buyer(s,entry);for(const price of [1,200,null])unchanged(s,()=>E.setListing(s,entry.uid,price));unchanged(s,()=>E.sell(s,entry.uid,'quick'));assert(E.offer(s,999999999).departed);assert.equal(s.current.status,'left');assert(E.setListing(s,entry.uid,140).ok);const result=E.sell(s,entry.uid,'quick');assert(result.ok);assert.equal(result.amount,35);assert.equal(result.profit,-45);assert(E.validate(s));
});
test('A visiting buyer can purchase a listed item through ordinary negotiation and checkout',()=>{
 const s=fixture(),entry=lot(s);assert(E.setListing(s,entry.uid,150).ok);buyer(s,entry);const cash=s.coins;assert(E.offer(s,100).accepted);assert(E.accept(s).ok);assert.equal(s.coins,cash+100);assert.equal(s.profit,20);assert.equal(s.current.sale,100);assert.equal(s.stock.length,0);unchanged(s,()=>E.accept(s));assert(E.validate(s));
});
test('Ordinary random visitors can request stock even when every available item has a price tag',()=>{
 const s=fixture(61217),entry=lot(s);assert(E.setListing(s,entry.uid,999999999).ok);let visitors=0,encounter;
 for(let n=0;n<240;n++){advance(s);if(!s.closing&&s.current.kind==='buyer'){assert.equal(s.current.stockUid,entry.uid);assert(s.current.buyerQuotes[entry.uid]);assert(E.buyerFit(s,entry).allowed);visitors++;encounter=copy(s);}assert(s.stock.some(x=>x.uid===entry.uid));}
 assert(visitors>5,'No buyers visited listed-only stock');assert(encounter);quiet(encounter);const cash=encounter.coins,price=encounter.current.price;assert(E.accept(encounter).ok);assert.equal(encounter.coins,cash+price);assert.equal(encounter.profit,price-entry.paid);assert.equal(encounter.stock.length,0);assert(E.validate(encounter));console.log('Listed-only stock buyer visits: '+visitors);
});
test('Immediate sale is always a loss on a paid item and never invents cash for a free item',()=>{
 for(const paid of [0,1,2,5,80,1000])for(const value of [0,1,9,100,100000]){const s=fixture(),entry=lot(s,{paid,value}),expected=Math.floor(Math.min(value*.35,paid*.5)),cash=s.coins;assert.equal(E.quote(s,entry,'quick'),expected);const result=E.sell(s,entry.uid,'quick');assert(result.ok);assert.equal(result.amount,expected);assert.equal(result.profit,expected-paid);assert.equal(s.coins,cash+expected);if(paid>0)assert(result.profit<0);else assert.equal(result.amount,0);assert(E.validate(s));}
 const s=fixture(),entry=lot(s,{paid:80,value:100});s.activeEvent={id:'discount-demand',day:s.day,kind:'market',category:'clock',mult:1.4,gift:0};assert.equal(E.quote(s,entry,'quick'),40);
});
test('Listed genuine items can be catalogued or repaired and repair cost enters immediate-sale loss',()=>{
 const s=fixture(),entry=lot(s,{condition:0,value:720,paid:400});assert(E.setListing(s,entry.uid,999999999).ok);closeDay(s);assert(E.nightAction(s,'catalog',entry.uid).ok);const repair=E.repairQuote(s,entry),cash=s.coins;assert(E.nightAction(s,'repair',entry.uid).ok);assert.equal(entry.paid,400+repair.cost);assert.equal(s.coins,cash-repair.cost);assert.equal(entry.displayPrice,999999999);assert.equal(entry.displayAt!==null,true);const expected=Math.floor(Math.min(entry.value*.35,entry.paid*.5));assert.equal(E.quote(s,entry,'quick'),expected);const sold=E.sell(s,entry.uid,'quick');assert(sold.ok);assert.equal(sold.profit,expected-400-repair.cost);assert(s.album[entry.itemId]);assert(E.validate(s));
});
test('Old fixed consignment saves migrate to price listings without a cash payout or lost deal evidence',()=>{
 const s=fixture(),entry=lot(s,{displayAt:2,displayPrice:145});delete s.marketSalesVersion;const before=copy(s);assert(E.validate(s));E.prepare(s);assert.equal(s.marketSalesVersion,1);assert.equal(entry.displayAt,s.turn);assert.equal(entry.displayPrice,145);for(const key of ['coins','profit','sold','seed','relationships','discovered'])assert.deepEqual(s[key],before[key]);assert.deepEqual(s.current,before.current);const stable=JSON.stringify(s);E.prepare(s);assert.equal(JSON.stringify(s),stable);assert(E.validate(s));setDraw(s,.9);E.next(s);assert(s.stock.some(x=>x.uid===entry.uid));
});
test('Fixed delivery and forced completion are removed while old requests become market demand',()=>{
 const s=fixture(),entry=lot(s);s.activeEvent={id:'old-request',day:s.day,kind:'request',category:'clock',mult:1.4,gift:140};assert.equal(E.event(s).kind,'market');assert.equal(E.event(s).gift,0);assert.equal(E.quote(s,entry,'display'),140);for(const mode of ['request','complete','display'])unchanged(s,()=>E.sell(s,entry.uid,mode));assert.equal(s.eventDone,false);assert(E.setListing(s,entry.uid,140).ok);setDraw(s,.9);E.next(s);assert(s.stock.includes(entry));assert.equal(s.sold,0);assert(E.validate(s));
});
test('Corrupted listing markers, prices and market versions are rejected without save mutation',()=>{
 const s=fixture(),entry=lot(s);assert(E.setListing(s,entry.uid,100).ok);for(const mutate of [x=>x.marketSalesVersion=2,x=>x.stock[0].displayPrice=0,x=>x.stock[0].displayPrice=1.2,x=>x.stock[0].displayPrice=1000000000,x=>x.stock[0].displayAt=-1,x=>delete x.stock[0].displayPrice]){const invalid=copy(s);mutate(invalid);const before=JSON.stringify(invalid);assert.equal(E.validate(invalid),false);assert.equal(JSON.stringify(invalid),before);}
});
console.log(JSON.stringify({marketTests:tests}));
