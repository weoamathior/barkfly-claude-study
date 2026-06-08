package com.zoo.web.api;

import com.zoo.data.FakeData;
import com.zoo.data.Models.Account;
import com.zoo.data.Models.OrderRec;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Read-only JSON for the demos. CORS is opened here ({@code @CrossOrigin}) so
 * the child apps on :8081 can fetch from the portal on :8080 — the later
 * "runtime-origin confusion" exhibit will revisit why this matters.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = {"http://localhost:8080", "http://localhost:8081"})
public class DataApiController {

    private final FakeData data;

    public DataApiController(FakeData data) {
        this.data = data;
    }

    @GetMapping("/accounts")
    public List<Account> accounts() {
        return data.accounts();
    }

    @GetMapping("/accounts/{id}/orders")
    public ResponseEntity<List<OrderRec>> ordersForAccount(@PathVariable String id) {
        if (data.account(id).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(data.ordersForAccount(id));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<OrderRec> order(@PathVariable String id) {
        return data.order(id).map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }
}
