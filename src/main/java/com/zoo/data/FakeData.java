package com.zoo.data;

import com.zoo.data.Models.Account;
import com.zoo.data.Models.AppUser;
import com.zoo.data.Models.Invoice;
import com.zoo.data.Models.OrderRec;
import com.zoo.data.Models.PackingSlip;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * The entire (fake) enterprise, in memory. Small and readable on purpose.
 * Two accounts so that the "wrong account" bugs in the storage/handoff
 * exhibits are obvious at a glance.
 */
@Component
public class FakeData {

    public static final List<Account> ACCOUNTS = List.of(
            new Account("ACC-A", "Mission Pharmacy", "Retail Pharmacy"),
            new Account("ACC-B", "Valley Hospital", "Health System"));

    public static final List<AppUser> USERS = List.of(
            new AppUser("USR-1", "Dana Ops", "ACCOUNT_MANAGER", "ACC-A"),
            new AppUser("USR-2", "Priya Admin", "ADMIN", "ACC-B"));

    public static final List<OrderRec> ORDERS = List.of(
            new OrderRec("ORD-10001", "ACC-A", "SHIPPED", "$1,240.00",
                    List.of("Nitrile gloves x40", "Alcohol swabs x100")),
            new OrderRec("ORD-10002", "ACC-A", "PROCESSING", "$320.50",
                    List.of("Pill bottles x500")),
            new OrderRec("ORD-10003", "ACC-B", "SHIPPED", "$8,900.00",
                    List.of("IV pumps x4", "Saline bags x200")),
            new OrderRec("ORD-10004", "ACC-B", "CANCELLED", "$0.00",
                    List.of("(cancelled) MRI contrast x10")));

    public static final List<Invoice> INVOICES = List.of(
            new Invoice("INV-50001", "ORD-10001", "$1,240.00", "PAID"),
            new Invoice("INV-50003", "ORD-10003", "$8,900.00", "OPEN"));

    public static final List<PackingSlip> PACKING_SLIPS = List.of(
            new PackingSlip("PS-90001", "ORD-10001", "WH-WEST", "2026-05-28"),
            new PackingSlip("PS-90003", "ORD-10003", "WH-EAST", "2026-05-30"));

    public List<Account> accounts() {
        return ACCOUNTS;
    }

    public Optional<Account> account(String id) {
        return ACCOUNTS.stream().filter(a -> a.id().equals(id)).findFirst();
    }

    public List<OrderRec> ordersForAccount(String accountId) {
        return ORDERS.stream().filter(o -> o.accountId().equals(accountId)).toList();
    }

    public Optional<OrderRec> order(String id) {
        return ORDERS.stream().filter(o -> o.id().equals(id)).findFirst();
    }
}
