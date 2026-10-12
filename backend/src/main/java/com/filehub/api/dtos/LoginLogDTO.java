package com.filehub.api.dtos;

import java.time.LocalDateTime;

public class LoginLogDTO {

    private String username;
    private LocalDateTime timestamp;
    private String status;

    public LoginLogDTO(String username, LocalDateTime timestamp, String status) {
        this.username = username;
        this.timestamp = timestamp;
        this.status = status;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
