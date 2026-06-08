package com.zoo.data;

import java.util.List;

/**
 * Tiny, readable fake domain. No real companies, no real data.
 * Grouped in one file because each record is a handful of fields and they are
 * only ever used together by the demos.
 */
public final class Models {

    private Models() {
    }

    /** A customer account. e.g. "Mission Pharmacy". */
    public record Account(String id, String name, String segment) {
    }

    /** A user who belongs to an account. */
    public record AppUser(String id, String name, String role, String accountId) {
    }

    /** An order placed by an account. */
    public record OrderRec(String id, String accountId, String status, String total, List<String> lines) {
    }

    /** An invoice for an order. */
    public record Invoice(String id, String orderId, String amount, String status) {
    }

    /** A packing slip for an order. */
    public record PackingSlip(String id, String orderId, String warehouse, String shippedOn) {
    }
}
