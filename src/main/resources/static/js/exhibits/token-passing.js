/* Exhibit 8 — Token Passing Anti-pattern. */
(function () {
  const log = ZooLog.attach('#log');

  /* ===================== BAD ===================== */
  const badUser = document.getElementById('badUser');
  const badTamper = document.getElementById('badTamper');
  const badUrlEl = document.getElementById('badUrl');
  const badChildEl = document.getElementById('badChild');
  let badUrl = null;

  // A fake, official-looking token. (Not a real JWT, but shaped like one.)
  function fakeToken(userId, role) {
    return 'eyJhbGciOiJub25lIn0.' + btoa(JSON.stringify({ sub: userId, role: role })) + '.sig';
  }

  document.querySelector('[data-bad="login"]').addEventListener('click', function () {
    const userId = badUser.value;
    const realRole = badUser.selectedOptions[0].dataset.role;
    const token = fakeToken(userId, realRole);

    localStorage.setItem('authToken', token);          // (1) readable by any script
    console.log('[orders-portal] auth token:', token);  // (2) ends up in screen-shares
    log.warn('portal/bad', 'token written to localStorage + console', { token: token.slice(0, 24) + '…' });

    const roleInUrl = badTamper.checked ? 'ADMIN' : realRole; // (4) client decides the role
    badUrl = '/child/orders?token=' + encodeURIComponent(token) + '&role=' + roleInUrl;
    badUrlEl.textContent = 'Child URL: ' + badUrl;       // (3) token in the URL
    log.warn('portal/bad', 'built child URL with token + role in query string', { role: roleInUrl });
  });

  document.querySelector('[data-bad="open"]').addEventListener('click', function () {
    if (!badUrl) { log.error('child/bad', 'login first'); return; }
    const params = new URLSearchParams(badUrl.split('?')[1]);
    const role = params.get('role'); // child TRUSTS this without checking the server
    badChildEl.dataset.role = role;
    badChildEl.textContent = 'Child app opened. Client-supplied role = ' + role + ' (trusted blindly)';
    log.error('child/bad', 'trusting client-supplied role from URL', { role: role });
  });

  document.querySelector('[data-bad="admin"]').addEventListener('click', function () {
    const role = badChildEl.dataset.role;
    if (role === 'ADMIN') {
      badChildEl.textContent = '🔓 ADMIN action performed (child trusted the URL role).';
      log.error('child/bad', 'ADMIN action allowed purely on client-supplied role');
    } else {
      badChildEl.textContent = 'Admin action blocked (role was ' + role + ').';
    }
  });

  /* ===================== BETTER ===================== */
  const goodUser = document.getElementById('goodUser');
  const goodSidEl = document.getElementById('goodSid');
  const goodChildEl = document.getElementById('goodChild');
  let sid = null;

  document.querySelector('[data-good="login"]').addEventListener('click', function () {
    fetch('/api/bff/session?user=' + encodeURIComponent(goodUser.value), { method: 'POST' })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        sid = res.bffSessionId;
        goodSidEl.textContent = 'BFF session: ' + sid + ' (opaque; not in URL, not in localStorage)';
        log.info('portal/better', 'BFF issued opaque session', { bffSessionId: sid });
      });
  });

  document.querySelector('[data-good="open"]').addEventListener('click', function () {
    if (!sid) { log.error('child/better', 'login via BFF first'); return; }
    fetch('/api/bff/context/' + sid).then(function (r) { return r.json(); }).then(function (ctx) {
      goodChildEl.textContent = 'Child context: ' + ctx.displayName + ' · account ' + ctx.accountId
        + ' · role ' + ctx.role + ' (server-issued)';
      log.info('child/better', 'received minimal server-issued context', ctx);
    });
  });

  document.querySelector('[data-good="admin"]').addEventListener('click', function () {
    if (!sid) { log.error('child/better', 'login via BFF first'); return; }
    fetch('/api/bff/admin/' + sid).then(function (r) {
      return r.json().then(function (b) { return { ok: r.ok, body: b }; });
    }).then(function (res) {
      if (res.ok) {
        goodChildEl.textContent = '✓ ' + res.body.message;
        log.info('child/better', 'ADMIN action authorized by server');
      } else {
        goodChildEl.textContent = '⛔ ' + res.body.message;
        log.warn('child/better', 'server REJECTED admin action (role enforced server-side)');
      }
    });
  });

  /* ===================== reset ===================== */
  document.querySelector('[data-reset]').addEventListener('click', function () {
    localStorage.removeItem('authToken');
    badUrl = null; sid = null;
    badUrlEl.textContent = 'Child URL: —';
    badChildEl.textContent = 'Child app: not opened.';
    delete badChildEl.dataset.role;
    badTamper.checked = false;
    goodSidEl.textContent = 'BFF session: —';
    goodChildEl.textContent = 'Child context: —';
    log.clear();
  });
})();
