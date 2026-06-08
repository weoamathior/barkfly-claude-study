package com.zoo;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.TestPropertySource;

/**
 * Boots the full app on its real two-connector setup and asserts the exhibit
 * surface. Runs in-process via {@code ./gradlew test} so it verifies the
 * two-origin wiring without leaving a server running.
 *
 * <p>Uses ports 18080/18081 (not the dev defaults 8080/8081) so the suite can
 * run even while a dev instance is up.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.DEFINED_PORT)
@TestPropertySource(properties = {
        "server.port=18080",
        "zoo.child-port=18081",
        "zoo.portal-origin=http://localhost:18080",
        "zoo.child-origin=http://localhost:18081"
})
class SmokeTest {

    static final String PORTAL = "http://localhost:18080";
    static final String CHILD = "http://localhost:18081";

    // Plain template (won't throw on 5xx) so we can assert the boom=1 500.
    final TestRestTemplate http = new TestRestTemplate(new RestTemplateBuilder());

    private String body(String url) {
        ResponseEntity<String> r = http.getForEntity(url, String.class);
        assertThat(r.getStatusCode()).as(url).isEqualTo(HttpStatus.OK);
        return r.getBody();
    }

    @Test
    void portalAndExhibitPagesRender() {
        assertThat(body(PORTAL + "/")).contains("Frontend Integration Zoo", "Exhibit #10");
        // every exhibit slug must render (all 10 are live)
        String[] slugs = {"iframe", "postmessage", "eventbus", "localstorage", "querystring",
                "clickjacking-nav", "session-illusion", "token-passing", "frame-headers", "origin-confusion"};
        for (String slug : slugs) {
            assertThat(body(PORTAL + "/exhibit/" + slug)).as(slug).contains("Event Log");
        }
        // home no longer advertises anything as coming soon
        assertThat(body(PORTAL + "/")).doesNotContain("Coming soon");
    }

    @Test
    void handoffIsOpaqueShortLivedAndSingleUse() {
        // create -> opaque id; consume once -> ok; consume again -> 410 Gone
        ResponseEntity<String> created = http.postForEntity(PORTAL + "/api/handoff",
                Map.of("accountId", "ACC-A", "role", "ADMIN"), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.OK);
        String id = created.getBody().replaceAll(".*\"handoffId\":\"([^\"]+)\".*", "$1");
        assertThat(id).startsWith("ho_");

        assertThat(body(PORTAL + "/api/handoff/" + id)).contains("ACC-A");
        assertThat(http.getForEntity(PORTAL + "/api/handoff/" + id, String.class).getStatusCode())
                .isEqualTo(HttpStatus.GONE);
    }

    @Test
    void sessionStatusReflectsExpiry() {
        http.postForEntity(PORTAL + "/api/session/reset", null, String.class);
        assertThat(body(PORTAL + "/api/session/status?app=child")).contains("\"active\":true");
        http.postForEntity(PORTAL + "/api/session/expire?app=child", null, String.class);
        assertThat(body(PORTAL + "/api/session/status?app=child"))
                .contains("\"active\":false", "\"expired\":true");
    }

    @Test
    void bffEnforcesRoleServerSide() {
        // account manager session cannot reach the admin endpoint; admin can
        String mgr = http.postForEntity(PORTAL + "/api/bff/session?user=USR-1", null, String.class).getBody()
                .replaceAll(".*\"bffSessionId\":\"([^\"]+)\".*", "$1");
        assertThat(http.getForEntity(PORTAL + "/api/bff/admin/" + mgr, String.class).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(body(PORTAL + "/api/bff/context/" + mgr)).contains("ACCOUNT_MANAGER");

        String admin = http.postForEntity(PORTAL + "/api/bff/session?user=USR-2", null, String.class).getBody()
                .replaceAll(".*\"bffSessionId\":\"([^\"]+)\".*", "$1");
        assertThat(http.getForEntity(PORTAL + "/api/bff/admin/" + admin, String.class).getStatusCode())
                .isEqualTo(HttpStatus.OK);
    }

    @Test
    void frameHeadersAreEnforced() {
        // blocked page must carry the real refusal headers; protected names the portal
        ResponseEntity<String> blocked = http.getForEntity(CHILD + "/frame/blocked", String.class);
        assertThat(blocked.getHeaders().getFirst("X-Frame-Options")).isEqualTo("DENY");
        assertThat(blocked.getHeaders().getFirst("Content-Security-Policy")).contains("frame-ancestors 'none'");

        ResponseEntity<String> prot = http.getForEntity(CHILD + "/frame/protected", String.class);
        assertThat(prot.getHeaders().getFirst("Content-Security-Policy")).contains("frame-ancestors");
    }

    @Test
    void childAppsServeOnTheSecondConnector() {
        String orders = body(CHILD + "/child/orders");
        assertThat(orders).contains("OrderTrak", "CHILD_READY", "ORD-10001");

        String messaging = body(CHILD + "/child/orders-messaging");
        assertThat(messaging).contains("ORDER_DETAILS_RESULT");
    }

    @Test
    void boomReturns500AndNeverSendsHandshake() {
        ResponseEntity<String> r = http.getForEntity(CHILD + "/child/orders?boom=1", String.class);
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(r.getBody()).doesNotContain("CHILD_READY");
    }

    @Test
    void dataApiReturnsFakeDomain() {
        assertThat(body(PORTAL + "/api/orders/ORD-10001")).contains("ACC-A", "SHIPPED");
        assertThat(body(PORTAL + "/api/accounts/ACC-A/orders")).contains("ORD-10001", "ORD-10002");
        // same API answers on the child connector too (used by the messaging child)
        assertThat(body(CHILD + "/api/accounts")).contains("Mission Pharmacy", "Valley Hospital");
    }

    @Test
    void staticAssetsAreServed() {
        assertThat(body(PORTAL + "/js/log.js")).contains("ZooLog");
        assertThat(body(PORTAL + "/js/exhibits/iframe.js")).contains("CHILD_READY");
        assertThat(body(PORTAL + "/js/exhibits/postmessage.js")).contains("ORDER_DETAILS_REQUEST");
        assertThat(body(PORTAL + "/js/exhibits/localstorage.js")).contains("GOOD_VERSION");
        assertThat(body(PORTAL + "/css/zoo.css")).contains(".logpanel");
    }
}
