package com.filehub.api.controllers;

import com.filehub.api.models.GroupRequest;
import com.filehub.api.services.GroupRequestService;
import com.filehub.api.services.GroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.NoSuchElementException;
import java.util.Optional;

@RestController
@RequestMapping(value = "requests")
public class GroupRequestController {

    @Autowired
    GroupRequestService groupRequestService;

    @GetMapping
    public ResponseEntity<?> findBy(
            @RequestParam Optional<String> userId,
            @RequestParam Optional<String> groupId
    )
    {
        try {
            return ResponseEntity.ok(groupRequestService.findBy(userId, groupId));
        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createRequest( @RequestBody GroupRequest groupRequest ) {
        GroupRequest rez;
        try {
            rez = groupRequestService.createRequest(groupRequest);
        } catch (IllegalArgumentException e) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(e.getMessage());
        } catch (NoSuchElementException e) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(e.getMessage());
        }

        return ResponseEntity.ok(rez);
    }

    @DeleteMapping
    public ResponseEntity<?> deleteRequest(
            @RequestParam String userId,
            @RequestParam String groupId
    )
    {
        try {
            groupRequestService.deleteRequest(userId, groupId);
        } catch (Exception e) {
            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(e.getMessage());
        }

        return ResponseEntity
                .status(HttpStatus.NO_CONTENT)
                .build();
    }

}
