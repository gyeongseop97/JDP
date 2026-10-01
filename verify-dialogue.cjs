'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
for(const file of ['items.js','characters.js','profiles.js','appraisal-data.js','legacy-item-appraisals.js','item-appraisals.js','guest-data.js','voices.js','trade-voice.js','affinity-voice.js','origin-data.js','customer-goals.js','evolution.js','discovery-data.js','dialogue-data.js','dialogue-reply.js','discovery.js','engine.js'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{filename:file});
const E=PawnEngine,D=PawnDiscovery,copy=x=>JSON.parse(JSON.stringify(x));let tests=0;
function test(name,fn){try{fn();tests++;console.log('PASS '+name)}catch(error){console.error('FAIL '+name);throw error}}
function unchanged(s,fn){const before=JSON.stringify(s);assert.equal(fn().ok,false);assert.equal(JSON.stringify(s),before)}
function fixture(itemId='clock-01',character=1,changes={}){
 const s=E.create(61101),o=s.current;s.coins=100000;s.relationships={[character]:60};s.met={[character]:1};s.stock=[];
 Object.assign(o,{uid:'dialogue-'+itemId,kind:'seller',character,itemId,practiceClassic:true,genuine:true,intent:'honest',grade:3,claimedGrade:3,condition:0,appraisalClarity:0,talked:[],history:[],notes:[],...changes});
 delete o.investigationVersion;delete o.investigations;delete o.discovery;delete o.dialogue;
 E.prepare(s);return s;
}
function reply(s,id){const question=E.dialogueOptions(s).find(x=>x.id===id),before=s.current.history.length,result=E.talk(s,id);assert(result.ok,id+' rejected for '+s.current.itemId+' character '+s.current.character);const added=s.current.history.slice(before),text=added.filter(x=>x.speaker==='customer').at(-1)?.text;assert(text,id+' produced no answer');assert(added.some(x=>x.speaker==='player'&&x.text===question?.label));return {text,answer:result.answer,result};}
function learned(s){return s.current.discovery.clues.filter(x=>x.heard).map(x=>x.id)}
function observed(s){return s.current.discovery.clues.filter(x=>x.observed).map(x=>x.id)}
function buyerFixture(itemId='clock-01',character=0,minCondition=0,minGrade=0,changes={}){
 const s=fixture(itemId,character),o=s.current,it=E.item(itemId),lot={uid:'buyer-dialogue-stock',itemId,grade:8,claimedGrade:8,condition:4,genuine:true,value:400,apparent:400,paid:200,displayAt:null,sourceCharacter:character,...changes};
 s.stock=[lot];s.activeEvent={id:'buyer-dialogue-quiet',day:s.day,kind:'rumor',category:'all',mult:1,gift:0};
 Object.assign(o,{kind:'buyer',uid:'buyer-dialogue-'+itemId,stockUid:lot.uid,grade:lot.grade,claimedGrade:lot.claimedGrade,condition:lot.condition,genuine:lot.genuine,value:lot.value,apparent:lot.apparent,paid:lot.paid,price:300,asking:300,baseFloor:0,floor:0,patience:6,mood:0,pitchUsed:false,talked:[],history:[],notes:[],buyerQuotes:{[lot.uid]:{uid:lot.uid,price:300,initialPrice:300,maxBase:440,perceivedValue:400,detected:false,disclosed:false,acceptedOffer:false,lastOffer:null,taste:1,assertRoll:1,asserted:false}},purchasePurpose:{version:1,category:it.category,itemId,requestedUid:lot.uid,legacy:false,use:PawnCustomerGoals.contexts[character],name:it.name,minCondition,minGrade}});
 return E.prepare(s);
}

function expectClaimedAnswer(s,topic,answer){
 const o=s.current,a=o.evidence.axes[topic==='function'?'condition':topic],cautious=PawnEvolution.cautious(o);
 assert(answer&&typeof answer.text==='string'&&answer.text.length>5,topic+' has no direct answer');assert(['belief','reported','catalogue','experience','unverified'].includes(answer.source));
 if(topic==='authenticity'){
  const admitted=o.evidenceUsed.authenticity==='defect'&&o.evidence.axes.authenticity.observedActual&&o.evidence.axes.authenticity.actual===0;
  const kind=admitted?'admitted-replica':cautious?'uncertain-authenticity':a.claimed===1?'believed-genuine':'believed-replica';assert.equal(answer.kind,kind);
  if(kind==='believed-genuine')assert.match(answer.text,/진품/);else if(['believed-replica','admitted-replica'].includes(kind))assert.match(answer.text,/가품|모조품|복제/);else assert.match(answer.text,/모르|확인|확실|장담|단정/);
 }else if(topic==='condition'){
  assert.equal(answer.kind,['reported-damage','reported-wear','reported-intact'][a.claimed]);
  if(a.claimed===0)assert.match(answer.text,/흠|손상|문제|금|갈라|깨|찢|메웠|고친|수리/);else if(a.claimed===1)assert.match(answer.text,/사용|흔적|닳|긁|작은|가벼|흠|문제/);else assert.match(answer.text,/없|깨끗|온전|멀쩡|괜찮/);
 }else if(topic==='function'){
  const clue=o.discovery.clues.find(x=>x.id===answer.clueId)||o.discovery.clues.find(x=>x.topic==='function');
  assert.equal(answer.kind,clue.reportedProblem===null?'untested-function':clue.reportedProblem?'reported-problem':'reported-working');
  if(answer.kind==='untested-function')assert.match(answer.text,/안 써|사용해 보|써 보|확인|모르|모른|시험/);else if(answer.kind==='reported-problem')assert.match(answer.text,/문제|이상|고장|안 되|않|걸리|막히|새|멈/);else assert.match(answer.text,/문제|이상|정상|잘|없|괜찮/);
 }else if(topic==='quality')assert(['intended-feature','feature-detail'].includes(answer.kind));
 else if(topic==='use'){assert.equal(answer.kind,'use-instruction');assert.equal(answer.source,'catalogue');assert(answer.text.includes(PawnDialogueData.useFor(o.itemId).instruction));}
}

test('All 144 items provide specific use instructions and six distinct seller questions',()=>{
 const labels={provenance:'어디서, 언제 구하셨어요?',condition:'겉에 문제가 있나요?',function:'쓰는 데 문제가 있나요?',quality:'이 물건만의 특징이 있나요?',authenticity:'진품인가요, 가품인가요?',use:'어떻게 쓰는 물건인가요?'},uses=new Set();
 for(const it of PAWN_ITEMS){const s=fixture(it.id),use=PawnDialogueData.useFor(it.id),instruction=use?.instruction;assert.equal(typeof instruction,'string');assert(instruction.length>10);assert.equal(typeof use.precaution,'string');assert(use.precaution.length>8);assert(!/[{}]|undefined/.test(instruction+use.precaution));uses.add(instruction);const opts=E.dialogueOptions(s);for(const [id,label] of Object.entries(labels))assert.equal(opts.find(x=>x.id===id)?.label,label,it.id+' '+id);assert.equal(new Set(opts.map(x=>x.id)).size,opts.length);assert(E.appraisalNotebook(s).every(x=>x.claim===null&&x.observation===null));assert.deepEqual(learned(s),[]);}
 assert.equal(uses.size,144);
});

test('Every seller question gives a semantic answer for all 144 items in all 26 voices',()=>{
 let answers=0;const questions=['provenance','use','authenticity','quality','condition','function'];
 for(const it of PAWN_ITEMS){const base=fixture(it.id);for(let character=0;character<26;character++)for(const topic of questions){const s=copy(base),o=s.current;o.character=character;s.relationships={[character]:60};s.met={[character]:1};const before=copy(o),known=learned(s),seen=observed(s),left=o.talkLeft;const response=reply(s,topic);answers++;
  assert(!/[{}]|undefined/.test(response.text),it.id+' '+character+' '+topic);assert.equal(o.questionSpent,before.questionSpent+1);assert.equal(o.talkLeft,left-1);assert.equal(o.inspectionLeft,before.inspectionLeft);assert.equal(o.price,before.price);assert.equal(o.genuine,before.genuine);assert.deepEqual(o.judgment,before.judgment);assert.equal(o.verdict,before.verdict);assert.deepEqual(observed(s),seen);
  if(topic==='provenance'){assert(response.text.includes(PawnTradeVoice.spoken(o.origin.claim,character)));assert.deepEqual(learned(s),known);}else{
   expectClaimedAnswer(s,topic,response.answer);assert(response.text.includes(PawnTradeVoice.spoken(response.answer.text,character)),it.id+' '+character+' '+topic);assert.deepEqual(o.dialogue.answers[topic].at(-1),response.answer);
   const fresh=learned(s).filter(id=>!known.includes(id));assert.equal(fresh.length,['authenticity','condition','function'].includes(topic)?1:0,it.id+' '+topic+' reveals wrong number of clues');if(fresh.length)assert.equal(response.answer.clueId,fresh[0]);
   if(topic==='quality'){assert.equal(response.answer.kind,'intended-feature');assert(response.answer.text.includes(it.effect));}
  }
  if(character===0)assert(!/(?:요|습니다|세요)[.!?]/.test(response.text));if(character===21)assert(response.text.startsWith('뽀글.'));assert(E.validate(s));
 }}assert.equal(answers,144*26*6);console.log('Semantic replies checked: '+answers);
});

test('Authenticity answers follow claimed knowledge rather than the hidden genuine flag',()=>{
 for(const claimed of [0,1])for(const cautious of [false,true]){
  const s=fixture('clock-01',1,{genuine:false,intent:'fraud'}),o=s.current;for(let n=0;n<100;n++){o.uid='confidence-'+n;if(PawnEvolution.cautious(o)===cautious)break;}assert.equal(PawnEvolution.cautious(o),cautious);
  const a=o.evidence.axes.authenticity;a.claimed=claimed;const spec=PAWN_ITEM_APPRAISALS[o.itemId],claims=D.fragments(claimed?spec.authenticity.claimGenuine:spec.authenticity.claimReplica);a.claim=claimed?spec.authenticity.claimGenuine:spec.authenticity.claimReplica;for(const [n,clue] of o.discovery.clues.filter(x=>x.topic==='authenticity').entries())clue.claim=claims[n]||claims[0];
  const hiddenTwin=copy(s);hiddenTwin.current.genuine=true;hiddenTwin.current.value*=100;hiddenTwin.current.evidence.axes.authenticity.actual=1;const expected=reply(s,'authenticity'),other=reply(hiddenTwin,'authenticity');expectClaimedAnswer(s,'authenticity',expected.answer);assert.deepEqual(other.answer,expected.answer);assert.equal(other.text,expected.text);assert.equal(o.evidence.axes.authenticity.observedActual,false);assert.equal(o.judgment.authenticity,null);assert.equal(o.verdict,'');
 }
});

test('Confirmed fake evidence allows one admission answer without refunding questions',()=>{
 const s=fixture('clock-01',1,{genuine:false,intent:'fraud'}),o=s.current,a=o.evidence.axes.authenticity;reply(s,'authenticity');assert(E.investigate(s,a.tool+'-'+a.site).ok);assert(E.presentEvidence(s,'authenticity','defect').supported);const spent=o.questionSpent;
 const admission=reply(s,'authenticity');assert.equal(admission.answer.kind,'admitted-replica');assert.equal(admission.answer.source,'experience');assert.equal(o.questionSpent,spent+1);assert.match(admission.answer.text,/가품|모조품|복제/);unchanged(s,()=>E.talk(s,'authenticity'));assert(E.validate(s));
});

test('Use instructions and initial intended features disclose no physical clues, then feature details advance one at a time',()=>{
 for(const it of PAWN_ITEMS){const s=fixture(it.id),o=s.current;const use=reply(s,'use');assert.equal(use.answer.kind,'use-instruction');assert.deepEqual(learned(s),[]);unchanged(s,()=>E.talk(s,'use'));const feature=reply(s,'quality');assert.equal(feature.answer.kind,'intended-feature');assert(feature.answer.text.includes(it.effect));assert.deepEqual(learned(s),[]);const before=learned(s),detail=reply(s,'quality');assert.equal(detail.answer.kind,'feature-detail');assert.equal(learned(s).filter(id=>!before.includes(id)).length,1);assert(detail.answer.clueId);assert.equal(o.questionSpent,3);assert.equal(o.talkLeft,1);assert(E.validate(s));}
});

test('Direct authenticity and function answers remain available after all topic clues were inspected',()=>{
 for(const topic of ['authenticity','function']){const s=fixture(),o=s.current;for(const clue of o.discovery.clues.filter(x=>x.topic===topic))clue.observed=true;const before=learned(s),seen=observed(s),option=E.dialogueOptions(s).find(x=>x.id===topic);assert(option&&!option.exhausted);const answer=reply(s,topic);expectClaimedAnswer(s,topic,answer.answer);assert.deepEqual(learned(s),before);assert.deepEqual(observed(s),seen);assert.equal(o.questionSpent,1);unchanged(s,()=>E.talk(s,topic));}
});

test('Exterior questions report the seller claimed symptom while deceit and function status remain explicit',()=>{
 for(const intent of ['honest','unaware','fraud'])for(const condition of [0,2,4]){const s=fixture('clock-01',1,{condition,intent}),o=s.current,answer=reply(s,'condition');expectClaimedAnswer(s,'condition',answer.answer);if(intent==='fraud'&&condition<4)assert.equal(answer.answer.kind,'reported-intact');else assert.equal(answer.answer.kind,['reported-damage','reported-wear','reported-intact'][condition===0?0:condition===2?1:2]);assert(o.discovery.clues.find(x=>x.id===answer.answer.clueId).heard);assert.equal(o.evidence.axes.condition.observedActual,false);}
});

test('Function replies and use instructions do not change when undisclosed hidden truth changes',()=>{
 for(const topic of ['function','use','quality','condition'])for(const it of PAWN_ITEMS){const s=fixture(it.id),other=copy(s);other.current.genuine=false;other.current.value=1;other.current.grade=8;other.current.condition=4;const a=reply(s,topic),b=reply(other,topic);assert.deepEqual(b.answer,a.answer,it.id+' '+topic);assert.equal(b.text,a.text);}
});

test('New question routes share the unchanged affinity budget and rejected questions never alter state',()=>{
 for(const [relation,max] of [[-25,1],[0,2],[25,3],[60,4]]){const s=fixture();s.relationships[s.current.character]=relation;s.current.loopVersion=1;E.prepare(s);assert.equal(s.current.talkLeft,max);for(const topic of ['use','quality','authenticity','function'].slice(0,max))reply(s,topic);assert.equal(s.current.questionSpent,max);assert.equal(s.current.talkLeft,0);for(const topic of ['provenance','use','quality','authenticity','function','condition'])unchanged(s,()=>E.talk(s,topic));assert(E.validate(s));}
});

test('Real v6.10 save gains direct reply routes without rewriting history, known fragments or spent budgets',()=>{
 const s=JSON.parse(fs.readFileSync(path.join(__dirname,'migration-v610-dialogue-fixture.json'),'utf8')),before=copy(s);assert(!s.current.dialogue);assert(E.validate(s));E.prepare(s);
 for(const key of ['coins','seed','stock','relationships','discovered'])assert.deepEqual(s[key],before[key]);for(const key of ['history','notes','discovery','evidence','inspectionResults','price','acceptedOffer','questionSpent','questionMax','talkLeft','inspectionSpent','inspectionMax','inspectionLeft'])assert.deepEqual(s.current[key],before.current[key]);
 assert(Object.values(s.current.dialogue.answered).every(x=>x===false));assert(Object.values(s.current.dialogue.answers).every(x=>x.length===0));assert(E.dialogueOptions(s).some(x=>x.id==='use'&&!x.exhausted));assert.equal(E.appraisalNotebook(s).find(x=>x.recordKey==='use').claim,null);
 const saved=JSON.stringify(s);E.prepare(s);E.dialogueOptions(s);E.appraisalNotebook(s);assert.equal(JSON.stringify(s),saved);const use=reply(s,'use');assert.equal(use.answer.kind,'use-instruction');assert.deepEqual(s.current.discovery,before.current.discovery);assert.equal(s.current.questionSpent,before.current.questionSpent+1);assert.equal(s.current.talkLeft,0);assert(E.validate(s));
});

test('Buyer requirement replies state all five condition and nine grade thresholds correctly in every voice',()=>{
 const conditionTerms=[/손상|수리/,/마모와 손상/,/좋은 보존 상태/,/거의 새것/,/완벽하게 보존/];let replies=0;
 for(let character=0;character<26;character++)for(let minCondition=0;minCondition<=4;minCondition++)for(let minGrade=0;minGrade<=8;minGrade++){
  const s=buyerFixture('clock-01',character,minCondition,minGrade),o=s.current,raw=PawnEvolution.buyerRequirements(s),before=copy(s);assert.match(raw,conditionTerms[minCondition]);
  if(minCondition===0)assert.match(raw,/있어도 검토/);if(minCondition===1)assert.match(raw,/그보다 보존 상태가 나쁜 물건은 어렵/);if(minCondition===2||minCondition===3)assert.match(raw,/이상이어야/);
  if(minGrade===0)assert.match(raw,/제작 등급은 따로 요구하지 않는다/);else assert(raw.includes(E.GRADES[minGrade][0]+' 이상 등급이어야 한다'));
  const answer=reply(s,'taste');assert(answer.text.includes(PawnTradeVoice.spoken(raw,character)),character+' condition '+minCondition+' grade '+minGrade);assert.equal(s.coins,before.coins);assert.equal(E.relationship(s,character),E.relationship(before,character));assert.equal(o.price,before.current.price);assert.deepEqual(o.buyerQuotes,before.current.buyerQuotes);assert.equal(o.questionSpent,1);assert.equal(o.talkLeft,3);assert.equal(o.offerSpent,before.current.offerSpent);assert.equal(o.patience,before.current.patience);assert(E.validate(s));replies++;
 }assert.equal(replies,26*5*9);console.log('Buyer requirement replies checked: '+replies);
});

test('The condition and grade stated by buyers match the real item acceptance boundaries',()=>{
 for(let minCondition=0;minCondition<=4;minCondition++)for(let minGrade=0;minGrade<=8;minGrade++){
  const s=buyerFixture('clock-01',0,minCondition,minGrade),lot=s.stock[0];lot.condition=minCondition;lot.grade=minGrade;assert(E.buyerFit(s,lot).allowed);
  if(minCondition>0){lot.condition=minCondition-1;const fit=E.buyerFit(s,lot);assert.equal(fit.allowed,false);assert.equal(fit.reason,'찾는 물건보다 보존 상태가 좋지 않음');lot.condition=minCondition;}
  if(minGrade>0){lot.grade=minGrade-1;const fit=E.buyerFit(s,lot);assert.equal(fit.allowed,false);assert.equal(fit.reason,'원하는 제작 수준에 미치지 못함');}
 }
});

test('All item introductions name the actual item and preserve the existing price, trust and opportunity effects',()=>{
 let replies=0;
 for(const it of PAWN_ITEMS)for(let character=0;character<26;character++)for(const topic of ['story','demonstrate','assert-real']){
  const s=buyerFixture(it.id,character),o=s.current,q=o.buyerQuotes[o.stockUid],before=copy(s),matched=PawnEvolution.approach(s)===topic,historyStart=o.history.length;const answer=reply(s,topic),added=o.history.slice(historyStart);replies++;
  assert(answer.text.includes(it.name),it.id+' '+character+' '+topic+' names another item');assert(!/[{}]|undefined/.test(answer.text));
  if(topic==='story'){assert(added.some(x=>x.speaker==='player'&&x.text===it.story));assert(answer.text.includes(it.story.replace(/[.!?。]+$/,'')));assert(q.storyShown);}
  if(topic==='demonstrate'){assert(answer.text.includes(E.CONDITIONS[o.condition][0]));assert(answer.text.includes(it.effect));const instruction=PawnDialogueData.useFor(it.id).instruction;assert(added.some(x=>x.speaker==='player'&&x.text.includes(it.name)&&x.text.includes(instruction)));}
  if(topic==='assert-real'){assert.match(answer.text,/진품/);assert(q.asserted);assert.equal(q.detected,false);}
  assert.equal(q.price,matched?318:300);assert.equal(q.maxBase,matched?493:440);assert.equal(o.price,q.price);assert.equal(E.relationship(s,character),matched?63:59);assert.equal(o.mood,matched?8:-3);assert.equal(o.patience,5);assert(o.pitchUsed);assert.equal(s.coins,before.coins);
  for(const key of ['questionSpent','inspectionSpent','inspectionLeft','offerSpent'])assert.equal(o[key],before.current[key],topic+' changed '+key);assert.equal(o.questionMax,E.questionCapacity(E.relationship(s,character)));assert.equal(o.talkLeft,o.questionMax-o.questionSpent);assert.equal(o.offerMax,E.offerCapacity(E.relationship(s,character)));assert.equal(o.offerLeft,o.offerMax-o.offerSpent);for(const key of ['grade','condition','genuine','value'])assert.equal(o[key],before.current[key]);unchanged(s,()=>E.talk(s,topic));assert(E.validate(s));
 }assert.equal(replies,144*26*3);console.log('Buyer item introductions checked: '+replies);
});

test('Introduction copy leaves successful checkout and caught false-assurance amounts unchanged',()=>{
 for(const topic of ['story','demonstrate','assert-real']){
  const s=buyerFixture('clock-01',0),o=s.current;reply(s,topic);const before=s.coins,price=o.price,relation=E.relationship(s,0);assert(E.accept(s).ok);assert.equal(s.coins,before+price);assert.equal(o.sale,price);assert.equal(s.profit,price-200);assert.equal(E.relationship(s,0),relation+6);assert.equal(s.stock.length,0);unchanged(s,()=>E.accept(s));assert(E.validate(s));
 }
 const s=buyerFixture('clock-01',0,0,0,{genuine:false}),o=s.current,q=o.buyerQuotes[o.stockUid];q.assertRoll=0;const before=s.coins,answer=reply(s,'assert-real');assert.match(answer.text,/가품/);assert(q.detected);assert.equal(o.price,288);assert.equal(q.maxBase,432);assert.equal(q.perceivedValue,400);assert.equal(E.relationship(s,0),48);assert.equal(o.mood,-20);assert.equal(o.patience,5);assert.equal(o.questionSpent,0);assert.equal(o.offerSpent,0);assert.equal(s.coins,before);
 assert(E.accept(s).ok);assert.equal(s.coins,before+288);assert.equal(s.profit,88);assert.equal(E.relationship(s,0),52);assert(E.validate(s));
});

test('Preference replies refuse stock that fails the stated purpose, condition, grade or personal taste',()=>{
 let refusals=0;
 for(let character=0;character<26;character++)for(const reason of ['condition','grade','purpose','dislike']){
  const p=E.profile(character),wanted=PAWN_ITEMS.find(it=>p.likes.includes(it.category));assert(wanted);
  const s=buyerFixture(wanted.id,character,2,2),o=s.current,lot=s.stock[0];
  if(reason==='condition')lot.condition=1;
  else if(reason==='grade')lot.grade=1;
  else {const other=PAWN_ITEMS.find(it=>reason==='dislike'?p.dislikes.includes(it.category):it.category!==wanted.category&&!p.likes.includes(it.category)&&!p.dislikes.includes(it.category));if(!other)continue;lot.itemId=other.id;o.itemId=other.id;}
  const fit=E.buyerFit(s,lot);assert.equal(fit.allowed,false);const expected={condition:'찾는 물건보다 보존 상태가 좋지 않음',grade:'원하는 제작 수준에 미치지 못함',purpose:'방문 목적과 취향에 맞지 않음',dislike:'좋아하지 않는 품목'}[reason];assert.equal(fit.reason,expected);
  const before=copy(s),raw=PawnCustomerGoals.decline(o.purchasePurpose,fit.reason),answer=reply(s,'preference');assert(answer.text.includes(PawnTradeVoice.spoken(raw,character)),character+' '+reason+' does not explain refusal');assert.match(answer.text,/사지/);assert(!/대신.*검토/.test(answer.text));assert.equal(o.price,before.current.price);assert.equal(s.coins,before.coins);assert.equal(E.relationship(s,character),E.relationship(before,character));assert.equal(o.questionSpent,1);assert.equal(o.patience,before.current.patience);assert.equal(o.offerSpent,before.current.offerSpent);assert(o.buyerQuotes[o.stockUid].preferenceAsked);assert(E.validate(s));refusals++;
 }assert(refusals>=78);console.log('Buyer refusal replies checked: '+refusals);
});

console.log(JSON.stringify({tests,items:PAWN_ITEMS.length,voices:PAWN_CHARACTERS.length}));
