/* Exhibit 4 — Shared localStorage as an integration contract. */
(function () {
  const log = ZooLog.attach('#log');

  // Keys: the bad app uses a bare key; the better app namespaces + versions.
  const BAD_KEY = 'selectedAccount';
  const GOOD_KEY = 'zoo.account.v2';
  const AUTH_KEY = 'zoo.auth';
  const GOOD_VERSION = 2;
  const TTL_MS = 60000;

  const badStore = document.getElementById('badStore');
  const badOrders = document.getElementById('badOrders');
  const goodStore = document.getElementById('goodStore');
  const goodOrders = document.getElementById('goodOrders');

  function showBadStore() {
    badStore.textContent = 'localStorage["selectedAccount"] = ' + (localStorage.getItem(BAD_KEY) || '(unset)');
  }
  function showGoodStore() {
    goodStore.textContent = 'storage = ' + (localStorage.getItem(GOOD_KEY) || '(unset)');
  }

  function fetchOrders(accountId) {
    return fetch('/api/accounts/' + encodeURIComponent(accountId) + '/orders')
      .then(function (r) { return r.ok ? r.json() : null; });
  }
  function renderOrders(el, accountName, orders) {
    if (!orders || !orders.length) { el.textContent = '(no orders for "' + accountName + '")'; return; }
    el.textContent = 'Orders for "' + accountName + '": ' + orders.map(function (o) { return o.id; }).join(', ');
  }

  /* ===================== BAD ===================== */
  // Writer: raw object, no version, no expiry, no owner.
  document.querySelectorAll('[data-bad="pick"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const val = { id: btn.dataset.id, name: btn.dataset.name };
      localStorage.setItem(BAD_KEY, JSON.stringify(val));
      localStorage.setItem(AUTH_KEY, JSON.stringify({ user: 'USR-1' }));
      log.info('account-picker/bad', 'WRITE selectedAccount', val);
      showBadStore();
    });
  });

  document.querySelector('[data-bad="v1"]').addEventListener('click', function () {
    const val = { account: 'ACC-A' }; // old shape: ".account", not ".id"
    localStorage.setItem(BAD_KEY, JSON.stringify(val));
    log.warn('account-picker/bad', 'WRITE legacy v1 shape', val);
    showBadStore();
  });

  document.querySelector('[data-bad="corrupt"]').addEventListener('click', function () {
    localStorage.setItem(BAD_KEY, 'not json{');
    log.warn('account-picker/bad', 'WRITE corrupt value', 'not json{');
    showBadStore();
  });

  // Bad logout: only clears auth, forgets selectedAccount -> ghost session.
  document.querySelector('[data-bad="logout"]').addEventListener('click', function () {
    localStorage.removeItem(AUTH_KEY);
    log.warn('portal/bad', 'LOGOUT (auth only — selectedAccount left behind)');
    showBadStore();
  });

  // Reader: parses with NO try/catch, assumes .id exists.
  document.querySelector('[data-bad="read"]').addEventListener('click', function () {
    const raw = localStorage.getItem(BAD_KEY);
    log.info('orders-viewer/bad', 'READ selectedAccount', raw);
    const parsed = JSON.parse(raw);                 // <-- throws on corrupt value
    const accountId = parsed.id;                    // <-- undefined for v1 shape
    log.info('orders-viewer/bad', 'ASSUME shape', { accountId: accountId, name: parsed.name });
    fetchOrders(accountId).then(function (orders) {
      renderOrders(badOrders, parsed.name || '(unknown)', orders);
    });
  });

  /* ===================== BETTER ===================== */
  function writeGood(accountId, name, expiresAt) {
    const envelope = {
      version: GOOD_VERSION,
      owner: 'account-picker',
      ts: Date.now(),
      expiresAt: expiresAt,
      data: { id: accountId, name: name }
    };
    localStorage.setItem(GOOD_KEY, JSON.stringify(envelope));
    return envelope;
  }

  document.querySelectorAll('[data-good="pick"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const env = writeGood(btn.dataset.id, btn.dataset.name, Date.now() + TTL_MS);
      localStorage.setItem(AUTH_KEY, JSON.stringify({ user: 'USR-1' }));
      log.info('account-picker/better', 'WRITE envelope v' + GOOD_VERSION, env.data);
      showGoodStore();
    });
  });

  document.querySelector('[data-good="expire"]').addEventListener('click', function () {
    const env = writeGood('ACC-A', 'Mission Pharmacy', Date.now() - 1000); // already expired
    log.warn('account-picker/better', 'WRITE already-expired envelope', { expiresAt: env.expiresAt });
    showGoodStore();
  });

  document.querySelector('[data-good="corrupt"]').addEventListener('click', function () {
    localStorage.setItem(GOOD_KEY, '}{garbage');
    log.warn('account-picker/better', 'WRITE corrupt value', '}{garbage');
    showGoodStore();
  });

  // Better logout: clear ALL zoo.* keys.
  document.querySelector('[data-good="logout"]').addEventListener('click', function () {
    Object.keys(localStorage).filter(function (k) { return k.indexOf('zoo.') === 0; })
      .forEach(function (k) { localStorage.removeItem(k); });
    log.info('portal/better', 'LOGOUT (cleared all zoo.* keys)');
    showGoodStore();
  });

  // Reader: defensive parse + version check + expiry check.
  document.querySelector('[data-good="read"]').addEventListener('click', function () {
    const raw = localStorage.getItem(GOOD_KEY);
    log.info('orders-viewer/better', 'READ envelope', raw);
    if (!raw) { goodOrders.textContent = 'No account selected. Please choose one.'; return; }

    let env;
    try {
      env = JSON.parse(raw);
    } catch (e) {
      goodOrders.textContent = '⚠ Stored value was corrupt — ignoring it (defensive parse).';
      log.error('orders-viewer/better', 'PARSE_FAILED, ignored safely', { error: String(e) });
      return;
    }
    if (!env || env.version !== GOOD_VERSION) {
      goodOrders.textContent = '⚠ Unsupported storage version — ignoring. Please re-select.';
      log.warn('orders-viewer/better', 'VERSION_MISMATCH', { got: env && env.version, want: GOOD_VERSION });
      return;
    }
    if (!env.expiresAt || env.expiresAt < Date.now()) {
      goodOrders.textContent = '⚠ Selection expired — please choose your account again.';
      log.warn('orders-viewer/better', 'EXPIRED', { expiresAt: env.expiresAt });
      return;
    }
    log.info('orders-viewer/better', 'VALID selection', env.data);
    fetchOrders(env.data.id).then(function (orders) {
      renderOrders(goodOrders, env.data.name, orders);
    });
  });

  /* ===================== reset ===================== */
  document.querySelector('[data-reset]').addEventListener('click', function () {
    [BAD_KEY, GOOD_KEY, AUTH_KEY].forEach(function (k) { localStorage.removeItem(k); });
    Object.keys(localStorage).filter(function (k) { return k.indexOf('zoo.') === 0; })
      .forEach(function (k) { localStorage.removeItem(k); });
    badOrders.textContent = 'No orders loaded.';
    goodOrders.textContent = 'No orders loaded.';
    showBadStore();
    showGoodStore();
    log.clear();
  });

  showBadStore();
  showGoodStore();
})();
