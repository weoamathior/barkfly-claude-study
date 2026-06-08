package com.zoo.web.api;

import com.zoo.store.HandoffStore;
import java.util.Map;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exhibit 5 — server-side handoff: opaque id in, real context out (once). */
@RestController
@RequestMapping("/api/handoff")
@CrossOrigin(origins = {"http://localhost:8080", "http://localhost:8081"})
public class HandoffController {

    private static final long TTL_MS = 30_000; // 30s, short-lived on purpose

    private final HandoffStore store;

    public HandoffController(HandoffStore store) {
        this.store = store;
    }

    /** Source app stores the real context, gets back an opaque id for the URL. */
    @PostMapping
    public Map<String, Object> create(@RequestBody Map<String, Object> payload) {
        String id = store.create(payload, TTL_MS);
        return Map.of("handoffId", id, "expiresInMs", TTL_MS);
    }

    /** Target app exchanges the id for the context — once, before it expires. */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> consume(@PathVariable String id) {
        Optional<Map<String, Object>> payload = store.consume(id);
        if (payload.isEmpty()) {
            // A clear, explicit error — not a silently-replayed stale context.
            return ResponseEntity.status(HttpStatus.GONE)
                    .body(Map.of("error", "handoff_expired_or_used",
                            "message", "This handoff is invalid, already used, or expired. Start again."));
        }
        return ResponseEntity.ok(payload.get());
    }
}
