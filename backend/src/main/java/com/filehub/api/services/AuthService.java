package com.filehub.api.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.filehub.api.dtos.UserDTO;
import com.filehub.api.dtos.LoginLogDTO;
import com.filehub.api.models.LoginLog;
import com.filehub.api.repositories.LoginLogRepository;
import org.apache.http.NameValuePair;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.util.EntityUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.time.LocalDateTime;

@Service
public class AuthService {

    @Autowired
    private UserService userService;

    @Autowired
    private LoginLogRepository loginLogRepository;

    @Value("${filehub.kc.url}")
    private String keycloakUrl;

    private static final String REALM = "FileHub";

    public String login(UserDTO userDTO) {
        if (userDTO.getUsername().contains(" ")) {
            logLoginAttempt(userDTO.getUsername(), LoginLog.LoginStatus.FAILURE);
            throw new IllegalArgumentException("Username cannot contain spaces.");
        }
        if (userDTO.getPassword().contains(" ")) {
            logLoginAttempt(userDTO.getUsername(), LoginLog.LoginStatus.FAILURE);
            throw new IllegalArgumentException("Password cannot contain spaces.");
        }

        if (userDTO.getUsername() == null || userDTO.getPassword() == null || userDTO.getUsername().isEmpty() || userDTO.getPassword().isEmpty()) {
            logLoginAttempt(userDTO.getUsername(), LoginLog.LoginStatus.FAILURE);
            throw new IllegalArgumentException("Please provide the username and password.");
        }

        String tokenEndpoint = keycloakUrl + "/realms/" + REALM + "/protocol/openid-connect/token";

        try (CloseableHttpClient client = HttpClients.createDefault()) {
            HttpPost post = new HttpPost(tokenEndpoint);
            List<NameValuePair> params = new ArrayList<>();
            params.add(new BasicNameValuePair("client_id", "filehub-rest-api"));
            params.add(new BasicNameValuePair("grant_type", "password"));
            params.add(new BasicNameValuePair("client_secret", "G9GNOxjksVgd0cQ5PinHKaWeiJYUwcVY"));
            params.add(new BasicNameValuePair("username", userDTO.getUsername()));
            params.add(new BasicNameValuePair("password", userDTO.getPassword()));
            post.setEntity(new UrlEncodedFormEntity(params));

            try (CloseableHttpResponse response = client.execute(post)) {
                int statusCode = response.getStatusLine().getStatusCode();

                if (statusCode == 200) {
                    String jsonResponse = EntityUtils.toString(response.getEntity());
                    Map<String, Object> tokenData = new ObjectMapper().readValue(jsonResponse, Map.class);
                    logLoginAttempt(userDTO.getUsername(), LoginLog.LoginStatus.SUCCESS);
                    return (String) tokenData.get("access_token");
                } else if (statusCode == 401) {
                    throw new RuntimeException("Invalid credentials.");
                } else {
                    throw new RuntimeException("Failed to authenticate: " + statusCode);
                }
            }
        } catch (Exception e) {
            logLoginAttempt(userDTO.getUsername(), LoginLog.LoginStatus.FAILURE);
            throw new RuntimeException(e.getMessage(), e);
        }
    }

    private void logLoginAttempt(String username, LoginLog.LoginStatus status) {
        LoginLog loginLog = new LoginLog();
        loginLog.setUsername(username);
        loginLog.setTimestamp(LocalDateTime.now());
        loginLog.setStatus(status);
        loginLogRepository.save(loginLog); // Save to the database
    }

    public String register(UserDTO userDTO) {
        if (!areAllFieldsProvided(userDTO)) {
            throw new IllegalArgumentException("All fields must be provided.");
        }

        try {
            userDTO.setStorageId(0);
            userService.createUser(userDTO);
            return login(userDTO); // Log in after successful registration
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    private boolean areAllFieldsProvided(UserDTO userDTO) {
        return userDTO.getUsername() != null
                && userDTO.getBirthdate() != null
                && userDTO.getEmail() != null
                && userDTO.getPassword() != null
                && !userDTO.getUsername().isEmpty()
                && !userDTO.getBirthdate().isEmpty()
                && !userDTO.getEmail().isEmpty()
                && !userDTO.getPassword().isEmpty();
    }

    public List<LoginLogDTO> getLoginLogs(String username) {
        List<LoginLog> logs = loginLogRepository.findByUsername(username);
        List<LoginLogDTO> logDTOs = new ArrayList<>();

        for (LoginLog log : logs) {
            logDTOs.add(new LoginLogDTO(log.getUsername(), log.getTimestamp(), log.getStatus().name()));
        }
        return logDTOs;
    }
}
