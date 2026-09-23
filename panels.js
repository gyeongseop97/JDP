'use strict';
(() => {
  const A = PawnApp, E = A.E, $ = id => document.getElementById(id);
  const { esc, fmt, art, portrait, badge } = A;

  function stock() {
    const s = A.state;
    const help = document.querySelector('#view-stock .section-heading p');
    if (help) help.textContent = '보관 중인 물건은 사러 온 손님과 직접 흥정할 수 있어요. 도매·위탁 판매도 가능합니다.';
    for (const b of document.querySelectorAll('[data-stock-filter]')) {
      b.classList.toggle('active', b.dataset.stockFilter === A.stockFilter);
      if (b.dataset.stockFilter === 'display') b.textContent = '위탁 중';
    }
    $('stock-count').textContent = s.stock.length + ' / ' + E.capacity(s);
    const list = s.stock.filter(x => A.stockFilter === 'all' || (A.stockFilter === 'display' ? x.displayAt !== null : x.displayAt === null));
    const ev = E.event(s);
    $('stock-grid').innerHTML = list.length ? list.map(lot => {
      const it = E.item(lot.itemId), quick = E.quote(s, lot), display = E.quote(s, lot, 'display');
      const isDisplay = lot.displayAt !== null;
      const negotiating = s.current?.kind === 'buyer' && s.current.status === 'offered' && s.current.stockUid === lot.uid;
      const eligible = !s.eventDone && ev.kind === 'request' && lot.genuine && (ev.category === 'all' || ev.category === it.category) && !isDisplay;
      const disabled = negotiating ? ' disabled' : '';
      const saleControls = isDisplay
        ? '<div class="display-status">위탁 판매 · 손님 ' + Math.max(0, lot.displayAt - s.turn) + '명 뒤 · ' + fmt(lot.displayPrice) + 'G</div>'
        : (negotiating ? '<div class="display-status negotiation-status">손님과 협상 중 · 거래 화면에서 이어가세요</div>' : '') +
          '<div class="stock-actions"><button class="btn primary" data-action="quick-sale" data-uid="' + esc(lot.uid) + '"' + disabled + '>도매 판매 ' + fmt(quick) + 'G</button>' +
          '<button class="btn secondary" data-action="display-sale" data-uid="' + esc(lot.uid) + '"' + disabled + '>위탁 판매 ' + fmt(display) + 'G</button></div>';
      return '<article class="stock-card"><div class="stock-card-top">' + art(lot.itemId, lot.grade) + '<div><h3>' + esc(it.name) + '</h3>' + badge(lot.grade) +
        (lot.genuine ? ' <span class="auth-tag">진품</span>' : ' <span class="fake-tag">가품</span>') + '</div></div>' +
        '<div class="stock-meta"><span>매입 ' + fmt(lot.paid) + 'G</span><b>이 물건의 가치 ' + fmt(lot.value) + 'G</b></div>' + saleControls +
        (eligible ? '<button class="request-deliver" data-action="deliver" data-uid="' + esc(lot.uid) + '"' + disabled + '>의뢰 전달 · ' + fmt(Math.round(lot.value * (ev.mult || 1.4)) + (ev.gift || 0)) + 'G</button>' : '') +
        '<button class="card-detail" data-action="item-detail" data-id="' + it.id + '">물건의 이야기 보기</button></article>';
    }).join('') : '<div class="empty"><strong>다음 손님이 탐낼 물건은 무엇일까요?</strong>매입한 물건을 보관하면 사러 오는 손님을 만날 수 있어요.<br>직접 대화하고 가격을 제안하거나 도매·위탁으로 판매하세요.<br>발견한 물건은 팔아도 수집록에 남아요.<br><button class="btn primary" data-action="go-trade">손님 만나러 가기</button></div>';
  }

  function codex() {
    const s = A.state;
    for (const b of document.querySelectorAll('[data-codex-mode]')) b.classList.toggle('active', b.dataset.codexMode === A.codexMode);
    $('codex-count').textContent = A.codexMode === 'people' ? Object.keys(s.met).length + ' / 24' : A.codexMode === 'grades' ? new Set(Object.values(s.discovered).map(x => x.grade)).size + ' / 9' : Object.keys(s.discovered).length + ' / 144';
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
      return '<button class="codex-card ' + (found ? '' : 'locked') + '" data-action="item-detail" data-id="' + it.id + '" ' + (!found ? 'disabled' : '') + ' style="--grade:' + (found ? E.GRADES[found.grade][1] : '#716b7c') + '">' + art(it.id, found?.grade || 1, '', !found) + '<strong>' + esc(found ? it.name : '미발견') + '</strong><small>' + esc(found ? '최고 기록 · ' + E.GRADES[found.grade][0] : E.CATEGORIES[it.category]) + '</small></button>';
    }).join('');
  }

  function shop() {
    const s = A.state;
    $('shop-summary').innerHTML = '<div><small>누적 거래 이익</small><strong>' + fmt(s.profit) + 'G</strong></div><div><small>판매한 물건</small><strong>' + s.sold + '개</strong></div><div><small>만난 손님</small><strong>' + Object.keys(s.met).length + '명</strong></div>';
    const desc = {
      appraisal: [
        '물건에 남은 증거를 더 정밀하게 읽고 추정 가격의 범위를 좁힙니다.',
        '흔적과 손님의 설명을 비교할 때 쓸 증거의 정확도가 높아집니다.',
        '정교한 위조의 흔적을 더 잘 읽습니다. 단서만으로 진위를 확정할 수는 없습니다.',
        '증거 판독이 정밀해지고, 손님과 나눌 대화가 3회에서 4회로 늘어납니다.',
        '증거 판독과 가격 추정이 가장 정밀해집니다. 대화는 4회이며 오판 가능성은 남습니다.'
      ],
      shelves: Array.from({ length: 5 }, (_, i) => '보관함 ' + (12 + i * 4) + '칸, 위탁 판매 ' + (4 + i) + '칸으로 넓힙니다.'),
      word: Array.from({ length: 5 }, (_, i) => '판매가 ' + Math.round((i + 1) * 3.5) + '% 보너스. 흥정과 희귀 물품 발견에도 유리해집니다.')
    };
    $('upgrades-list').innerHTML = [['appraisal', '⌕', '감정사의 안목'], ['shelves', '▣', '진열장 확장'], ['word', '✦', '골목의 명성']].map(([key, icon, title]) => {
      const lv = s.upgrades[key], cost = E.UPGRADE_COSTS[lv];
      return '<article class="upgrade-card"><span aria-hidden="true">' + icon + '</span><h3>' + title + '</h3><p>' + (lv < 5 ? desc[key][lv] : '이 분야의 최고 수준에 도달했습니다.') + '</p><small>' + (lv < 5 ? 'LEVEL ' + lv + ' → ' + (lv + 1) : 'MASTERED') + '</small><button class="btn primary" data-action="upgrade" data-key="' + key + '" ' + (lv >= 5 || s.coins < cost ? 'disabled' : '') + '>' + (lv < 5 ? fmt(cost) + 'G 강화' : '완성') + '</button></article>';
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
      '<dl><dt>분류</dt><dd>' + E.CATEGORIES[it.category] + '</dd><dt>알려진 특징</dt><dd>' + esc(it.clue) + '</dd><dt>전해지는 특성</dt><dd>' + esc(it.effect) + '</dd><dt>매입 횟수</dt><dd>' + d.count + '회</dd><dt>진품 발견 이력</dt><dd>' + (d.genuine ? '이전에 진품을 발견한 적 있음' : '아직 가품만 발견') + '</dd><dt>현재 보관한 개체</dt><dd>' + (owned.length ? '진품 ' + genuineCount + '개 · 가품 ' + (owned.length - genuineCount) + '개' : '보관 중인 물건 없음') + '</dd></dl>');
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
    }
  };
  A.render();
})();
