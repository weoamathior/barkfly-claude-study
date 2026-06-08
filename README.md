# 🦓 Frontend Integration Zoo

A runnable learning lab of **enterprise frontend integration patterns** — the
"temporary" shortcuts that were born in 2014 and are load-bearing today. Each
exhibit lets you trigger the **bad** version, watch it break in a visible event
log, then flip to a **safer** version and watch it behave.

This is deliberately **not** a best-practices showcase. Bad code is labelled
bad and breaks on purpose, so a backend/architecture engineer can *feel* why
these patterns hurt and learn to recognize them in real code.

> Status: **all 10 exhibits live.** Optional bonus exhibits are still open — see
> [Suggested next experiments](#6-suggested-next-experiments).

---

## 1. Project purpose

Help an experienced backend engineer understand, viscerally, the pain senior
frontend engineers feel around legacy enterprise integration. After using the
lab you should be able to say: *"that's why this pattern hurts,"* recognize it
in production code, and ask sharper questions of frontend architects.

## 2. How to run

Requires **Java 21** (no separate install of Gradle needed — the wrapper is
included).

```bash
./gradlew bootRun
```

Then open the portal: **http://localhost:8080/**

The app starts a **single process that serves two origins**:

| Origin                  | Role                                   |
|-------------------------|----------------------------------------|
| `http://localhost:8080` | The "Unified Portal" shell (parent)    |
| `http://localhost:8081` | The embedded "legacy" / child apps     |

Two ports means your browser treats them as **genuinely different origins**, so
the cross-origin behavior in these exhibits (postMessage origin checks, CORS,
framing) is real — not faked. (See [Known limitations](#5-known-limitations).)

To run the verification suite (boots the full app in-process and checks every
route, page, and asset):

```bash
./gradlew test
```

## 3. Exhibit list

| # | Exhibit | Status |
|---|---------|--------|
| 1 | Portal Shell + Iframe Legacy App | ✅ live |
| 2 | `postMessage` Communication | ✅ live |
| 3 | Global Window Event Bus | ✅ live |
| 4 | Shared `localStorage` / `sessionStorage` | ✅ live |
| 5 | Query String Handoff | ✅ live |
| 6 | Click Interception / Fake Navigation | ✅ live |
| 7 | Shared Cookie / Session Illusion | ✅ live |
| 8 | Token Passing Anti-pattern | ✅ live |
| 9 | Iframe Security Headers / Clickjacking | ✅ live |
| 10 | Runtime-Origin Confusion | ✅ live |

## 4. What each exhibit teaches

### Exhibit 1 — Portal Shell + Iframe
A legacy orders app embedded in an iframe. The **bad** wrapper hardcodes the
`src`, is fixed at 120px (clips content), and has no load/error/timeout
handling — a backend 500 just shows a **silent blank frame**. The **better**
wrapper shows a visible app boundary, a spinner, and waits for a `CHILD_READY`
handshake from the *allowed origin* within a timeout, surfacing a real error
state on failure. *Teaches: iframes need an integration contract and explicit
load/error states, not hope.*

### Exhibit 2 — `postMessage` Communication
Parent ↔ iframe messaging. The **bad** version uses `postMessage(payload, '*')`,
accepts messages from any origin, and has no types, correlation IDs, or
timeouts — so an "attacker" message is accepted blindly. The **better** version
uses a typed envelope (`type`, `version`, `correlationId`, `source`, `payload`),
an origin allowlist, request/response correlation, a timeout, and schema
validation. *Teaches: `postMessage` is a network boundary — validate origin and
shape, correlate, and time out.*

### Exhibit 4 — Shared `localStorage`
Two "apps" (an Account Picker and an Orders Viewer) coupled through browser
storage. The **bad** version writes a raw `selectedAccount`, assumes its shape,
never expires it, and logs out by clearing only its own key — producing **ghost
sessions**, **wrong-account orders**, and **crashes on corrupt values**. The
**better** version uses a versioned envelope with an expiry, defensive parsing,
and clear-all-on-logout. *Teaches: storage-as-integration-bus is an implicit,
unversioned contract that drifts and goes stale.*

### Exhibit 3 — Global Window Event Bus
Apps coupled through `window` events. The **bad** version uses ad-hoc event
names (two teams pick different strings → silent misses, or the same string →
collisions), registers anonymous listeners (so adding one twice fires the side
effect twice — duplicate invoices — and they can't be removed). The **better**
version is a tiny namespaced registry with documented event names, duplicate-
listener detection, real `unsubscribe()` handles, and payload validation.
*Teaches: a global event bus without ownership and a schema is an undocumented
contract that collides and leaks.*

### Exhibit 5 — Query String Handoff
Passing context between apps via the URL. The **bad** version puts the account,
role, and a fake token straight in the query string (leaks into history/logs),
breaks on an unencoded `&`, and lets a copied URL **replay** stale context
forever. The **better** version POSTs the context to a server-side store and
passes only an **opaque, single-use, 30s** handoff id. *Teaches: URLs are not a
secure or durable transport for context.*

### Exhibit 6 — Click Interception / Fake Navigation
Making several apps feel like one. The **bad** version intercepts every link
click and swaps content without touching the URL — so the back button leaves the
whole portal, breadcrumbs lie, and open-in-new-tab does nothing. The **better**
version uses real `<a href>` links plus the History API: the URL reflects the
view, breadcrumbs update, back/forward work, and new-tab works. *Teaches:
navigation belongs to the URL and history, not to a click interceptor.*

### Exhibit 7 — Shared Cookie / Session Illusion
Assuming one shared login. The **bad** version trusts the portal's own session
and never checks the child, so when the child session expires the UI shows
stale data and "succeeds" at actions that are actually unauthorized (zombie UI);
logout logs out only one app. The **better** version polls an explicit child
session-status endpoint, shows a re-auth prompt on expiry, and broadcasts logout
to all apps with an acknowledgement. *Teaches: separate apps have separate
sessions — verify, don't assume.*

### Exhibit 8 — Token Passing Anti-pattern
Propagating identity to a child app. The **bad** version puts a token in the
URL, in `localStorage`, and in the console, and lets the child trust a
client-supplied `role` (so anyone can become ADMIN by editing a query param).
The **better** version uses a backend-for-frontend that issues an opaque session
id and returns only minimal context, with the **role enforced server-side** —
the client cannot escalate. *Teaches: never trust client-supplied authorization;
keep tokens out of URLs and JS-readable storage.*

### Exhibit 9 — Iframe Security Headers / Clickjacking
Where integration and security collide. The **bad** version embeds an
unprotected page and overlays a deceptive UI (a simulated clickjack). The
**better** version shows real `frame-ancestors` / `X-Frame-Options` enforcement:
an allowlisted page (naming the portal origin) embeds fine, while a denied page
is genuinely refused by your browser. *Teaches: the safe answer is an explicit
embedding allowlist, not "deny everything" or "allow anything."* (Header
enforcement is **real**; the attacker overlay is **simulated** — see below.)

### Exhibit 10 — Runtime-Origin Confusion
"Works on my machine." The **bad** version assumes the child shares the portal's
origin (`postMessage(..., location.origin)`), which passes every local test but
silently drops messages in prod where the apps are on different origins. The
**better** version takes origins from config, validates replies against an
explicit allowlist, and emits a clear diagnostic on mismatch. *Teaches: never
infer another app's origin from your own — configure it.*

Every exhibit has an **Event Log** panel (timestamp · actor app · event type ·
correlation id · payload preview · warning/error level) that makes the
otherwise-invisible coupling between apps visible.

## 5. Known limitations

- **Two ports ≈ two origins (real), but not two deployments**: it's one Spring
  Boot process with a second Tomcat connector. Real distinct origins for the
  browser, but they share server-side memory — fine for the exhibits, but don't
  read it as a true multi-app topology.
- **Simulated vs real**: cross-origin behavior (postMessage origins, CORS) and
  the framing headers in Exhibit 9 (`frame-ancestors`, `X-Frame-Options`) are
  **real** — your browser actually enforces them. What's **simulated**: the
  clickjacking *overlay* in Exhibit 9 (shown semi-transparent for safety rather
  than as a real invisible-iframe attack), the BFF "session id in JSON" (a real
  app would use an httpOnly cookie), and the `?slow=` server delay.
- All auth/session/token/account data is **fake** and clearly labelled. No real
  secrets, tokens, or company names.
- Server session/handoff/BFF state is **in-memory and global** to the process
  (single demo user) — restart to fully reset, or use each exhibit's Reset.
- `localStorage` is shared per-origin in your browser; use the **Reset** button
  (or the exhibit's logout) to clear state between runs.

## 6. Suggested next experiments

- Add the optional bonus exhibits: spinner-forever, zombie UI, an
  account-selection vs child-init **race condition**, multiple tabs fighting
  over shared storage, and popup-blocked / `window.opener` weirdness.
- Try opening an exhibit's child app directly on `:8081` and compare behavior
  when it's *not* framed.
- Split the child apps onto a genuinely different host/port via
  `zoo.child-origin` / `zoo.child-port` and watch the origin-confusion and
  CORS exhibits react.

## 7. How to use this lab

1. Open an exhibit from the dashboard.
2. Read **"Why enterprises do this"** and **"Why it hurts."**
3. Follow the **Scripted walkthrough** top to bottom: trigger the bad behavior
   first and watch the **Event Log**, then flip to the better version.
4. Toggle the failure scenarios (slow load, backend 500, dropped response,
   malformed reply, expired storage…) and watch how the two versions diverge.
5. Hit **Reset** before the next exhibit.

## 8. How to recognize this pattern in real enterprise code

- **Iframe**: a hardcoded `src`, fixed pixel height, and zero `onload`/`onerror`
  handling. No agreed handshake between parent and child. "Open in new tab" or
  the back button behaves oddly.
- **postMessage**: `postMessage(data, '*')`, a `message` listener with **no
  `event.origin` check**, stringly-typed payloads, and no request/response
  correlation. Console logs full of untyped traffic.
- **Shared storage**: a bare `localStorage` key like `selectedAccount` read in
  one app and written in another, `JSON.parse` with no `try/catch`, no version
  field, no expiry, and a logout that clears only some keys.
- **General smell**: integration contracts that live in tribal knowledge and
  comments ("don't change this key") rather than a typed, versioned, validated
  boundary.

---

## Architecture summary

- **Java 21 + Spring Boot 3.3 + Thymeleaf + vanilla JS.** No frontend framework.
- One process, **two Tomcat connectors** (`SecondConnectorConfig`) → real
  `:8080` (portal) and `:8081` (child) origins.
- Server state is in-memory and fake (`FakeData`): 2 accounts (Mission Pharmacy,
  Valley Hospital), a handful of orders/invoices/packing slips, 2 users.
- Each exhibit is isolated: one controller route, one Thymeleaf template under
  `templates/exhibits/`, one script under `static/js/exhibits/`.
- A single shared event-log component (`static/js/log.js`) backs every exhibit's
  log panel.

```
src/main/java/com/zoo/
  ZooApplication.java
  config/   SecondConnectorConfig (configurable child port), ZooProperties (origins/port)
  data/     Models (records), FakeData
  store/    HandoffStore (ex5), SessionStore (ex7)
  web/      HomeController, ExhibitsController, ChildAppController, FrameController (ex9), Exhibit (catalog)
  web/api/  DataApiController, HandoffController (ex5), SessionController (ex7), BffController (ex8)
src/main/resources/
  templates/  home.html, fragments/layout.html, exhibits/* (10), childapps/*
  static/     css/zoo.css, js/log.js, js/exhibits/* (10)
src/test/java/com/zoo/SmokeTest.java   # boots the app on 18080/18081, asserts the surface
```

### Backend endpoints used by the exhibits

- `GET /api/accounts`, `/api/accounts/{id}/orders`, `/api/orders/{id}` — fake domain.
- `POST /api/handoff` → opaque id; `GET /api/handoff/{id}` → single-use, 30s TTL (ex5).
- `GET/POST /api/session/{status,login,logout,expire,reset}?app=portal|child` (ex7).
- `POST /api/bff/session?user=…`, `GET /api/bff/context/{sid}`, `GET /api/bff/admin/{sid}` (ex8).
- `GET /frame/{unprotected,protected,blocked}` — real framing headers (ex9).

## Shortcuts taken

- The `slow` knob sleeps a request thread (capped at 15s) rather than modelling
  real backpressure.
- The "attacker" in Exhibits 2/10 is a same-page `window.postMessage`, which is
  enough to demonstrate the missing origin check without a separate hostile
  origin.
- In-memory, global, single-demo-user server state (no persistence, no real
  auth). The BFF returns its opaque session id in JSON rather than an httpOnly
  cookie so the lab can show it.
- Records grouped in one `Models.java` for readability.
