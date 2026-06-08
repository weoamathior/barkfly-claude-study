/* Exhibit 5 — Query String Handoff. */
(function () {
  const log = ZooLog.attach('#log');

  const badUrlEl = document.getElementById('badUrl');
  const badTargetEl = document.getElementById('badTarget');
  const badTricky = document.getElementById('badTricky');
  const goodUrlEl = document.getElementById('goodUrl');
  const goodTargetEl = document.getElementById('goodTarget');

  const BASE = '/exhibit/querystring'; // pretend target app path

  /* ===================== BAD ===================== */
  let badUrl = null;

  document.querySelector('[data-bad="gen"]').addEventListener('click', function () {
    const accountName = badTricky.checked ? 'Mission & Valley' : 'Mission Pharmacy';
    // Sensitive context, naively concatenated. Note: accountName is NOT encoded,
    // which is exactly the brittle/real mistake.
    badUrl = BASE + '?accountId=ACC-A&accountName=' + accountName
      + '&role=ADMIN&ssn=123-45-6789&authToken=tok_live_4f3c9a';
    badUrlEl.textContent = 'URL: ' + badUrl;
    // ...and now it's in the "access log" too:
    log.warn('portal/bad', 'GENERATED URL (lands in history + logs)', badUrl);
  });

  document.querySelector('[data-bad="open"]').addEventListener('click', function () {
    if (!badUrl) { log.error('target-app/bad', 'No URL generated yet'); return; }
    const qs = badUrl.split('?')[1] || '';
    const params = new URLSearchParams(qs); // brittle: depends on correct encoding
    const ctx = {
      accountId: params.get('accountId'),
      accountName: params.get('accountName'),
      role: params.get('role')
    };
    badTargetEl.textContent = 'Target app received: account=' + ctx.accountName
      + ' (' + ctx.accountId + '), role=' + ctx.role;
    log.info('target-app/bad', 'PARSED query string', ctx);
    if (badTricky.checked) {
      log.error('target-app/bad', 'Account name truncated at "&" — unencoded value corrupted the query');
    }
  });

  document.querySelector('[data-bad="replay"]').addEventListener('click', function () {
    if (!badUrl) { log.error('target-app/bad', 'No URL to replay'); return; }
    log.warn('target-app/bad', 'REPLAYED old URL — stale context accepted again (no expiry!)', badUrl);
    badTargetEl.textContent = 'Target app re-accepted the stale URL. Still "logged in" as ADMIN.';
  });

  /* ===================== BETTER ===================== */
  let goodUrl = null;

  document.querySelector('[data-good="gen"]').addEventListener('click', function () {
    fetch('/api/handoff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accountId: 'ACC-A', accountName: 'Mission Pharmacy', role: 'ADMIN' })
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        goodUrl = BASE + '?h=' + res.handoffId;
        goodUrlEl.textContent = 'URL: ' + goodUrl + '   (opaque, expires in ' + (res.expiresInMs / 1000) + 's)';
        log.info('portal/better', 'CREATED server-side handoff', { handoffId: res.handoffId });
      });
  });

  function consume(label, el) {
    if (!goodUrl) { log.error('target-app/better', 'No handoff created yet'); return; }
    const id = new URLSearchParams(goodUrl.split('?')[1]).get('h');
    log.info('target-app/better', 'EXCHANGE handoff id', { handoffId: id });
    fetch('/api/handoff/' + encodeURIComponent(id))
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); })
      .then(function (res) {
        if (!res.ok) {
          el.textContent = '⚠ ' + res.body.message;
          log.error('target-app/better', 'REJECTED: ' + res.body.error, null);
          return;
        }
        el.textContent = 'Target app received: account=' + res.body.accountName
          + ' (' + res.body.accountId + '), role=' + res.body.role;
        log.info('target-app/better', 'CONSUMED handoff (single-use)', res.body);
      });
  }

  document.querySelector('[data-good="open"]').addEventListener('click', function () {
    consume('open', goodTargetEl);
  });
  document.querySelector('[data-good="replay"]').addEventListener('click', function () {
    consume('replay', goodTargetEl); // second time -> 410 Gone
  });

  /* ===================== reset ===================== */
  document.querySelector('[data-reset]').addEventListener('click', function () {
    badUrl = null; goodUrl = null;
    badUrlEl.textContent = 'URL: (none yet)';
    goodUrlEl.textContent = 'URL: (none yet)';
    badTargetEl.textContent = 'Target app: nothing received.';
    goodTargetEl.textContent = 'Target app: nothing received.';
    badTricky.checked = false;
    log.clear();
  });
})();
