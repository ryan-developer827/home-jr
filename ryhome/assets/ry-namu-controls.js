(function(){
  const touchQuery = '(hover: none), (pointer: coarse), (max-width: 760px)';
  const isTouch = () => window.matchMedia(touchQuery).matches;
  const clean = (s) => String(s||'')
    .replace(/접기|펼치기|▾|▸|▲|▼|목차/g,'')
    .replace(/\b\d+\s*개\b/g,'')
    .replace(/\s+\d+\s*$/g,'')
    .replace(/\s+/g,' ')
    .trim();
  const visible = (el) => !!(el && el.getClientRects && el.getClientRects().length) && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
  const idSafe = (el, i) => { if(!el.id) el.id = 'ry-nav-target-' + i; return el.id; };

  function titleOf(el){
    if(!el) return '';
    if(el.matches('.mid-divider,.section-divider')) return clean(el.textContent) || '항목';
    if(el.matches('details.category')){
      const sum = el.querySelector(':scope > summary');
      return clean(sum ? sum.textContent : el.textContent) || '항목';
    }
    if(el.matches('.quick-card')){
      const h = el.querySelector('h2,h3');
      return clean(h ? h.textContent : el.textContent) || '항목';
    }
    const h = el.querySelector('h2,h3,summary,.toc-title');
    return clean(h ? h.textContent : el.textContent) || '항목';
  }

  function collectSections(){
    const selectors = [
      '#news-start.section-divider', '#portal.quick-card', '#breaking.quick-card', '#forum-start.section-divider',
      '#bookmarkTree .mid-divider', '#bookmarkTree details.category',
      '#newsTree .mid-divider', '#newsTree details.category',
      '#forumTree .mid-divider', '#forumTree details.category'
    ];
    const seen = new Set();
    const items = [];
    document.querySelectorAll(selectors.join(',')).forEach((el)=>{
      if(seen.has(el) || !visible(el)) return;
      seen.add(el);
      const title = titleOf(el);
      if(!title) return;
      items.push({el,title,level:sectionLevel(el),id:idSafe(el,items.length)});
    });
    if(items.length === 0){
      document.querySelectorAll('main details, main section[id], main .toc').forEach((el)=>{
        if(seen.has(el) || !visible(el)) return;
        seen.add(el);
        const title = titleOf(el);
        if(title) items.push({el,title,level:sectionLevel(el),id:idSafe(el,items.length)});
      });
    }
    return items.slice(0,90);
  }

  function expandTocIfNeeded(){
    // details형 목차: 기본홈/미디어 쪽 대응
    document.querySelectorAll('details.toc, details:has(> summary.toc-title)').forEach((d)=>{ d.open = true; });

    // 버튼형 목차: 뉴스/포럼 쪽 대응
    document.querySelectorAll('.toc-title.toc-toggle').forEach((btn)=>{
      const panelId = btn.getAttribute('data-panel');
      const panel = panelId ? document.getElementById(panelId) : null;
      const isCollapsed = panel && panel.classList.contains('is-collapsed');
      const ariaCollapsed = btn.getAttribute('aria-expanded') === 'false';
      if(isCollapsed || ariaCollapsed){
        panel && panel.classList.remove('is-collapsed');
        btn.setAttribute('aria-expanded','true');
        const icon = btn.querySelector('.toc-toggle-icon');
        if(icon) icon.textContent = '접기';
      }
    });
  }

  function reveal(el){
    if(!el) return;
    el.classList.remove('hidden','collapsed-by-divider');
    if(el.matches('details')) el.open = true;
    let p = el.parentElement;
    while(p){
      if(p.matches && p.matches('details')) p.open = true;
      p.classList && p.classList.remove('hidden','collapsed-by-divider');
      p = p.parentElement;
    }
    if(el.matches('.mid-divider')){
      const expanded = el.getAttribute('aria-expanded') !== 'false';
      if(!expanded){
        const btn = el.matches('.mid-divider-toggle') ? el : el.querySelector('.mid-divider-toggle');
        if(btn) btn.click();
      }
    }
  }

  function go(el, preferredIndex){
    if(!el) return;
    reveal(el);
    const widget = document.querySelector('.ry-namu-widget');
    const dots = widget ? Array.from(widget.querySelectorAll('.ry-namu-dot')) : [];
    let index = Number.isFinite(preferredIndex) ? preferredIndex : -1;
    if(index < 0) index = dots.findIndex(dot => dot.getAttribute('aria-label') === titleOf(el));

    // smooth-scroll 중 스크롤 감지기가 다른 하단 항목으로 덮어쓰지 않도록
    // 사용자가 직접 누른 항목을 잠시 우선 적용한다.
    if(index >= 0){
      manualCurrentIndex = index;
      manualCurrentUntil = Infinity;
      setCurrentShortcut(widget, index);
    }

    el.scrollIntoView({behavior:'smooth', block:'start'});
    try{ history.replaceState(null,'','#'+encodeURIComponent(el.id)); }catch(e){}
    document.querySelectorAll('.anchor-active,.jump-highlight').forEach(x=>x.classList.remove('anchor-active','jump-highlight'));
    el.classList.add('anchor-active','jump-highlight');
    setTimeout(()=>el.classList.remove('anchor-active','jump-highlight'),1500);
  }

  function tocTarget(){
    return document.querySelector('.toc-grid') ||
      document.querySelector('details.toc') ||
      document.querySelector('.toc') ||
      document.getElementById('bookmarkToc') ||
      document.getElementById('newsToc') ||
      document.getElementById('forumToc') ||
      document.querySelector('main') || document.body;
  }

  function goToc(){
    expandTocIfNeeded();
    const target = tocTarget();
    if(!target) return;
    target.scrollIntoView({behavior:'smooth', block:'start'});
  }

  function icon(kind){
    if(kind==='toc') return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="6" r="1.7" fill="currentColor" stroke="none"></circle><circle cx="5" cy="12" r="1.7" fill="currentColor" stroke="none"></circle><circle cx="5" cy="18" r="1.7" fill="currentColor" stroke="none"></circle><path d="M10 6h9M10 12h9M10 18h9"></path></svg>';
    if(kind==='up') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"></path><path d="M6 11l6-6 6 6"></path></svg>';
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"></path><path d="M6 13l6 6 6-6"></path></svg>';
  }

  let currentObserver = null;
  let currentScrollHandler = null;
  let manualCurrentIndex = -1;
  let manualCurrentUntil = 0;
  let scrollRaf = 0;
  let manualClearBound = false;

  function setCurrentShortcut(widget, index){
    if(!widget || index == null || index < 0) return;
    widget.querySelectorAll('.ry-namu-dot,.ry-namu-link').forEach((el)=>{
      el.classList.toggle('is-current', Number(el.dataset.index) === Number(index));
      if(el.classList.contains('ry-namu-dot')){
        el.setAttribute('aria-current', Number(el.dataset.index) === Number(index) ? 'true' : 'false');
      }
    });
  }

  function stickyOffset(){
    const sticky = document.querySelector('.search-card');
    if(!sticky || !visible(sticky)) return 0;
    const style = getComputedStyle(sticky);
    if(style.position !== 'sticky' && style.position !== 'fixed') return 0;
    const rect = sticky.getBoundingClientRect();
    if(rect.bottom <= 0 || rect.top > 8) return 0;
    return Math.max(0, Math.min(rect.height + 12, window.innerHeight * 0.22));
  }

  function currentFocusLine(){
    const base = Math.max(36, Math.min(96, window.innerHeight * 0.12));
    return Math.max(base, stickyOffset() + 14);
  }

  function pickCurrentIndex(items){
    const focus = currentFocusLine();
    const vh = window.innerHeight || document.documentElement.clientHeight || 800;
    let best = 0;
    let bestScore = Infinity;

    items.forEach((item, idx)=>{
      const rect = item.el.getBoundingClientRect();
      if(rect.bottom < 0 || rect.top > vh) return;

      let score;
      if(rect.top <= focus && rect.bottom >= focus){
        // 기준선이 항목 내부에 있으면 현재 항목으로 강하게 우선한다.
        score = Math.abs(rect.top - focus) * 0.35;
      }else{
        // 기준선에 가장 가까운 항목을 선택한다.
        score = Math.min(Math.abs(rect.top - focus), Math.abs(rect.bottom - focus));
      }

      // 하단에 조금 보이는 다음 항목보다 상단 기준선 근처 항목이 이기도록 보정.
      if(rect.top > focus) score += Math.min(220, rect.top - focus);

      if(score < bestScore){
        bestScore = score;
        best = idx;
      }
    });

    // 화면 안에서 후보를 못 찾으면 스크롤 위치 기준으로 가장 가까운 이전 항목을 사용한다.
    if(!Number.isFinite(bestScore)){
      const y = window.scrollY + focus;
      best = 0;
      items.forEach((item, idx)=>{
        const top = item.el.getBoundingClientRect().top + window.scrollY;
        if(top <= y) best = idx;
      });
    }
    return best;
  }

  function watchCurrentSection(widget, items){
    if(currentObserver) currentObserver.disconnect();
    if(currentScrollHandler) window.removeEventListener('scroll', currentScrollHandler);
    if(currentScrollHandler) window.removeEventListener('resize', currentScrollHandler);
    if(scrollRaf) cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
    if(!widget || !items || !items.length) return;

    const update = () => {
      scrollRaf = 0;
      if(manualCurrentIndex >= 0 && Date.now() < manualCurrentUntil){
        setCurrentShortcut(widget, manualCurrentIndex);
        return;
      }
      manualCurrentIndex = -1;
      setCurrentShortcut(widget, pickCurrentIndex(items));
    };

    currentScrollHandler = () => {
      if(scrollRaf) return;
      scrollRaf = window.requestAnimationFrame(update);
    };
    window.addEventListener('scroll', currentScrollHandler, {passive:true});
    window.addEventListener('resize', currentScrollHandler, {passive:true});

    if('IntersectionObserver' in window){
      currentObserver = new IntersectionObserver(update, {root:null, threshold:[0, .15, .35, .6], rootMargin:'-12% 0px -60% 0px'});
      items.forEach(item=>currentObserver.observe(item.el));
    }
    update();
  }


  function sectionLevel(el){
    if(!el) return 0;
    if(el.matches('.mid-divider,.section-divider')) return 0;
    if(el.matches('.quick-card,details.category')) return 1;
    return 0;
  }

  function escapeHtml(s){
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function mobileNumberedHtml(item, state){
    const level = item.level || 0;
    if(level === 0){
      state.parent += 1;
      state.child = 0;
      return `<span class="ry-namu-line"><span class="ry-namu-num">${state.parent}.</span><span class="ry-namu-title">${escapeHtml(item.title)}</span></span>`;
    }
    if(state.parent < 1) state.parent = 1;
    state.child += 1;
    return `<span class="ry-namu-line"><span class="ry-namu-num">${state.parent}.${state.child}.</span><span class="ry-namu-title">${escapeHtml(item.title)}</span></span>`;
  }

  function build(){
    document.querySelectorAll('.ry-namu-widget').forEach(el=>el.remove());
    const items = collectSections();
    const widget = document.createElement('aside');
    widget.className = 'ry-namu-widget';
    widget.setAttribute('aria-label','페이지 이동 컨트롤');
    widget.innerHTML = `
      <div class="ry-namu-controls" aria-label="목차와 상하 이동 버튼">
        <button type="button" class="ry-namu-btn ry-namu-btn-toc" data-action="toc" data-tip="목차" aria-label="목차">${icon('toc')}</button>
        <button type="button" class="ry-namu-btn" data-action="top" data-tip="맨 위로" aria-label="맨 위로">${icon('up')}</button>
        <button type="button" class="ry-namu-btn" data-action="bottom" data-tip="맨 아래" aria-label="맨 아래">${icon('down')}</button>
      </div>
      <div class="ry-namu-dots" aria-label="항목 바로가기 점 목록"></div>
      <div class="ry-namu-panel" role="dialog" aria-label="목차 팝업">
        <div class="ry-namu-panel-title">목차</div>
        <div class="ry-namu-list"></div>
      </div>`;

    const dots = widget.querySelector('.ry-namu-dots');
    const list = widget.querySelector('.ry-namu-list');
    if(items.length){
      items.forEach((item)=>{
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'ry-namu-dot';
        dot.dataset.title = item.title;
        dot.dataset.index = String(items.indexOf(item));
        dot.setAttribute('aria-label', item.title);
        dot.addEventListener('click',()=>{ go(item.el, Number(dot.dataset.index)); widget.classList.remove('is-open'); });
        dots.appendChild(dot);

        const link = document.createElement('button');
        link.type = 'button';
        link.className = 'ry-namu-link ry-namu-link-depth' + (item.level || 0);
        link.dataset.index = String(items.indexOf(item));
        if(!list._numState) list._numState = {parent:0, child:0};
        link.innerHTML = mobileNumberedHtml(item, list._numState);
        link.addEventListener('click',()=>{ go(item.el, Number(link.dataset.index)); widget.classList.remove('is-open'); });
        list.appendChild(link);
      });
    }else{
      const empty = document.createElement('div');
      empty.className = 'ry-namu-empty';
      empty.textContent = '표시할 목차가 없습니다.';
      list.appendChild(empty);
    }

    widget.addEventListener('click',(e)=>{
      const btn = e.target.closest('.ry-namu-btn');
      if(!btn) return;
      const action = btn.dataset.action;
      if(action==='top'){
        manualCurrentIndex = -1;
        manualCurrentUntil = 0;
        window.scrollTo({top:0,behavior:'smooth'});
        widget.classList.remove('is-open');
        return;
      }
      if(action==='bottom'){
        manualCurrentIndex = -1;
        manualCurrentUntil = 0;
        window.scrollTo({top:document.documentElement.scrollHeight,behavior:'smooth'});
        widget.classList.remove('is-open');
        return;
      }
      if(action==='toc'){
        if(isTouch()) widget.classList.toggle('is-open');
        else goToc();
      }
    });

    document.addEventListener('click',(e)=>{
      if(isTouch() && !widget.contains(e.target)) widget.classList.remove('is-open');
    }, true);

    // 사용자가 직접 스크롤/키 이동을 시작하면 클릭으로 고정했던 현재 항목을 해제한다.
    if(!manualClearBound){
      manualClearBound = true;
      const clearManual = (e) => {
        if(e && e.target && e.target.closest && e.target.closest('.ry-namu-widget')) return;
        manualCurrentIndex = -1;
        manualCurrentUntil = 0;
      };
      ['wheel','touchstart','mousedown','keydown'].forEach(type=>{
        window.addEventListener(type, clearManual, {passive:true, capture:true});
      });
    }

    document.body.appendChild(widget);
    watchCurrentSection(widget, items);
  }

  function boot(){ setTimeout(build,120); setTimeout(build,750); setTimeout(build,1500); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
