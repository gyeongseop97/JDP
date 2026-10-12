'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
// Explicit, browser-order loader: no wildcard discovery and no DOM/UI modules.
const MODULES=['items.js','characters.js','profiles.js','appraisal-data.js','legacy-item-appraisals.js','item-appraisals.js','guest-data.js','voices.js','trade-voice.js','affinity-voice.js','origin-data.js','customer-goals.js','evolution.js','dialogue-data.js','dialogue-reply.js','discovery-data.js','discovery.js','planning.js','adventures.js','conversation-data.js','conversations.js','engine.js'];
function load(){const ctx=vm.createContext({console});for(const file of MODULES)vm.runInContext(fs.readFileSync(path.join(__dirname,file),'utf8'),ctx,{filename:file});return ctx}
const G=load(),E=G.PawnEngine,C=G.PawnConversations,D=G.PawnConversationData,copy=x=>JSON.parse(JSON.stringify(x));let passed=0,branches=0,continuations=0;
function test(name,fn){fn();passed++;console.log('PASS '+name)}
function unchanged(s,fn){const before=JSON.stringify(s),result=fn();assert.equal(result.ok,false);assert.equal(JSON.stringify(s),before);return result}
function budgets(s){const o=s.current;return copy({seed:s.seed,coins:s.coins,stock:s.stock,night:s.night,questionSpent:o.questionSpent,talkLeft:o.talkLeft,offerSpent:o.offerSpent,offerLeft:o.offerLeft,inspectionSpent:o.inspectionSpent,inspectionLeft:o.inspectionLeft,price:o.price,asking:o.asking,floor:o.floor,acceptedOffer:o.acceptedOffer,evidence:o.evidence,judgment:o.judgment,talked:o.talked,planning:s.planning,adventures:s.adventures})}
function closed(i=0,n=0){const s=E.create(61313+i);s.coins=10000;s.visitor=8;s.current.status='left';assert(E.next(s).closing);s.current.character=i;s.met[i]=Math.max(1,s.met[i]||0);s.relationships[i]=Math.max(-100,n-6);E.refreshRelationship(s);return s}
function coffee(i=0,n=0){const s=closed(i,n);assert(E.nightAction(s,'tea',String(i)).ok);assert(C.view(s));s.relationships[i]=n;E.refreshRelationship(s);return s}
function answer(s,id,response){const before=budgets(s),r=C.choose(s,id,response);assert.deepEqual(budgets(s),before,'C.choose itself must not touch trade budgets');if(r.ok)E.refreshRelationship(s);return r}
function healthy(s){assert(C.valid(s));assert(E.validate(s),'engine rejected social state');assert(G.PawnPlanning.valid(s));assert(G.PawnAdventures.valid(s))}
function spoken(){const lines=[];for(const p of D.people){Object.values(p.opening).forEach(a=>lines.push(...a));lines.push(...p.ending,...Object.values(p.reactions),...Object.values(p.casual).flat(),...Object.values(p.decorate).flat());for(const t of p.topics)lines.push(...t.low,...t.high,t.recall,t.listen,t.ask,t.light,...(t.lowAsk?[t.lowAsk,t.lowListen]:[]))}return lines}

