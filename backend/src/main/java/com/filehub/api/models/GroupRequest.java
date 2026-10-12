package com.filehub.api.models;

import com.filehub.api.GroupRequestId;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;

@Entity
@IdClass(GroupRequestId.class)
public class GroupRequest {
    @Id
    String groupId;

    @Id
    String userId;

    public GroupRequest(String groupId, String userId) {
        this.groupId = groupId;
        this.userId = userId;
    }

    public GroupRequest() {
    }

    public String getGroupId() {
        return groupId;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }
}