/*
 * Shared event-log component for every exhibit.
 *
 * This is the whole point of the "observability-lite" requirement: a single
 * place that makes the otherwise-invisible coupling between apps visible.
 * Every exhibit's script logs cross-boundary actions here.
 *
 * Usage:
 *   const log = ZooLog.attach('#log');         // wire up a .logpanel element
 *   log.info('portal', 'IFRAME_LOAD', { src }, { cid });
 *   log.warn('orders-app', 'BAD_ORIGIN', { from });
 *   log.error('portal', 'TIMEOUT', { ms: 3000 }, { cid });
 *   log.clear();
 */
(function (global) {
  function pad(n) { return String(n).padStart(2, '0'); }

  function stamp() {
    const d = new Date();
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
      + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  function preview(payload) {
    if (payload === undefined || payload === null) return '';
    try {
      const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
      return s.length > 200 ? s.slice(0, 200) + '…' : s;
    } catch (e) {
      return '[unserializable payload]';
    }
  }

  function attach(selector) {
    const panel = typeof selector === 'string' ? document.querySelector(selector) : selector;
    const body = panel.querySelector('.logbody');
    const empty = body.querySelector('.empty-log');

    function row(level, actor, type, payload, opts) {
      opts = opts || {};
      if (empty) empty.remove();
      const el = document.createElement('div');
      el.className = 'logrow level-' + level;

      const ts = document.createElement('span');
      ts.className = 'ts';
      ts.textContent = stamp();

      const act = document.createElement('span');
      act.className = 'actor';
      act.textContent = '[' + actor + ']';

      const msg = document.createElement('span');
      let text = type;
      if (opts.cid) text += ' cid=' + opts.cid;
      const pv = preview(payload);
      if (pv) text += ' ' + pv;
      msg.textContent = text;

      el.appendChild(ts);
      el.appendChild(act);
      el.appendChild(msg);
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    const api = {
      info: function (actor, type, payload, opts) { return row('info', actor, type, payload, opts); },
      warn: function (actor, type, payload, opts) { return row('warn', actor, type, payload, opts); },
      error: function (actor, type, payload, opts) { return row('error', actor, type, payload, opts); },
      clear: function () {
        body.innerHTML = '<div class="empty-log">No events yet. Run the demo above.</div>';
      }
    };

    const clearBtn = panel.querySelector('[data-log-clear]');
    if (clearBtn) clearBtn.addEventListener('click', api.clear);
    return api;
  }

  global.ZooLog = { attach: attach, newCid: function () {
    return Math.random().toString(36).slice(2, 8);
  } };
})(window);