test('All 26 characters have individually authored, frozen, complete data',()=>{
 assert.equal(D.people.length,26);assert(Object.isFrozen(D));const labels=new Set();
 for(let i=0;i<26;i++){const p=D.people[i];assert.equal(p.name,G.PAWN_CHARACTERS[i].name);assert.deepEqual(copy(p.topics.map(t=>t.id)),['interest','memory','fear','hope']);assert.deepEqual(copy(p.topics.map(t=>t.gate)),[-100,0,25,60]);assert(Object.isFrozen(p));
  for(const t of p.topics){labels.add(t.label);assert.equal(t.low.length,2);assert.equal(t.high.length,2);assert.equal(new Set([...t.low,...t.high,t.recall,t.listen,t.ask,t.light]).size,8,p.name+' '+t.id);assert(Object.isFrozen(t.replies));if(t.id==='fear'){assert.notEqual(t.replies.low.ask,t.replies.high.ask);assert.notEqual(t.replies.low.listen,t.replies.high.listen)}}
 }
 assert.equal(labels.size,104);const lines=spoken();assert(new Set(lines).size>300);for(const line of lines){assert.equal(typeof line,'string');assert(line.length>=5);assert(!/[{}]|undefined|NaN|TODO|TBD|寒さ|[\u3040-\u30ff]/.test(line),line)}
});
test('prepare is idempotent, legacy-safe, and preserves other expansions exactly',()=>{
 const s=E.create(21);delete s.social;const before=copy(s);assert(C.valid(s));C.prepare(s);assert.deepEqual(copy(s.social),{version:1,people:{},active:null});const withSocial=JSON.stringify(s);C.prepare(s);assert.equal(JSON.stringify(s),withSocial);const rest=copy(s);delete rest.social;assert.deepEqual(rest,before);healthy(s);
 const broken=copy(s);broken.social={version:9,people:{},active:null};const serialized=JSON.stringify(broken);C.prepare(broken);assert.equal(JSON.stringify(broken),serialized);assert(!C.valid(broken));
 for(const file of ['migration-v4-fixture.json','migration-v5-fixture.json','migration-v6-fixture.json','migration-v610-dialogue-fixture.json']){const old=JSON.parse(fs.readFileSync(path.join(__dirname,file),'utf8')),saved=copy(old);assert(C.valid(old));C.prepare(old);delete old.social;assert.deepEqual(old,saved)}
});
test('Coffee requires a paid night action and start never duplicates root costs or +6',()=>{
 for(let i=0;i<26;i++){const s=closed(i,24);unchanged(s,()=>C.startCoffee(s,i));assert.deepEqual(copy(C.topics(s,i)),[]);unchanged(s,()=>C.choose(s,'interest'));
  const coins=s.coins,actions=s.night.actions,n=E.relationship(s,i);assert(E.nightAction(s,'tea',String(i)).ok);assert.equal(s.coins,coins-25);assert.equal(s.night.actions,actions-1);assert.equal(E.relationship(s,i),n+6);const before=JSON.stringify(s),r=C.startCoffee(s,i);assert(r.ok);assert(r.conversation);assert.equal(JSON.stringify(s),before);healthy(s);
  C.finish(s);unchanged(s,()=>C.startCoffee(s,i));unchanged(s,()=>E.nightAction(s,'tea',String(i)));
 }
 const low=closed(0);low.coins=24;unchanged(low,()=>E.nightAction(low,'tea','0'));unchanged(low,()=>C.startCoffee(low,0));
});
test('Affinity gates at -100/-1/0/24/25/59/60/100 hide labels and hints without spoilers',()=>{
 for(let i=0;i<26;i++)for(const [n,allowed] of [[-100,1],[-1,1],[0,2],[24,2],[25,3],[59,3],[60,4],[100,4]]){const s=coffee(i,n),list=C.topics(s,i);assert.equal(list.filter(t=>!t.locked).length,allowed);for(const t of list){assert.deepEqual(Object.keys(t),['id','label','locked','hint']);if(D.people[i].topics.find(d=>d.id===t.id).gate>n){assert.equal(t.label,'아직 꺼내기 어려운 이야기');assert(!JSON.stringify(t).includes(D.people[i].topics.find(d=>d.id===t.id).label));unchanged(s,()=>C.choose(s,t.id))}}}
});
test('Every character/topic/band has five actual branches and bounded ask continuations',()=>{
 for(let i=0;i<26;i++)for(const t of D.people[i].topics)for(const n of [Math.max(0,t.gate),90]){
  const outputs=new Set();
  for(const response of ['listen','empathize','ask','light','joke']){const s=coffee(i,n),before=budgets(s);assert(answer(s,t.id).ok);assert.deepEqual(copy(C.view(s).responses.map(r=>r.id)),['listen','empathize','ask','light','joke']);const opened=copy(C.view(s));assert(t[n>=t.depth?'high':'low'].includes(opened.message),i+' '+t.id+' '+n);const r=answer(s,t.id,response);assert(r.ok);outputs.add(r.message);branches++;before.talkLeft=Math.max(0,E.questionCapacity(E.relationship(s,i))-before.questionSpent);before.offerLeft=Math.max(0,E.offerCapacity(E.relationship(s,i))-before.offerSpent);assert.deepEqual(budgets(s),before);assert(Math.abs(E.relationship(s,i)-n)<=1);healthy(s);
   if(response==='ask'){assert.equal(C.view(s).phase,'followup');assert.deepEqual(copy(C.view(s).responses.map(r=>r.id)),['listen','light']);unchanged(s,()=>answer(s,t.id,'ask'));for(const end of ['listen','light']){const restored=copy(s);assert(answer(restored,t.id,end).ok);continuations++;assert.equal(C.view(restored).phase,'topics');unchanged(restored,()=>answer(restored,t.id,end));healthy(restored)}}else{assert.equal(C.view(s).phase,'topics');unchanged(s,()=>answer(s,t.id,response))}
  }
  assert.equal(outputs.size,5,i+' '+t.id+' '+n+' branches collapsed');
 }
});
test('At 25/59 affinity all fear replies use guarded low data including ask-followup/listen/empathy',()=>{
 for(let i=0;i<26;i++)for(const n of [25,59])for(const response of ['listen','empathize','ask','light','joke']){const s=coffee(i,n),t=D.people[i].topics[2];answer(s,'fear');const r=answer(s,'fear',response);assert(r.ok);if(['listen','empathize'].includes(response))assert(r.message.includes(t.replies.low.listen));if(response==='ask'){assert.equal(r.message,t.replies.low.ask);assert.equal(answer(s,'fear','listen').message,t.replies.low.listen)}assert(!s.social.active.history.some(h=>h.text.includes(t.high[0])||h.text.includes(t.high[1])||h.text.includes(t.replies.high.ask)||h.text.includes(t.replies.high.listen)))}
 // Specific regression: anonymous theatre support cannot be inferred from Serin's low replies.
 for(const response of ['listen','empathize','ask','light','joke']){const s=coffee(25,25);answer(s,'fear');answer(s,'fear',response);if(response==='ask')answer(s,'fear','listen');assert(!/익명|수입|후원|보내요|문 닫/.test(C.view(s).history.map(h=>h.text).join(' ')))}
});
test('Three topics, one use each, finite followups, no relation farming and no re-open after finish',()=>{
 for(let i=0;i<26;i++){const s=coffee(i,70),before=budgets(s);for(const id of ['interest','memory','fear']){assert(answer(s,id).ok);assert(answer(s,id,'listen').ok);unchanged(s,()=>answer(s,id));unchanged(s,()=>answer(s,id,'listen'))}assert.equal(E.relationship(s,i),73);assert.equal(s.social.active.relationDelta,3);assert.equal(C.view(s).remaining,0);assert(C.view(s).done);assert(C.view(s).topics.every(t=>t.locked));unchanged(s,()=>answer(s,'hope'));const saved=JSON.stringify(s);C.startCoffee(s,i);assert.equal(JSON.stringify(s),saved);assert.deepEqual(budgets(s),before);assert(C.finish(s).ok);unchanged(s,()=>C.startCoffee(s,i));unchanged(s,()=>C.finish(s));healthy(s)}
 const full=coffee(0,100);answer(full,'interest');assert.equal(answer(full,'interest','listen').relationChange,0);assert.equal(E.relationship(full,0),100);const cold=coffee(0,-100);answer(cold,'interest');assert.equal(answer(cold,'interest','ask').relationChange,0);assert.equal(E.relationship(cold,0),-100);
});
test('JSON reload restores topic selection, response and followup exactly in a fresh VM',()=>{
 const H=load();for(const phase of ['topics','response','followup','done']){const s=coffee(25,70);if(phase!=='topics')answer(s,'interest');if(phase==='followup')answer(s,'interest','ask');if(phase==='done'){answer(s,'interest','listen');for(const id of ['memory','fear']){answer(s,id);answer(s,id,'light')}}const restored=copy(s),before=JSON.stringify(restored),view=copy(C.view(s));assert(H.PawnConversations.valid(restored));H.PawnConversations.prepare(restored);assert.deepEqual(copy(H.PawnConversations.view(restored)),view);assert(H.PawnConversations.startCoffee(restored,25).ok);assert.equal(JSON.stringify(restored),before);assert.equal(view.phase,phase);if(phase==='response'){assert.deepEqual(copy(H.PawnConversations.choose(restored,'interest','ask')),copy(C.choose(s,'interest','ask')))}if(phase==='followup'){assert(H.PawnConversations.choose(restored,'interest','light').ok)} }
});
test('Views are detached; stale context and a second guest cannot consume or reroll dialogue',()=>{
 const s=coffee(0,60),view=C.view(s),before=JSON.stringify(s);view.history[0].text='tampered';view.topics[0].label='tampered';assert.equal(JSON.stringify(s),before);s.met[1]=1;unchanged(s,()=>C.startCoffee(s,1));unchanged(s,()=>E.nightAction(s,'tea','1'));
 for(const mutation of [x=>x.day++,x=>x.closing=false,x=>x.night.done=[],x=>x.night=null,x=>delete x.met[0]]){const stale=copy(s);mutation(stale);assert.equal(C.view(stale),null);assert.deepEqual(copy(C.topics(stale,0)),[]);unchanged(stale,()=>answer(stale,'interest'));unchanged(stale,()=>C.startCoffee(stale,0))}
 for(const id of [-1,26,'0',NaN,Infinity,null])unchanged(s,()=>C.startCoffee(s,id));unchanged(s,()=>answer(s,'__proto__'));answer(s,'interest');unchanged(s,()=>answer(s,'interest','__proto__'));healthy(s);
});
test('Across nights variants rotate, recall only completed past conversations and early finish earns nothing',()=>{
 for(let i=0;i<26;i++)for(const high of [false,true]){const s=coffee(i,high?90:10),t=D.people[i].topics[0],first=answer(s,'interest').message;answer(s,'interest','light');C.finish(s);E.nextDay(s);s.visitor=8;s.current.status='left';E.next(s);s.met[i]=1;s.relationships[i]=high?84:4;assert(E.nightAction(s,'tea',String(i)).ok);const second=answer(s,'interest').message;assert(second.startsWith(t.recall+' '));assert.notEqual(second.slice(t.recall.length+1),first);assert(t[high?'high':'low'].includes(second.slice(t.recall.length+1)));healthy(s)}
 const s=coffee(0,10);answer(s,'interest');const n=E.relationship(s,0);C.finish(s);assert.equal(E.relationship(s,0),n);assert.equal(s.social.people[0].topics.interest.response,null);
 const fresh=coffee(0,10);assert(!answer(fresh,'interest').message.startsWith(D.people[0].topics[0].recall));
});
test('Casual is one topic per visit, idempotent, independent from all budgets and hidden authenticity',()=>{
 for(let i=0;i<26;i++)for(const id of ['daily','interest']){const s=E.create(144+i);s.current.character=i;s.relationships[i]=10;E.refreshRelationship(s);const before=budgets(s),history=copy(s.current.history);assert.equal(C.casualOptions(s).length,2);const r=C.casualTalk(s,id);assert(r.ok);assert.deepEqual(budgets(s),before);assert.deepEqual(copy(s.current.history),history);const saved=JSON.stringify(s);assert(C.casualTalk(s,id).repeated);assert.equal(JSON.stringify(s),saved);assert.deepEqual(copy(C.casualOptions(s)),[]);unchanged(s,()=>C.casualTalk(s,id==='daily'?'interest':'daily'));healthy(s);
  // Returning to the same offer and switching stock does not start another visit.
  s.current.uid+='-changed';unchanged(s,()=>C.casualTalk(s,id==='daily'?'interest':'daily'));
 }
 for(const condition of ['buyer','seller']){const s=E.create(71);s.current.kind=condition;s.current.character=0;const twins=[copy(s),copy(s)];twins[0].current.genuine=true;twins[0].current.intent='honest';twins[1].current.genuine=false;twins[1].current.intent='fraud';assert.equal(C.casualTalk(twins[0],'interest').message,C.casualTalk(twins[1],'interest').message)}
 const s=E.create(15);s.relationships[s.current.character]=-1;const opt=C.casualOptions(s).find(t=>t.id==='interest');assert(opt.locked);unchanged(s,()=>C.casualTalk(s,'interest'));assert(C.casualTalk(s,'daily').ok);E.next(s);assert.equal(C.casualOptions(s).length,2);
});
test('Root casual route adds history once and preserves question/offer/inspection budgets',()=>{
 const s=E.create(81),before=budgets(s),len=s.current.history.length;assert(E.talk(s,'casual:daily').ok);assert.equal(s.current.history.length,len+2);const saved=JSON.stringify(s);assert(E.talk(s,'casual:daily').repeated);assert.equal(JSON.stringify(s),saved);assert.deepEqual(budgets(s),before);healthy(s);
});
test('Casual recalls previous coffee but never invents a conversation',()=>{
 const s=coffee(20,10),t=D.people[20].topics[0];answer(s,'interest');answer(s,'interest','listen');C.finish(s);E.nextDay(s);s.current.character=20;s.relationships[20]=10;E.refreshRelationship(s);assert(C.casualTalk(s,'interest').message.startsWith(t.recall));
 const fresh=E.create(99);fresh.current.character=20;fresh.relationships[20]=10;assert(!C.casualTalk(fresh,'interest').message.startsWith(t.recall));
});
test('Decoration is deterministic, varies without RNG, and preserves every factual answer verbatim',()=>{
 const factual=['claim','uncertainClaim','answer','provenance','authenticity','quality','condition','function','use','originCaught','originDefend','disclosed','reassure','unknown'];
 for(let i=0;i<26;i++){const s=E.create(101+i),o=s.current;o.character=i;const before=JSON.stringify(s),value='진품 여부는 확인하지 못했습니다. 가격은 1,234G, 손상은 2곳입니다.';for(const key of factual)assert.equal(C.decorate(s,o,key,value),value);for(const key of ['sellerOpen','buyerOpen','counter','offerAccepted','rapport']){const a=C.decorate(s,o,key,value);assert(a.endsWith(value));assert.equal(C.decorate(s,o,key,value),a)}assert.equal(JSON.stringify(s),before);const variants=new Set();for(let v=0;v<20;v++)variants.add(C.decorate({...s,turn:v},{...o,uid:'visit-'+v},'sellerOpen',value));assert.equal(variants.size,2)}
});
test('Save validation rejects malformed counters, keys, transcripts and impossible pending states',()=>{
 assert(!C.valid(null));assert(!C.valid({social:null}));const base=coffee(0,60);answer(base,'interest');
 const mutations=[x=>x.social.version=2,x=>x.social.people=[],x=>x.social.people[26]=copy(x.social.people[0]),x=>x.social.people[0].visits=-1,x=>x.social.people[0].variants.evil=1,x=>x.social.people[0].topics.unknown={},x=>x.social.people[0].casual={visit:'bad',id:'daily',message:'bad'},x=>x.social.active.exchanges=4,x=>x.social.active.usedTopics.push('interest'),x=>x.social.active.character=30,x=>x.social.active.relationDelta=4,x=>x.social.active.phase='infinite',x=>x.social.active.topicId='hope',x=>x.social.active.history[0].speaker='system',x=>x.social.active.history[0].text=123,x=>x.social.active.history[0].responseId='hack',x=>x.social.active.history[0].topicId='hack',x=>x.social.active.phase='followup',x=>x.social.people[0].topics.interest.response='hack'];
 for(const mutation of mutations){const bad=copy(base);mutation(bad);assert.equal(C.valid(bad),false);assert.equal(C.view(bad),null);unchanged(bad,()=>C.choose(bad,'interest','listen'))}
});

const lines=spoken(),metrics={characters:D.people.length,topics:D.people.reduce((n,p)=>n+p.topics.length,0),lowOpenings:208,highOpenings:208,recallLines:104,topicListenAskLight:312,guardedFearReplies:52,openingLines:104,endingLines:26,characterReactions:78,casualLines:104,decorationLines:104,authoredSpokenLines:lines.length,uniqueSpokenLines:new Set(lines).size,branchPaths:branches,continuationPaths:continuations,testGroups:passed};
console.log('CONVERSATION_METRICS '+JSON.stringify(metrics));
console.log('PASS '+passed+' conversation test groups');
