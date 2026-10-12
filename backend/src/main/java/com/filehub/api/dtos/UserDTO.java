package com.filehub.api.dtos;

public class UserDTO {
    private String userId;
    private String username;
    private String profilePic;
    private String email;
    private String password;
    private String role;
    private String birthdate;
    private String createdAt;
    private Integer storageId;

    public UserDTO(String userId, String profilePic, String username, String email, String password, String role, String birthdate, String createdAt, Integer storageId) {
        this.userId = userId;
        this.profilePic = profilePic;
        this.username = username;
        this.email = email;
        this.password = password;
        this.role = role;
        this.birthdate = birthdate;
        this.createdAt = createdAt;
        this.storageId = storageId;
    }

    public UserDTO() {
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getProfilePic() {
        return profilePic;
    }

    public void setProfilePic(String profilePic) {
        this.profilePic = profilePic;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getBirthdate() {
        return birthdate;
    }

    public void setBirthdate(String birthdate) {
        this.birthdate = birthdate;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public Integer getStorageId() {
        return storageId;
    }

    public void setStorageId(Integer storageId) {
        this.storageId = storageId;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }
}
