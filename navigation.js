'use strict';
(() => {
  const A = window.PawnApp;
  if (!A || !window.PawnOnboarding) return;
  const routes = {
    title: {title:'시작 화면'}, trade: {title:'거래하기', view:'trade'},
    stock: {title:'보관함', view:'stock'}, collection: {title:'수집록', view:'codex'},
    shop: {title:'가게 관리', view:'shop'}, tutorial: {title:'체험 튜토리얼'}
  };
  const token = 'pawn-navigation-v1';
  let current, applying = false, queued = false, consuming = null, opened = [], sequence = 0, scrollTimer;
  const observed = new WeakSet();
  const hash = route => '#/'+route;
  const parse = () => {
    const value = location.hash.replace(/^#\/?/, '').replace(/\/$/, '');
    return Object.hasOwn(routes, value) ? value : value === 'codex' ? 'collection' : 'title';
  };
  const screen = () => A.inTutorial ? 'tutorial' : A.mode === 'menu' ? 'title' : A.view === 'codex' ? 'collection' : A.view;
  const allowed = route => routes[route].view && !A.hasSave ? 'title' : route;
  const owned = state => state?.pawnNavigation === token;
  function entry(route, guard = false, base = null) {
    return {pawnNavigation:token, route, guard, id:Date.now().toString(36)+'-'+(++sequence), base, scroll:0};
  }
  function write(state, replace = false) {
    history[replace ? 'replaceState' : 'pushState'](state, '', hash(state.route));
    current = state;
    document.title = routes[state.route].title+' · 수상한 전당포';
  }
  function rememberScroll() {
    if (!current || consuming || applying || current.route !== screen()) return;
    const next = {...current, scroll:Math.max(0,window.scrollY)};
    if (next.scroll===current.scroll) return;
    history.replaceState(next, '', location.href); current = next;
  }
  function dialogs() {
    opened = opened.filter(d => d.isConnected && d.open);
    for (const d of document.querySelectorAll('dialog[open]')) if (!opened.includes(d)) opened.push(d);
    return opened;
  }
  function closeDialog(dialog) {
    if (dialog.id === 'counter-drawer') window.PawnCounter?.close();
    else dialog.close();
  }
  function closeAll() { for (const dialog of [...dialogs()].reverse()) closeDialog(dialog); opened=[]; }
  function apply(route, scroll = 0) {
    applying = true;
    try {
      closeAll();
      if (A.inTutorial && route !== 'tutorial') PawnOnboarding.endTutorial();
      if (route === 'tutorial') {
        if (!A.inTutorial) PawnOnboarding.startTutorial();
      } else if (route === 'title') {
        if (A.mode !== 'menu') A.returnToTitle();
      } else if (A.mode !== 'play') A.startGame({view:routes[route].view});
      else if (A.view !== routes[route].view) A.switchView(routes[route].view);
      document.title = routes[route].title+' · 수상한 전당포';
      // Let layout settle before restoring a previous screen's scroll position.
      requestAnimationFrame(() => {
        if (screen() === route && !dialogs().length) window.scrollTo({top:scroll,behavior:'instant'});
      });
    } finally { applying = false; }
  }
  function schedule() {
    if (applying || queued) return;
    queued = true;
    queueMicrotask(() => { queued=false; reconcile(); });
  }
  function reconcile() {
    if (applying || consuming || !current) return;
    const route = screen();
    if (route !== current.route) {
      closeAll();
      if (current.guard) {
        // Consume the dialog guard first; commit the final screen after popstate.
        // This keeps closing a dialog from leaving a duplicate page in Back history.
        consuming = {base:current.base}; history.back(); return;
      }
      write(entry(route));
    }
    const open = dialogs();
    if (open.length && !current.guard) write(entry(route,true,current.id));
    else if (!open.length && current.guard) { consuming={base:current.base}; history.back(); }
  }
  function navigateHistory(event) {
    const incoming = event.state;
    if (consuming) {
      const expected = consuming.base, restoreScreen = consuming.restoreScreen; consuming=null;
      if (owned(incoming) && incoming.id === expected) {
        current=incoming;
        if (restoreScreen) apply(incoming.route,incoming.scroll||0);
        // The UI may already have moved while closing a dialog (e.g. Start Game).
        reconcile(); return;
      }
    }
    if (owned(incoming) && incoming.guard) {
      // Guards are temporary. Forward never resurrects a stale price/confirm window.
      current=incoming; consuming={base:incoming.base,restoreScreen:true}; history.back(); return;
    }
    if (current?.guard && owned(incoming) && incoming.id === current.base && screen() === incoming.route) {
      current=incoming;
      const top=dialogs().at(-1);
      if (top) closeDialog(top);
      // One guard is shared by nested dialogs: each Back closes only the top one.
      reconcile(); return;
    }
    const requested=parse(), route=allowed(requested);
    if (owned(incoming) && incoming.route === route && location.hash === hash(route)) current=incoming;
    else write(entry(route),true);
    apply(route,current.scroll||0);
    schedule();
  }
  window.addEventListener('popstate',navigateHistory);
  window.addEventListener('hashchange', () => {
    // Browsers dispatch hashchange after popstate for a same-document traversal.
    if (consuming || (current && location.hash === hash(current.route))) return;
    navigateHistory({state:history.state});
  });
  for (const name of ['pawn:view','pawn:mode']) window.addEventListener(name,schedule);
  function watchDialogs() {
    for (const dialog of document.querySelectorAll('dialog')) {
      if (observed.has(dialog)) continue;
      observed.add(dialog);
      new MutationObserver(schedule).observe(dialog,{attributes:true,attributeFilter:['open']});
      dialog.addEventListener('close',schedule);
      // Prevent the native Escape handler and onboarding's Escape listener from
      // closing two nested dialogs in the same key event.
      dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog(dialog);schedule();});
    }
  }
  watchDialogs();
  document.addEventListener('click',rememberScroll,true);
  document.addEventListener('keydown',event=>{
    rememberScroll();
    if(event.key==='Escape' && dialogs().length) {
      event.preventDefault();event.stopImmediatePropagation();closeDialog(dialogs().at(-1));schedule();
    }
  },true);
  // Avoid Safari's history update rate limit during a long mobile scroll.
  window.addEventListener('scroll',()=>{
    if(scrollTimer)return;
    scrollTimer=setTimeout(()=>{scrollTimer=null;rememberScroll();},1000);
  },{passive:true});
  window.addEventListener('pagehide',rememberScroll);
  history.scrollRestoration='manual';
  // Rebuild only the major screen on reload; never replay dialog content/actions.
  const requested=parse(), first=allowed(requested);
  const previous=history.state;
  if (owned(previous) && previous.guard && previous.route===first) {
    current=previous;
    apply(first);
    consuming={base:previous.base,restoreScreen:true}; history.back();
  } else {
    write(owned(previous) && previous.route===first ? previous : entry(first),true);
    apply(first,current.scroll||0);
  }
  if (first!==requested && routes[requested].view) A.toast('저장된 가게가 없어요. 새로 시작하거나 튜토리얼을 선택하세요.');
  window.PawnNavigation={get route(){return screen()},get pending(){return !!consuming},get openDialogs(){return dialogs().map(d=>d.id)}};
  schedule();
})();
