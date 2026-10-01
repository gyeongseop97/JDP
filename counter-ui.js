'use strict';
(function(){
const A=PawnApp,$=id=>document.getElementById(id),mobile=matchMedia('(max-width: 760px)');
const groups={investigation:$('counter-investigation'),pricing:$('counter-pricing')};
const homes={};for(const [key,node] of Object.entries(groups)){const anchor=document.createComment('counter '+key);node.before(anchor);homes[key]=anchor;}
const dock=document.createElement('div');dock.className='counter-dock';dock.hidden=true;
dock.innerHTML='<button type="button" data-counter="investigation">⌕ 조사·기록</button><button type="button" data-counter="pricing">G 가격 제안</button>';
document.body.append(dock);
const drawer=document.createElement('dialog');drawer.id='counter-drawer';drawer.className='counter-drawer';drawer.setAttribute('aria-labelledby','counter-title');
drawer.innerHTML='<header class="counter-header"><h2 id="counter-title">조사·기록</h2><div class="counter-header-actions"><button type="button" data-counter-history aria-haspopup="dialog" aria-controls="conversation-dialog">전체 대화</button><button type="button" data-counter-close aria-label="닫고 대화로 돌아가기">닫기 ×</button></div></header><p id="counter-guide" class="counter-guide" hidden></p><nav class="counter-tabs" aria-label="카운터 작업 전환"><button type="button" data-counter="investigation" aria-pressed="false">조사·기록</button><button type="button" data-counter="pricing" aria-pressed="false">가격 제안</button></nav><p id="counter-last-line" class="counter-last-line" aria-live="polite" hidden></p><div id="counter-body"></div>';
document.body.append(drawer);let section=null,scrollPositions={investigation:0,pricing:0},lastVisit='';
function active(){return !document.body.classList.contains('title-screen')&&$('view-trade').classList.contains('active')&&!A.state.closing&&A.state.current.status==='offered'}
function restore(){for(const [key,node] of Object.entries(groups))homes[key].after(node)}
function renderContext(){
 const o=A.state.current,replies=(o.history||[]).filter(h=>h.speaker==='customer'),latest=replies.length>1?replies.at(-1):null;
 $('counter-last-line').hidden=!latest;
 $('counter-last-line').textContent=latest?$('customer-name').textContent+' · '+latest.text:'';
 drawer.querySelector('[data-counter="investigation"]').textContent=o.kind==='buyer'?'물건 고르기':'조사·기록';
 drawer.querySelectorAll('.counter-tabs button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.counter===section)));
 $('counter-title').textContent=section==='pricing'?'가격 제안':o.kind==='buyer'?'물건 고르기':'조사·기록';
}
function close(){if(section)scrollPositions[section]=$('counter-body').scrollTop;if(drawer.open)drawer.close();restore();section=null;document.body.classList.remove('counter-open');}
function open(key){
 if(key==='conversation'){
  if(!mobile.matches)return false;
  close();requestAnimationFrame(()=>$('dialogue-options').scrollIntoView({block:'nearest',behavior:'instant'}));return true;
 }
 if(!mobile.matches||!active()||!groups[key])return false;
 if(A.state.current.uid!==lastVisit){close();scrollPositions={investigation:0,pricing:0};lastVisit=A.state.current.uid;}
 if(section)scrollPositions[section]=$('counter-body').scrollTop;
 restore();section=key;$('counter-body').append(groups[key]);
 renderContext();
 $('counter-guide').hidden=!A.inTutorial;
 if(A.inTutorial)$('counter-guide').textContent=document.querySelector('#tutorial-goals li:not(.done)')?.textContent||'이 단계 완료 · 대화로 돌아가 다음 연습을 누르세요.';
 document.body.classList.add('counter-open');if(!drawer.open)drawer.showModal();
 $('counter-body').scrollTop=scrollPositions[key];return true;
}
function render(){
 const on=mobile.matches&&active();dock.hidden=!on;document.body.classList.toggle('counter-mobile',mobile.matches);
 $('price-reference').hidden=A.state.current.kind==='buyer';
 if(A.state.current.uid!==lastVisit){close();scrollPositions={investigation:0,pricing:0};lastVisit=A.state.current.uid;}
 if(!on)close();else if(drawer.open)renderContext();
 dock.querySelector('[data-counter="investigation"]').textContent=A.state.current.kind==='buyer'?'▣ 물건 고르기':'⌕ 조사·기록';
}
function reveal(id){
 if(!mobile.matches)return false;
 const el=typeof id==='string'?$(id):id;if(!el)return false;
 if(el.id==='reveal-view'){close();return false}
 if(el.id==='conversation-heading'){if(drawer.open&&active()){renderContext();return true}close();return false}
 if($('conversation-heading').contains(el)){open('conversation');requestAnimationFrame(()=>el.scrollIntoView({block:'nearest',behavior:'instant'}));return true;}
 const key=Object.keys(groups).find(k=>groups[k].contains(el));
 if(!key)return false;
 if(open(key))requestAnimationFrame(()=>el.scrollIntoView({block:'nearest',behavior:'instant'}));
 return !!key;
}
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.counter)open(button.dataset.counter);if(button.hasAttribute('data-counter-close'))close();if(button.hasAttribute('data-counter-history'))$('conversation-history').click();});
drawer.addEventListener('close',()=>{if(drawer.open)return;if(section)scrollPositions[section]=$('counter-body').scrollTop;restore();section=null;document.body.classList.remove('counter-open')});
drawer.addEventListener('click',event=>{if(event.target!==drawer)return;const r=drawer.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right)close()});
for(const ev of ['pawn:change','pawn:view','pawn:mode'])window.addEventListener(ev,render);
mobile.addEventListener('change',()=>{close();render()});
window.PawnCounter={open,close,reveal,render};render();
})();
