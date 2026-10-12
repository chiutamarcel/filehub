package com.filehub.api;

import java.io.Serializable;
import java.util.Objects;

public class GroupRequestId implements Serializable {
    private String groupId;
    private String userId;

    public GroupRequestId(String groupId, String userId) {
        this.groupId = groupId;
        this.userId = userId;
    }

    public GroupRequestId() {
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        GroupRequestId that = (GroupRequestId) o;
        return Objects.equals(groupId, that.groupId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(groupId, userId);
    }
}
