/* Exhibit 7 — Shared Session Illusion. */
(function () {
  const log = ZooLog.attach('#log');

  function post(path) { return fetch(path, { method: 'POST' }).then(function (r) { return r.json(); }); }
  function get(path) { return fetch(path).then(function (r) { return r.json(); }); }

  /* ===================== BAD ===================== */
  const badPortal = document.getElementById('badPortal');
  const badChild = document.getElementById('badChild');
  let badChildLoaded = false;

  document.querySelector('[data-bad="load"]').addEventListener('click', function () {
    get('/api/session/status?app=portal').then(function (s) {
      badPortal.textContent = 'Portal: ' + (s.active ? 'LOGGED IN ✓' : 'logged out');
      log.info('portal/bad', 'checked OWN session only', s);
    });
    badChild.textContent = 'Child app: Orders ORD-10001, ORD-10002 (loaded)';
    badChildLoaded = true;
  });

  document.querySelector('[data-bad="expire"]').addEventListener('click', function () {
    post('/api/session/expire?app=child').then(function (s) {
      log.warn('server', 'child session expired', s);
      // The bad portal does NOT re-check, so the UI keeps showing stale orders.
      log.error('portal/bad', 'portal did not re-check child — UI is now stale (zombie)');
    });
  });

  document.querySelector('[data-bad="act"]').addEventListener('click', function () {
    if (!badChildLoaded) { log.error('portal/bad', 'nothing loaded'); return; }
    // Optimistic: never verifies the child session before claiming success.
    badChild.textContent = 'Child app: "Invoice generated!" (portal assumed success)';
    log.error('portal/bad', 'action reported success without checking child auth');
  });

  document.querySelector('[data-bad="logout"]').addEventListener('click', function () {
    post('/api/session/logout?app=portal').then(function (s) {
      badPortal.textContent = 'Portal: logged out';
      log.warn('portal/bad', 'logged out PORTAL only — child session untouched', s);
    });
  });

  /* ===================== BETTER ===================== */
  const goodPortal = document.getElementById('goodPortal');
  const goodChild = document.getElementById('goodChild');
  const goodBanner = document.getElementById('goodBanner');
  let monitor = null;

  function paintChild(s) {
    if (s.active) {
      goodChild.textContent = 'Child: active ✓ (expires in ' + Math.round(s.expiresInMs / 1000) + 's)';
      goodBanner.textContent = '';
      goodBanner.style.color = '';
    } else {
      goodChild.textContent = 'Child: ' + (s.expired ? 'EXPIRED' : 'logged out');
      goodBanner.textContent = '⚠ Your Orders App session ended. Please re-authenticate.';
      goodBanner.style.color = 'var(--bad)';
    }
  }

  function poll() {
    get('/api/session/status?app=portal').then(function (s) {
      goodPortal.textContent = 'Portal: ' + (s.active ? 'LOGGED IN ✓' : 'logged out');
    });
    get('/api/session/status?app=child').then(function (s) {
      paintChild(s);
      log.info('portal/better', 'heartbeat: child status', { active: s.active, expired: s.expired });
    });
  }

  document.querySelector('[data-good="monitor"]').addEventListener('click', function () {
    if (monitor) return;
    poll();
    monitor = setInterval(poll, 3000);
    log.info('portal/better', 'session monitor started (polls child every 3s)');
  });

  document.querySelector('[data-good="expire"]').addEventListener('click', function () {
    post('/api/session/expire?app=child').then(function (s) {
      log.warn('server', 'child session expired', s);
      poll();
    });
  });

  document.querySelector('[data-good="reauth"]').addEventListener('click', function () {
    post('/api/session/login?app=child').then(function (s) {
      log.info('portal/better', 'child re-authenticated', s);
      poll();
    });
  });

  document.querySelector('[data-good="logout"]').addEventListener('click', function () {
    log.info('portal/better', 'LOGOUT broadcast to all apps');
    Promise.all([post('/api/session/logout?app=portal'), post('/api/session/logout?app=child')])
      .then(function (results) {
        log.info('portal', 'ack: portal logged out', results[0]);
        log.info('orders-app', 'ack: child logged out', results[1]);
        poll();
      });
  });

  /* ===================== reset ===================== */
  document.querySelector('[data-reset]').addEventListener('click', function () {
    if (monitor) { clearInterval(monitor); monitor = null; }
    post('/api/session/reset').then(function () {
      badPortal.textContent = 'Portal: —';
      badChild.textContent = 'Child app: not loaded.';
      badChildLoaded = false;
      goodPortal.textContent = 'Portal: —';
      goodChild.textContent = 'Child: —';
      goodBanner.textContent = '';
      log.clear();
    });
  });
})();
