'use strict';
(() => {
const E=PawnEngine,$=id=>document.getElementById(id),KEY='midnight-pawn-v5';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=x=>Math.round(Number(x)||0).toLocaleString('ko-KR');
let s,view='trade',stockFilter='all',codexMode='items',category='all',timer,audio,saveOK=true,offerKey='',mode='menu',hasSave=false,investigationTool='lens',inspectionFocus='',inspectionVisit='';
for(const key of [KEY,KEY+'-backup','midnight-pawn-v4','midnight-pawn-v4-backup','midnight-pawn-v3','midnight-pawn-v3-backup']){
  try{const candidate=JSON.parse(localStorage.getItem(key)||'null');if(E.validate(candidate)){s=E.prepare(candidate);hasSave=true;break}}catch{}
}
if(!s)s=E.prepare(E.create());
let tutorialBackup=null;
const sheets=[];
function sheet(index){if(!sheets[index]){const img=new Image();img.decoding='async';img.onload=paintPeople;img.src='characters-'+index+'.webp';sheets[index]=img}return sheets[index]}
function save(){if(mode!=='play')return;try{const old=localStorage.getItem(KEY);if(old){try{if(E.validate(JSON.parse(old)))localStorage.setItem(KEY+'-backup',old)}catch{}}localStorage.setItem(KEY,JSON.stringify(s));saveOK=true;hasSave=true}catch{saveOK=false;toast('저장 공간을 사용할 수 없어요. 창을 닫지 말아 주세요.')}}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('show'),2500)}
function tone(kind='tap'){if(!s.sound)return;try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const now=audio.currentTime;const notes=kind==='rare'?[523,659,784,1046]:kind==='coin'?[784,1046]:[392];notes.forEach((hz,i)=>{const osc=audio.createOscillator(),gain=audio.createGain(),t=now+i*.07;osc.type='triangle';osc.frequency.value=hz;gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.04,t+.009);gain.gain.exponentialRampToValueAtTime(.0001,t+.16);osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+.18)})}catch{}}
function paintPeople(){for(const canvas of document.querySelectorAll('canvas[data-person]')){const c=PAWN_CHARACTERS[Number(canvas.dataset.person)];if(!c)continue;const img=sheet(c.sheet);if(!img.complete||!img.naturalWidth)continue;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,canvas.width,canvas.height);const sw=img.naturalWidth/4,sh=img.naturalHeight/2;ctx.drawImage(img,(c.cell%4)*sw,Math.floor(c.cell/4)*sh,sw,sh,0,0,canvas.width,canvas.height)}}
function paintItems(){for(const canvas of document.querySelectorAll('canvas[data-item]'))PawnArt.item(canvas,E.item(canvas.dataset.item),Number.isFinite(Number(canvas.dataset.grade))?Number(canvas.dataset.grade):1,canvas.dataset.unknown==='true')}
function art(itemId,grade=1,cls='',unknown=false){return '<canvas class="'+cls+'" width="64" height="64" data-item="'+esc(itemId)+'" data-grade="'+grade+'" data-unknown="'+unknown+'" aria-hidden="true"></canvas>'}
function portrait(index,cls=''){return '<canvas class="'+cls+'" width="192" height="256" data-person="'+index+'" aria-hidden="true"></canvas>'}
function badge(grade,text){const g=E.GRADES[grade]||E.GRADES[1];return '<span class="grade-badge" style="--grade:'+g[1]+'">'+esc(text||g[0])+'</span>'}
const motion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth';
function showResult(id){if(mode==='tutorial'||innerWidth>760)return;requestAnimationFrame(()=>{const target=$(id);if(!target)return;if(id==='conversation-heading'){const line=$('customer-line').getBoundingClientRect(),controls=['.bottom-nav','.deal-actions'].map(x=>document.querySelector(x)).filter(x=>x?.getClientRects().length&&getComputedStyle(x).position==='fixed'),bottom=Math.min(innerHeight-16,...controls.map(x=>x.getBoundingClientRect().top-16));if(line.top>=65&&line.bottom<=bottom)return;}target.scrollIntoView({block:'start',behavior:motion()})})}
function run(fn,...args){const before=s.current?.status,result=fn(s,...args);render();save();if(result?.ok!==false)tone(fn===E.accept&&s.current?.status==='bought'&&s.current.grade>=3?'rare':s.current?.status==='sold'?'coin':'tap');if(result?.message&&(result.ok===false||!['talk','investigate'].includes(fn.name)))toast(result.message);if(s.notices.length){const note=s.notices[s.notices.length-1];s.notices=[];save();if(!result?.message)toast(note)}if(before==='offered'&&s.current?.status!=='offered')showResult('reveal-view');window.dispatchEvent(new CustomEvent('pawn:change',{detail:{action:fn.name,args,result}}));return result}
function switchView(next){if(!['trade','stock','codex','shop'].includes(next))return;view=next;for(const el of document.querySelectorAll('.view'))el.classList.toggle('active',el.id==='view-'+view);for(const el of document.querySelectorAll('[data-view]')){el.classList.toggle('active',el.dataset.view===view);if(el.dataset.view===view)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')}render();window.scrollTo({top:0,behavior:'instant'});window.dispatchEvent(new CustomEvent('pawn:view',{detail:{view}}))}
function relationship(index){return E.relationship(s,index)}
function renderRelationship(o){const value=relationship(o.character),p=E.profile(o.character);$('relationship').innerHTML='<span class="relation-badge '+(value<0?'unfriendly':value>20?'friendly':'')+'">'+(value>=0?'♡':'♧')+' '+esc(E.relationLabel(value))+' <b>'+(value>0?'+':'')+value+'</b></span><span class="customer-manner">'+esc(p.manner)+'</span>';$('visitor-tag').textContent=(o.kind==='buyer'?'구매하러 온 손님':'판매하러 온 손님')+' · '+(s.met[o.character]>1?'단골':'첫 방문');}
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
  $('talk-count').textContent='질문·조사 자유';
  $('talk-count').hidden=!active;
  $('patience-label').textContent=!active?(s.closing?'오늘의 영업을 마쳤어요':o.status==='left'?'손님이 자리를 떠났어요':'거래를 마쳤어요'):o.patience<=1?'협상 여유가 거의 없어요':o.mood<-10?'기분이 상했어요':o.mood>10?'호의적인 반응':'이야기를 듣고 있어요';
  const options=active?(E.dialogueOptions(s)||[]):[];
  $('dialogue-options').hidden=!active;
  $('dialogue-options').innerHTML=options.length?options.map((x,i)=>'<button class="dialogue-choice '+(x.tone==='risk'||x.tone==='hostile'?'risky':'')+'" data-talk="'+esc(x.id)+'"'+(x.hint?' data-tooltip="'+esc(x.hint)+'" aria-description="'+esc(x.hint)+'"':'')+'><span class="choice-marker" aria-hidden="true">'+(i+1)+'</span><strong>'+esc(x.label)+'</strong><span class="choice-arrow" aria-hidden="true">›</span></button>').join(''):'<p class="quiet-note">이야기를 충분히 나눴어요. '+(o.kind==='buyer'?'판매할 물건을 고르거나 가격을 제안하세요.':'물건을 살펴보거나 가격을 제안하세요.')+'</p>';
  if($('conversation-dialog').open)renderHistory(o);

  const investigations=E.investigationOptions(s),used=new Set(o.inspected||[]);
  $('inspection-count').textContent='비용·횟수 제한 없음';
  $('investigation-panel').hidden=o.kind==='buyer';
  $('evidence-book').hidden=o.kind==='buyer';
  if(inspectionVisit!==o.uid){inspectionFocus=o.lastInspection||'';inspectionVisit=o.uid}
  $('investigation-options').innerHTML='<div class="investigation-tools"><button type="button" data-tool="lens" aria-pressed="'+(investigationTool==='lens')+'" class="'+(investigationTool==='lens'?'selected':'')+'">⌕ 돋보기</button><button type="button" data-tool="light" aria-pressed="'+(investigationTool==='light')+'" class="'+(investigationTool==='light'?'selected':'')+'">☼ 불빛 비추기</button></div><p class="tool-purpose">'+(investigationTool==='lens'?'작은 표식, 가는 선, 표면의 틈을 확대합니다.':'빛깔의 변화, 반사 무늬, 투과하는 빛을 봅니다.')+'</p><div class="investigation-workbench">'+art(o.itemId,1,'inspection-art')+'<span>어느 부위를 확인할까요?</span></div><div class="investigation-targets">'+investigations.filter(x=>x.tool===investigationTool).map(x=>'<button class="investigation-choice" data-investigate="'+esc(x.id)+'"><strong>'+esc(x.label)+'</strong><small>'+esc(used.has(x.id)?'다시 보기':x.hint)+'</small></button>').join('')+'</div>';
  const observed=o.inspectionResults?.[inspectionFocus],opt=investigations.find(x=>x.id===inspectionFocus);
  $('appraisal-observation').innerHTML=observed?'<span class="eyebrow">직접 본 흔적 · '+esc(opt?.label||'조사 기록')+'</span><p>'+esc(observed)+'</p>':'<p>손님의 말에서 확인할 특징을 골라 도구와 부위를 선택하세요. 관찰 결과는 여기에 남습니다.</p>';
  const cards=E.appraisalNotebook(s);
  $('evidence-count').textContent=cards.filter(c=>c.observation).length+' / 3';
  $('appraisal-notes').innerHTML=cards.map(c=>'<article class="comparison-card"><h4>'+esc(c.title)+'</h4><dl><dt>손님의 말</dt><dd>'+esc(c.claim||'아직 이 특징을 물어보지 않았습니다.')+'</dd><dt>내가 본 흔적</dt><dd>'+esc(c.observation||'아직 이 특징의 관찰 기록이 없습니다.')+'</dd></dl><details><summary>수첩의 비교 기준</summary><p>'+esc(c.reference)+'</p></details></article>').join('');

}
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
  $('trade-help').textContent=o.kind==='buyer'?'소개하는 방식과 손님의 취향이 가격에 영향을 줍니다.':s.coins<o.price?'소지금이 부족해요. 더 낮게 제안하거나 보관함을 확인하세요.':'같은 보물에도 진품과 가품이 있습니다. 이번 손님의 말을 판단하세요.';
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
  if(review.length)$('reveal-view').innerHTML+='<details class="appraisal-review" open><summary>감정 풀이 · 이번 물건에서 볼 수 있던 것</summary>'+review.map(c=>'<article><h4>'+esc(c.title)+' — '+esc(c.result)+'</h4><p>'+esc(c.observation)+'</p><p class="review-note">'+(c.seen?'거래 전에 확인한 흔적입니다.':'거래 전에 끝까지 확인하지 않은 흔적입니다.')+' '+esc(c.explanation)+'</p></article>').join('')+'</details>';
}
function render(){
  if(mode==='menu')return;
  const o=s.current,c=PAWN_CHARACTERS[o.character],it=E.item(o.itemId),known=o.kind==='buyer'||['bought','sold'].includes(o.status),ev=E.event(s);
  $('coins').innerHTML=(s.coins<100000?fmt(s.coins):new Intl.NumberFormat('ko-KR',{notation:'compact',maximumFractionDigits:1}).format(s.coins))+'<span>G</span>';$('coins').setAttribute('aria-label',fmt(s.coins)+' 골드');$('coins').dataset.tooltip=fmt(s.coins)+' G';
  $('day-label').textContent=s.day+'번째 밤';$('visitor-label').textContent='손님 '+s.visitor+' / 8';$('day-ticks').innerHTML=Array.from({length:8},(_,i)=>'<i class="'+(i<s.visitor-1?'past':i===s.visitor-1?'now':'')+'"></i>').join('');const lv=1+Math.floor(s.xp/120);$('shop-level').textContent='LV.'+lv+' '+(lv<4?'작은 가게':lv<9?'골목의 명소':'전설의 전당포');
  $('event-title').textContent=ev.title;$('event-short').textContent=ev.kind==='market'?(E.CATEGORIES[ev.category]||'모든 물건')+' 판매가 '+Math.round(((ev.mult||1)-1)*100)+'% 상승':ev.kind==='request'?(s.eventDone?'의뢰 완료':(E.CATEGORIES[ev.category]||'모든 품목')+' 수집 의뢰'):ev.kind==='gift'?'뜻밖의 손님이 남긴 선물':'진귀한 물건이 찾아오는 밤';$('stock-dot').hidden=!s.stock.length;
  $('character').dataset.person=o.character;$('customer-name').textContent=c.name;$('customer-name').style.color=c.color;$('customer-role').textContent=c.role;$('customer-line').textContent=o.feedback||o.line||c.greeting;
  renderRelationship(o);renderDialogue(o);$('scene-grade').textContent=known?(o.genuine?'진품':'모조품'):'손님의 주장 · 아직 미확인';$('scene-item').dataset.item=it.id;$('scene-item').dataset.grade=known?o.grade:1;
  $('lot-category').textContent=(o.kind==='buyer'?'판매 협상':'매입 협상')+' / '+E.CATEGORIES[it.category];$('lot-name').textContent=it.name;$('lot-grade').className='grade-badge'+(known?'':' unknown');$('lot-grade').style.setProperty('--grade',known?E.GRADES[o.grade][1]:'#baaba0');$('lot-grade').textContent=known?(o.genuine?'진품':'모조품'):'진위 미확인';
  $('offer-view').hidden=s.closing||o.status!=='offered';$('reveal-view').hidden=s.closing||o.status==='offered';$('closing-view').hidden=!s.closing;
  if(s.closing){$('closing-view').innerHTML='<div class="closing"><div class="eyebrow">THE END OF A NIGHT</div><h3>'+s.day+'번째 밤, 마감</h3><p>다음 밤에는 다른 손님과 새로운 사건이 찾아옵니다.</p><dl><dt>오늘 매입</dt><dd>'+s.dayBought+'개</dd><dt>오늘 실현 이익</dt><dd>'+(s.dayProfit>=0?'+':'')+fmt(s.dayProfit)+'G</dd><dt>마감 보너스</dt><dd>+'+(70+s.day*15)+'G</dd></dl><button class="btn primary" data-action="next-day">정산하고 다음 밤으로</button></div>'}
  else if(o.status==='offered')renderOffer(o);else renderResult(o,it);
  const display=s.stock.filter(x=>x.displayAt!==null);$('shelf-preview').innerHTML='<div><b>구매 손님을 기다리는 물건</b>보관 중 '+s.stock.filter(x=>x.displayAt===null).length+'개 · 위탁 '+display.length+'개</div>'+s.stock.filter(x=>x.displayAt===null).slice(0,3).map(x=>art(x.itemId,x.grade)).join('')+'<button data-action="stock">보관함 ＋</button>';
  if(view!=='trade'&&window.PawnPanels)PawnPanels.render(view);paintItems();paintPeople();fitControls();
}
function openDialog(html){$('dialog-body').innerHTML=html;if(!$('detail-dialog').open)$('detail-dialog').showModal();paintItems();paintPeople()}
function customerInfo(index=s.current.character){const c=PAWN_CHARACTERS[index],p=E.profile(index),met=s.met[index]||0,v=relationship(index);openDialog(portrait(index,'person-art')+'<div class="eyebrow">'+esc(c.role)+'</div><h2 style="color:'+c.color+'">'+esc(c.name)+'</h2><p>“'+esc(met?c.secret:'아직 가게에 찾아오지 않은 손님입니다.')+'”</p><dl><dt>우리의 관계</dt><dd>'+esc(E.relationLabel(v))+' '+(v>0?'+':'')+v+'</dd><dt>선호하는 대화</dt><dd>'+esc(met?p.manner:'만나면 알아갈 수 있어요.')+'</dd><dt>좋아하는 물건</dt><dd>'+esc(met?(p.likes||[]).map(x=>E.CATEGORIES[x]).join(' · '):'아직 모릅니다.')+'</dd><dt>취향</dt><dd>'+esc(met?p.interest:'아직 모릅니다.')+'</dd><dt>방문 횟수</dt><dd>'+met+'회</dd></dl><p class="save-note">만족스러운 거래는 관계를 높입니다. 우호적인 손님은 흥정에 더 너그럽지만, 같은 손님도 물건에 대해 착각하거나 거짓말할 수 있습니다.</p>')}
function eventInfo(){const ev=E.event(s),character=Number.isInteger(ev.character)?ev.character:0;openDialog('<div class="eyebrow">'+s.day+'번째 밤의 사건</div><h2>'+esc(ev.title)+'</h2><p>'+esc(ev.description)+'</p>'+portrait(character,'person-art')+'<p>'+esc(s.eventDone?ev.resolveText:ev.requestText)+'</p><div class="display-status">'+(ev.kind==='market'?(E.CATEGORIES[ev.category]||'모든 품목')+' 판매가 ×'+ev.mult:ev.kind==='request'?(s.eventDone?'의뢰를 완료했습니다.':'조건에 맞는 진품을 보관함에서 전달하세요.'):ev.kind==='gift'?'보상은 금고에 지급되었습니다.':'희귀한 물건을 만날 가능성이 높아집니다.')+'</div><button class="btn primary" data-action="dialog-close">알겠어요</button>')}

