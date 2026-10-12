package com.filehub.api.repositories;

import com.filehub.api.GroupRequestId;
import com.filehub.api.models.GroupLeader;
import com.filehub.api.models.GroupRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GroupRequestRepository extends JpaRepository<GroupRequest, GroupRequestId> {
    List<GroupRequest> findByUserId(String userId);
    List<GroupRequest> findByGroupId(String userId);
    boolean existsByGroupId(String groupId);
    void deleteByGroupId(String groupId);
}
