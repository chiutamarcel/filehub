package com.filehub.api.repositories;

import com.filehub.api.models.GroupLeader;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GroupLeaderRepository extends JpaRepository<GroupLeader, String> {
    Optional<GroupLeader> findByGroupId(String groupId);
    boolean existsByGroupId(String groupId);

    @Query("SELECT g FROM GroupLeader g WHERE g.leader = :leader")
    List<GroupLeader> findByLeader(@Param("leader") String leader);
}