function openAppraisalBook(){const cards=E.appraisalNotebook(s);openDialog('<div class="eyebrow">감정 수첩 · '+esc(E.CATEGORIES[E.item(s.current.itemId).category])+'</div><h2>세 가지를 따로 보세요</h2><p>진품이라도 거칠게 만들거나 손상될 수 있습니다. 정교한 복제품도 있습니다. 이 수첩은 이 가게 세계의 제작 관례입니다.</p><p>돋보기는 작은 선과 표면을, 불빛은 색·반사·투과를 확인합니다. 흐릿한 흔적은 단정하지 말고 거래를 보류하거나 위험을 감수하세요. 감정 도구 강화 후 다시 살피면 더 읽을 수 있습니다.</p>'+cards.map(c=>'<article class="reference-card"><h3>'+esc(c.title)+'</h3><p>'+esc(c.reference)+'</p></article>').join(''))}

function settings(){openDialog('<div class="eyebrow">AFTER HOURS · 대화와 거래</div><h2>말을 듣고, 값을 정하세요</h2><p>물건을 파는 손님과 사려는 손님이 무작위로 찾아옵니다. 시간 제한은 없습니다.</p><ol class="game-help"><li>특징을 묻고, 알맞은 도구로 부위를 살펴 감정 수첩과 비교하세요. 질문과 조사는 무료이며 횟수 제한이 없습니다.</li><li>같은 이름의 물건도 진품과 가품이 따로 존재합니다. 거짓말과 단순한 착각을 구별해 보세요.</li><li>금액을 직접 제안하고 손님의 역제안을 살피세요. 수락 버튼을 눌러야 거래됩니다.</li><li>실질적인 설명과 만족스러운 거래는 관계를 높입니다. 모욕적인 흥정이나 근거 없는 단정은 관계를 해칩니다.</li><li>구매 손님에게 취향에 맞는 재고를 권하고, 어떤 말로 소개할지 결정하세요.</li></ol><div class="settings-row"><span>거래 효과음</span><button data-action="sound">'+(s.sound?'켜짐':'꺼짐')+'</button></div><div class="settings-row"><span>진행 상황</span><button data-action="save">지금 저장</button></div><p class="save-note">'+(saveOK?'이 기기·브라우저에 자동 저장됩니다.':'현재 브라우저에서 저장할 수 없습니다.')+' 다른 기기와는 동기화되지 않습니다.</p><button class="btn secondary wide" data-action="title">시작 화면으로</button><button class="btn secondary danger" data-action="reset-ask">새 가게 시작하기</button>')}
function action(name,target){const uid=target?.dataset.uid;
  if(name==='appraisal-book')openAppraisalBook();
  else if(name==='next'){run(E.next);window.scrollTo({top:0,behavior:'instant'})}
  else if(name==='next-day'){run(E.nextDay);window.scrollTo({top:0,behavior:'instant'})}
  else if(name==='quick-sale')run(E.sell,uid,'quick');else if(name==='display-sale')run(E.sell,uid,'display');
  else if(name==='deliver'){const result=run(E.sell,uid,'request');if(result.ok)toast(E.event(s).resolveText)}
  else if(name==='title')returnToTitle();else if(name==='stock')switchView('stock');else if(name==='dialog-close')$('detail-dialog').close();
  else if(name==='sound'){s.sound=!s.sound;save();settings();tone('coin')}
  else if(name==='save'){save();toast(saveOK?'이 기기에 저장했어요.':'저장할 수 없습니다.')}
  else if(name==='reset-ask')openDialog('<h2>새 가게를 시작할까요?</h2><p>금고, 수집록, 관계와 거래 기록이 초기화됩니다. 손님과 사건은 새로 섞입니다.</p><button class="btn danger" data-action="reset-confirm">기록을 지우고 처음부터</button><button class="btn secondary" data-action="dialog-close">취소</button>');
  else if(name==='reset-confirm'){s=E.prepare(E.create());save();$('detail-dialog').close();switchView('trade');toast('새로운 밤이 시작됐어요.')}
  else if(window.PawnPanels)PawnPanels.action(name,target);
}
document.addEventListener('click',e=>{
  const el=e.target.closest('button');if(!el||el.disabled)return;
  if(el.dataset.action)action(el.dataset.action,el);
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
function startGame(options={}){if(options.fresh)s=E.prepare(E.create());mode='play';tutorialBackup=null;offerKey='';$('detail-dialog').close();$('conversation-dialog').close();signalMode();switchView('trade');save()}
function returnToTitle(){if(mode==='tutorial'){endTutorial();return}save();$('detail-dialog').close();$('conversation-dialog').close();mode='menu';signalMode();window.scrollTo(0,0)}
function beginTutorial(seed){if(mode!=='tutorial')tutorialBackup=JSON.parse(JSON.stringify(s));mode='tutorial';s=E.prepare(E.create(seed));offerKey='';$('detail-dialog').close();$('conversation-dialog').close();signalMode();switchView('trade')}
function setTutorialState(candidate){if(mode!=='tutorial')throw Error('연습 가게에서만 사용할 수 있습니다.');const next=JSON.parse(JSON.stringify(candidate));if(!E.validate(next))throw Error('올바르지 않은 연습 상태입니다.');s=E.prepare(next);offerKey='';render()}
function endTutorial(){if(tutorialBackup)s=tutorialBackup;tutorialBackup=null;mode='menu';offerKey='';$('detail-dialog').close();$('conversation-dialog').close();signalMode();render();window.scrollTo(0,0)}
window.PawnApp={get state(){return s},get hasSave(){return hasSave},get inTutorial(){return mode==='tutorial'},startGame,returnToTitle,beginTutorial,setTutorialState,endTutorial,get stockFilter(){return stockFilter},get codexMode(){return codexMode},get category(){return category},E,esc,fmt,art,portrait,badge,run,render,openDialog,customerInfo,switchView,toast,save};
render();save();
if(document.fonts)document.fonts.load('16px PawnPixel').then(()=>{paintItems();fitControls()}).catch(()=>{});
if(document.modelContext?.registerTool){const lifecycle=new AbortController();try{Promise.resolve(document.modelContext.registerTool({name:'read_pawnshop',title:'전당포 상태 읽기',description:'금고, 손님과의 대화 기록, 관계와 재고를 조회합니다. 숨겨진 진위나 손님의 의도는 공개하지 않습니다.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){if(input!==undefined&&(input===null||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length))throw new Error('빈 객체가 필요합니다.');const o=s.current,known=o.kind==='buyer'||['bought','sold'].includes(o.status);return{coins:s.coins,day:s.day,visitor:s.visitor,collected:Object.keys(s.discovered).length,stock:s.stock.length,current:{kind:o.kind,customer:PAWN_CHARACTERS[o.character].name,relationship:relationship(o.character),item:E.item(o.itemId).name,status:o.status,price:o.price,history:o.history,notes:o.notes,talkLeft:o.talkLeft,...(known?{grade:E.GRADES[o.grade][0],genuine:o.genuine,value:o.value}:{})}}}},{signal:lifecycle.signal})).catch(()=>{})}catch{}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true})}
})();
