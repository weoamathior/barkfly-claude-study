
# Project: Frontend Integration Zoo — Enterprise Learning Lab

Build a runnable learning lab that demonstrates common enterprise frontend integration hacks, anti-patterns, and safer alternatives.

## Goal

Create a hands-on “frontend integration zoo” for an experienced backend / architecture-oriented engineer who wants to viscerally understand the pain senior frontend engineers feel when they encounter legacy enterprise frontend integration patterns.

This should not be a polished “best practices” demo. It should be a learning lab where things break in visible, memorable ways.

The user should walk away able to say:

- “Ah, that’s why this pattern hurts.”
- “I can now recognize this in production code.”
- “I can ask better questions of frontend architects.”
- “I can push back when deadline pressure creates a bad integration shortcut.”

## Tone

Neutral, practical, and fun.

Use an enterprise-flavored fake domain:
- unified portal
- customer accounts
- orders
- invoices
- packing slips
- product search
- support center
- admin app

No real company names or real data.

## Tech Stack

Preferred:

- Java 21
- Spring Boot
- Thymeleaf where server-side rendering helps demonstrate portal / iframe / navigation issues
- Simple vanilla JavaScript where possible
- Avoid heavyweight frontend frameworks unless a scenario specifically benefits from one
- Gradle or Maven, whichever is simpler
- Local runnable app
- Clear README

Use a light backend. This is not a full microservices project unless needed. Multiple Spring routes/controllers are fine. If useful, simulate multiple apps using different paths, ports, or origins.

## Core Structure

Create a web app with a home dashboard listing the zoo exhibits.

Each exhibit should include:

1. A short explanation:
   - What the pattern is
   - Why enterprises use it
   - Why it hurts
   - What a safer alternative looks like

2. A runnable demo:
   - Bad version
   - Better version

3. Toggles:
   - Enable / disable broken behavior
   - Enable / disable safer behavior
   - Show message logs or event traces
   - Simulate latency, missing auth, expired session, blocked iframe, or race condition when useful

4. Scripted walkthrough:
   - Step 1: click this
   - Step 2: observe what breaks
   - Step 3: toggle safer version
   - Step 4: observe improved behavior

## Required Exhibits

### 1. Portal Shell + Iframe Legacy App

Demonstrate a fake enterprise portal embedding a legacy order app in an iframe.

Bad version:
- iframe hardcoded URL
- no load failure handling
- no resize handling
- no clear ownership boundary
- broken back button behavior

Better version:
- iframe wrapper component
- explicit allowed origins
- visible app boundary
- load/error state
- documented integration contract

### 2. `postMessage` Communication

Demonstrate parent portal communicating with iframe app.

Bad version:
- accepts messages from any origin
- loosely typed message payloads
- no correlation ID
- no timeout
- no schema validation
- confusing console logs

Better version:
- origin validation
- typed message envelope
- correlation ID
- request/response pattern
- timeout handling
- visible message log

Example message envelope:

```json
{
  "type": "ORDER_SELECTED",
  "version": "1.0",
  "correlationId": "abc-123",
  "source": "legacy-orders-app",
  "payload": {
    "orderId": "ORD-10001"
  }
}
```

### 3. Global Window Event Bus

Demonstrate apps communicating through global browser events.

Bad version:

* random event names
* no ownership
* no documentation
* events collide
* duplicate listeners cause repeated actions

Better version:

* small event registry
* namespaced events
* unsubscribe behavior
* payload validation
* warning when duplicate listeners are registered

### 4. Shared `localStorage` / `sessionStorage`

Demonstrate multiple apps using browser storage as an integration contract.

Bad version:

* one app writes `selectedAccount`
* another app assumes shape/version
* stale data causes wrong account/order display
* logout does not clear all storage

Better version:

* versioned storage envelope
* expiration timestamp
* explicit ownership
* defensive parsing
* clear-on-logout behavior

### 5. Query String Handoff

Demonstrate passing context between apps through URL parameters.

Bad version:

* sensitive data in query string
* brittle parameter naming
* broken encoding
* copied URL replays old context

Better version:

* opaque handoff ID
* short-lived server-side handoff store
* validation and expiration
* clear error when handoff expires

### 6. Click Interception / Fake Navigation

