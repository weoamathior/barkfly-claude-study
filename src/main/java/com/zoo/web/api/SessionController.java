package com.zoo.web.api;

import com.zoo.store.SessionStore;
import java.util.Map;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exhibit 7 — explicit session-check endpoint. The better version of the
 * exhibit polls {@code /status} for the child app so the parent can detect that
 * the child's session expired instead of showing a silent blank frame.
 */
@RestController
@RequestMapping("/api/session")
@CrossOrigin(origins = {"http://localhost:8080", "http://localhost:8081"})
public class SessionController {

    private final SessionStore sessions;

    public SessionController(SessionStore sessions) {
        this.sessions = sessions;
    }

    @GetMapping("/status")
    public Map<String, Object> status(@RequestParam String app) {
        return sessions.status(app);
    }

    @PostMapping("/login")
    public Map<String, Object> login(@RequestParam String app) {
        sessions.login(app);
        return sessions.status(app);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(@RequestParam String app) {
        sessions.logout(app);
        return sessions.status(app);
    }

    /** Simulate the child app's session timing out while the portal's is fine. */
    @PostMapping("/expire")
    public Map<String, Object> expire(@RequestParam String app) {
        sessions.expire(app);
        return sessions.status(app);
    }

    @PostMapping("/reset")
    public Map<String, Object> reset() {
        sessions.reset();
        return Map.of("portal", sessions.status("portal"), "child", sessions.status("child"));
    }
}
