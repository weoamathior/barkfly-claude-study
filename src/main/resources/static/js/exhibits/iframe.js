/* Exhibit 1 — Portal Shell + Iframe. */
(function () {
  const log = ZooLog.attach('#log');
  const CHILD_ORIGIN = document.querySelector('main').dataset.childOrigin;
  const READY_TIMEOUT_MS = 5000;

  const badFrame = document.getElementById('badFrame');
  const badStatus = document.getElementById('badStatus');
  const goodFrame = document.getElementById('goodFrame');
  const goodSpinner = document.getElementById('goodSpinner');
  const goodError = document.getElementById('goodError');

  function scenario() {
    return document.querySelector('input[name="scenario"]:checked').value;
  }

  // Build the child URL for the current scenario.
  function childUrl() {
    const base = CHILD_ORIGIN + '/child/orders';
    switch (scenario()) {
      case 'slow': return base + '?slow=2500';
      case 'fail': return base + '?boom=1';
      default: return base;
    }
  }

  /* ---------------- BAD wrapper ----------------
     Just sets src. No onload, no onerror, no timeout, fixed height. When the
     child 500s or hangs, the user gets a blank frame and zero feedback. */
  document.querySelector('[data-bad="load"]').addEventListener('click', function () {
    const url = childUrl();
    badFrame.src = url;
    badStatus.textContent = 'src set to ' + url + ' (and then we just… hope)';
    log.info('portal/bad-wrapper', 'IFRAME_SRC_SET', { src: url });
    // Note: no further logging — the bad wrapper has no idea what happens next.
  });

  /* ---------------- BETTER wrapper ----------------
     Spinner -> wait for CHILD_READY from the allowed origin -> loaded, with a
     timeout that catches 500s and slow-loris loads. */
  let pendingTimer = null;
  let waitingForReady = false;

  function resetGoodUi() {
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
    waitingForReady = false;
    goodFrame.style.display = 'none';
    goodError.style.display = 'none';
    goodSpinner.style.display = 'none';
  }

  document.querySelector('[data-good="load"]').addEventListener('click', function () {
    resetGoodUi();
    const url = childUrl();
    goodSpinner.style.display = 'block';
    waitingForReady = true;
    log.info('portal/better-wrapper', 'IFRAME_LOAD_START', { src: url, timeoutMs: READY_TIMEOUT_MS });
    goodFrame.src = url;

    pendingTimer = setTimeout(function () {
      if (!waitingForReady) return;
      waitingForReady = false;
      goodSpinner.style.display = 'none';
      goodError.style.display = 'block';
      goodError.textContent = '⚠ Legacy app failed to load (no CHILD_READY within '
        + READY_TIMEOUT_MS + 'ms). Showing a real error instead of a blank frame.';
      log.error('portal/better-wrapper', 'LOAD_TIMEOUT', { src: url, ms: READY_TIMEOUT_MS });
    }, READY_TIMEOUT_MS);
  });

  // The only message this exhibit cares about: the child's readiness handshake.
  window.addEventListener('message', function (event) {
    const data = event.data;
    if (!data || data.type !== 'CHILD_READY') return;

    // Real origin validation — the child is served from :8081.
    if (event.origin !== CHILD_ORIGIN) {
      log.warn('portal/better-wrapper', 'READY_FROM_BAD_ORIGIN', { origin: event.origin });
      return;
    }
    if (!waitingForReady) return; // late/duplicate ready, ignore

    waitingForReady = false;
    if (pendingTimer) { clearTimeout(pendingTimer); pendingTimer = null; }
    goodSpinner.style.display = 'none';
    goodError.style.display = 'none';
    goodFrame.style.display = 'block';
    log.info('legacy-orders-app', 'CHILD_READY', { source: data.source }, {});
    log.info('portal/better-wrapper', 'IFRAME_LOADED', { origin: event.origin });
  });

  document.querySelector('[data-reset]').addEventListener('click', function () {
    badFrame.removeAttribute('src');
    badFrame.src = 'about:blank';
    badStatus.textContent = 'Nothing loaded.';
    goodFrame.src = 'about:blank';
    resetGoodUi();
    log.clear();
  });
})();
