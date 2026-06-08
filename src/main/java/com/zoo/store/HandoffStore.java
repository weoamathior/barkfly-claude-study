package com.zoo.store;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

/**
 * Short-lived, single-use server-side handoff store (Exhibit 5).
 *
 * <p>The safer alternative to stuffing context into a query string: the source
 * app POSTs the real context here and gets back an <em>opaque</em> id. The
 * target app exchanges that id (once, before it expires) for the context. The
 * URL only ever carries the meaningless id.
 */
@Component
public class HandoffStore {

    private record Entry(Map<String, Object> payload, Instant expiresAt) {
    }

    private final Map<String, Entry> entries = new ConcurrentHashMap<>();

    /** Create a handoff; returns the opaque id to put in the URL. */
    public String create(Map<String, Object> payload, long ttlMillis) {
        String id = "ho_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        entries.put(id, new Entry(payload, Instant.now().plusMillis(ttlMillis)));
        return id;
    }

    /**
     * Consume a handoff: returns the payload exactly once if it exists and is
     * unexpired, then deletes it. Empty if missing, already used, or expired.
     */
    public Optional<Map<String, Object>> consume(String id) {
        Entry e = entries.remove(id); // single-use: remove on read
        if (e == null) {
            return Optional.empty();
        }
        if (Instant.now().isAfter(e.expiresAt())) {
            return Optional.empty();
        }
        return Optional.of(e.payload());
    }
}
