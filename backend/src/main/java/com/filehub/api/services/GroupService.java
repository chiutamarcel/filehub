package com.filehub.api.services;

import com.filehub.api.dtos.GroupDTO;
import com.filehub.api.dtos.UserDTO;
import com.filehub.api.models.GroupLeader;
import com.filehub.api.models.GroupRequest;
import com.filehub.api.repositories.GroupLeaderRepository;
import com.filehub.api.repositories.GroupRequestRepository;
import jakarta.ws.rs.core.Response;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.GroupResource;
import org.keycloak.admin.client.resource.GroupsResource;
import org.keycloak.representations.idm.GroupRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class GroupService {

    @Autowired
    GroupLeaderRepository groupLeaderRepository;
    GroupRequestRepository groupRequestRepository;
    private final Keycloak keycloak;
    private final MinioFileService minioFileService;
    private static final String REALM = "FileHub";

    ArrayList<GroupDTO> groupList;

    public GroupService(Keycloak keycloak, MinioFileService minioFileService, GroupLeaderRepository groupLeaderRepository, GroupRequestRepository groupRequestRepository) {
        this.keycloak = keycloak;
        this.minioFileService = minioFileService;
        this.groupLeaderRepository = groupLeaderRepository;
        this.groupRequestRepository = groupRequestRepository;
    }

    public List<GroupDTO> listAllGroups(Optional<String> username) {
        try {
            // Initialize a list to store group DTOs
            List<GroupDTO> groups = new ArrayList<>();

            if (username.isPresent() && !username.get().isEmpty()) {
                // Search for the user in Keycloak
                var users = keycloak.realm(REALM).users().search(username.get());
                if (users.isEmpty()) {
                    throw new NoSuchElementException("User not found.");
                }

                // Fetch the user's group memberships
                String userId = users.get(0).getId();
                List<GroupRepresentation> userGroups = keycloak.realm(REALM).users().get(userId).groups();

                // Map the user's groups to GroupDTO with the leader and first two members
                for (GroupRepresentation group : userGroups) {
                    GroupResource groupResource = keycloak.realm(REALM).groups().group(group.getId());

                    // Fetch all members of the group
                    List<UserRepresentation> members = groupResource.members();

                    // Fetch leader from the database
                    String leader = groupLeaderRepository.findById(group.getName())
                            .map(GroupLeader::getLeader)
                            .orElse(null);

                    // Collect the first two members, excluding the leader
                    List<String> memberNames = new ArrayList<>(
                            members.stream()
                                    .map(UserRepresentation::getUsername)
                                    .filter(memberName -> !memberName.equals(leader))
                                    .limit(2)
                                    .toList()
                    );

                    if (leader != null) {
                        memberNames.add(0, leader);
                    }

                    // Map the group to GroupDTO
                    GroupDTO groupDTO = mapToGroupDTO(group);
                    groupDTO.setMembers(memberNames);
                    groupDTO.setLeader(leader);

                    groups.add(groupDTO);
                }
            } else {
                // Fetch all groups from Keycloak
                GroupsResource groupsResource = keycloak.realm(REALM).groups();
                List<GroupRepresentation> groupRepresentations = groupsResource.groups();

                // Map all groups to GroupDTO with the leader and first two members
                for (GroupRepresentation groupRepresentation : groupRepresentations) {
                    GroupResource groupResource = groupsResource.group(groupRepresentation.getId());

                    // Fetch all members of the group
                    List<UserRepresentation> members = groupResource.members();

                    // Fetch leader from the database
                    String leader = groupLeaderRepository.findById(groupRepresentation.getName())
                            .map(GroupLeader::getLeader)
                            .orElse(null);

                    List<String> memberNames = new ArrayList<>(
                            members.stream()
                                    .map(UserRepresentation::getUsername)
                                    .filter(memberName -> !memberName.equals(leader))
                                    .limit(2)
                                    .toList()
                    );

                    if (leader != null) {
                        memberNames.add(0, leader);
                    }

                    // Map the group to GroupDTO
                    GroupDTO groupDTO = mapToGroupDTO(groupRepresentation);
                    groupDTO.setMembers(memberNames);
                    groupDTO.setLeader(leader);

                    groups.add(groupDTO);
                }
            }

            return groups;
        } catch (Exception e) {
            throw new RuntimeException("Failed to list groups: " + e.getMessage(), e);
        }
    }



    public GroupDTO getGroup(String groupName) {
        // Fetch the group from Keycloak
        List<GroupRepresentation> groups = keycloak.realm(REALM).groups().groups(groupName, 0, 1);

        if (groups.isEmpty()) {
            throw new NoSuchElementException("Group not found.");
        }

        GroupRepresentation group = groups.get(0);

        // Fetch members of the group
        GroupResource groupResource = keycloak.realm(REALM).groups().group(group.getId());
        List<UserRepresentation> members = groupResource.members();

        // Map members to a list of usernames
        List<String> memberNames = members.stream()
                .map(UserRepresentation::getUsername)
                .toList();

        GroupDTO groupDTO = mapToGroupDTO(group);
        groupDTO.setMembers(memberNames);

        groupLeaderRepository.findByGroupId(group.getName()).ifPresent(leader -> groupDTO.setLeader(leader.getLeader()));

        return groupDTO;
    }

    public GroupDTO createGroup(GroupDTO groupDTO, String username) throws Exception {

        // Fetch the group from Keycloak
        List<GroupRepresentation> groups = keycloak.realm(REALM).groups().groups(groupDTO.getName(), 0, 1);

        if(!groups.isEmpty()){
            throw new IllegalArgumentException("Group already exists with this name.");
        }

        // Create a GroupRepresentation from the GroupDTO
        GroupRepresentation groupRepresentation = new GroupRepresentation();
        groupRepresentation.setName(groupDTO.getName());

        // Create the group in Keycloak
        Response response = keycloak.realm(REALM).groups().add(groupRepresentation);

        if (response.getStatus() != 201) {
            throw new RuntimeException("Failed to create group: " + response.getStatusInfo().getReasonPhrase());
        }

        // Get the Location header to fetch the ID of the created group
        String locationHeader = response.getHeaderString("Location");
        if (locationHeader == null) {
            throw new RuntimeException("Group created, but unable to retrieve its ID from the response.");
        }
        String groupId = locationHeader.substring(locationHeader.lastIndexOf("/") + 1);

        // Check if the user exists in Keycloak
        if (username != null) {
            var users = keycloak.realm(REALM).users().search(username);
            if (users.isEmpty() || !users.get(0).getUsername().equals(username)) {
                throw new NoSuchElementException("User not found.");
            }
            UserRepresentation userRepresentation = users.get(0);

            // Add user to the group
            keycloak.realm(REALM).users().get(userRepresentation.getId()).joinGroup(groupId);

            if (!groupLeaderRepository.existsByGroupId(groupDTO.getName())) {
                GroupLeader groupLeader = new GroupLeader(groupDTO.getName(), username);
                groupLeaderRepository.save(groupLeader);
            }
        }

        // Fetch the created group details
        GroupRepresentation createdGroup = keycloak.realm(REALM).groups().group(groupId).toRepresentation();

        // Map the created group details to GroupDTO

        String groupName = ("group-" + groupDTO.getName()).toLowerCase();
        this.minioFileService.createBucket(groupName, true);

        GroupResource groupResource = keycloak.realm(REALM).groups().group(createdGroup.getId());

        // Fetch all members of the group
        List<UserRepresentation> members = groupResource.members();

        // Limit to the first three members
        List<String> memberNames = members.stream()
                .limit(3)
                .map(UserRepresentation::getUsername)
                .toList();

        // Map the group to GroupDTO
        GroupDTO newGroup = mapToGroupDTO(createdGroup);
        newGroup.setMembers(memberNames);
        newGroup.setLeader(username);

        return newGroup;
    }

    public void updateGroupLeader(String groupName, String newUsername) throws Exception {

        List<GroupRepresentation> groups = keycloak.realm(REALM).groups().groups(groupName, 0, 1);
        if (groups.isEmpty()) {
            throw new NoSuchElementException("Group not found!");
        }

        List<UserRepresentation> users = keycloak.realm(REALM).users().search(newUsername);
        if (users.isEmpty() || !users.get(0).getUsername().equals(newUsername)) {
            throw new NoSuchElementException("User not found!");
        }

        Optional<GroupLeader> existingGroupLeader = groupLeaderRepository.findByGroupId(groupName);

        if (existingGroupLeader.isPresent()) {
            GroupLeader groupLeader = existingGroupLeader.get();
            groupLeader.setLeader(newUsername);
            groupLeaderRepository.save(groupLeader);
        } else {
            GroupLeader newGroupLeader = new GroupLeader(groupName, newUsername);
            groupLeaderRepository.save(newGroupLeader);
        }
    }



    public GroupDTO updateGroup(String groupName, GroupDTO groupDTO) {
        // Fetch the group from Keycloak
        List<GroupRepresentation> groups = keycloak.realm(REALM).groups().groups(groupName, 0, 1);

        if(groups.isEmpty()){
            throw new NoSuchElementException("Group not found.");
        }

        GroupRepresentation existingGroup = groups.get(0);

        // Update the group
        if (groupDTO.getName() != null && !groupDTO.getName().trim().isEmpty()) {
            existingGroup.setName(groupDTO.getName());
        } else {
            throw new IllegalArgumentException("Group name cannot be null or empty.");
        }

        // Fetch the group resource using the group's ID
        GroupResource groupResource = keycloak.realm(REALM).groups().group(existingGroup.getId());


        // Save the changes to Keycloak
        groupResource.update(existingGroup);

        // Fetch the updated group details
        GroupRepresentation updatedGroup = groupResource.toRepresentation();

        // Map the updated group to GroupDTO
        return mapToGroupDTO(updatedGroup);
    }

    public void deleteGroup(String groupName) throws Exception {
        // Fetch the group from Keycloak
        List<GroupRepresentation> groups = keycloak.realm(REALM).groups().groups(groupName, 0, 1);

        if (groups.isEmpty()) {
            throw new NoSuchElementException("Group not found.");
        }

        GroupRepresentation groupToDelete = groups.get(0);

        // Șterge grupul din Keycloak
        keycloak.realm(REALM).groups().group(groupToDelete.getId()).remove();
        System.out.println("Keycloak group deleted: " + groupToDelete.getName());

        // Verifică și șterge intrările din tabela group_request
        List<GroupRequest> groupLeaders = groupRequestRepository.findByGroupId(groupName);
        if (!groupLeaders.isEmpty()) {
            groupRequestRepository.deleteAll(groupLeaders);
            System.out.println("Deleted all group leader entries for user: " + groupName);
        }

        // Verifică dacă există intrarea în repository
        if (groupLeaderRepository.existsByGroupId(groupToDelete.getName())) {
            GroupLeader groupLeader = groupLeaderRepository.findByGroupId(groupToDelete.getName())
                    .orElseThrow(() -> new NoSuchElementException("Group leader entry not found."));
            groupLeaderRepository.delete(groupLeader);
            System.out.println("Group leader entry deleted successfully: " + groupName);
        } else {
            System.out.println("Group leader entry does not exist in repository.");
        }

        // Șterge bucket-ul asociat grupului
        String groupBucketName = ("group-" + groupName).toLowerCase();
        this.minioFileService.deleteBucket(groupBucketName, true);
        System.out.println("MinIO bucket deleted: " + groupBucketName);
    }


    public void addUserToGroup(String groupName, UserDTO userDTO) {
        // Validate input
        if (userDTO.getUsername() == null || userDTO.getUsername().isEmpty()) {
            throw new IllegalArgumentException("Username must be provided.");
        }

        // Fetch the user from Keycloak
        var users = keycloak.realm(REALM).users().search(userDTO.getUsername());
        if (users.stream().noneMatch(user -> userDTO.getUsername().equals(user.getUsername()))) {
            throw new NoSuchElementException("User not found.");
        }
        UserRepresentation userRepresentation = users.get(0);

        // Fetch the group from Keycloak
        List<GroupRepresentation> groups = keycloak.realm(REALM).groups().groups(groupName, 0, 1);
        if (groups.isEmpty()) {
            throw new NoSuchElementException("Group not found.");
        }
        GroupRepresentation group = groups.get(0);

        // Check if the user is already part of the group
        List<GroupRepresentation> userGroups = keycloak.realm(REALM).users().get(userRepresentation.getId()).groups();
        boolean isUserInGroup = userGroups.stream().anyMatch(g -> g.getId().equals(group.getId()));

        if (isUserInGroup) {
            throw new IllegalStateException("User is already a member of the group.");
        }

        // Add the user to the group
        keycloak.realm(REALM).users().get(userRepresentation.getId()).joinGroup(group.getId());
    }

    public void removeUserFromGroup(String groupName, String username) {
        // Validate input
        if (username == null || username.isEmpty()) {
            throw new IllegalArgumentException("Username must be provided.");
        }

        // Fetch the user from Keycloak
        var users = keycloak.realm(REALM).users().search(username);
        if (users.stream().noneMatch(user -> username.equals(user.getUsername()))) {
            throw new NoSuchElementException("User not found.");
        }
        UserRepresentation userRepresentation = users.get(0);
        String userId = userRepresentation.getId();

        // Fetch the group from Keycloak
        List<GroupRepresentation> groups = keycloak.realm(REALM).groups().groups(groupName, 0, 1);
        if (groups.isEmpty()) {
            throw new NoSuchElementException("Group not found.");
        }
        GroupRepresentation group = groups.get(0);
        String groupId = group.getId();

        // Check if the user is part of the group
        List<GroupRepresentation> userGroups = keycloak.realm(REALM).users().get(userId).groups();
        boolean isUserInGroup = userGroups.stream().anyMatch(g -> g.getId().equals(groupId));

        if (!isUserInGroup) {
            throw new IllegalStateException("User is not a member of the specified group.");
        }

        // Check if the user is the leader of the group
        Optional<GroupLeader> groupLeaderOpt = groupLeaderRepository.findByGroupId(groupName);
        if (groupLeaderOpt.isPresent()) {
            GroupLeader groupLeader = groupLeaderOpt.get();
            if (groupLeader.getLeader().equals(username)) {
                // Remove the group leader entry
                groupLeaderRepository.delete(groupLeader);
                System.out.println("User was the leader and has been removed from the GroupLeader table.");
            }
        }

        // Remove the user from the group
        keycloak.realm(REALM).users().get(userId).leaveGroup(groupId);
    }

    public List<UserDTO> getUsers(String groupName) {
        // Fetch the group from Keycloak
        List<GroupRepresentation> groups = keycloak.realm(REALM).groups().groups(groupName, 0, 1);

        if (groups.isEmpty()) {
            throw new NoSuchElementException("Group not found.");
        }

        GroupRepresentation group = groups.get(0);

        // Fetch members of the group
        GroupResource groupResource = keycloak.realm(REALM).groups().group(group.getId());
        List<UserRepresentation> members = groupResource.members();

        // Map UserRepresentation to UserDTO
        List<UserDTO> userDTOs = new ArrayList<>();
        for (UserRepresentation user : members) {
            UserDTO userDTO = new UserDTO();
            userDTO.setUsername(user.getUsername());
            userDTOs.add(userDTO);
        }

        return userDTOs;
    }


    private GroupDTO mapToGroupDTO(GroupRepresentation groupRepresentation) {
        return new GroupDTO(
                groupRepresentation.getId(),
                groupRepresentation.getName()
        );
    }
}
