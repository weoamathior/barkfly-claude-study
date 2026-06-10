package com.zoo.web;

import java.util.List;

/**
 * Catalog of the zoo exhibits, used to render the home dashboard. All ten are
 * live, so the full shape of the lab is visible from day one.
 */
public record Exhibit(int number, String slug, String title, String tagline) {

    /** All ten exhibits from the spec, in order. */
    public static final List<Exhibit> ALL = List.of(
            new Exhibit(1, "iframe", "Portal Shell + Iframe Legacy App",
                    "Temporary integration, born 2014, still in production."),
            new Exhibit(2, "postmessage", "postMessage Communication",
                    "It accepts mail from any origin. What could go wrong?"),
            new Exhibit(3, "eventbus", "Global Window Event Bus",
                    "Two teams, one event name, zero documentation."),
            new Exhibit(4, "localstorage", "Shared localStorage / sessionStorage",
                    "The browser is our integration bus now."),
            new Exhibit(5, "querystring", "Query String Handoff",
                    "Copy the URL, replay yesterday's context."),
            new Exhibit(6, "clickjacking-nav", "Click Interception / Fake Navigation",
                    "The back button has left the chat."),
            new Exhibit(7, "session-illusion", "Shared Cookie / Session Illusion",
                    "Logged in here, logged out there."),
            new Exhibit(8, "token-passing", "Token Passing Anti-pattern",
                    "The token rode in the query string. In the logs. Forever."),
            new Exhibit(9, "frame-headers", "Iframe Security Headers / Clickjacking",
                    "Security exception approved by committee."),
            new Exhibit(10, "origin-confusion", "Runtime-Origin Confusion",
                    "It worked in QA."));
}
