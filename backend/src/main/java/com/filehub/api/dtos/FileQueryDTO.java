package com.filehub.api.dtos;

import java.util.Date;

public class FileQueryDTO {

    private String bucketName;
    private Long minFileSize;
    private Long maxFileSize;
    private Long equalFileSize;
    private Date minCreatedAt;
    private Date maxCreatedAt;
    private Date equalCreatedAt;
    private Date minModifiedAt;
    private Date maxModifiedAt;
    private Date equalModifiedAt;
    private String createdBy;
    private String fileType;

    public FileQueryDTO(String bucketName, Long minFileSize, Long maxFileSize, Long equalFileSize, Date minCreatedAt, Date maxCreatedAt, Date equalCreatedAt, Date minModifiedAt, Date maxModifiedAt, Date equalModifiedAt, String createdBy, String fileType) {
        this.bucketName = bucketName;
        this.minFileSize = minFileSize;
        this.maxFileSize = maxFileSize;
        this.equalFileSize = equalFileSize;
        this.minCreatedAt = minCreatedAt;
        this.maxCreatedAt = maxCreatedAt;
        this.equalCreatedAt = equalCreatedAt;
        this.minModifiedAt = minModifiedAt;
        this.maxModifiedAt = maxModifiedAt;
        this.equalModifiedAt = equalModifiedAt;
        this.createdBy = createdBy;
        this.fileType = fileType;
    }

    public String getBucketName() {
        return bucketName;
    }

    public void setBucketName(String bucketName) {
        this.bucketName = bucketName;
    }

    public Long getMinFileSize() {
        return minFileSize;
    }

    public void setMinFileSize(Long minFileSize) {
        this.minFileSize = minFileSize;
    }

    public Long getMaxFileSize() {
        return maxFileSize;
    }

    public void setMaxFileSize(Long maxFileSize) {
        this.maxFileSize = maxFileSize;
    }

    public Long getEqualFileSize() {
        return equalFileSize;
    }

    public void setEqualFileSize(Long equalFileSize) {
        this.equalFileSize = equalFileSize;
    }

    public Date getMaxCreatedAt() {
        return maxCreatedAt;
    }

    public void setMaxCreatedAt(Date maxCreatedAt) {
        this.maxCreatedAt = maxCreatedAt;
    }

    public Date getMinCreatedAt() {
        return minCreatedAt;
    }

    public void setMinCreatedAt(Date minCreatedAt) {
        this.minCreatedAt = minCreatedAt;
    }

    public Date getEqualCreatedAt() {
        return equalCreatedAt;
    }

    public void setEqualCreatedAt(Date equalCreatedAt) {
        this.equalCreatedAt = equalCreatedAt;
    }

    public Date getMinModifiedAt() {
        return minModifiedAt;
    }

    public void setMinModifiedAt(Date minModifiedAt) {
        this.minModifiedAt = minModifiedAt;
    }

    public Date getMaxModifiedAt() {
        return maxModifiedAt;
    }

    public void setMaxModifiedAt(Date maxModifiedAt) {
        this.maxModifiedAt = maxModifiedAt;
    }

    public Date getEqualModifiedAt() {
        return equalModifiedAt;
    }

    public void setEqualModifiedAt(Date equalModifiedAt) {
        this.equalModifiedAt = equalModifiedAt;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

}