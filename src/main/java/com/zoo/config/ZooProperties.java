package com.zoo.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Origins for the portal and child apps, bound from application.yml.
 * Exposed to Thymeleaf templates so exhibit pages can build cross-origin URLs
 * and origin allowlists from one source of truth.
 */
@Component
@ConfigurationProperties(prefix = "zoo")
public class ZooProperties {

    private String portalOrigin = "http://localhost:8080";
    private String childOrigin = "http://localhost:8081";
    private int childPort = 8081;

    public String getPortalOrigin() {
        return portalOrigin;
    }

    public void setPortalOrigin(String portalOrigin) {
        this.portalOrigin = portalOrigin;
    }

    public String getChildOrigin() {
        return childOrigin;
    }

    public void setChildOrigin(String childOrigin) {
        this.childOrigin = childOrigin;
    }

    public int getChildPort() {
        return childPort;
    }

    public void setChildPort(int childPort) {
        this.childPort = childPort;
    }
}
