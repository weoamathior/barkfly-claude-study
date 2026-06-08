package com.zoo.config;

import org.apache.catalina.connector.Connector;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Adds a SECOND Tomcat connector so one process serves two origins:
 * the main connector (the portal) plus an extra connector (the embedded
 * "legacy" child apps, default :8081 — see {@code zoo.child-port}).
 *
 * <p>This is the trick that makes the cross-origin exhibits behave like the
 * real world: the same controllers are reachable on both ports, but the
 * browser treats them as different origins.
 */
@Configuration
public class SecondConnectorConfig {

    private final ZooProperties props;

    public SecondConnectorConfig(ZooProperties props) {
        this.props = props;
    }

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> childConnector() {
        return factory -> {
            Connector connector = new Connector(TomcatServletWebServerFactory.DEFAULT_PROTOCOL);
            connector.setPort(props.getChildPort());
            factory.addAdditionalTomcatConnectors(connector);
        };
    }
}