Demonstrate the portal intercepting clicks and silently redirecting to another app while pretending the user stayed in one experience.

Bad version:

* hijacks anchor clicks
* changes iframe content without clear route change
* browser back button behaves strangely
* open-in-new-tab breaks

Better version:

* explicit navigation boundaries
* real links where possible
* documented route ownership
* breadcrumbs show app boundary
* back button behavior works predictably

### 7. Shared Cookie / Session Illusion

Demonstrate multiple embedded apps assuming shared session state.

Bad version:

* portal thinks user is logged in
* iframe app session is expired
* iframe silently shows login or blank page
* logout only logs out one app

Better version:

* explicit session check endpoint
* parent detects child auth failure
* user-facing reauth flow
* logout broadcast with acknowledgement

### 8. Token Passing Anti-pattern

Demonstrate insecure token propagation from parent app to child app.

Bad version:

* token passed in query string
* token stored in localStorage
* token logged to console
* child app trusts client-supplied role

Better version:

* backend-for-frontend issues scoped session
* no token in URL
* server validates authorization
* child app receives only minimal context

### 9. Iframe Security Headers / Clickjacking

Demonstrate why iframe embedding and frame protection collide.

Bad version:

* page can be framed by anything
* fake attacker page overlays the embedded app
* confusing clickjacking-style demo

Better version:

* simulated `frame-ancestors` / `X-Frame-Options` explanation
* allowlisted embedding
* visible explanation of why security policy and integration desire conflict

Since local demos may not fully enforce real production headers in all cases, explain clearly what is simulated versus real.

### 10. Runtime-Origin Confusion

Demonstrate local/dev/prod origin mismatch.

Bad version:

* code assumes same-origin
* works locally but fails when iframe served from different origin
* CORS or message origin mismatch

Better version:

* environment config
* allowed origin list
* explicit contract
* visible diagnostics when origin mismatch occurs

## Optional Bonus Exhibits

Add only if not too much:

* iframe load latency / spinner forever
* zombie UI: stale UI looks valid but backend context changed
* race condition between portal account selection and child app initialization
* multiple tabs fighting over shared storage
* popup blocked / window opener weirdness

## UI Requirements

Make the app pleasant but simple.

Each exhibit page should have:

* title
* “Why enterprises do this”
* “Why it hurts”
* “Bad demo”
* “Better demo”
* toggles
* scripted walkthrough
* visible log panel
* reset button

Use humor lightly. Examples:

* “This worked in QA.”
* “Temporary integration, born 2014, still in production.”
* “The back button has left the chat.”
* “Security exception approved by committee.”

## Observability-lite

Include a visible in-browser event log for each exhibit.

For each important action log:

* timestamp
* actor/app
* event type
* correlation ID if present
* payload preview
* warning/error if applicable

This is not full telemetry. It is just enough to make the hidden coupling visible.

## Backend Requirements

Use Spring Boot routes to simulate:

* portal shell
* legacy app
* support app
* admin app
* token/session endpoints
* handoff endpoint
* fake auth state
* fake account/order data

Include toggles either client-side or backed by simple server state.

No real auth provider. Simulate auth/session/token behavior with fake values and clear labels.

## Data Model

Use fake sample data:

* accounts
* users
* orders
* invoices
* packing slips

Keep it small and readable.

Example:

* Account A: “Mission Pharmacy”
* Account B: “Valley Hospital”
* Order ORD-10001
* Packing Slip PS-90001

## README Requirements

Create a strong README with:

1. Project purpose
2. How to run
3. Exhibit list
4. What each exhibit teaches
5. Known limitations
6. Suggested next experiments
7. “How to use this lab”
8. “How to recognize this pattern in real enterprise code”

## Engineering Requirements

* Keep code readable
* Prefer boring implementation over clever abstractions
* Comment the dangerous/bad code intentionally
* Mark bad examples clearly as bad
* Keep each exhibit isolated enough to study
* Do not build a production framework
* Do not over-engineer
* Avoid real secrets, real tokens, or real company references

## Deliverable

Produce a complete runnable project.

After generating the code, include:

* run instructions
* short architecture summary
* list of implemented exhibits
* any shortcuts taken
* suggested next improvements


