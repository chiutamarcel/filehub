package com.filehub.api.models;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;

@Entity
public class GroupLeader {

    @Id
    private String groupId;

    private String leader;

    public GroupLeader() {
    }

    public GroupLeader(String groupId, String leader) {
        this.groupId = groupId;
        this.leader = leader;
    }

    public String getGroupId() {
        return groupId;
    }

    public void setGroupId(String groupId) {
        this.groupId = groupId;
    }

    public String getLeader() {
        return leader;
    }

    public void setLeader(String leader) {
        this.leader = leader;
    }
}
