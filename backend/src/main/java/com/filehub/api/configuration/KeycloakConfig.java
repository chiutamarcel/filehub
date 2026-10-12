package com.filehub.api.configuration;

import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.KeycloakBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class KeycloakConfig {

    private Keycloak kc;

    @Value("${filehub.kc.url}")
    private String keycloakUrl;

    @Bean
    public Keycloak keycloakClient() {
        kc = KeycloakBuilder.builder()
                .serverUrl(keycloakUrl) // Keycloak server URL
                .realm("master")                   // Realm name
                .username("admin")                 // Admin username
                .password("admin")              // Admin password
                .clientId("admin-cli")             // Client ID
                .build();

        return kc;
    }
}
