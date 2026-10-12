package com.filehub.api.dtos;

import java.util.Date;
import java.util.List;

public class MinioFileDTO {

    private int id;
    private String bucketName;
    private String objectName;
    private long fileSize;
    private Date createdAt;
    private Date modifiedAt;
    private String createdBy;
    private String fileType;
    private List<String> versionIds;
    private String isFolder = "false";

    public MinioFileDTO(int id, String bucketName, String objectName, long fileSize, Date createdAt, Date modifiedAt, String createdBy, String fileType, List<String> versionIds, String isFolder) {
        this.id = id;
        this.bucketName = bucketName;
        this.objectName = objectName;
        this.fileSize = fileSize;
        this.createdAt = createdAt;
        this.modifiedAt = modifiedAt;
        this.createdBy = createdBy;
        this.fileType = fileType;
        this.versionIds = versionIds;
        this.isFolder = isFolder;
    }

    public MinioFileDTO(int id, String bucketName, String objectName, long fileSize, Date createdAt, Date modifiedAt, String createdBy, String fileType, List<String> versionIds) {
        this(id, bucketName, objectName, fileSize, createdAt, modifiedAt, createdBy, fileType, versionIds, "false");
    }

    public List<String> getVersionIds() {
        return versionIds;
    }

    public void setVersionIds(List<String> versionIds) {
        this.versionIds = versionIds;
    }

    public MinioFileDTO(String bucketName, String objectName, String createdBy, String isFolder) {
        this.bucketName = bucketName;
        this.objectName = objectName;
        this.createdBy = createdBy;
        this.isFolder = isFolder;
    }


    public MinioFileDTO() {
    }

    // Getters and Setters
    public int getId() { return id; }
    public void setId(int id) { this.id = id; }
    public String getBucketName() { return bucketName; }
    public void setBucketName(String bucketName) { this.bucketName = bucketName; }
    public String getObjectName() { return objectName; }
    public void setObjectName(String objectName) { this.objectName = objectName; }
    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    public Date getModifiedAt() { return modifiedAt; }
    public void setModifiedAt(Date modifiedAt) { this.modifiedAt = modifiedAt; }
    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }
    public String getFileType() { return fileType; } // New getter
    public void setFileType(String fileType) { this.fileType = fileType; } // New setter

    public String getIsFolder() {
        return isFolder;
    }

    public void setIsFolder(String isFolder) {
        this.isFolder = isFolder;
    }
}
