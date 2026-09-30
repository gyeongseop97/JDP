'use strict';
(() => {
const E=PawnEngine,$=id=>document.getElementById(id),KEY='midnight-pawn-v6';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.round(Number(x)||0).toLocaleString('ko-KR');
let s,view='trade',stockFilter='all',codexMode='items',category='all',timer,saveOK=true,offerKey='',mode='menu',hasSave=false,investigationTool='lens',inspectionFocus='',inspectionVisit='';
for(const key of [KEY,KEY+'-backup','midnight-pawn-v5','midnight-pawn-v5-backup','midnight-pawn-v4','midnight-pawn-v4-backup','midnight-pawn-v3','midnight-pawn-v3-backup']){
  try{const candidate=JSON.parse(localStorage.getItem(key)||'null');if(E.validate(candidate)){s=E.prepare(candidate);hasSave=true;break}}catch{}
}
if(!s)s=E.prepare(E.create());
let tutorialBackup=null;
const sheets=[];
function sheet(index,portrait){const key=portrait||index;if(!sheets[key]){const img=new Image();img.decoding='async';img.onload=paintPeople;img.src=portrait||'characters-'+index+'.webp';sheets[key]=img}return sheets[key]}
function save(){if(mode!=='play')return;try{const old=localStorage.getItem(KEY);if(old){try{if(E.validate(JSON.parse(old)))localStorage.setItem(KEY+'-backup',old)}catch{}}localStorage.setItem(KEY,JSON.stringify(s));saveOK=true;hasSave=true}catch{saveOK=false;toast('저장 공간을 사용할 수 없어요. 창을 닫지 말아 주세요.')}}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('show'),2500)}
function tone(kind='tap'){window.PawnAudio?.effect(kind)}
function paintPeople(){for(const canvas of document.querySelectorAll('canvas[data-person]')){const c=PAWN_CHARACTERS[Number(canvas.dataset.person)];if(!c)continue;const img=sheet(c.sheet,c.portrait);if(!img.complete||!img.naturalWidth)continue;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);if(c.portrait){const scale=Math.min(canvas.width/img.naturalWidth,canvas.height/img.naturalHeight),w=Math.round(img.naturalWidth*scale),h=Math.round(img.naturalHeight*scale);ctx.drawImage(img,Math.floor((canvas.width-w)/2),canvas.height-h,w,h);continue}const sw=img.naturalWidth/4,sh=img.naturalHeight/2;ctx.drawImage(img,(c.cell%4)*sw,Math.floor(c.cell/4)*sh,sw,sh,0,0,canvas.width,canvas.height)}}
function paintItems(){for(const canvas of document.querySelectorAll('canvas[data-item]'))PawnArt.item(canvas,E.item(canvas.dataset.item),Number.isFinite(Number(canvas.dataset.grade))?Number(canvas.dataset.grade):1,canvas.dataset.unknown==='true')}
function art(itemId,grade=1,cls='',unknown=false){return '<canvas class="'+cls+'" width="64" height="64" data-item="'+esc(itemId)+'" data-grade="'+grade+'" data-unknown="'+unknown+'" aria-hidden="true"></canvas>'}
function portrait(index,cls=''){return '<canvas class="'+cls+'" width="192" height="256" data-person="'+index+'" aria-hidden="true"></canvas>'}
function badge(grade,text){const g=E.GRADES[grade]||E.GRADES[1];return '<span class="grade-badge" style="--grade:'+g[1]+'">'+esc(text||g[0])+'</span>'}
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
function showResult(id){if(window.PawnCounter?.reveal(id))return;if(mode==='tutorial'||innerWidth>760)return;requestAnimationFrame(()=>{const target=$(id);if(!target)return;if(id==='conversation-heading'){const line=$('customer-line').getBoundingClientRect(),controls=['.bottom-nav','.deal-actions'].map(x=>document.querySelector(x)).filter(x=>x?.getClientRects().length&&getComputedStyle(x).position==='fixed'),bottom=Math.min(innerHeight-16,...controls.map(x=>x.getBoundingClientRect().top-16));if(line.top>=65&&line.bottom<=bottom)return;}target.scrollIntoView({block:'start',behavior:motion()})})}
function run(fn,...args){const before=s.current?.status,result=fn(s,...args);render();save();window.PawnAudio?.feedback(fn.name,result,s);if(result?.message&&(result.ok===false||!['talk','investigate','deepInvestigate'].includes(fn.name)))toast(result.message);if(s.notices.length){const note=s.notices[s.notices.length-1];s.notices=[];save();if(!result?.message)toast(note)}if(before==='offered'&&s.current?.status!=='offered')showResult('reveal-view');window.dispatchEvent(new CustomEvent('pawn:change',{detail:{action:fn.name,args,result}}));return result}
function switchView(next){if(!['trade','stock','codex','shop'].includes(next))return;view=next;for(const el of document.querySelectorAll('.view'))el.classList.toggle('active',el.id==='view-'+view);for(const el of document.querySelectorAll('[data-view]')){el.classList.toggle('active',el.dataset.view===view);if(el.dataset.view===view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')}render();window.scrollTo({top:0,behavior:'instant'});window.dispatchEvent(new CustomEvent('pawn:view',{detail:{view}}))}
function relationship(index){return E.relationship(s,index)}
function renderRelationship(o){const value=relationship(o.character),p=E.profile(o.character);$('relationship').innerHTML='<span class="relation-badge '+(value<0?'unfriendly':value>20?'friendly':'')+'">'+(value>=0?'♡':'♧')+' '+esc(E.relationLabel(value))+' <b>'+(value>0?'+':'')+value+'</b></span><span class="customer-manner">'+esc(p.manner)+' · 호감도 질문 한도 '+E.questionCapacity(value)+'회'+'</span>';$('visitor-tag').textContent=(o.kind==='buyer'?'구매하러 온 손님':'판매하러 온 손님')+' · '+(s.met[o.character]>1?'단골':'첫 방문');}
function renderHistory(o){
  const history=o.history||[];
  $('conversation-meta').textContent=PAWN_CHARACTERS[o.character].name+' · '+(o.kind==='buyer'?'구매하러 온 손님':'판매하러 온 손님');
  $('dialogue-log').innerHTML=history.map(h=>'<div class="dialogue-line '+esc(h.speaker)+'"><span>'+({player:'나',customer:PAWN_CHARACTERS[o.character].name,note:'관찰'}[h.speaker]||'기록')+'</span><p>'+esc(h.text)+'</p></div>').join('')||'<p class="quiet-note">아직 나눈 대화가 없습니다.</p>';
  if(o.legacyHistory?.length)$('dialogue-log').innerHTML+='<details><summary>이전 버전의 대화 기록</summary>'+o.legacyHistory.map(h=>'<p>'+esc(h.text)+'</p>').join('')+'</details>';
}
function openConversation(){
  renderHistory(s.current);
  $('conversation-dialog').showModal();
  $('conversation-history').setAttribute('aria-expanded','true');
  document.body.classList.add('conversation-open');
  const log=$('dialogue-log');log.scrollTop=log.scrollHeight;
}
function renderDialogue(o){
  const history=o.history||[],latest=history.filter(h=>h.speaker==='customer').at(-1),active=!s.closing&&o.status==='offered';
  $('customer-line').textContent=latest?.text||o.feedback||o.line||PAWN_CHARACTERS[o.character].greeting;
  $('history-count').textContent=history.length;
  $('talk-count').textContent='질문 '+o.talkLeft+'/'+o.questionMax+' · 조사 '+o.inspectionLeft+'/'+o.inspectionMax;
  $('talk-count').hidden=!active;
  $('patience-label').textContent=!active?(s.closing?'오늘의 영업을 마쳤어요':o.status==='left'?'손님이 자리를 떠났어요':'거래를 마쳤어요'):o.patience<=1?'협상 여유가 거의 없어요':o.mood<-10?'기분이 상했어요':o.mood>10?'호의적인 반응':'이야기를 듣고 있어요';
  const options=active?(E.dialogueOptions(s)||[]):[];
  $('dialogue-options').hidden=!active;
  $('dialogue-options').innerHTML=options.length?options.map((x,i)=>'<button class="dialogue-choice '+(x.tone==='risk'||x.tone==='hostile'?'risky':'')+'" data-talk="'+esc(x.id)+'"'+(x.hint?' data-tooltip="'+esc(x.hint)+'" aria-description="'+esc(x.hint)+'"':'')+'><span class="choice-marker" aria-hidden="true">'+(i+1)+'</span><strong>'+esc(x.label)+'</strong><span class="choice-arrow" aria-hidden="true">›</span></button>').join(''):'<p class="quiet-note">이야기를 충분히 나눴어요. '+(o.kind==='buyer'?'판매할 물건을 고르거나 가격을 제안하세요.':'물건을 살펴보거나 가격을 제안하세요.')+'</p>';
  renderFollowup(o);if($('conversation-dialog').open)renderHistory(o);

  const investigations=E.investigationOptions(s),used=new Set(o.inspected||[]);
  $('inspection-count').textContent='남은 조사 '+o.inspectionLeft+' / '+o.inspectionMax;
  $('investigation-panel').hidden=o.kind==='buyer';
  $('evidence-book').hidden=o.kind==='buyer';
  if(inspectionVisit!==o.uid){inspectionFocus=o.lastInspection||'';inspectionVisit=o.uid}
  $('investigation-options').innerHTML='<div class="investigation-tools"><button type="button" data-tool="lens" aria-pressed="'+(investigationTool==='lens')+'" class="'+(investigationTool==='lens'?'selected':'')+'">⌕ 돋보기</button><button type="button" data-tool="light" aria-pressed="'+(investigationTool==='light')+'" class="'+(investigationTool==='light'?'selected':'')+'">☼ 불빛 비추기</button></div><p class="tool-purpose">'+(investigationTool==='lens'?'작은 무늬와 틈을 가까이 봅니다.':'색과 반짝임, 속에 비치는 것을 봅니다.')+'</p><div class="investigation-workbench">'+art(o.itemId,1,'inspection-art')+'<span>어느 부위를 확인할까요?</span></div><div class="investigation-targets">'+investigations.filter(x=>x.tool===investigationTool).map(x=>'<button class="investigation-choice" data-investigate="'+esc(x.id)+'" '+(o.inspectionLeft<=0&&!used.has(x.id)?'disabled':'')+'><strong>'+esc(x.label)+'</strong><small>'+esc(used.has(x.id)?'다시 보기':x.hint)+'</small></button>').join('')+'</div>';
  const observed=o.inspectionResults?.[inspectionFocus],opt=investigations.find(x=>x.id===inspectionFocus);
  $('appraisal-observation').innerHTML=observed?'<span class="eyebrow">살펴본 곳 · '+esc(opt?.label||'조사 기록')+'</span><p>'+esc(observed)+'</p>':'<p>궁금한 곳만 살펴보세요. 도구를 고른 뒤 부위를 누르면 됩니다.</p>';

  const cards=E.appraisalNotebook(s),impact=o.lastImpact;
  $('trade-impact').hidden=!impact;
  if(impact)$('trade-impact').innerHTML='<strong>'+fmt(impact.before)+'G → '+fmt(impact.after)+'G</strong><span>호감도 '+(impact.relationDelta>0?'+':'')+(impact.relationDelta||0)+'</span><p>'+esc(impact.reason)+'</p>';
  const actions=c=>c.observation?'<div class="evidence-actions"><button data-present="'+c.key+'" data-kind="defect" '+(o.evidenceUsed?.[c.key]||o.acceptedOffer?'disabled':'')+'>이 흠으로 값 깎기</button><button data-present="'+c.key+'" data-kind="praise" '+(o.evidenceUsed?.[c.key]||o.acceptedOffer?'disabled':'')+'>좋은 점 알려 주기</button></div>':'';
  const focus=cards.find(c=>c.observation===observed);
  if(o.evidence?.axes?.authenticity?.needsCorroboration&&focus?.key==='authenticity'&&!o.evidence.axes.authenticity.observedActual)$('appraisal-observation').innerHTML+='<p class="quiet-note">겉면만으로는 단정하기 어렵습니다. 교차 확인하거나 불확실성을 감안해 값을 정하세요.</p>';
  if(focus)$('appraisal-observation').innerHTML+='<details class="observation-reference"><summary>수첩에서는 뭐라고 했지?</summary><p>'+esc(focus.reference)+'</p></details>'+actions(focus);
  $('evidence-count').textContent=cards.filter(c=>c.observation).length+' / 3';
  $('appraisal-notes').innerHTML=cards.map(c=>'<article class="comparison-card"><h4>'+esc(c.title)+'</h4><dl><dt>손님의 말 · 사실 확인 전</dt><dd>'+esc(c.claim?PawnTradeVoice.spoken(c.claim,o.character):'아직 묻지 않았습니다.')+'</dd><dt>내가 본 흔적</dt><dd>'+esc((c.observation||'아직 조사하지 않았습니다.')+(c.extra?'\n'+c.extra:''))+'</dd></dl><details><summary>비교 기준 다시 읽기</summary><p>'+esc(c.reference)+'</p></details>'+'</article>').join('');
  renderPriceGuide(o);renderOrigin(o);renderAdvanced(o);


}


function renderAdvanced(o){const host=$('deep-investigation');host.hidden=o.kind!=='seller'||o.status!=='offered'||s.closing;if(host.hidden)return;const choices=E.deepOptions(s);host.innerHTML='<h3>흔적을 더 따라가기</h3><p class="quiet-note">먼저 기본 흔적을 보고, 다른 도구와 각도로 확인합니다.</p>'+choices.map(x=>'<button class="deep-choice" data-deep="'+x.id+'" '+(!x.enabled?'disabled':'')+'><strong>'+esc(x.title)+'</strong><span>'+esc(x.site)+' · '+(x.tool==='lens'?'돋보기':'불빛')+'</span><small>'+esc(x.hint)+'</small></button>').join('')+Object.entries(o.deepResults||{}).map(([id,t])=>'<article class="deep-result"><h4>'+esc(choices.find(c=>c.id===id)?.title||'정밀 관찰')+'</h4><p>'+esc(t)+'</p><div class="evidence-actions"><button data-present="'+(id==='deep-auth'?'authenticity':id==='deep-grade'?'quality':'condition')+'" data-kind="defect" '+(o.evidenceUsed?.[id==='deep-auth'?'authenticity':id==='deep-grade'?'quality':'condition']||o.acceptedOffer?'disabled':'')+'>이 근거로 값 깎기</button><button data-present="'+(id==='deep-auth'?'authenticity':id==='deep-grade'?'quality':'condition')+'" data-kind="praise" '+(o.evidenceUsed?.[id==='deep-auth'?'authenticity':id==='deep-grade'?'quality':'condition']||o.acceptedOffer?'disabled':'')+'>좋은 점 알려 주기</button></div></article>').join('')+'<details><summary>공방 서명표 읽기</summary><p>'+esc(E.deepReference())+'</p></details>';}
function renderFollowup(o){const host=$('return-story'),choices=E.returnChoices(s);host.hidden=!choices.length;if(host.hidden)return;host.innerHTML='<h3>지난 거래의 후일담</h3><p>'+esc(E.item(o.returnStory.itemId).name)+' · '+o.returnStory.day+'번째 밤의 기억</p>'+choices.map(c=>'<button class="dialogue-choice" data-followup="'+c.id+'" '+(s.coins<c.cost?'disabled':'')+'>'+esc(c.label)+'</button>').join('');}
function originReference(){const n=E.originNotebook(s);return n?'<article class="reference-card"><h3>처음 만든 때와 사연</h3><p>처음 만든 해: <b>'+n.year+'년</b></p><p>'+esc(n.story)+'</p><small>이 가게의 도록에 적힌 기록입니다. 연대가 안 맞으면 출처를 의심할 수 있지만, 진위까지 확정되는 것은 아니에요.</small></article>':''}
function renderOrigin(o){const n=E.originNotebook(s),host=$('origin-record');host.hidden=!n?.claim||s.closing||o.status!=='offered';if(host.hidden)return;host.innerHTML='<summary>출처 이야기 대조하기'+(n.trust==='shaken'?' · 말이 달랐던 손님':'')+'</summary><p class="quiet-note">손님은 이렇게 말했어요</p><p>'+esc(PawnTradeVoice.spoken(n.claim,o.character))+'</p>'+originReference()+'<div class="evidence-actions"><button data-origin="date" '+(n.used||o.acceptedOffer?'disabled':'')+'>구매 시기가 맞지 않아요</button><button data-origin="story" '+(n.used||o.acceptedOffer?'disabled':'')+'>제작 사연이 다르네요</button></div><small>틀린 부분이 보일 때만 짚으세요. 출처를 따지는 건 한 번뿐입니다.</small>'}

function renderPriceGuide(o){$('deal-plan').hidden=o.kind!=='seller';if(o.kind!=='seller')return;const base=E.valuation(s).ordinary;$('deal-plan').innerHTML='<div class="price-guide"><span>보통 진품의 도매가</span><strong>'+fmt(base)+'G 안팎</strong></div><small>상태와 솜씨에 따라 달라져요. 지금 물건의 감정가는 아닙니다.</small>'+(s.ambition==='collection'?'<p class="collection-hint">'+(s.album[o.itemId]?'도록에 등록한 물건입니다.':'도록에 없는 물건이에요. 진품이라면 밤까지 보관해 보세요.')+'</p>':'')}

function renderBuyerStock(o){$('buyer-selection').hidden=o.kind!=='buyer';if(o.kind!=='buyer')return;const p=E.profile(o.character);$('buyer-request').textContent=p.interest;const lots=s.stock.filter(l=>l.displayAt===null);$('buyer-stock-options').innerHTML=lots.map(l=>{const it=E.item(l.itemId),preferred=p.likes?.includes(it.category);return '<button class="buyer-lot '+(o.stockUid===l.uid?'selected':'')+'" data-stock-choice="'+esc(l.uid)+'" aria-pressed="'+(o.stockUid===l.uid)+'">'+art(l.itemId,l.grade)+'<span><strong>'+esc(it.name)+'</strong><small>'+esc(E.GRADES[l.grade][0])+' · '+(l.genuine?'진품':'모조품')+(preferred?' · 좋아하는 품목':'')+'</small></span></button>'}).join('')||'<p>판매할 물건이 없어요. 다음 손님을 맞이해 주세요.</p>'}
function renderOffer(o){
  renderBuyerStock(o);
  $('asking-label').textContent=o.kind==='buyer'?'손님이 내겠다는 금액':'손님이 받고 싶은 금액';
  $('asking-price').innerHTML=fmt(o.price)+'<small>G</small>';
  $('offer-label').textContent=o.kind==='buyer'?'내 판매 가격 제안':'내 매입 가격 제안';
  const key=s.serial+':'+o.kind+':'+(o.stockUid||o.uid);if(key!==offerKey){$('offer-price').value='';offerKey=key}
  $('offer-price').placeholder=String(o.price);$('offer-submit').disabled=o.patience<=0;
  $('offer-status').textContent=o.acceptedOffer?'내 제안을 받아들였어요. 아래에서 거래를 완료하세요.':'금액을 직접 적어 제안하세요. 무리한 흥정은 관계를 해칩니다.';
  $('buy-button').textContent=fmt(o.price)+'G에 '+(o.kind==='buyer'?'판매':'매입');
  $('buy-button').disabled=o.kind==='seller'&&(s.coins<o.price||s.stock.length>=E.capacity(s));
  $('pass-button').textContent='거래 거절';
  $('trade-help').textContent=o.kind==='buyer'?'소개하는 방식과 손님의 취향이 가격에 영향을 줍니다.':s.coins<o.price?'소지금이 부족해요. 더 낮게 제안하거나 보관함을 확인하세요.':'다 살펴볼 필요는 없어요. 마음이 정해졌다면 값을 부르거나 거래하세요.';
}
function renderResult(o,it){
  if(o.status==='left'){$('reveal-view').innerHTML='<div class="reveal departed"><div class="eyebrow">THIS DEAL ENDS HERE</div><h3>손님이 거래를 접었습니다</h3><p>'+esc(o.feedback||'이번에는 합의하지 못했습니다.')+'</p><div class="outcome-note">현재 관계 · '+esc(E.relationLabel(relationship(o.character)))+' '+relationship(o.character)+'</div><button class="btn primary wide" data-action="next">다음 손님 맞이하기</button></div>';return}
  const lot=s.stock.find(x=>x.uid===o.uid),sold=o.status==='sold',quick=lot?E.quote(s,lot):o.sale,profit=(sold?o.sale:quick)-o.paid;
  let buttons;
  if(sold)buttons='<button class="btn primary wide" data-action="next">다음 손님 맞이하기</button>';
  else if(lot?.displayAt!==null&&lot?.displayAt!==undefined)buttons='<div class="display-status wide">'+Math.max(0,lot.displayAt-s.turn)+'명 뒤 위탁 판매</div><button class="btn primary wide" data-action="next">다음 손님 맞이하기</button>';
  else buttons='<button class="btn primary wide" data-action="next">보관하고 구매 손님 기다리기</button><button class="btn secondary" data-action="quick-sale" data-uid="'+esc(o.uid)+'">도매 판매 · '+fmt(quick)+'G</button><button class="btn secondary" data-action="display-sale" data-uid="'+esc(o.uid)+'">위탁 · '+fmt(lot?E.quote(s,lot,'display'):0)+'G</button>';
  const verdict=o.verdict||(o.kind==='buyer'?'손님의 반응이 다음 방문에도 이어집니다.':!o.genuine?(o.intent==='fraud'?'판매자는 위조품이라는 사실을 알고 있었습니다.':'손님도 진품으로 믿었던 모조품입니다.'):it.effect);
  $('reveal-view').innerHTML='<div class="reveal" style="--grade:'+E.GRADES[o.grade][1]+'"><div class="eyebrow">'+(sold?'거래를 마쳤습니다':!o.genuine?'매입 후 드러난 진실':o.value>o.paid*3?'숨은 보물을 발견했습니다':'거래 뒤의 감정 기록')+'</div>'+badge(o.grade,(o.genuine?'진품':'모조품')+' · '+E.GRADES[o.grade][0])+'<div class="reveal-art">'+art(it.id,o.grade)+'</div><h3>'+esc(it.name)+'</h3><p class="verdict">'+esc(verdict)+'</p><div class="value-reveal"><small>'+(sold?'판매 완료':'실제 가치')+'</small>'+fmt(sold?o.sale:o.value)+' G</div><span class="profit-label '+(profit<0?'loss':'')+'">'+(sold?'실현 이익 ':'지금 도매 판매 시 ')+(profit>=0?'+':'')+fmt(profit)+'G</span><div class="outcome-note">'+esc(PAWN_CHARACTERS[o.character].name)+' · '+esc(E.relationLabel(relationship(o.character)))+' '+(relationship(o.character)>0?'+':'')+relationship(o.character)+(Number.isFinite(o.relationDelta)?' <span>이번 만남 '+(o.relationDelta>0?'+':'')+o.relationDelta+'</span>':'')+'</div><div class="reveal-buttons">'+buttons+'</div></div>';

  const review=E.appraisalReview(s);
  if(review.length)$('reveal-view').innerHTML+='<details class="appraisal-review"><summary>감정 풀이 · 이번 물건에서 볼 수 있던 것</summary>'+review.map(c=>'<article><h4>'+esc(c.title)+' — '+esc(c.result)+'</h4><p>'+esc(c.observation)+'</p><p class="review-note">'+(c.seen?'거래 전에 확인한 흔적입니다.':'거래 전에 끝까지 확인하지 않은 흔적입니다.')+' '+esc(c.explanation)+'</p></article>').join('')+'</details>';
}
function render(){
  if(mode==='menu')return;
  const o=s.current,c=PAWN_CHARACTERS[o.character],it=E.item(o.itemId),known=o.kind==='buyer'||['bought','sold'].includes(o.status),ev=E.event(s);
  $('coins').innerHTML=(s.coins<100000?fmt(s.coins):new Intl.NumberFormat('ko-KR',{notation:'compact',maximumFractionDigits:1}).format(s.coins))+'<span>G</span>';$('coins').setAttribute('aria-label',fmt(s.coins)+' 골드');$('coins').dataset.tooltip=fmt(s.coins)+' G';
  $('day-label').textContent=s.day+'번째 밤';$('visitor-label').textContent='손님 '+s.visitor+' / 8';$('day-ticks').innerHTML=Array.from({length:8},(_,i)=>'<i class="'+(i<s.visitor-1?'past':i===s.visitor-1?'now':'')+'"></i>').join('');const lv=1+Math.floor(s.xp/120);$('shop-level').textContent='LV.'+lv+' '+(lv<4?'작은 가게':lv<9?'골목의 명소':'전설의 전당포');
  $('event-title').textContent=ev.title;$('event-short').textContent=ev.kind==='market'?(E.CATEGORIES[ev.category]||'모든 물건')+' 판매가 '+Math.round(((ev.mult||1)-1)*100)+'% 상승':ev.kind==='request'?(s.eventDone?'의뢰 완료':(E.CATEGORIES[ev.category]||'모든 품목')+' 수집 의뢰'):ev.kind==='gift'?(s.eventDone?'감사 선물을 받았습니다':'거래·밤 활동 뒤 받을 감사 선물'):'진귀한 물건이 찾아오는 밤';$('stock-dot').hidden=!s.stock.length;
  $('character').dataset.person=o.character;$('customer-name').textContent=c.name;$('customer-name').style.color=c.color;$('customer-role').textContent=c.role;$('customer-line').textContent=o.feedback||o.line||c.greeting;
  renderRelationship(o);renderDialogue(o);$('scene-grade').textContent=known?(o.genuine?'진품':'모조품'):'손님의 주장 · 아직 미확인';$('scene-item').dataset.item=it.id;$('scene-item').dataset.grade=known?o.grade:1;
  $('lot-category').textContent=(o.kind==='buyer'?'판매 협상':'매입 협상')+' / '+E.CATEGORIES[it.category];$('lot-name').textContent=it.name;$('lot-grade').className='grade-badge'+(known?'':' unknown');$('lot-grade').style.setProperty('--grade',known?E.GRADES[o.grade][1]:'#baaba0');$('lot-grade').textContent=known?(o.genuine?'진품':'모조품'):'진위 미확인';
  $('offer-view').hidden=s.closing||o.status!=='offered';$('reveal-view').hidden=s.closing||o.status==='offered';$('closing-view').hidden=!s.closing;
  if(s.closing){$('closing-view').innerHTML='<div class="closing"><div class="eyebrow">THE END OF A NIGHT</div><h3>'+s.day+'번째 밤, 마감</h3><p>다음 밤에는 다른 손님과 새로운 사건이 찾아옵니다.</p><dl><dt>오늘 매입</dt><dd>'+s.dayBought+'개</dd><dt>오늘 실현 이익</dt><dd>'+(s.dayProfit>=0?'+':'')+fmt(s.dayProfit)+'G</dd><dt>마감 보너스</dt><dd>+'+E.dayBonus(s).total+'G</dd></dl><button class="btn primary" data-action="next-day">정산하고 다음 밤으로</button></div>'}
  else if(o.status==='offered')renderOffer(o);else renderResult(o,it);
  const display=s.stock.filter(x=>x.displayAt!==null);$('shelf-preview').innerHTML='<div><b>구매 손님을 기다리는 물건</b>보관 중 '+s.stock.filter(x=>x.displayAt===null).length+'개 · 위탁 '+display.length+'개</div>'+s.stock.filter(x=>x.displayAt===null).slice(0,3).map(x=>art(x.itemId,x.grade)).join('')+'<button data-action="stock">보관함 ＋</button>';
  if(view!=='trade'&&window.PawnPanels)PawnPanels.render(view);if(window.PawnNight)PawnNight.render();if(window.PawnCounter)PawnCounter.render();paintItems();paintPeople();fitControls();
}
function openDialog(html){$('dialog-body').innerHTML=html;if(!$('detail-dialog').open)$('detail-dialog').showModal();paintItems();paintPeople()}
function customerInfo(index=s.current.character){const c=PAWN_CHARACTERS[index],p=E.profile(index),met=s.met[index]||0,v=relationship(index),r=s.customerRecords?.[index];const records=r?'<section class="customer-track"><h3>내가 겪은 거래</h3><p>진품 '+r.genuine+'개 · 가품 '+r.fakes+'개<br>희귀 이상 진품 '+r.rare+'개<br>출처 설명의 모순 '+r.contradictions+'번</p><small>직접 확인한 기록입니다. 이번 물건도 같으리란 보장은 없어요.</small></section>':'<p class="quiet-note">거래를 마치면 이 손님의 물건 이력이 쌓입니다.</p>';openDialog(portrait(index,'person-art')+'<div class="eyebrow">'+esc(c.role)+'</div><h2 style="color:'+c.color+'">'+esc(c.name)+'</h2><p>“'+esc(s.friendStories?.includes(index)?c.secret:met?'호감도 25가 되면 마음속 이야기를 들을 수 있습니다.':'아직 가게에 찾아오지 않은 손님입니다.')+'”</p><dl><dt>우리의 관계</dt><dd>'+esc(E.relationLabel(v))+' '+(v>0?'+':'')+v+'</dd><dt>거래할 때 모습</dt><dd>'+esc(met?p.manner:'만나면 알아갈 수 있어요.')+'</dd><dt>좋아하는 물건</dt><dd>'+esc(met?(p.likes||[]).map(x=>E.CATEGORIES[x]).join(' · '):'아직 모릅니다.')+'</dd><dt>관심사</dt><dd>'+esc(met?p.interest:'아직 모릅니다.')+'</dd><dt>방문 횟수</dt><dd>'+met+'회</dd></dl>'+records+'<section class="customer-track"><h3>함께 남긴 기억</h3>'+((s.memories||[]).filter(m=>m.character===index).slice(0,5).map(m=>'<p>'+m.day+'번째 밤 · '+esc(m.text)+'</p>').join('')||'<p>다음 만남에 이어질 이야기를 기다리고 있어요.</p>')+'</section><p class="save-note">질문 한도: 호감도 −25 이하 1회 · −24~24는 2회 · 25~59는 3회 · 60 이상은 4회. 거래 중 호감도가 바뀌면 남은 질문도 조정되며, 이미 나눈 질문은 돌려받지 않습니다. 만족스러운 거래는 관계를 높입니다. 친해지면 흥정에 더 너그러워지지만, 친절한 손님도 가품에 속거나 말을 부풀릴 수 있습니다.</p>')}

function eventInfo(){const ev=E.event(s),character=Number.isInteger(ev.character)?ev.character:0;openDialog('<div class="eyebrow">'+s.day+'번째 밤의 사건</div><h2>'+esc(ev.title)+'</h2><p>'+esc(ev.description)+'</p>'+portrait(character,'person-art')+'<p>'+esc(s.eventDone?ev.resolveText:ev.requestText)+'</p><div class="display-status">'+(ev.kind==='market'?(E.CATEGORIES[ev.category]||'모든 품목')+' 판매가 ×'+ev.mult:ev.kind==='request'?(s.eventDone?'의뢰를 완료했습니다.':'조건에 맞는 진품을 보관함에서 전달하세요.'):ev.kind==='gift'?(s.eventDone?'보상은 금고에 지급되었습니다.':'오늘 거래나 야간 활동을 마치면 감사 선물을 받습니다.'):'희귀한 물건을 만날 가능성이 높아집니다.')+'</div><button class="btn primary" data-action="dialog-close">알겠어요</button>')}

function openAppraisalBook(){const cards=E.appraisalNotebook(s);openDialog('<div class="eyebrow">감정 수첩 · '+esc(E.item(s.current.itemId).name)+'</div><h2>궁금한 것만 찾아보세요</h2><p>물건의 사연과 살펴볼 특징을 모아 뒀어요. 전부 읽거나 확인할 필요는 없습니다.</p><p>돋보기로 작은 무늬를, 불빛으로 색과 반짝임을 살펴보세요. 잘 만든 물건도 가품일 수 있습니다. 흐릿한 곳은 감정 도구를 강화하면 더 잘 보입니다.</p>'+originReference()+cards.map(c=>'<article class="reference-card"><h3>'+esc(c.title)+'</h3><p>'+esc(c.reference)+'</p></article>').join(''))}

function settings(){openDialog('<div class="eyebrow">AFTER HOURS · 대화와 거래</div><h2>말을 듣고, 값을 정하세요</h2><p>물건을 파는 손님과 사려는 손님이 무작위로 찾아옵니다. 시간 제한은 없습니다.</p><ol class="game-help"><li>특징을 묻고, 알맞은 도구로 부위를 살펴 감정 수첩과 비교하세요. 질문은 호감도 −25 이하 1회, −24~24는 2회, 25~59는 3회, 60 이상은 4회입니다. 조사 작업대를 강화하면 조사가 2회에서 최대 6회로 늘어납니다. 기록 다시 보기는 무료입니다.</li><li>같은 이름의 물건도 진품과 가품이 따로 존재합니다. 거짓말과 단순한 착각을 구별해 보세요.</li><li>금액을 직접 제안하고 손님의 역제안을 살피세요. 수락 버튼을 눌러야 거래됩니다.</li><li>실질적인 설명과 만족스러운 거래는 관계를 높입니다. 모욕적인 흥정이나 근거 없는 단정은 관계를 해칩니다.</li><li>구매 손님에게 취향에 맞는 재고를 권하고, 거래 성향을 물어보세요. 사연·상태·진품 보증 중 소개는 방문당 한 방식이며 협상 여유 1회를 씁니다.</li><li>조사 작업대 1·2·3단계에서 표식 안쪽, 제작자 서명, 수리 부품 정밀 조사가 열립니다. 기본 흔적을 먼저 보고 조사하세요. 일부 거래는 이후 재방문 이야기로 이어집니다.</li><li>여덟 손님을 맞이하면 밤의 자유 시간 2칸이 생깁니다. 도록 등록·차 마시기·재고 손질을 골라 보세요. 가게 관리에서 세 가지 목표, 수집록에서 테마 도록을 확인할 수 있습니다.</li></ol><div class="settings-row"><span>배경 음악 · 소리 크기</span><button data-audio="open">라디오 설정</button></div><div class="settings-row"><span>거래 효과음</span><button data-action="sound">'+(s.sound?'켜짐':'꺼짐')+'</button></div><div class="settings-row"><span>진행 상황</span><button data-action="save">지금 저장</button></div><p class="save-note">'+(saveOK?'이 기기·브라우저에 자동 저장됩니다.':'현재 브라우저에서 저장할 수 없습니다.')+' 다른 기기와는 동기화되지 않습니다.</p><button class="btn secondary wide" data-action="title">시작 화면으로</button><button class="btn secondary danger" data-action="reset-ask">새 가게 시작하기</button>')}
function action(name,target){const uid=target?.dataset.uid;
  if(name==='appraisal-book')openAppraisalBook();
  else if(name==='next'){run(E.next);window.scrollTo({top:0,behavior:'instant'})}
  else if(name==='next-day'){run(E.nextDay);window.scrollTo({top:0,behavior:'instant'})}
  else if(name==='quick-sale')run(E.sell,uid,'quick');else if(name==='display-sale')run(E.sell,uid,'display');
  else if(name==='deliver'){const result=run(E.sell,uid,'request');if(result.ok)toast(E.event(s).resolveText)}
  else if(name==='title')returnToTitle();else if(name==='stock')switchView('stock');else if(name==='goals')switchView('shop');else if(name==='dialog-close')$('detail-dialog').close();
  else if(name==='sound'){s.sound=!s.sound;save();window.PawnAudio?.refresh();settings();tone('coin')}
  else if(name==='save'){save();toast(saveOK?'이 기기에 저장했어요.':'저장할 수 없습니다.')}
  else if(name==='reset-ask')openDialog('<h2>새 가게를 시작할까요?</h2><p>금고, 수집록, 관계와 거래 기록이 초기화됩니다. 손님과 사건은 새로 섞입니다.</p><button class="btn danger" data-action="reset-confirm">기록을 지우고 처음부터</button><button class="btn secondary" data-action="dialog-close">취소</button>');
  else if(name==='reset-confirm'){s=E.prepare(E.create());save();$('detail-dialog').close();switchView('trade');toast('새로운 밤이 시작됐어요.')}
  else if(window.PawnPanels)PawnPanels.action(name,target);
}
document.addEventListener('click',e=>{
  const el=e.target.closest('button');if(!el||el.disabled)return;
  if(el.dataset.action)action(el.dataset.action,el);
  if(el.dataset.deep){run(E.deepInvestigate,el.dataset.deep);showResult('deep-investigation')}
  if(el.dataset.followup){run(E.resolveFollowup,el.dataset.followup);showResult('conversation-heading')}
  if(el.dataset.origin){run(E.presentOrigin,el.dataset.origin);showResult('trade-impact')}
  if(el.dataset.present){run(E.presentEvidence,el.dataset.present,el.dataset.kind);showResult('trade-impact')}
  if(el.dataset.talk){run(E.talk,el.dataset.talk);showResult('conversation-heading')}
  if(el.dataset.tool){investigationTool=el.dataset.tool;render()}
  if(el.dataset.investigate){inspectionFocus=el.dataset.investigate;inspectionVisit=s.current.uid;run(E.investigate,el.dataset.investigate);showResult('appraisal-observation')}
  if(el.dataset.stockChoice){run(E.chooseStock,el.dataset.stockChoice);showResult('conversation-heading')}
  if(el.dataset.view)switchView(el.dataset.view);
  if(el.dataset.stockFilter){stockFilter=el.dataset.stockFilter;render()}
  if(el.dataset.codexMode){codexMode=el.dataset.codexMode;render()}
  if(el.dataset.category){category=el.dataset.category;render()}
});
$('offer-form').addEventListener('submit',e=>{e.preventDefault();const field=$('offer-price'),text=field.value.trim().replaceAll(',','');if(!/^\d+$/.test(text)||Number(text)<1||Number(text)>999999999){$('offer-error').textContent='1~999,999,999 사이의 정수 금액을 입력하세요.';field.setAttribute('aria-invalid','true');field.focus();return}$('offer-error').textContent='';field.removeAttribute('aria-invalid');field.blur();run(E.offer,Number(text));showResult('conversation-heading')});
$('offer-price').addEventListener('input',()=>{$('offer-error').textContent='';$('offer-price').removeAttribute('aria-invalid')});
$('conversation-history').onclick=openConversation;
$('close-conversation').onclick=()=>$('conversation-dialog').close();
$('conversation-dialog').addEventListener('close',()=>{document.body.classList.remove('conversation-open');$('conversation-history').setAttribute('aria-expanded','false')});
$('conversation-dialog').addEventListener('click',e=>{if(e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close()});
$('buy-button').onclick=()=>run(E.accept);
$('pass-button').onclick=()=>{run(E.next);window.scrollTo({top:0,behavior:'instant'})};
$('event-banner').onclick=eventInfo;$('customer-info').onclick=()=>customerInfo();$('settings-button').onclick=settings;$('close-dialog').onclick=()=>$('detail-dialog').close();$('aid-button').onclick=()=>run(E.aid);
$('detail-dialog').addEventListener('click',e=>{if(e.target===$('detail-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}});
window.addEventListener('pagehide',save);document.addEventListener('visibilitychange',()=>{if(document.hidden)save()});
function fitControls(){const nav=document.querySelector('.bottom-nav'),deal=document.querySelector('.deal-actions');if(!nav||!deal)return;const navHeight=nav.getBoundingClientRect().height,dealHeight=deal.getBoundingClientRect().height;document.documentElement.style.setProperty('--nav-height',navHeight+'px');if(dealHeight)document.documentElement.style.setProperty('--deal-height',dealHeight+'px')}
if(window.ResizeObserver){const controls=new ResizeObserver(fitControls);controls.observe(document.querySelector('.bottom-nav'));controls.observe(document.querySelector('.deal-actions'))}window.addEventListener('resize',fitControls);
if(window.visualViewport){let fullHeight=visualViewport.height;const keyboard=()=>{fullHeight=Math.max(fullHeight,visualViewport.height);document.body.classList.toggle('keyboard-open',document.activeElement===$('offer-price')&&visualViewport.height<fullHeight*.76)};visualViewport.addEventListener('resize',keyboard);$('offer-price').addEventListener('focus',keyboard);$('offer-price').addEventListener('blur',()=>document.body.classList.remove('keyboard-open'));window.addEventListener('orientationchange',()=>{fullHeight=visualViewport.height})}
function signalMode(){document.body.classList.toggle('title-screen',mode==='menu');document.body.classList.toggle('practice-mode',mode==='tutorial');window.dispatchEvent(new CustomEvent('pawn:mode',{detail:{mode}}))}
function startGame(options={}){if(options.fresh)s=E.prepare(E.create());mode='play';tutorialBackup=null;offerKey='';$('detail-dialog').close();$('conversation-dialog').close();signalMode();switchView(options.view||'trade');save()}
function returnToTitle(){if(mode==='tutorial'){endTutorial();return}save();$('detail-dialog').close();$('conversation-dialog').close();mode='menu';signalMode();window.scrollTo(0,0)}
function beginTutorial(seed){if(mode!=='tutorial')tutorialBackup=JSON.parse(JSON.stringify(s));mode='tutorial';s=E.prepare(E.create(seed));offerKey='';$('detail-dialog').close();$('conversation-dialog').close();signalMode();switchView('trade')}
function setTutorialState(candidate){if(mode!=='tutorial')throw Error('연습 가게에서만 사용할 수 있습니다.');const next=JSON.parse(JSON.stringify(candidate));if(!E.validate(next))throw Error('올바르지 않은 연습 상태입니다.');s=E.prepare(next);offerKey='';render()}
function endTutorial(){if(tutorialBackup)s=tutorialBackup;tutorialBackup=null;mode='menu';offerKey='';$('detail-dialog').close();$('conversation-dialog').close();signalMode();render();window.scrollTo(0,0)}
window.PawnApp={get mode(){return mode},get view(){return view},get state(){return s},get hasSave(){return hasSave},get inTutorial(){return mode==='tutorial'},startGame,returnToTitle,beginTutorial,setTutorialState,endTutorial,get stockFilter(){return stockFilter},get codexMode(){return codexMode},get category(){return category},E,esc,fmt,art,portrait,badge,run,render,openDialog,customerInfo,switchView,toast,save};
render();save();
if(document.fonts)document.fonts.load('16px PawnPixel').then(()=>{paintItems();fitControls()}).catch(()=>{});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'read_pawnshop',title:'전당포 상태 읽기',description:'금고, 손님과의 대화 기록, 관계와 재고를 조회합니다. 숨겨진 진위나 손님의 의도는 공개하지 않습니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input!==undefined&&(input===null||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length))throw new Error('빈 객체가 필요합니다.');const o=s.current,known=o.kind==='buyer'||['bought','sold'].includes(o.status);return{coins:s.coins,day:s.day,visitor:s.visitor,collected:Object.keys(s.discovered).length,stock:s.stock.length,current:{kind:o.kind,customer:PAWN_CHARACTERS[o.character].name,relationship:relationship(o.character),item:E.item(o.itemId).name,status:o.status,price:o.price,history:o.history,notes:o.notes,talkLeft:o.talkLeft,...(known?{grade:E.GRADES[o.grade][0],genuine:o.genuine,value:o.value}:{})}}}},{signal:lifecycle.signal})).catch(()=>{})}catch{}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true})}
})();
