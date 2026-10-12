package com.filehub.api.repositories;

import com.filehub.api.models.LoginLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LoginLogRepository extends JpaRepository<LoginLog, Long> {

    // Query to find login logs for a given time range
    List<LoginLog> findByTimestampBetween(LocalDateTime start, LocalDateTime end);

    // Query to find login logs by a specific username
    List<LoginLog> findByUsername(String username);

    // Query to find login logs within a specific date range (e.g., last 24 hours, week, or month)
    List<LoginLog> findByTimestampAfter(LocalDateTime timestamp);

    long countByStatus(LoginLog.LoginStatus status);
}
