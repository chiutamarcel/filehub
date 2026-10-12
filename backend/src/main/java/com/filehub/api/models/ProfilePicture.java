package com.filehub.api.models;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;

@Entity
public class ProfilePicture {

    @Id
    private String username;

    @Lob
    private String profilePictureSvg;

    public ProfilePicture() {
    }

    public ProfilePicture(String username, String profilePictureSvg) {
        this.username = username;
        this.profilePictureSvg = profilePictureSvg;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getProfilePictureSvg() {
        return profilePictureSvg;
    }

    public void setProfilePictureSvg(String profilePictureSvg) {
        this.profilePictureSvg = profilePictureSvg;
    }
}
