/* Exhibit 10 — Runtime-Origin Confusion. */
(function () {
  const log = ZooLog.attach('#log');
  const main = document.querySelector('main');
  const CHILD_ORIGIN = main.dataset.childOrigin;   // from server config
  const PORTAL_ORIGIN = main.dataset.portalOrigin;
  const ALLOWED_ORIGINS = [CHILD_ORIGIN];           // explicit allowlist
  const TIMEOUT_MS = 1500;

  const frame = document.getElementById('childFrame');
  frame.src = CHILD_ORIGIN + '/child/orders-messaging';

  // Diagnostics: make the runtime origin reality visible.
  const sameOrigin = (PORTAL_ORIGIN === CHILD_ORIGIN);
  document.getElementById('diag').innerHTML =
    'page origin = <strong>' + location.origin + '</strong> · configured child origin = <strong>'
    + CHILD_ORIGIN + '</strong> — '
    + (sameOrigin
        ? 'same origin (dev-like).'
        : '⚠ <span style="color:var(--bad)">different origins (prod-like): same-origin assumptions will break here.</span>');
  log.info('diagnostics', 'runtime origins', { page: location.origin, child: CHILD_ORIGIN, sameOrigin: sameOrigin });

  const badOut = document.getElementById('badOut');
  const goodOut = document.getElementById('goodOut');

  /* ===================== BAD ===================== */
  document.querySelector('[data-bad="send"]').addEventListener('click', function () {
    badOut.textContent = 'Sent. Waiting…';
    // The bug: assumes the child lives at the portal's own origin.
    log.warn('portal/bad', 'postMessage with targetOrigin = location.origin', { targetOrigin: location.origin });
    frame.contentWindow.postMessage({ orderId: 'ORD-10001' }, location.origin);
    // Bad receive: rejects anything not from our own origin (so the real child is rejected).
    setTimeout(function () {
      badOut.textContent = '⚠ No reply. The message was dropped (targetOrigin ' + location.origin
        + ' ≠ child origin ' + CHILD_ORIGIN + ').';
      log.error('portal/bad', 'no reply — browser dropped the cross-origin message silently');
    }, TIMEOUT_MS);
  });

  /* ===================== BETTER ===================== */
  document.querySelector('[data-good="send"]').addEventListener('click', function () {
    goodOut.textContent = 'Sent. Waiting…';
    log.info('portal/better', 'postMessage with configured child origin', { targetOrigin: CHILD_ORIGIN });
    frame.contentWindow.postMessage({ orderId: 'ORD-10001' }, CHILD_ORIGIN);
  });

  document.querySelector('[data-good="spoof"]').addEventListener('click', function () {
    // Deliver a reply that appears to come from the page's own origin (not the child).
    window.postMessage({ order: { id: 'ORD-10001' }, _fakeFrom: PORTAL_ORIGIN }, '*');
  });

  // Better receive: validate against the explicit allowlist, with a clear diagnostic.
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (!m || !m.order) return;
    if (ALLOWED_ORIGINS.indexOf(e.origin) === -1) {
      goodOut.textContent = '⚠ Reply from unexpected origin "' + e.origin
        + '" rejected (allowlist: ' + ALLOWED_ORIGINS.join(', ') + ').';
      log.error('portal/better', 'ORIGIN MISMATCH diagnostic', { got: e.origin, allowed: ALLOWED_ORIGINS });
      return;
    }
    goodOut.textContent = '✓ Order ' + m.order.id + ' received from verified origin ' + e.origin;
    log.info('portal/better', 'reply accepted from allowlisted origin', { origin: e.origin });
  });

  /* ===================== reset ===================== */
  document.querySelector('[data-reset]').addEventListener('click', function () {
    badOut.textContent = 'No response yet.';
    goodOut.textContent = 'No response yet.';
    log.clear();
  });
})();
