package com.zoo.web;

import com.zoo.config.ZooProperties;
import com.zoo.data.FakeData;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

/**
 * The embedded "legacy" child apps. These are meant to be loaded in an iframe
 * from the CHILD origin (:8081), though the same routes also answer on :8080.
 *
 * <p>Query knobs used by the iframe exhibit to make failure visible:
 * <ul>
 *   <li>{@code ?slow=<ms>} — sleep server-side to simulate slow load.</li>
 *   <li>{@code ?boom=1} — return HTTP 500 with an error body that never sends
 *       the CHILD_READY handshake, so a well-built wrapper can detect it.</li>
 * </ul>
 */
@Controller
public class ChildAppController {

    private final FakeData data;
    private final ZooProperties props;

    public ChildAppController(FakeData data, ZooProperties props) {
        this.data = data;
        this.props = props;
    }

    /** The deliberate-failure body. Real 500 status, and — the point — no CHILD_READY handshake. */
    private static final String BOOM_HTML = """
            <!DOCTYPE html><html><head><meta charset="UTF-8"><title>500 — OrderTrak</title>
            <style>body{font-family:monospace;margin:0;padding:20px;background:#fff;color:#cf222e}
            h1{font-size:16px}p{color:#57606a;font-size:13px}</style></head><body>
            <h1>HTTP 500 — OrderTrak backend unavailable</h1>
            <p>Connection to ORDERS-DB pool exhausted. (This worked in QA.)</p>
            </body></html>""";

    @GetMapping("/child/orders")
    public String orders(@RequestParam(required = false) Integer slow,
                         @RequestParam(required = false) Integer boom,
                         Model model,
                         HttpServletResponse resp) throws InterruptedException, IOException {
        maybeSlow(slow);
        if (boom != null && boom == 1) {
            // The "this worked in QA" path: real 500, body written directly so
            // Spring's error dispatch doesn't reset the status. No handshake here.
            resp.setStatus(500);
            resp.setContentType("text/html;charset=UTF-8");
            resp.getWriter().write(BOOM_HTML);
            return null; // response already committed
        }
        model.addAttribute("orders", data.ordersForAccount("ACC-A"));
        model.addAttribute("account", data.account("ACC-A").orElseThrow());
        model.addAttribute("portalOrigin", props.getPortalOrigin());
        return "childapps/orders";
    }

    /** The legacy app wired for request/response postMessage (Exhibit 2). */
    @GetMapping("/child/orders-messaging")
    public String ordersMessaging(Model model) {
        model.addAttribute("portalOrigin", props.getPortalOrigin());
        return "childapps/orders-messaging";
    }

    private void maybeSlow(Integer slow) throws InterruptedException {
        if (slow != null && slow > 0) {
            Thread.sleep(Math.min(slow, 15000)); // cap so we never wedge the server thread forever
        }
    }
}
