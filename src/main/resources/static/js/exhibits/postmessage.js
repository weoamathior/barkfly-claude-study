/* Exhibit 2 — postMessage Communication. */
(function () {
  const log = ZooLog.attach('#log');
  const main = document.querySelector('main');
  const CHILD_ORIGIN = main.dataset.childOrigin;
  const PORTAL_ORIGIN = main.dataset.portalOrigin;
  const TIMEOUT_MS = 3000;

  const frame = document.getElementById('childFrame');
  frame.src = CHILD_ORIGIN + '/child/orders-messaging';

  const orderSelect = document.getElementById('orderSelect');
  const badOut = document.getElementById('badOut');
  const goodOut = document.getElementById('goodOut');
  const tDrop = document.getElementById('tDrop');
  const tGarbage = document.getElementById('tGarbage');

  function fmtOrder(o) {
    if (!o) return '(order not found)';
    return o.id + ' · ' + o.status + ' · ' + o.total + ' · account ' + o.accountId;
  }

  /* ============ BAD: trusts everything ============ */
  // Send: wildcard targetOrigin, no type, no correlation id.
  document.querySelector('[data-bad="request"]').addEventListener('click', function () {
    const orderId = orderSelect.value;
    log.info('portal/bad', 'SEND', { orderId: orderId, targetOrigin: '*' });
    frame.contentWindow.postMessage({ orderId: orderId }, '*'); // <-- wildcard: don't do this
  });

  // The "attacker": posts a message into this window from the PORTAL origin
  // (not the child). A handler that checks origin would reject it.
  document.querySelector('[data-bad="spoof"]').addEventListener('click', function () {
    const fake = { order: { id: 'ORD-66666', status: 'SHIPPED', total: '$0.00', accountId: 'ATTACKER', lines: ['gift cards x999'] } };
    log.warn('attacker-page', 'SPOOFED_MESSAGE', { fromOrigin: PORTAL_ORIGIN });
    window.postMessage(fake, '*');
  });

  // Bad receive handler: no origin check, no schema, no correlation.
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (!m || !m.order) return;           // only thing it checks: "is there an order?"
    // NOTE: no e.origin check at all — this is the vulnerability.
    badOut.textContent = '✓ Order: ' + fmtOrder(m.order) + '   (origin: ' + e.origin + ', accepted blindly)';
    log.info('portal/bad', 'RECEIVE_ACCEPTED', { order: m.order.id, origin: e.origin });
  });

  /* ============ BETTER: typed envelope + validation ============ */
  const pending = new Map(); // correlationId -> { timer, orderId }

  document.querySelector('[data-good="request"]').addEventListener('click', function () {
    const orderId = orderSelect.value;
    const cid = ZooLog.newCid();
    const envelope = {
      type: 'ORDER_DETAILS_REQUEST',
      version: '1.0',
      correlationId: cid,
      source: 'unified-portal',
      payload: { orderId: orderId, simulateDrop: tDrop.checked, sendGarbage: tGarbage.checked }
    };

    const timer = setTimeout(function () {
      if (!pending.has(cid)) return;
      pending.delete(cid);
      goodOut.textContent = '⚠ Timed out after ' + TIMEOUT_MS + 'ms waiting for ' + orderId;
      goodOut.style.color = 'var(--bad)';
      log.error('portal/better', 'TIMEOUT', { orderId: orderId, ms: TIMEOUT_MS }, { cid: cid });
    }, TIMEOUT_MS);
    pending.set(cid, { timer: timer, orderId: orderId });

    log.info('portal/better', 'SEND ORDER_DETAILS_REQUEST', { orderId: orderId, targetOrigin: CHILD_ORIGIN }, { cid: cid });
    frame.contentWindow.postMessage(envelope, CHILD_ORIGIN); // <-- explicit target origin
  });

  // Better receive handler: validate origin, schema, and correlation id.
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (!m || m.type !== 'ORDER_DETAILS_RESULT') return; // only our typed replies

    // 1) origin allowlist
    if (e.origin !== CHILD_ORIGIN) {
      log.warn('portal/better', 'REJECTED_BAD_ORIGIN', { origin: e.origin }, { cid: m.correlationId });
      return;
    }
    // 2) correlation id must match an outstanding request
    if (!m.correlationId || !pending.has(m.correlationId)) {
      log.warn('portal/better', 'REJECTED_UNKNOWN_CID', { cid: m.correlationId });
      return;
    }
    // 3) schema validation of the payload
    const ok = m.version === '1.0' && m.payload && typeof m.payload === 'object' && m.payload.order;
    const entry = pending.get(m.correlationId);
    clearTimeout(entry.timer);
    pending.delete(m.correlationId);

    if (!ok) {
      goodOut.textContent = '⚠ Reply failed schema validation (payload was not a valid order).';
      goodOut.style.color = 'var(--bad)';
      log.error('portal/better', 'SCHEMA_REJECTED', { payload: m.payload }, { cid: m.correlationId });
      return;
    }
    goodOut.style.color = '';
    goodOut.textContent = '✓ Order: ' + fmtOrder(m.payload.order) + '   (origin verified: ' + e.origin + ')';
    log.info('portal/better', 'RECEIVE_VALIDATED', { order: m.payload.order.id }, { cid: m.correlationId });
  });

  document.querySelector('[data-reset]').addEventListener('click', function () {
    pending.forEach(function (v) { clearTimeout(v.timer); });
    pending.clear();
    badOut.textContent = 'No order loaded.';
    goodOut.textContent = 'No order loaded.';
    goodOut.style.color = '';
    tDrop.checked = false;
    tGarbage.checked = false;
    log.clear();
  });
})();
