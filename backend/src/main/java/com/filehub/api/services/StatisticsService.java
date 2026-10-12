package com.filehub.api.services;

import com.filehub.api.dtos.BucketStatisticsDTO;
import com.filehub.api.models.LoginLog;
import com.filehub.api.repositories.LoginLogRepository;
import io.minio.ListObjectsArgs;
import io.minio.MinioClient;
import io.minio.Result;
import io.minio.messages.Bucket;
import io.minio.messages.Item;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatisticsService {

    private final MinioClient minioClient;
    private final BucketStatisticsService bucketStatisticsService;
    private final LoginLogRepository loginLogRepository;

    @Autowired
    public StatisticsService(MinioClient minioClient, BucketStatisticsService bucketStatisticsService, LoginLogRepository loginLogRepository) {
        this.minioClient = minioClient;
        this.bucketStatisticsService = bucketStatisticsService;
        this.loginLogRepository = loginLogRepository;
    }

    public List<String> getTopBuckets() throws Exception {
        List<Bucket> buckets;
        try {
            buckets = minioClient.listBuckets(); // Fetch all buckets
        } catch (Exception e) {
            throw new RuntimeException("Error retrieving bucket list from Minio", e);
        }

        Map<String, Long> bucketUsageMap = new HashMap<>();

        for (Bucket bucket : buckets) {
            String bucketName = bucket.name();
            try {
                // Fetch the bucket statistics
                BucketStatisticsDTO stats = bucketStatisticsService.getBucketStatistics(bucketName);
                if (stats != null) {
                    long usedStorage = stats.getUsedStorage();
                    bucketUsageMap.put(bucketName, usedStorage);
                } else {
                    bucketUsageMap.put(bucketName, 0L); // If stats are null, assume 0 storage used
                }
            } catch (Exception e) {
                // Log and handle errors when retrieving statistics for individual buckets
                System.err.println("Error retrieving statistics for bucket: " + bucketName);
                e.printStackTrace();
                bucketUsageMap.put(bucketName, 0L); // Assume 0 if stats fail
            }
        }

        // Sort buckets by used storage in descending order and return the top 5 bucket names
        return bucketUsageMap.entrySet().stream()
                .sorted((e1, e2) -> Long.compare(e2.getValue(), e1.getValue()))
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    public Map<String, Object> getActivity() {
        Map<String, Object> activity = new HashMap<>();

        // Get the current time
        LocalDateTime now = LocalDateTime.now();

        // Calculate the start times for day, week, and month
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfWeek = now.minusWeeks(1);
        LocalDateTime startOfMonth = now.minusMonths(1);

        // Count logins for each period
        long loginsToday = countUniqueLogins(startOfDay, now);
        long loginsThisWeek = countUniqueLogins(startOfWeek, now);
        long loginsThisMonth = countUniqueLogins(startOfMonth, now);

        activity.put("lastDay", loginsToday);
        activity.put("lastWeek", loginsThisWeek);
        activity.put("lastMonth", loginsThisMonth);

        return activity;
    }

    private long countUniqueLogins(LocalDateTime start, LocalDateTime end) {
        List<LoginLog> logs = loginLogRepository.findByTimestampBetween(start, end);

        // Return the number of unique usernames (distinct logins)
        return logs.stream()
                .map(LoginLog::getUsername)
                .distinct()
                .count();
    }

    public Long getUsedStorage() throws Exception {
        long totalUsedStorage = 0;

        // List all buckets
        List<Bucket> buckets = minioClient.listBuckets();

        // Iterate through each bucket and calculate total storage used
        for (Bucket bucket : buckets) {
            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucket.name())
                            .recursive(true)
                            .build()
            );

            for (Result<Item> result : results) {
                Item item = result.get();
                // Skip directories or special metadata files
                if (!item.objectName().endsWith("/")) {
                    totalUsedStorage += item.size();
                }
            }
        }

        return totalUsedStorage;
    }

    public Map<String, Long> getLoginStatusCounts() {
        // Numără toate autentificările cu status SUCCESS
        long successCount = loginLogRepository.countByStatus(LoginLog.LoginStatus.SUCCESS);

        // Numără toate autentificările cu status FAILURE
        long failureCount = loginLogRepository.countByStatus(LoginLog.LoginStatus.FAILURE);

        // Returnează rezultatul sub formă de map
        Map<String, Long> loginStatusCounts = new HashMap<>();
        loginStatusCounts.put("success", successCount);
        loginStatusCounts.put("failure", failureCount);

        return loginStatusCounts;
    }
}