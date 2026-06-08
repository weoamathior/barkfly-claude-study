/* Exhibit 6 — Click Interception / Fake Navigation. */
(function () {
  const log = ZooLog.attach('#log');

  const VIEWS = {
    orders: 'Orders App — ORD-10001, ORD-10002 …',
    invoices: 'Invoices App — INV-50001 (PAID) …',
    support: 'Support App — 0 open tickets. Have you tried turning it off and on?'
  };
  const LABEL = { orders: 'Orders App', invoices: 'Invoices App', support: 'Support App' };

  /* ===================== BAD ===================== */
  // One global handler hijacks every link click in the nav, swaps content, and
  // never touches the URL, breadcrumb, or history.
  const badView = document.getElementById('badView');
  const badStatus = document.getElementById('badStatus');
  const badLinks = document.querySelectorAll('#badNav a');

  badLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault(); // intercept — the link goes nowhere real
      const name = a.textContent.trim().toLowerCase();
      badView.textContent = VIEWS[name];
      log.warn('portal/bad', 'INTERCEPTED click, swapped content (URL unchanged)', { view: name });
    });
  });

  document.querySelector('[data-bad="back"]').addEventListener('click', function () {
    log.error('portal/bad', 'Back pressed — no in-app history was pushed, so this leaves the portal');
    badStatus.textContent = '⟵ Back would exit the whole portal (nothing was pushed to history).';
  });

  /* ===================== BETTER ===================== */
  // Real links + History API. Each view is a real route; back/forward and
  // open-in-new-tab all behave.
  const goodView = document.getElementById('goodView');
  const goodCrumb = document.getElementById('goodCrumb');
  const goodLinks = document.querySelectorAll('#goodNav a');

  function render(view, label) {
    if (view && VIEWS[view]) {
      goodView.textContent = VIEWS[view];
      goodCrumb.innerHTML = 'You are here: <strong>Portal › ' + LABEL[view] + '</strong>';
    } else {
      goodView.textContent = 'Welcome to the portal home.';
      goodCrumb.innerHTML = 'You are here: <strong>Portal › Home</strong>';
    }
  }

  goodLinks.forEach(function (a) {
    a.addEventListener('click', function (e) {
      // Let modified clicks (ctrl/cmd/middle = open in new tab) use the real href.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
      e.preventDefault();
      const view = a.dataset.view;
      history.pushState({ view: view }, '', a.getAttribute('href'));
      render(view);
      log.info('portal/better', 'pushState route', { view: view, url: a.getAttribute('href') });
    });
  });

  window.addEventListener('popstate', function (e) {
    const view = (e.state && e.state.view) || null;
    render(view);
    log.info('portal/better', 'popstate — back/forward worked', { view: view });
  });

  document.querySelector('[data-good="back"]').addEventListener('click', function () {
    log.info('portal/better', 'history.back()');
    history.back();
  });

  // Honor ?view= on load so open-in-new-tab lands on the right view.
  const initial = new URLSearchParams(location.search).get('view');
  if (initial) { render(initial); log.info('portal/better', 'Loaded directly into view from URL', { view: initial }); }

  /* ===================== reset ===================== */
  document.querySelector('[data-reset]').addEventListener('click', function () {
    badView.textContent = 'Welcome to the portal home.';
    badStatus.textContent = '';
    render(null);
    log.clear();
  });
})();
