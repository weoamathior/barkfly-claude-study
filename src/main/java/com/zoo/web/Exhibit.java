package com.zoo.web;

import java.util.List;

/**
 * Catalog of the zoo exhibits, used to render the home dashboard. The 3 marquee
 * exhibits are {@code live}; the rest are listed as "coming soon" so the full
 * shape of the lab is visible from day one.
 */
public record Exhibit(int number, String slug, String title, String tagline, boolean live) {

    /** All ten exhibits from the spec, in order. */
    public static final List<Exhibit> ALL = List.of(
            new Exhibit(1, "iframe", "Portal Shell + Iframe Legacy App",
                    "Temporary integration, born 2014, still in production.", true),
            new Exhibit(2, "postmessage", "postMessage Communication",
                    "It accepts mail from any origin. What could go wrong?", true),
            new Exhibit(3, "eventbus", "Global Window Event Bus",
                    "Two teams, one event name, zero documentation.", true),
            new Exhibit(4, "localstorage", "Shared localStorage / sessionStorage",
                    "The browser is our integration bus now.", true),
            new Exhibit(5, "querystring", "Query String Handoff",
                    "Copy the URL, replay yesterday's context.", true),
            new Exhibit(6, "clickjacking-nav", "Click Interception / Fake Navigation",
                    "The back button has left the chat.", true),
            new Exhibit(7, "session-illusion", "Shared Cookie / Session Illusion",
                    "Logged in here, logged out there.", true),
            new Exhibit(8, "token-passing", "Token Passing Anti-pattern",
                    "The token rode in the query string. In the logs. Forever.", true),
            new Exhibit(9, "frame-headers", "Iframe Security Headers / Clickjacking",
                    "Security exception approved by committee.", true),
            new Exhibit(10, "origin-confusion", "Runtime-Origin Confusion",
                    "It worked in QA.", true));
}
