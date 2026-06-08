/* Exhibit 3 — Global Window Event Bus. */
(function () {
  const log = ZooLog.attach('#log');
  const badInvoice = document.getElementById('badInvoice');
  const goodInvoice = document.getElementById('goodInvoice');

  /* ===================== BAD ===================== */
  // Raw window events with ad-hoc names. Each "Add listener" click registers
  // ANOTHER anonymous handler, so the side effect runs once per listener.
  let badInvoiceCount = 0;
  let badListenerCount = 0;

  function addBadListener() {
    // Anonymous handler — note we keep no reference, so we can't removeEventListener it.
    window.addEventListener('orderSelected', function (e) {
      badInvoiceCount++;
      badInvoice.textContent = 'Invoices generated this selection: ' + badInvoiceCount;
      log.warn('invoice-app/bad', 'GENERATE_INVOICE (duplicate side effect)', { orderId: e.detail.orderId });
    });
    badListenerCount++;
    log.info('invoice-app/bad', 'addEventListener("orderSelected")', { totalListeners: badListenerCount });
  }

  document.querySelector('[data-bad="add"]').addEventListener('click', addBadListener);

  document.querySelector('[data-bad="remove"]').addEventListener('click', function () {
    // There's nothing to pass to removeEventListener — the handlers were anonymous.
    log.error('invoice-app/bad', 'removeEventListener FAILED — no handler reference to remove');
  });

  document.querySelector('[data-bad="publish"]').addEventListener('click', function () {
    badInvoiceCount = 0;
    badInvoice.textContent = 'Invoices generated this selection: 0';
    log.info('orders-app/bad', 'dispatchEvent("orderSelected")', { orderId: 'ORD-10001' });
    window.dispatchEvent(new CustomEvent('orderSelected', { detail: { orderId: 'ORD-10001' } }));
    if (badListenerCount === 0) {
      log.warn('orders-app/bad', 'No listeners heard it (nobody subscribed yet)');
    }
  });

  document.querySelector('[data-bad="publish-typo"]').addEventListener('click', function () {
    // The other team named it differently. Same intent, different string -> silent miss.
    log.info('orders-app/bad', 'dispatchEvent("order_selected")  <-- different name!', { orderId: 'ORD-10001' });
    window.dispatchEvent(new CustomEvent('order_selected', { detail: { orderId: 'ORD-10001' } }));
    log.warn('bus', 'Event "order_selected" had no listeners — silent miss');
  });

  /* ===================== BETTER ===================== */
  // A tiny namespaced registry: documented event names, dedup by owner,
  // unsubscribe handles, and payload validation.
  const ZooBus = (function () {
    const EVENTS = { ORDER_SELECTED: 'orders:order-selected' };
    const validators = {
      'orders:order-selected': function (p) { return p && typeof p.orderId === 'string'; }
    };
    const listeners = {}; // event -> [ {owner, fn} ]

    function subscribe(event, owner, fn) {
      listeners[event] = listeners[event] || [];
      if (listeners[event].some(function (l) { return l.owner === owner; })) {
        log.warn('zoo-bus', 'DUPLICATE listener rejected', { event: event, owner: owner });
        return function () {}; // no-op unsubscribe
      }
      const entry = { owner: owner, fn: fn };
      listeners[event].push(entry);
      log.info('zoo-bus', 'subscribe', { event: event, owner: owner });
      return function unsubscribe() {
        listeners[event] = (listeners[event] || []).filter(function (l) { return l !== entry; });
        log.info('zoo-bus', 'unsubscribe', { event: event, owner: owner });
      };
    }

    function publish(event, payload) {
      const validate = validators[event];
      if (validate && !validate(payload)) {
        log.error('zoo-bus', 'PAYLOAD REJECTED (failed schema)', { event: event, payload: payload });
        return;
      }
      const ls = listeners[event] || [];
      log.info('zoo-bus', 'publish', { event: event, listeners: ls.length, payload: payload });
      ls.forEach(function (l) { l.fn(payload); });
    }

    return { EVENTS: EVENTS, subscribe: subscribe, publish: publish };
  })();

  let goodInvoiceCount = 0;
  let unsubInvoice = null;

  document.querySelector('[data-good="add"]').addEventListener('click', function () {
    const unsub = ZooBus.subscribe(ZooBus.EVENTS.ORDER_SELECTED, 'invoice-app', function (p) {
      goodInvoiceCount++;
      goodInvoice.textContent = 'Invoices generated this selection: ' + goodInvoiceCount;
      log.info('invoice-app/better', 'GENERATE_INVOICE', { orderId: p.orderId });
    });
    if (!unsubInvoice) unsubInvoice = unsub; // keep the first real handle
  });

  document.querySelector('[data-good="remove"]').addEventListener('click', function () {
    if (unsubInvoice) { unsubInvoice(); unsubInvoice = null; }
    else log.info('invoice-app/better', 'nothing subscribed');
  });

  document.querySelector('[data-good="publish"]').addEventListener('click', function () {
    goodInvoiceCount = 0;
    goodInvoice.textContent = 'Invoices generated this selection: 0';
    ZooBus.publish(ZooBus.EVENTS.ORDER_SELECTED, { orderId: 'ORD-10001' });
  });

  document.querySelector('[data-good="publish-bad"]').addEventListener('click', function () {
    ZooBus.publish(ZooBus.EVENTS.ORDER_SELECTED, { ordrId: 'typo-key' }); // wrong shape
  });

  /* ===================== reset ===================== */
  document.querySelector('[data-reset]').addEventListener('click', function () {
    // Note: the bad anonymous listeners genuinely leak until page reload — that's the point.
    badInvoiceCount = 0; goodInvoiceCount = 0;
    badInvoice.textContent = 'Invoices generated this selection: 0';
    goodInvoice.textContent = 'Invoices generated this selection: 0';
    if (unsubInvoice) { unsubInvoice(); unsubInvoice = null; }
    log.clear();
    log.warn('exhibit', 'Reset. (Bad anonymous listeners leak until you reload the page — that is the lesson.)');
  });
})();
