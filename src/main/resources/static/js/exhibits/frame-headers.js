/* Exhibit 9 — Iframe Security Headers / Clickjacking. */
(function () {
  const log = ZooLog.attach('#log');
  const CHILD = document.querySelector('main').dataset.childOrigin;

  const badFrame = document.getElementById('badFrame');
  const attacker = document.getElementById('attacker');
  const goodFrame = document.getElementById('goodFrame');
  const goodStatus = document.getElementById('goodStatus');

  /* ===================== BAD ===================== */
  document.querySelector('[data-bad="load"]').addEventListener('click', function () {
    badFrame.src = CHILD + '/frame/unprotected';
    log.warn('portal/bad', 'embedded page with NO frame protection', { src: badFrame.src });
  });

  document.getElementById('overlay').addEventListener('change', function (e) {
    attacker.style.display = e.target.checked ? 'flex' : 'none';
    log.warn('attacker-page', e.target.checked
      ? 'overlay shown — decoy UI over the real "Confirm transfer" button'
      : 'overlay hidden');
  });

  /* ===================== BETTER ===================== */
  // We can't read cross-origin load success directly, but we can detect the
  // browser's framing refusal heuristically: a refused frame never fires a
  // useful load and its document stays inaccessible. We log expectations and
  // let the visible frame + devtools console tell the real story.
  function embed(path, expectation) {
    goodFrame.src = CHILD + path;
    goodStatus.textContent = expectation;
    log.info('portal/better', 'attempt embed', { src: goodFrame.src });
  }

  document.querySelector('[data-good="allow"]').addEventListener('click', function () {
    embed('/frame/protected',
      'Allowlisted: should render (portal origin is permitted by frame-ancestors).');
    log.info('portal/better', 'expected: ALLOWED (frame-ancestors names the portal)');
  });

  document.querySelector('[data-good="deny"]').addEventListener('click', function () {
    embed('/frame/blocked',
      'Denied: frame should stay BLANK — browser refused it (see console for the CSP error).');
    log.warn('portal/better', 'expected: BLOCKED by frame-ancestors \'none\' / X-Frame-Options DENY');
  });

  /* ===================== reset ===================== */
  document.querySelector('[data-reset]').addEventListener('click', function () {
    badFrame.src = 'about:blank';
    goodFrame.src = 'about:blank';
    attacker.style.display = 'none';
    document.getElementById('overlay').checked = false;
    goodStatus.textContent = '';
    log.clear();
  });
})();
