'use strict';
// Optional v6.5 state stays alongside v6 saves; existing observations are never rerolled.
(function(G){
let H;
const cap=(v,a,b)=>Math.max(a,Math.min(b,v));
const PITCHES=['story','demonstrate','assert-real'];
const APPROACHES=['demonstrate','assert-real','story','story','demonstrate','demonstrate','story','assert-real','story','demonstrate','story','story','story','demonstrate','demonstrate','demonstrate','assert-real','assert-real','demonstrate','assert-real','assert-real','story','demonstrate','assert-real','assert-real','story'];
const APPROACH_TEXT={story:'누가 아끼던 물건인지, 어떤 사연이 있는지가 중요하다.',demonstrate:'오래 써도 괜찮을지, 지금 상태와 쓰임새를 먼저 보고 싶다.','assert-real':'이름만 믿지는 않는다. 진품이라는 근거와 보증이 먼저다.'};
const MARKS=['칼자국이 불규칙하고 서명이 없다','바깥 테두리에 짧은 획 하나가 있다','짧은 획 둘이 나란히 새겨져 있다','세 획 끝에 작은 점이 찍혀 있다','네 획을 잇는 닫힌 고리가 있다','다섯 획 안에 작은 달이 숨어 있다','여섯 획이 별 하나를 에워싸고 있다','일곱 획 사이로 이중 별이 보인다','여덟 획 한가운데 빛을 삼키는 빈 점이 있다'];
const DEEP=[{id:'deep-auth',axis:'authenticity',level:1,title:'표식 안쪽을 교차 확인'},{id:'deep-grade',axis:'quality',level:2,title:'제작자 서명을 정밀 판독'},{id:'deep-wear',axis:'condition',level:3,title:'수리 부품과 사용층 확인'}];
const CASES=['기본 특징','겉면을 고친 물건','부품을 맞춘 물건'];
function material(o){return G.PAWN_ITEM_APPRAISALS?.[o.itemId]?.materialFamily||'metal'}
function layers(o){
 const f=material(o);
 if(f==='liquid'||f==='powder')return{surface:'위쪽에 얇은 층이 생겨 아래의 배합은 가려져 있다.',assembly:'성분이 한 번 나뉘었다가 다시 섞인 흔적이 있다.',claimSurface:'겉에 뜬 층을 걷어낸 적이 있다. 아래쪽은 자세히 보지 못했다.',claimAssembly:'옮겨 담으면서 한 번 다시 섞었다. 밑에 가라앉은 것은 살펴보지 못했다.',goodSurface:'위아래 층에서 같은 입자와 빛 반응이 이어진다. 겉층 아래에도 원래 배합의 특징이 남아 있다.',badSurface:'윗층만 특징을 흉내 냈다. 아래층은 입자 모양과 빛 반응이 전혀 다르다.',goodAssembly:'다시 섞인 층에서도 같은 성분의 입자가 고르게 이어진다.',badAssembly:'성질이 다른 입자가 두 층으로 갈라진다. 다른 배합을 섞어 겉모습만 맞췄다.',reference:'액체·가루는 위아래 층의 입자와 빛 반응을 비교합니다. 같은 배합이면 특징이 이어지고, 다른 배합을 섞은 물건은 층마다 반응이 다릅니다.'};
 if(f==='paper'||f==='paint')return{surface:'얇게 덧댄 표면 아래의 원래 섬유와 안료층이 가려져 있다.',assembly:'작은 조각을 이어 붙인 흔적이 있어 안쪽 결은 아직 보이지 않는다.',claimSurface:'겉면을 보존 처리한 적은 있다. 밑의 결은 자세히 보지 못했다.',claimAssembly:'훼손된 부분을 다시 이어 붙였다고 들었다. 이음 안쪽은 살펴보지 못했다.',goodSurface:'덧댄 층 아래에도 원래 섬유와 오래된 안료층이 이어진다.',badSurface:'겉층만 오래되어 보인다. 밑에는 새 종이와 다른 안료가 드러난다.',goodAssembly:'다시 맞춘 이음 안쪽에서도 원래 결이 자연스럽게 이어진다.',badAssembly:'이어 붙인 조각마다 섬유와 안료가 다르다. 다른 물건의 조각을 맞춘 흔적이다.',reference:'보존 처리 자체는 위조의 증거가 아닙니다. 아래의 원래 섬유와 안료층이 이어지는지, 붙인 조각의 결이 서로 맞는지 비교합니다.'};
 if(['fiber','leather','feather'].includes(f))return{surface:'겉의 염색층 아래 올과 가죽 결이 가려져 있다.',assembly:'한 번 다시 꿰맨 흔적이 있어 안쪽 연결은 보이지 않는다.',claimSurface:'겉의 색을 손본 적은 있다. 안쪽 결은 자세히 보지 못했다.',claimAssembly:'풀어진 곳을 다시 이었다고 들었다. 안쪽 매듭은 살펴보지 못했다.',goodSurface:'염색 아래까지 원래 올과 결이 이어진다. 오래된 속층에도 같은 특징이 남아 있다.',badSurface:'겉의 색만 흉내 냈다. 안쪽에서는 다른 올과 새 접착제가 보인다.',goodAssembly:'다시 이은 매듭 양쪽의 올과 결이 자연스럽게 맞물린다.',badAssembly:'연결 양쪽의 올 굵기와 결이 다르다. 다른 물건의 일부를 이어 붙였다.',reference:'겉의 색보다 안쪽 올과 결을 봅니다. 원래 재료를 다시 이으면 결이 맞고, 다른 재료를 붙인 모방품은 연결 양쪽의 결이 다릅니다.'};
 return{surface:'겉면에 얇게 덧댄 층이 있어 안쪽과 이어지는지 보이지 않는다.',assembly:'연결 부위가 한 번 분리된 흔적이 있어 안쪽 무늬가 이어지는지 보이지 않는다.',claimSurface:'겉면을 손본 적은 있다. 안쪽은 자세히 보지 못했다.',claimAssembly:'중간에 부품을 맞췄다고 들었다. 연결 안쪽은 살펴보지 못했다.',goodSurface:'안쪽까지 오래된 층이 이어진다. 덧댄 겉면 아래에도 같은 특징이 남아 있다.',badSurface:'겉층만 특징을 흉내 냈다. 새 층 아래에서는 무늬가 끊기고 재료가 달라진다.',goodAssembly:'연결 안쪽 무늬가 끊기지 않고 이어진다. 원래 부품을 다시 맞춘 흔적이다.',badAssembly:'연결 안쪽 무늬가 서로 어긋난다. 다른 물건의 부품으로 겉모습만 맞췄다.',reference:'원래 재료의 안쪽에는 표면과 이어지는 오래된 층이 남습니다. 겉만 모방하면 층의 경계가 끊깁니다. 원래 부품끼리는 연결 무늬가 이어지며 다른 물건의 부품은 어긋납니다.'};
}
function signatureSite(o){const f=material(o);return['liquid','powder'].includes(f)?'용기의 배합 표식':f==='paper'?'종이 가장자리의 공방 표식':f==='paint'?'안료층 가장자리의 서명':['fiber','leather','feather'].includes(f)?'안쪽 매듭 옆의 표식':H.catalogFor(o).sites[o.evidence.axes.quality.site].label+' 안쪽'}
function bind(h){H=h}
function prepare(s){
 s.evolution=65;s.followups=s.followups||[];s.memories=s.memories||[];
 s.dayActivity=s.dayActivity||{trades:Math.min(8,s.dayBought||0),night:s.night?.done?.length||0};
 const o=s.current;if(o&&!('pitchUsed' in o))o.pitchUsed=(o.talked||[]).some(id=>PITCHES.includes(id));
}
function cautious(o){return H.stable(o,'knowledge-confidence')<.36}
function decorate(s,o){
 const variety=H.stable(o,'restoration-case');
 o.caseEdition=65;o.caseKind=o.practiceClassic?0:variety<.65?0:variety<.83?1:2;
 o.deepResults={};o.deepLevels={};o.pitchUsed=false;
 if(o.kind!=='seller')return;
 const c=H.catalogFor(o),a=o.evidence.axes.authenticity,l=layers(o);
 const other=a.tool==='lens'?'불빛으로':'돋보기로';
 a.reference+='\n\n겉면의 특징만 옮긴 복제도 있습니다. '+other+' 안쪽을 교차 확인하세요. '+l.reference;
 if(o.caseKind){
  a.needsCorroboration=true;
  const seam=o.caseKind===1?l.surface:l.assembly;
  a.full=c.authenticity.observedGenuine+' '+seam+' '+other+' 같은 부위를 교차 확인할 수 있다.';
  a.claim+=' '+(o.caseKind===1?l.claimSurface:l.claimAssembly);
 }
 for(const axis of Object.values(o.evidence.axes))o.investigations[axis.tool+'-'+axis.site]=axis.full;
}
function deepReference(){return '공방의 서명표 · 진위와는 별개의 제작 수준입니다. 모조품도 정교하게 만들 수 있습니다.\n'+MARKS.map((m,i)=>G.PawnEngine.GRADES[i][0]+': '+m).join('\n')}
function deepOptions(s){
 const o=s.current;if(s.closing||o?.kind!=='seller'||o.status!=='offered')return[];
 return DEEP.map(d=>{const a=o.evidence.axes[d.axis],seen=!!o.inspectionResults[a.tool+'-'+a.site],used=!!o.deepResults?.[d.id],fluid=['liquid','powder'].includes(material(o));return{...d,title:d.id==='deep-wear'&&fluid?'배합과 변질층 확인':d.title,site:d.id==='deep-grade'?signatureSite(o):H.catalogFor(o).sites[a.site].label,tool:d.id==='deep-auth'?(a.tool==='lens'?'light':'lens'):d.id==='deep-grade'?'lens':'light',used,enabled:used||(seen&&s.upgrades.inspection>=d.level&&o.inspectionLeft>0),hint:!seen?'먼저 이 부위의 기본 흔적을 살펴보세요.':s.upgrades.inspection<d.level?'조사 작업대 '+d.level+'단계부터 가능':used?'기록 다시 읽기 · 안목이 높아졌다면 재판독 가능':'조사 1회 · 다른 각도에서 확인합니다.'}});
}
function deepText(s,o,id){
 const a=o.evidence.axes.authenticity,site=H.catalogFor(o).sites[a.site].label,l=layers(o);
 if(id==='deep-auth'){
  if(s.upgrades.appraisal<a.requiredLevel)return site+' 안쪽에 층이 겹쳐 있다. 아직 경계가 흐려 이어지는지 읽지 못했다. 감정사의 안목을 더 높이면 재판독할 수 있다.';
  if(o.caseKind===1)return site+' · '+(o.genuine?l.goodSurface:l.badSurface);
  if(o.caseKind===2)return site+' · '+(o.genuine?l.goodAssembly:l.badAssembly);
  return (o.genuine?H.catalogFor(o).authenticity.observedGenuine:H.catalogFor(o).authenticity.observedReplica)+' 다른 각도에서도 같은 특징이 확인된다.';
 }
 if(id==='deep-grade'){
  const site=signatureSite(o);
  if(s.upgrades.appraisal<2){const pair=Math.floor(o.grade/2)*2;return site+'의 서명이 흐릿하다. 「'+MARKS[pair]+'」'+(pair<8?'와 「'+MARKS[pair+1]+'」 사이에서 세부 획을 구분하기 어렵다.':'와 비슷하다.')+' 안목 2단계부터 획을 더 읽을 수 있다. 공방 서명표와 비교해 보자.';}
  return site+'에 제작자의 작은 서명이 있다. '+MARKS[o.grade]+'. 공방 서명표와 비교해 보자. 이 서명은 솜씨의 근거이며 진품 보증은 아니다.';
 }
 const worn=['손상이나 변질이 안쪽까지 깊게 진행됐다.','오래된 흔적이 있지만 깊은 층은 비교적 안정적이다.','사용한 흔적이 얕고 안쪽까지 번지지 않았다.','눈에 띄는 사용 흔적은 거의 없다.','처음의 보호층이 이어지고 변질이나 사용 흔적을 찾기 어렵다.'];
 const c=H.catalogFor(o),band=o.condition<=1?0:o.condition<=3?1:2;
 return c.condition.observations[band]+' 정밀 관찰: '+worn[o.condition]+(o.caseKind===2?' '+(o.genuine?l.goodAssembly:l.badAssembly):'');
}
function deepInvestigate(s,id){
 const o=s.current,d=deepOptions(s).find(x=>x.id===id);if(!d)return{ok:false,message:'지금 할 수 없는 정밀 조사입니다.'};
 if(!d.used&&(!o.inspectionResults[o.evidence.axes[d.axis].tool+'-'+o.evidence.axes[d.axis].site]||s.upgrades.inspection<d.level))return{ok:false,message:d.hint};
 const text=deepText(s,o,id);
 if(o.deepResults?.[id]===text)return{ok:true,message:text,repeated:true,cost:0};
 if(o.inspectionLeft<=0)return{ok:false,message:'조사 기회가 남아 있지 않습니다. 기존 기록은 다시 읽을 수 있어요.'};
 o.inspectionSpent++;o.inspectionLeft--;o.deepResults=o.deepResults||{};o.deepLevels=o.deepLevels||{};o.deepResults[id]=text;o.deepLevels[id]=s.upgrades.appraisal;o.lastDeep=id;
 if(id==='deep-auth'&&s.upgrades.appraisal>=o.evidence.axes.authenticity.requiredLevel||id==='deep-wear'&&o.caseKind===2)o.evidence.axes.authenticity.observedActual=true;
 H.history(o,'player',d.title+' · '+d.site);H.note(o,text);return{ok:true,message:text,id,cost:1};
}
function review(s,o){const clear={...s,upgrades:{...s.upgrades,appraisal:5}};return DEEP.map(d=>({key:d.id,title:d.title,result:d.id==='deep-grade'?G.PawnEngine.GRADES[o.grade][0]:'정밀 확인',reference:d.id==='deep-grade'?deepReference():o.evidence.axes[d.axis].reference,observation:deepText(clear,o,d.id),seen:!!o.deepResults?.[d.id]&&o.deepResults[d.id]===deepText(clear,o,d.id),explanation:'기본 흔적을 살핀 뒤 조사 작업대 '+d.level+'단계부터 확인할 수 있는 근거입니다.'}))}
function qualityDirection(o){if(!o.deepResults?.['deep-grade'])return 0;const clear=o.deepLevels['deep-grade']>=2,low=clear?o.grade:Math.floor(o.grade/2)*2,high=clear?o.grade:Math.min(8,low+1),claimed=o.claimedGrade??o.grade;return high<claimed?-1:low>claimed?1:0}
function proof(o,key){return key==='authenticity'?(o.deepResults?.['deep-auth']||(o.caseKind===2?o.deepResults?.['deep-wear']:'')||''):key==='quality'?(o.deepResults?.['deep-grade']||''):(o.deepResults?.['deep-wear']||'')}
function approach(s){return APPROACHES[s.current.character]||'demonstrate'}
function pitchHint(s){return APPROACH_TEXT[approach(s)]}
function pitch(s,id){
 const o=s.current,q=o.buyerQuotes[o.stockUid];o.pitchUsed=true;o.patience--;
 const matched=approach(s)===id;
 if(id==='story'){q.storyShown=true;H.history(o,'player',H.item(o.itemId).story)}
 if(id==='assert-real'){
  q.asserted=true;const caught=!o.genuine&&(q.detected||q.disclosed||q.assertRoll<.16+H.profile(o.character).expertise*.68);
  if(caught){q.detected=true;const base=Math.max(3,o.value*q.taste*H.marketFactor(s,H.item(o.itemId)));q.perceivedValue=Math.round(base);q.maxBase=Math.round(base*1.08);q.price=Math.max(3,Math.round(base*.72));o.price=q.price;o.estimate=q.perceivedValue;o.mood=cap(o.mood-20,-100,100);H.changeRelation(s,-12,'근거 없는 진품 보증을 알아챔');return H.voice(s,'offended')}
 }
 if(matched){q.price=Math.max(3,Math.round(q.price*1.06));q.maxBase=Math.round(q.maxBase*1.12);o.mood=cap(o.mood+8,-100,100);H.changeRelation(s,3,'손님이 중요하게 여기는 점을 설명함')}
 else{o.mood=cap(o.mood-3,-100,100);H.changeRelation(s,-1,'손님이 원하는 설명과 어긋남')}
 o.price=q.price;
 const detail=matched?({story:'그 사연이라면 오래 간직하고 싶다. 조금 더 값을 쳐줄 수 있다.',demonstrate:'상태와 쓰임새를 직접 보니 마음이 놓인다. 이 정도면 값을 더 쳐줄 수 있다.','assert-real':'보증까지 해 준다면 믿고 살 수 있다. 그만큼 가격을 더 생각하겠다.'})[id]:pitchHint(s)+' 지금 설명은 내 결정에 큰 도움이 되지 않았다.';
 return H.voice(s,'claim',{detail});
}
function dayBonus(s){
 const a=s.dayActivity||{trades:Math.min(8,s.dayBought||0),night:s.night?.done?.length||0};
 const assets=s.coins+s.stock.reduce((n,l)=>n+H.quote(s,l),0);
 return{support:Math.max(0,Math.min(50,Math.floor(650-assets))),activity:Math.min(120,a.trades*12+a.night*8),get total(){return this.support+this.activity}};
}
function activity(s,kind){
 prepare(s);s.dayActivity[kind]=Math.min(kind==='trades'?32:2,s.dayActivity[kind]+1);
 const ev=H.event(s);if(ev.kind==='gift'&&!s.eventDone){const gift=Math.max(0,ev.gift||0);s.coins+=gift;s.eventDone=true;H.log(s,'활동을 마친 가게에 감사 선물 +'+gift+'G','good');H.notify(s,ev.title+' +'+gift+'G')}
}
function queue(s,kind,o,amount=0,delay=8){
 prepare(s);const id=o.uid+':'+kind;if(s.followups.some(x=>x.id===id)||s.memories.some(x=>x.id===id))return;
 if(s.followups.length>=12)return;
 s.followups.push({id,kind,character:o.character,itemId:o.itemId,lotUid:o.stockUid||o.uid,amount:Math.max(0,Math.round(amount)),due:s.turn+delay+Math.floor(H.stable(o,'return:'+kind)*12),day:s.day});
}
function bought(s,o){activity(s,'trades');if(o.genuine&&o.sleeper&&o.value>o.paid*2&&H.stable(o,'after-buy')<.3)queue(s,'undervalued',o,Math.min(300,(o.value-o.paid)*.15));else if(!o.genuine&&o.intent==='unaware'&&H.stable(o,'after-buy')<.2)queue(s,'apology',o);}
function sold(s,o,lot,q){
 if(!lot.genuine&&!q.detected&&!q.disclosed){if(H.stable(o,'after-sale')<.4)queue(s,'complaint',o,Math.min(300,o.sale*.2));}
 else if(lot.genuine&&o.sale<=q.perceivedValue*1.05&&H.stable(o,'after-sale')<.22)queue(s,'gratitude',o);
}
function pickReturn(s){
 prepare(s);const due=s.followups.filter(x=>x.due<=s.turn&&x.character!==s.lastCharacter);
 if(!due.length)return null;const oldest=due.reduce((a,b)=>a.due<b.due?a:b);
 return s.turn-oldest.due>=12||H.rand(s)<.35?oldest:null;
}
function specialLot(s,o,m){
 if(m?.kind!=='favor-reward')return;
 const it=H.item(o.itemId);o.genuine=true;o.grade=Math.max(3,Math.min(6,o.grade));o.claimedGrade=o.grade;o.sleeper=false;o.value=Math.round(it.base*G.PawnEngine.GRADES[o.grade][2]*G.PawnEngine.CONDITIONS[o.condition][1]);o.apparent=o.value;o.asking=o.price=Math.max(12,Math.round(o.value*.6));o.baseFloor=Math.max(4,Math.round(o.price*.9));o.estimate=o.value;
}
function arrive(s,o,m){
 if(!m)return;s.followups=s.followups.filter(x=>x.id!==m.id);o.returnStory={...m,resolved:m.kind==='favor-reward'};
 const name=H.item(m.itemId).name;
 const lines={complaint:'지난번 산 '+name+'을 다시 감정받았다. 복제품이라고 하더라. 그때 진품인 줄 알고 산 일은 이야기하고 싶다.',undervalued:'지난번 판 '+name+'이 생각보다 귀한 물건이라고 들었다. 당시 가격이 마음에 걸려 다시 왔다.',apology:'지난번 맡긴 '+name+'이 복제품이라는 걸 뒤늦게 알았다. 나도 진품으로 알고 있었다. 미안해서 다시 왔다.',gratitude:'지난번 산 '+name+'을 잘 쓰고 있다. 고마워서 작은 답례를 준비했다. 다음에 괜찮은 물건을 먼저 가져올 수도 있다.','favor-reward':'지난번 약속을 기억하고 있다. 오늘은 괜찮은 물건을 먼저 보여 주러 왔다. 값을 조금 낮췄으니 직접 살펴봐라.'};
 H.history(o,'customer',H.voice(s,'claim',{detail:lines[m.kind]}));
 if(m.kind==='favor-reward')remember(s,m,'약속한 물건을 먼저 보여 줌');
}
function remember(s,m,text){s.memories.unshift({...m,text,day:s.day});s.memories=s.memories.slice(0,40);H.log(s,G.PAWN_CHARACTERS[m.character].name+' · '+text,'normal')}
function returnChoices(s){
 const o=s.current,m=o.returnStory;if(s.closing||o.status!=='offered'||!m||m.resolved)return[];
 if(m.kind==='complaint'||m.kind==='undervalued')return[{id:'compensate',label:m.amount+'G를 보태 마음 풀기',cost:m.amount},{id:'explain',label:'그때의 거래를 설명하고 사과하기',cost:0},{id:'dismiss',label:'지난 거래는 끝났다고 말하기',cost:0}];
 if(m.kind==='apology')return[{id:'forgive',label:'다음에는 함께 확인하자고 하기',cost:0},{id:'dismiss',label:'당분간 거래를 조심하겠다고 말하기',cost:0}];
 return[{id:'gift',label:'작은 답례 받기 · 35G',cost:0},{id:'favor',label:'답례 대신 다음 좋은 물건 부탁하기',cost:0}];
}
function resolveFollowup(s,id){
 const choice=returnChoices(s).find(x=>x.id===id);if(!choice)return{ok:false,message:'지금 고를 수 없는 답변입니다.'};if(s.coins<choice.cost)return{ok:false,message:'보탤 금액이 부족합니다. 말로 풀 수도 있어요.'};
 const o=s.current,m=o.returnStory;o.relationDelta=0;H.history(o,'player',choice.label);s.coins-=choice.cost;
 if(m.kind==='complaint'&&choice.cost){s.profit-=choice.cost;s.dayProfit-=choice.cost}
 if(m.kind==='undervalued'&&choice.cost){const lot=s.stock.find(x=>x.uid===m.lotUid);if(lot)lot.paid+=choice.cost;else{s.profit-=choice.cost;s.dayProfit-=choice.cost}}
 const delta=id==='compensate'?6:id==='forgive'?4:id==='dismiss'?-5:2;H.changeRelation(s,delta,'지난 거래의 후일담');
 if(id==='gift')s.coins+=35;
 if(id==='favor')queue(s,'favor-reward',{...o,uid:m.id},0,6);
 m.resolved=true;remember(s,m,choice.label);
 H.history(o,'customer',H.voice(s,'claim',{detail:id==='favor'?'그럼 다음에 좋은 물건을 구하면 먼저 들르겠다.':id==='dismiss'?'알겠다. 다음 거래는 나도 더 신중히 생각하겠다.':'이야기를 나눠서 마음이 조금 정리됐다. 오늘 가져온 이야기도 이어가자.'}));
 return{ok:true,message:'지난 거래가 다음 만남의 기억으로 남았습니다.'};
}
function depart(s){const m=s.current?.returnStory;if(m&&!m.resolved){m.resolved=true;remember(s,m,'후일담을 듣고 이번에는 지나감')}}
function valid(s){
 if(s.evolution===undefined)return true;
 if(s.evolution!==65||!s.current||!Array.isArray(s.stock)||!Array.isArray(s.followups)||s.followups.length>12||!Array.isArray(s.memories)||s.memories.length>40)return false;
 const n=v=>Number.isSafeInteger(v)&&v>=0;
 const check=m=>m&&typeof m.id==='string'&&m.id.length<200&&['complaint','undervalued','apology','gratitude','favor-reward'].includes(m.kind)&&n(m.character)&&m.character<G.PAWN_CHARACTERS.length&&G.PAWN_ITEMS.some(it=>it.id===m.itemId)&&n(m.amount)&&m.amount<=300&&n(m.due)&&n(m.day);
 if(s.followups.some(m=>!check(m))||new Set(s.followups.map(m=>m.id)).size!==s.followups.length||s.memories.some(m=>!check(m)||typeof m.text!=='string'))return false;
 if(!s.dayActivity||!n(s.dayActivity.trades)||s.dayActivity.trades>32||!n(s.dayActivity.night)||s.dayActivity.night>2)return false;
 const o=s.current;if(o.returnStory&&(!check(o.returnStory)||typeof o.returnStory.resolved!=='boolean'))return false;
 if(o.pitchUsed!==undefined&&typeof o.pitchUsed!=='boolean')return false;
 if(o.caseEdition!==undefined&&(o.caseEdition!==65||!n(o.caseKind)||o.caseKind>2))return false;
 if(o.deepResults){if(typeof o.deepResults!=='object'||Array.isArray(o.deepResults)||!o.deepLevels)return false;for(const [id,t] of Object.entries(o.deepResults))if(!DEEP.some(d=>d.id===id)||typeof t!=='string'||t.length>3000||!n(o.deepLevels[id])||o.deepLevels[id]>5)return false;}
 return true;
}
G.PawnEvolution={bind,prepare,decorate,cautious,deepOptions,deepInvestigate,deepReference,deepText,review,qualityDirection,proof,pitch,pitchHint,approach,dayBonus,activity,queue,bought,sold,pickReturn,specialLot,arrive,returnChoices,resolveFollowup,depart,valid,CASES};
})(globalThis);
