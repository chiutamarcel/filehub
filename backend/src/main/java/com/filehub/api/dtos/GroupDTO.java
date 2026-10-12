package com.filehub.api.dtos;

import java.util.List;

public class GroupDTO {
    String id;
    String name;
    private List<String> members;
    private String leader;

    public GroupDTO(String id, String name) {
        this.id = id;
        this.name = name;
    }



    public String getLeader() {
        return leader;
    }

    public void setLeader(String leader) {
        this.leader = leader;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public List<String> getMembers() {
        return members;
    }

    public void setMembers(List<String> members) {
        this.members = members;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
