package com.zoo.web;

import com.zoo.config.ZooProperties;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Exhibit 9 — frame-protection headers. These three endpoints serve the SAME
 * tiny "confirm a money transfer" page with different framing policies. The
 * header enforcement here is <strong>real</strong> (your browser obeys it); the
 * clickjacking overlay in the exhibit UI is a simulation.
 */
@Controller
public class FrameController {

    private final ZooProperties props;

    public FrameController(ZooProperties props) {
        this.props = props;
    }

    private static String page(String banner) {
        return """
                <!DOCTYPE html><html><head><meta charset="UTF-8"><title>BankCorp Transfer</title>
                <style>body{font-family:system-ui,sans-serif;margin:0;padding:18px;color:#1a212b}
                .bn{font-size:11px;color:#888;font-family:monospace;margin-bottom:8px}
                .amt{font-size:18px;font-weight:700;margin:8px 0}
                button{font:inherit;background:#1a7f37;color:#fff;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}
                </style></head><body>
                <div class="bn">%s</div>
                <strong>BankCorp</strong>
                <div class="amt">Transfer $500.00 to ACCT ****8842</div>
                <button onclick="document.getElementById('r').textContent='✓ Transfer confirmed.'">Confirm transfer</button>
                <div id="r" style="margin-top:10px;color:#1a7f37;font-weight:600"></div>
                </body></html>""".formatted(banner);
    }

    private void write(HttpServletResponse resp, String html) throws IOException {
        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write(html);
    }

    /** No frame protection — embeddable by anyone (clickjacking target). */
    @GetMapping("/frame/unprotected")
    public void unprotected(HttpServletResponse resp) throws IOException {
        write(resp, page("frame policy: NONE — embeddable anywhere"));
    }

    /** Allowlisted: only the portal origin may frame this. (Real CSP enforcement.) */
    @GetMapping("/frame/protected")
    public void protectedPage(HttpServletResponse resp) throws IOException {
        resp.setHeader("Content-Security-Policy", "frame-ancestors " + props.getPortalOrigin());
        write(resp, page("frame policy: frame-ancestors " + props.getPortalOrigin()));
    }

    /** Framing denied for everyone. (Real CSP + X-Frame-Options enforcement.) */
    @GetMapping("/frame/blocked")
    public void blocked(HttpServletResponse resp) throws IOException {
        resp.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
        resp.setHeader("X-Frame-Options", "DENY");
        write(resp, page("frame policy: frame-ancestors 'none' (DENY)"));
    }
}
