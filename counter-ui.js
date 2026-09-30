'use strict';
(function(){
const A=PawnApp,E=A.E,$=id=>document.getElementById(id),mobile=matchMedia('(max-width: 760px)');
const groups={investigation:$('counter-investigation'),pricing:$('counter-pricing')};
const homes={};for(const [key,node] of Object.entries(groups)){const anchor=document.createComment('counter '+key);node.before(anchor);homes[key]=anchor;}
const dock=document.createElement('div');dock.className='counter-dock';dock.hidden=true;
dock.innerHTML='<button type="button" data-counter="investigation">⌕ 조사·기록</button><button type="button" data-counter="pricing">G 가격 제안</button>';
document.body.append(dock);
const drawer=document.createElement('dialog');drawer.id='counter-drawer';drawer.className='counter-drawer';drawer.setAttribute('aria-labelledby','counter-title');
drawer.innerHTML='<header class="counter-header"><h2 id="counter-title">카운터</h2><button type="button" data-counter-close aria-label="대화로 돌아가기">대화로 ×</button></header><p id="counter-guide" class="counter-guide" hidden></p><p id="counter-last-line" class="counter-last-line"></p><div id="counter-body"></div>';
document.body.append(drawer);let section=null,scrollPositions={investigation:0,pricing:0},lastVisit='';
function active(){return !document.body.classList.contains('title-screen')&&$('view-trade').classList.contains('active')&&!A.state.closing&&A.state.current.status==='offered'}
function restore(){for(const [key,node] of Object.entries(groups))homes[key].after(node)}
function close(){if(section)scrollPositions[section]=$('counter-body').scrollTop;if(drawer.open)drawer.close();restore();section=null;document.body.classList.remove('counter-open');}
function open(key){
 if(!mobile.matches||!active()||!groups[key])return false;
 if(section)scrollPositions[section]=$('counter-body').scrollTop;
 restore();section=key;$('counter-body').append(groups[key]);
 $('counter-title').textContent=key==='pricing'?'얼마에 거래할까요?':A.state.current.kind==='buyer'?'손님에게 권할 물건':'카운터의 조사 도구';
 $('counter-last-line').textContent=$('customer-name').textContent+' · '+$('customer-line').textContent;
 $('counter-guide').hidden=!A.inTutorial;
 if(A.inTutorial)$('counter-guide').textContent=document.querySelector('#tutorial-goals li:not(.done)')?.textContent||'이 단계 완료 · 대화로 돌아가 다음 연습을 누르세요.';
 document.body.classList.add('counter-open');if(!drawer.open)drawer.showModal();
 $('counter-body').scrollTop=scrollPositions[key];return true;
}
function render(){
 const on=mobile.matches&&active();dock.hidden=!on;document.body.classList.toggle('counter-mobile',mobile.matches);
 if(A.state.current.uid!==lastVisit){close();scrollPositions={investigation:0,pricing:0};lastVisit=A.state.current.uid;}
 if(!on)close();else if(drawer.open)$('counter-last-line').textContent=$('customer-name').textContent+' · '+$('customer-line').textContent;
 dock.querySelector('[data-counter="investigation"]').textContent=A.state.current.kind==='buyer'?'▣ 물건 고르기':'⌕ 조사·기록';
}
function reveal(id){
 if(!mobile.matches)return false;
 const el=typeof id==='string'?$(id):id;if(!el)return false;
 if(id==='conversation-heading'||id==='reveal-view'){close();return false}
 const key=Object.keys(groups).find(k=>groups[k].contains(el));
 if(!key)return false;
 if(open(key))requestAnimationFrame(()=>el.scrollIntoView({block:'nearest',behavior:'instant'}));
 return !!key;
}
document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.dataset.counter)open(button.dataset.counter);if(button.hasAttribute('data-counter-close'))close();});
drawer.addEventListener('close',()=>{restore();section=null;document.body.classList.remove('counter-open')});
drawer.addEventListener('click',event=>{if(event.target!==drawer)return;const r=drawer.getBoundingClientRect();if(event.clientY<r.top||event.clientX<r.left||event.clientX>r.right)close()});
for(const ev of ['pawn:change','pawn:view','pawn:mode'])window.addEventListener(ev,render);
mobile.addEventListener('change',()=>{close();render()});
window.PawnCounter={open,close,reveal,render};render();
})();
