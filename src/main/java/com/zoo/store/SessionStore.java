package com.zoo.store;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Fake per-app session state (Exhibit 7). Two independent "apps" — the portal
 * and the embedded child — each have their own session, which is the whole
 * point: the portal can believe it's logged in while the child's session has
 * quietly expired.
 *
 * <p>All fake, single demo user, in memory.
 */
@Component
public class SessionStore {

    private static final long SESSION_TTL_MS = 5 * 60_000;

    private record Session(boolean authenticated, Instant expiresAt) {
    }

    private final Map<String, Session> byApp = new ConcurrentHashMap<>();

    public SessionStore() {
        reset();
    }

    /** Both apps start logged in (the happy path that lulls everyone). */
    public final void reset() {
        login("portal");
        login("child");
    }

    public void login(String app) {
        byApp.put(app, new Session(true, Instant.now().plusMillis(SESSION_TTL_MS)));
    }

    public void logout(String app) {
        byApp.put(app, new Session(false, Instant.EPOCH));
    }

    /** Force a session to look expired — simulates the child timing out. */
    public void expire(String app) {
        byApp.put(app, new Session(true, Instant.now().minusSeconds(1)));
    }

    public Map<String, Object> status(String app) {
        Session s = byApp.getOrDefault(app, new Session(false, Instant.EPOCH));
        boolean expired = s.authenticated() && Instant.now().isAfter(s.expiresAt());
        boolean active = s.authenticated() && !expired;
        long expiresInMs = Math.max(0, s.expiresAt().toEpochMilli() - Instant.now().toEpochMilli());

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("app", app);
        out.put("active", active);
        out.put("expired", expired);
        out.put("expiresInMs", active ? expiresInMs : 0);
        return out;
    }
}
