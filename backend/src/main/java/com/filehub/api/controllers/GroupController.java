package com.filehub.api.controllers;

import com.filehub.api.dtos.GroupDTO;
import com.filehub.api.dtos.UserDTO;
import com.filehub.api.services.GroupService;
import org.keycloak.jose.jwk.JWK;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

@RestController
@RequestMapping(value = "group")
public class GroupController {

    @Autowired
    GroupService groupService;

    @GetMapping
    public ResponseEntity<?> getGroups(@RequestParam(value = "username", required = false) String username) {
        try {
            List<GroupDTO> groups = groupService.listAllGroups(Optional.ofNullable(username));
            return ResponseEntity.ok(groups);
        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(e.getMessage());
        }
    }

    @GetMapping("{groupName}")
    public ResponseEntity<?> getGroup(@PathVariable String groupName) {
        GroupDTO rez;
        try {
            rez = groupService.getGroup(groupName);
        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }

        return ResponseEntity.ok(rez);
    }

    @PostMapping
    public ResponseEntity<?> createGroup(@RequestBody GroupDTO groupDTO, @RequestHeader(value = "username", required = false) String username) {
        GroupDTO rez;
        try {
            if (username == null || username.isEmpty()) {
                username = null;
            }

            rez = groupService.createGroup(groupDTO, username);
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(e.getMessage());
        }

        return ResponseEntity.ok(rez);
    }

    @PutMapping("/{groupName}/leader")
    public ResponseEntity<?> updateGroupLeader(@PathVariable String groupName, @RequestHeader String username) {
        try {
            groupService.updateGroupLeader(groupName, username);
            return ResponseEntity.ok("Group leader updated successfully.");
        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error updating group leader: " + e.getMessage());
        }
    }

    @PutMapping("{groupName}")
    public ResponseEntity<?> updateGroup(@PathVariable String groupName, @RequestBody GroupDTO groupDTO) {
        GroupDTO rez;
        try {
            rez = groupService.updateGroup(groupName, groupDTO);
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }

        return ResponseEntity.ok(rez);
    }

    @DeleteMapping("{groupName}")
    public ResponseEntity<?> deleteGroup(@PathVariable String groupName) {
        try {
            groupService.deleteGroup(groupName);
        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }

        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PostMapping("/{groupName}/users")
    public ResponseEntity<?> addUserToGroup(@PathVariable String groupName, @RequestBody UserDTO userDTO) {
        try {
            groupService.addUserToGroup(groupName, userDTO);
            return ResponseEntity.ok("User added to group successfully.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred: " + e.getMessage());
        }
    }

    @DeleteMapping("/{groupName}/users/{username}")
    public ResponseEntity<?> removeUserFromGroup(@PathVariable String groupName, @PathVariable String username) {
        try {
            groupService.removeUserFromGroup(groupName, username);
            return ResponseEntity.ok("User removed from group successfully.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("An error occurred: " + e.getMessage());
        }
    }

    @GetMapping("{groupName}/users")
    public ResponseEntity<?> getUsers(@PathVariable String groupName) {
        List<UserDTO> rez;
        try {
            rez = groupService.getUsers(groupName);
        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }

        return ResponseEntity.ok(rez);
    }
}
