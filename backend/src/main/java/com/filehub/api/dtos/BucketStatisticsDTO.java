package com.filehub.api.dtos;

import java.util.List;

public class BucketStatisticsDTO {

    private long maxSize;
    private long usedStorage;
    private List<FileTypeUsage> fileTypeUsage;

    public BucketStatisticsDTO(long maxSize, long usedStorage, List<FileTypeUsage> fileTypeUsage) {
        this.maxSize = maxSize;
        this.usedStorage = usedStorage;
        this.fileTypeUsage = fileTypeUsage;
    }

    public long getMaxSize() {
        return maxSize;
    }

    public void setMaxSize(long maxSize) {
        this.maxSize = maxSize;
    }

    public long getUsedStorage() {
        return usedStorage;
    }

    public void setUsedStorage(long usedStorage) {
        this.usedStorage = usedStorage;
    }

    public List<FileTypeUsage> getFileTypeUsage() {
        return fileTypeUsage;
    }

    public void setFileTypeUsage(List<FileTypeUsage> fileTypeUsage) {
        this.fileTypeUsage = fileTypeUsage;
    }

    public static class FileTypeUsage {
        private String type;
        private long used;

        public FileTypeUsage(long used, String type) {
            this.type = type;
            this.used = used;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }

        public long getUsed() {
            return used;
        }

        public void setUsed(long used) {
            this.used = used;
        }
    }
}
