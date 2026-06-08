package com.zoo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Frontend Integration Zoo — a runnable learning lab.
 *
 * <p>Single Spring Boot process, two real origins:
 * <ul>
 *   <li>http://localhost:8080 — the "Unified Portal" shell (parent)</li>
 *   <li>http://localhost:8081 — the embedded "legacy" / child apps</li>
 * </ul>
 * Two ports means the browser sees two genuinely different origins, so the
 * cross-origin pain in these exhibits (postMessage origins, CORS, framing) is
 * real, not faked.
 */
@SpringBootApplication
public class ZooApplication {
    public static void main(String[] args) {
        SpringApplication.run(ZooApplication.class, args);
    }
}
