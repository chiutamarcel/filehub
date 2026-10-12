package com.filehub.api.services;

import com.filehub.api.GroupRequestId;
import com.filehub.api.models.GroupRequest;
import com.filehub.api.repositories.GroupRequestRepository;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.GroupRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Example;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@Service
public class GroupRequestService {
    GroupRequestRepository groupRequestRepository;
    private final Keycloak keycloak;
    private static final String REALM = "FileHub";

    @Autowired
    public GroupRequestService(GroupRequestRepository groupRequestRepository, Keycloak keycloak) {
        this.keycloak = keycloak;
        this.groupRequestRepository = groupRequestRepository;
    }

    public List<GroupRequest> findBy(
            Optional<String> userId,
            Optional<String> groupId
    )
    {
        List<GroupRequest> rez;

        if (userId.isPresent() && groupId.isPresent()) {
            Optional<GroupRequest> optGR;
            optGR = groupRequestRepository.findById(new GroupRequestId(groupId.get(), userId.get()));

            if (optGR.isEmpty()) {
                throw new NoSuchElementException("The group request doesn't exist");
            }

            rez = new ArrayList<>();
            rez.add(optGR.get());
        } else if (userId.isPresent()) {
            rez = groupRequestRepository.findByUserId(userId.get());
        } else if (groupId.isPresent()) {
            rez = groupRequestRepository.findByGroupId(groupId.get());
        } else {
            rez = groupRequestRepository.findAll();
        }

        return rez;
    }

    public GroupRequest createRequest(GroupRequest groupRequest) {
        Example<GroupRequest> example = Example.of(groupRequest);

        var users = keycloak.realm(REALM).users().search(groupRequest.getUserId());
        if (users.stream().noneMatch(user -> groupRequest.getUserId().equals(user.getUsername()))) {
            throw new NoSuchElementException("User not found.");
        }

        List<GroupRepresentation> groups = keycloak.realm(REALM).groups().groups(groupRequest.getGroupId(), 0, 1);

        if(groups.isEmpty()){
            throw new NoSuchElementException("Group not found.");
        }

        GroupRepresentation group = groups.get(0);
        List<UserRepresentation> groupMembers = keycloak.realm(REALM).groups()
                .group(group.getId())
                .members();

        // Verificare dacă utilizatorul este deja membru al grupului
        if (groupMembers.stream().anyMatch(member -> groupRequest.getUserId().equals(member.getUsername()))) {
            throw new IllegalArgumentException("User is already a member of the group.");
        }

        if (groupRequestRepository.exists(example)) {
            throw new IllegalArgumentException("An invitation has already been sent!");
        }

        groupRequestRepository.save(groupRequest);

        return groupRequest;
    }

    public void deleteRequest(String userId, String groupId) {
        Example<GroupRequest> example = Example.of(new GroupRequest(groupId, userId));
        if (!groupRequestRepository.exists(example)) {
            throw new NoSuchElementException("The group request doesn't exist!");
        }

        groupRequestRepository.delete(example.getProbe());
    }
}
