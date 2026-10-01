'use strict';
(() => {
  const A = PawnApp, E = A.E, $ = id => document.getElementById(id);
  const { esc, fmt, art, portrait, badge } = A;

  function profitLabel(price,paid,prefix='예상'){
    const difference=Math.round(Number(price)||0)-Math.round(Number(paid)||0);
    return prefix+' '+(difference<0?'손실':difference>0?'이익':'손익')+' '+fmt(Math.abs(difference))+'G';
  }
  function listingPrice(form){const text=form.elements.listingPrice.value.trim().replaceAll(',','');return /^\d+$/.test(text)&&Number(text)>=1&&Number(text)<=999999999?Number(text):null;}
  function previewListing(form){
    const price=listingPrice(form),out=form.querySelector('[data-listing-profit]'),paid=Number(form.dataset.paid)||0;
    out.textContent=price===null?'1~999,999,999G 사이의 정가를 입력하세요.':profitLabel(price,paid,'판매 시 예상');
    out.classList.toggle('loss',price!==null&&price<paid);
  }
  function stock() {
    const s=A.state,help=document.querySelector('#view-stock .section-heading p');
    if(help)help.textContent='가격표를 달면 손님이 올 때마다 판매 기회가 생겨요. 가격표가 있어도 방문 손님과 직접 흥정할 수 있습니다.';
    for(const b of document.querySelectorAll('[data-stock-filter]')){
      b.classList.toggle('active',b.dataset.stockFilter===A.stockFilter);
      b.textContent=b.dataset.stockFilter==='display'?'가격표 있음':b.dataset.stockFilter==='ready'?'가격표 없음':'전체';
    }
    $('stock-count').textContent=s.stock.length+' / '+E.capacity(s);
    const list=s.stock.filter(x=>A.stockFilter==='all'||(A.stockFilter==='display'?x.displayAt!==null:x.displayAt===null));
    $('stock-grid').innerHTML=list.length?list.map(lot=>{
      const it=E.item(lot.itemId),quick=E.quote(s,lot,'quick'),listed=lot.displayAt!==null,price=listed?lot.displayPrice:null;
      const negotiating=s.current?.kind==='buyer'&&s.current.status==='offered'&&s.current.stockUid===lot.uid;
      const uid=esc(lot.uid),inputId=esc('listing-price-'+lot.uid),profitId=esc('listing-profit-'+lot.uid),errorId=esc('listing-error-'+lot.uid);
      const status=listed?'가격표 '+fmt(price)+'G · 판매 시점 미정':'가격표 없음 · 방문 손님과 흥정만';
      return '<article class="stock-card" data-stock-uid="'+uid+'"><div class="stock-card-top">'+art(lot.itemId,lot.grade)+'<div><h3>'+esc(it.name)+'</h3>'+badge(lot.grade)+(lot.genuine?' <span class="auth-tag">진품</span>':' <span class="fake-tag">가품</span>')+'</div></div>'+
        (lot.genuine&&!s.album[lot.itemId]?'<p class="album-eligible">✦ 밤에 도록 등록 가능 · 등록 전에 팔면 기회를 놓쳐요</p>':'')+
        '<div class="stock-meta"><span>매입원가 · 손질비 포함 <b>'+fmt(lot.paid)+'G</b></span><span>물건의 가치 <b>'+fmt(lot.value)+'G</b></span></div>'+
        '<div class="listing-status '+(listed?'listed':'')+'">'+status+'</div>'+
        (negotiating?'<p class="stock-negotiation-status">지금 방문 손님과 흥정 중이에요. 거래를 마친 뒤 가격표를 바꿀 수 있습니다.</p>':'')+
        '<form class="listing-form" data-listing-form="'+uid+'" data-paid="'+lot.paid+'" novalidate><label for="'+inputId+'">진열 정가</label><div class="listing-input-row"><div class="gold-input"><input id="'+inputId+'" name="listingPrice" type="text" inputmode="numeric" maxlength="13" autocomplete="off" value="'+(listed?fmt(price):'')+'" placeholder="가격표 없음" aria-describedby="'+profitId+' '+errorId+'"'+(negotiating?' disabled':'')+'><span>G</span></div><button type="submit" class="btn secondary" data-action="list-stock" data-uid="'+uid+'"'+(negotiating?' disabled':'')+'>'+(listed?'가격 변경':'가격표 달기')+'</button></div>'+
        '<p class="listing-profit'+(listed&&price<lot.paid?' loss':'')+'" id="'+profitId+'" data-listing-profit aria-live="polite">'+(listed?profitLabel(price,lot.paid,'판매 시 예상'):'정가를 입력하면 예상 손익을 확인할 수 있어요.')+'</p><p class="listing-error" id="'+errorId+'" data-listing-error role="alert"></p>'+
        (listed?'<button type="button" class="listing-remove" data-action="unlist-stock" data-uid="'+uid+'"'+(negotiating?' disabled':'')+'>가격표 내리기</button>':'')+'</form>'+
        '<p class="listing-note">정가가 높을수록 오래 기다릴 수 있어요. 판매가 확정된 것은 아닙니다.</p>'+
        '<div class="stock-actions"><button class="btn secondary" data-action="quick-sale" data-uid="'+uid+'"'+(negotiating?' disabled':'')+'>즉시 헐값 판매 · '+fmt(quick)+'G</button></div><p class="quick-sale-note'+(quick<lot.paid?' loss':'')+'">'+profitLabel(quick,lot.paid)+' · 급히 현금이 필요할 때</p>'+
        '<button class="card-detail" data-action="item-detail" data-id="'+it.id+'">물건의 이야기 보기</button></article>';
    }).join(''):'<div class="empty"><strong>다음 손님이 탐낼 물건은 무엇일까요?</strong>가격표 없이 방문 손님과 흥정하거나 정가를 정해 진열하세요.<br>즉시 판매는 헐값이라 손실이 납니다.<br>발견한 물건은 팔아도 수집록에 남아요.<br><button class="btn primary" data-action="go-trade">손님 만나러 가기</button></div>';
  }

  function codex() {
    const s = A.state;
    for (const b of document.querySelectorAll('[data-codex-mode]')) b.classList.toggle('active', b.dataset.codexMode === A.codexMode);
    $('codex-count').textContent = A.codexMode === 'people' ? Object.keys(s.met).length + ' / ' + PAWN_CHARACTERS.length : A.codexMode === 'grades' ? new Set(Object.values(s.discovered).map(x => x.grade)).size + ' / 9' : Object.keys(s.discovered).length + ' / 144';
    $('category-filter').hidden = A.codexMode !== 'items';
    $('category-filter').innerHTML = '<button data-category="all" class="' + (A.category === 'all' ? 'active' : '') + '">전체</button>' + Object.entries(E.CATEGORIES).map(([k, v]) => '<button data-category="' + k + '" class="' + (A.category === k ? 'active' : '') + '">' + v + '</button>').join('');
    if (A.codexMode === 'people') {
      $('codex-grid').innerHTML = PAWN_CHARACTERS.map((c, i) => {
        const met = !!s.met[i], relation = E.relationship(s, i), profile = E.profile(i);
        const likes = (profile.likes || []).map(x => E.CATEGORIES[x]).filter(Boolean).join(' · ');
        return '<button class="codex-card person-card ' + (met ? '' : 'locked') + '" data-action="person" data-index="' + i + '">' + portrait(i) +
          (met ? '' : '<span class="unmet-label">아직 만나지 않은 손님</span>') + '<strong>' + esc(c.name) + '</strong><small>' + esc(c.role) + '</small>' +
          (met ? '<small class="relation-note">' + esc(E.relationLabel(relation)) + ' · 호감도 ' + (relation > 0 ? '+' : '') + relation + '</small><small class="taste-note">' + esc(likes ? '취향 · ' + likes : profile.interest || '대화로 취향을 알아보세요') + '</small>' : '') + '</button>';
      }).join('');
      return;
    }
    if (A.codexMode === 'grades') {
      const descriptions = ['세월에 닳은 물건. 가끔 놀라운 사연을 품고 있습니다.', '골목에서 흔히 만날 수 있는 익숙한 물건.', '잘 만들어지고 보존된, 수집의 시작.', '쉽게 만날 수 없는 색다른 이력을 품었습니다.', '감정사의 눈을 빛나게 하는 특별한 발견.', '오래된 시대의 기억과 힘이 남아 있습니다.', '한 가게의 이름을 널리 알릴 만한 보물.', '이야기 속에서만 존재하던 물건입니다.', '존재가 알려져서는 안 되는 가장 깊은 밤의 물건.'];
      $('codex-grid').innerHTML = '<div class="grades-list">' + E.GRADES.map((g, i) => '<div class="grade-row" style="--grade:' + g[1] + '"><small>CLASS ' + String(i + 1).padStart(2, '0') + '</small><h3><strong>' + g[0] + '</strong></h3><p>' + descriptions[i] + '</p><small>같은 품목 기준 가치 ×' + g[2] + '</small></div>').join('') + '</div>';
      return;
    }
    const list = PAWN_ITEMS.filter(x => A.category === 'all' || x.category === A.category);
    $('codex-grid').innerHTML = list.map(it => {
      const found = s.discovered[it.id];
      return '<button class="codex-card ' + (found ? '' : 'locked') + '" data-action="item-detail" data-id="' + it.id + '" ' + (!found ? 'disabled' : '') + ' style="--grade:' + (found ? E.GRADES[found.grade][1] : '#716b7c') + '">' + art(it.id, found?.grade || 1, '', !found) + '<strong>' + esc(found ? it.name : '미발견') + '</strong><small>' + esc(found ? (s.album[it.id]?'✦ 도록 등록 · ':'최고 기록 · ') + E.GRADES[found.grade][0] : E.CATEGORIES[it.category]) + '</small></button>';
    }).join('');
  }

  function shop() {
    const s = A.state;
    $('shop-summary').innerHTML = '<div><small>누적 거래 이익</small><strong>' + fmt(s.profit) + 'G</strong></div><div><small>판매한 물건</small><strong>' + s.sold + '개</strong></div><div><small>만난 손님</small><strong>' + Object.keys(s.met).length + '명</strong></div>';
    const desc = {
      appraisal: [
        '옅게 남은 각인과 반사를 읽습니다. 흐릿했던 곳은 강화 후 다시 살펴보세요.',
        '더 미세한 선과 약한 반사를 읽습니다. 관찰 결과를 수첩의 기준과 직접 비교하세요.',
        '겹친 흔적과 희미한 마감 차이도 더 읽습니다. 조사 횟수는 조사 작업대에서 늘립니다.',
        '아주 흐린 표식과 반사도 더 자세히 읽습니다. 손님의 주장과 맞는지는 직접 확인하세요.',
        '가장 흐릿한 흔적까지 읽는 최고 단계입니다. 흔적의 의미와 거래할 가격은 직접 판단하세요.'
      ],
      inspection: Array.from({ length: 4 }, (_, i) => '방문당 조사 ' + (2+i) + '회 → ' + (3+i) + '회. '+['표식 안쪽 교차 확인이 열립니다.','제작자 서명 판독이 열립니다.','수리 부품의 사용층 확인이 열립니다.','기본 세 부위와 정밀 조사 세 가지를 모두 살펴볼 여유가 생깁니다.'][i]+' 진행 중인 거래에도 1회가 추가됩니다.'),
      shelves: Array.from({ length: 5 }, (_, i) => '보관함 ' + (12 + i * 4) + '칸, 가격표 진열 ' + (4 + i) + '칸으로 넓힙니다.'),
      word: Array.from({ length: 5 }, (_, i) => '판매가 ' + Math.round((i + 1) * 3.5) + '% 보너스. 흥정과 희귀 물품 발견에도 유리해집니다.')
    };
    $('upgrades-list').innerHTML = [['inspection', '⊞', '조사 작업대'], ['appraisal', '⌕', '감정사의 안목'], ['shelves', '▣', '진열장 확장'], ['word', '✦', '골목의 명성']].map(([key, icon, title]) => {
      const lv = s.upgrades[key], cost = E.upgradeCost(s,key), max = E.upgradeLimit(key);
      return '<article class="upgrade-card"><span aria-hidden="true">' + icon + '</span><h3>' + title + '</h3><p>' + (lv < max ? desc[key][lv] : (key === 'inspection' ? '방문당 조사 6회. 모든 부위를 살펴볼 수 있습니다. 재조사도 남은 횟수를 사용합니다.' : '이 분야의 최고 수준에 도달했습니다.')) + '</p><small>' + (lv < max ? 'LEVEL ' + lv + ' → ' + (lv + 1) : 'MASTERED') + '</small><button class="btn primary" data-action="upgrade" data-key="' + key + '" ' + (lv >= max || s.coins < cost ? 'disabled' : '') + '>' + (lv < max ? fmt(cost) + 'G 강화' : '완성') + '</button></article>';
    }).join('');
    $('achievements-count').textContent = s.claimed.length + ' / ' + E.ACHIEVEMENTS.length;
    $('achievements').innerHTML = E.ACHIEVEMENTS.map(a => {
      const done = s.claimed.includes(a.id), n = a.key === 'discovery' ? Object.keys(s.discovered).length : s[a.key];
      return '<div class="achievement ' + (done ? 'done' : '') + '"><span aria-hidden="true">' + (done ? '✦' : '◇') + '</span><div><strong>' + a.name + '</strong><p>' + a.text + ' · ' + fmt(Math.max(0, Math.min(a.goal, n))) + '/' + fmt(a.goal) + '</p></div><small>' + (done ? '달성' : '+' + a.reward + 'G') + '</small></div>';
    }).join('');
    $('ledger').innerHTML = s.log.map(l => '<div class="' + esc(l.type) + '"><span>' + l.day + '일차</span>' + esc(l.text) + '</div>').join('');
    $('aid-button').disabled = !(s.coins < 120 && !s.stock.length && s.aidDay !== s.day);
  }

  function itemDetail(id) {
    const s = A.state, it = E.item(id), d = s.discovered[id];
    if (!d) { A.toast('매입한 물건의 이야기가 이곳에 기록됩니다.'); return; }
    const owned = s.stock.filter(lot => lot.itemId === id);
    const genuineCount = owned.filter(lot => lot.genuine).length;
    A.openDialog(art(id, d.grade, 'modal-art') + '<small class="record-label">기록한 최고 등급</small>' + badge(d.grade) + '<h2>' + esc(it.name) + '</h2><p>“' + esc(it.story) + '”</p>' +
      '<p class="authenticity-note">같은 이름의 보물에도 진품과 가품이 섞여 있습니다. 이 기록은 지금까지 매입한 물건의 기록이며, 다음에 만날 물건의 진위를 보장하지 않습니다.</p>' +
      '<dl><dt>처음 만든 해</dt><dd>'+PAWN_ORIGINS[id].year+'년 · 가게 도록 기록</dd><dt>분류</dt><dd>' + E.CATEGORIES[it.category] + '</dd><dt>알려진 특징</dt><dd>' + esc(it.clue) + '</dd><dt>전해지는 특성</dt><dd>' + esc(it.effect) + '</dd><dt>매입 횟수</dt><dd>' + d.count + '회</dd><dt>진품 발견 이력</dt><dd>' + (d.genuine ? '이전에 진품을 발견한 적 있음' : '아직 가품만 발견') + '</dd><dt>현재 보관한 개체</dt><dd>' + (owned.length ? '진품 ' + genuineCount + '개 · 가품 ' + (owned.length - genuineCount) + '개' : '보관 중인 물건 없음') + '</dd></dl>');
  }

  window.PawnPanels = {
    render(view) {
      if (view === 'stock') stock();
      else if (view === 'codex') codex();
      else if (view === 'shop') shop();
    },
    action(name, el) {
      if (name === 'person') A.customerInfo(Number(el.dataset.index));
      if (name === 'item-detail') itemDetail(el.dataset.id);
      if (name === 'upgrade') A.run(E.upgrade, el.dataset.key);
      if (name === 'go-trade') A.switchView('trade');
      if (name === 'unlist-stock') A.run(E.setListing, el.dataset.uid, null);
    }
  };

  document.addEventListener('input',event=>{
    const form=event.target.closest('[data-listing-form]');if(!form||event.target.name!=='listingPrice')return;
    form.querySelector('[data-listing-error]').textContent='';event.target.removeAttribute('aria-invalid');previewListing(form);
  });
  document.addEventListener('submit',event=>{
    const form=event.target.closest('[data-listing-form]');if(!form)return;event.preventDefault();
    const field=form.elements.listingPrice,price=listingPrice(form),typed=field.value,uid=form.dataset.listingForm;
    if(price===null){form.querySelector('[data-listing-error]').textContent='1~999,999,999 사이의 정수 금액을 입력하세요.';field.setAttribute('aria-invalid','true');field.focus();return;}
    field.blur();const result=A.run(E.setListing,uid,price);
    if(result?.ok===false){const fresh=[...document.querySelectorAll('[data-listing-form]')].find(x=>x.dataset.listingForm===uid);if(!fresh)return;fresh.elements.listingPrice.value=typed;fresh.querySelector('[data-listing-error]').textContent=result.message||'가격표를 바꾸지 못했어요.';fresh.elements.listingPrice.setAttribute('aria-invalid','true');previewListing(fresh);fresh.elements.listingPrice.focus();}
  });
  A.render();
})();
