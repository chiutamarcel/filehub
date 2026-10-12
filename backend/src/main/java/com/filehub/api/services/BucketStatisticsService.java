package com.filehub.api.services;

import com.filehub.api.dtos.BucketStatisticsDTO;
import com.filehub.api.dtos.BucketStatisticsDTO.FileTypeUsage;
import io.minio.*;
import io.minio.messages.Item;
import org.apache.tika.Tika;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class BucketStatisticsService {

    private final MinioClient minioClient;

    @Autowired
    public BucketStatisticsService(MinioClient minioClient) {
        this.minioClient = minioClient;
    }

    public BucketStatisticsDTO getBucketStatistics(String bucketName) throws Exception {
        // Retrieve the max size from the metadata marker
        long maxSize = getMaxSize(bucketName);

        // Collect file type usage and calculate total used storage
        Map<String, Long> fileTypeUsageMap = collectFileTypeUsage(bucketName);
        long usedStorage = fileTypeUsageMap.values().stream().mapToLong(Long::longValue).sum();

        // Sort and prepare the file type usage list
        List<FileTypeUsage> fileTypeUsages = fileTypeUsageMap.entrySet().stream()
                .sorted((e1, e2) -> Long.compare(e2.getValue(), e1.getValue()))
                .map(entry -> new FileTypeUsage(entry.getValue(), entry.getKey()))
                .collect(Collectors.toList());

        // Separate the top 4 file types
        List<FileTypeUsage> topFileTypes = new ArrayList<>();
        long otherUsage = 0;

        for (int i = 0; i < fileTypeUsages.size(); i++) {
            if (i < 4) {
                topFileTypes.add(fileTypeUsages.get(i));
            } else {
                otherUsage += fileTypeUsages.get(i).getUsed();
            }
        }

        // Add "other" and "free" entries
        if (otherUsage > 0) {
            topFileTypes.add(new FileTypeUsage(otherUsage, "other"));
        }

        long freeSpace = maxSize - usedStorage;
        if (freeSpace > 0) {
            topFileTypes.add(new FileTypeUsage(freeSpace, "free"));
        }

        return new BucketStatisticsDTO(maxSize, usedStorage, topFileTypes);
    }

    private long getMaxSize(String bucketName) throws Exception {
        String markerObject = "_metadata_marker";
        Map<String, String> tags = minioClient.getObjectTags(
                GetObjectTagsArgs.builder()
                        .bucket(bucketName)
                        .object(markerObject)
                        .build()
        ).get();

        String maxSizeStr = tags.get("maxSize");
        if (maxSizeStr == null) {
            throw new Exception("Metadata marker does not contain a maxSize tag.");
        }

        try {
            return Long.parseLong(maxSizeStr);
        } catch (NumberFormatException e) {
            throw new Exception("Invalid maxSize value in metadata: " + maxSizeStr, e);
        }
    }

    private Map<String, Long> collectFileTypeUsage(String bucketName) throws Exception {
        Map<String, Long> fileTypeUsageMap = new HashMap<>();

        Iterable<Result<Item>> results = minioClient.listObjects(
                ListObjectsArgs.builder()
                        .bucket(bucketName)
                        .recursive(true)
                        .build()
        );

        for (Result<Item> result : results) {
            Item item = result.get();

            if (!item.objectName().endsWith("/") && !item.objectName().equals("_metadata_marker")) {
                String mimeType = getFileType(bucketName, item.objectName());
                fileTypeUsageMap.put(mimeType, fileTypeUsageMap.getOrDefault(mimeType, 0L) + item.size());
            }
        }

        return fileTypeUsageMap;
    }

    private String getFileType(String bucketName, String objectName) throws Exception {
        try {
            StatObjectResponse objectStats = minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build()
            );
            return objectStats.contentType();
        } catch (Exception e) {
            throw new Exception("Error fetching file details for Bucket: " + bucketName + ", Object: " + objectName, e);
        }
    }
}
