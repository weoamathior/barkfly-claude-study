package com.zoo.web.api;

import com.zoo.data.FakeData;
import com.zoo.data.Models.AppUser;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exhibit 8 — backend-for-frontend. The safer alternative to throwing a JWT in
 * the URL: the BFF issues an <em>opaque</em> session id, and the child fetches
 * only the <em>minimal</em> context it needs. Crucially, the role/scopes come
 * from the SERVER's view of the user — the client cannot escalate by editing a
 * query parameter.
 *
 * <p>(In a real BFF the session id would be an httpOnly cookie; we return it in
 * JSON here only so the lab can show it without real cookies.)
 */
@RestController
@RequestMapping("/api/bff")
@CrossOrigin(origins = {"http://localhost:8080", "http://localhost:8081"})
public class BffController {

    /** Opaque session id -> userId. The id reveals nothing on its own. */
    private final Map<String, String> sessions = new ConcurrentHashMap<>();

    @PostMapping("/session")
    public Map<String, Object> createSession(@RequestParam String user) {
        String sid = "sess_" + UUID.randomUUID().toString().replace("-", "").substring(0, 20);
        sessions.put(sid, user);
        return Map.of("bffSessionId", sid);
    }

    /** Minimal, server-derived context. Role is NOT taken from the client. */
    @GetMapping("/context/{sid}")
    public ResponseEntity<Map<String, Object>> context(@PathVariable String sid) {
        Optional<AppUser> user = lookup(sid);
        if (user.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "no_session", "message", "Unknown or expired BFF session."));
        }
        AppUser u = user.get();
        Map<String, Object> ctx = new LinkedHashMap<>();
        ctx.put("displayName", u.name());
        ctx.put("accountId", u.accountId());
        ctx.put("role", u.role());            // <-- authoritative, from the server
        return ResponseEntity.ok(ctx);
    }

    /** Server-side authorization check: only real ADMINs get in. */
    @GetMapping("/admin/{sid}")
    public ResponseEntity<Map<String, Object>> adminOnly(@PathVariable String sid) {
        Optional<AppUser> user = lookup(sid);
        if (user.isEmpty() || !"ADMIN".equals(user.get().role())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "forbidden",
                            "message", "Server rejected this action — the session's role is not ADMIN."));
        }
        return ResponseEntity.ok(Map.of("ok", true, "message", "Admin action authorized by the server."));
    }

    private Optional<AppUser> lookup(String sid) {
        String userId = sessions.get(sid);
        if (userId == null) {
            return Optional.empty();
        }
        return FakeData.USERS.stream().filter(u -> u.id().equals(userId)).findFirst();
    }
}
