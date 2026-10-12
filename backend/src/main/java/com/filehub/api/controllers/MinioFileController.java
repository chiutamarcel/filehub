package com.filehub.api.controllers;

import com.filehub.api.dtos.FileQueryDTO;
import com.filehub.api.dtos.MinioFileDTO;
import com.filehub.api.services.MinioFileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/files")
public class MinioFileController {

    private final MinioFileService minioFileService;

    @Autowired
    public MinioFileController(MinioFileService minioFileService) {
        this.minioFileService = minioFileService;
    }

    @PostMapping("/createBucket")
    public ResponseEntity<String> createBucket(@RequestParam String bucketName) {
        try {
            minioFileService.createBucket(bucketName, false);
            return ResponseEntity.ok("Bucket created successfully: " + bucketName);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error creating bucket: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createFile(@RequestPart MinioFileDTO model, @RequestPart(required = false) MultipartFile file) {
        try {
            if (model.getIsFolder().equals("true")) {
                minioFileService.createFolder(model, false);
                return ResponseEntity.ok(model);
            } else if (model.getIsFolder()  .equals("false")){
                MinioFileDTO result = minioFileService.uploadFile(model, file, false);
                return ResponseEntity.ok(result);
            }
            return ResponseEntity.badRequest().body("Invalid isFolder value.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error uploading file: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<?> getAllFiles(FileQueryDTO model) {
        try {
            List<MinioFileDTO> files = minioFileService.getAllFiles(model, false);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving files: " + e.getMessage());
        }
    }

    @GetMapping("/all-buckets")
    public ResponseEntity<?> getAllFilesFromAllBuckets(FileQueryDTO model) {
        try {
            List<MinioFileDTO> files = minioFileService.getAllFilesFromAllBuckets(model, false);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error retrieving files from all buckets: " + e.getMessage());
        }
    }

    @GetMapping("/{bucketName}/search")
    public ResponseEntity<List<MinioFileDTO>> searchFiles(@PathVariable String bucketName, @RequestParam String prefix) {
        try {
            List<MinioFileDTO> files = minioFileService.partialSearch(bucketName, prefix, false);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }

    @GetMapping("/search/all-buckets")
    public ResponseEntity<List<MinioFileDTO>> searchFilesInAllBuckets(@RequestParam String prefix) {
        try {
            // Apelează funcția de căutare în toate bucket-urile
            List<MinioFileDTO> files = minioFileService.partialSearchInAllBuckets(prefix, false);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Collections.emptyList());
        }
    }


    @GetMapping("/fileDetails")
    public ResponseEntity<?> getFileDetailsByBucketAndObjectNameController(@RequestPart MinioFileDTO model) {
        try {
            MinioFileDTO fileDetails = minioFileService.getFileDetailsByBucketAndObjectName(model.getBucketName(), model.getObjectName(), false);
            return ResponseEntity.ok(fileDetails);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/update")
    public ResponseEntity<?> updateFile(@RequestPart MinioFileDTO oldFileDTO, @RequestPart MinioFileDTO newFileDTO, @RequestPart(value = "file", required = false) MultipartFile file) {
        try {
            MinioFileDTO updatedFile = minioFileService.updateFile(oldFileDTO, newFileDTO, file, false);
            return ResponseEntity.ok(updatedFile);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/{bucketName}/rename")
    public ResponseEntity<?> renameFolder(@PathVariable String bucketName,
                                          @RequestPart String oldPrefix,
                                          @RequestPart String newPrefix) {
        try {
            minioFileService.renameFolder(oldPrefix, newPrefix, bucketName, false);
            return ResponseEntity.ok("Folder renamed successfully!");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping
    public ResponseEntity<?> deleteFile(@RequestBody MinioFileDTO model,
                                        @RequestParam(required = false) String versionId) {
        try {
            minioFileService.deleteFile(model, versionId, false);

            String responseMessage = (versionId != null && !versionId.isEmpty())
                    ? "Version " + versionId + " of " + model.getObjectName() + " deleted from " + model.getBucketName()
                    : model.getObjectName() + " deleted from " + model.getBucketName();

            return ResponseEntity.ok(responseMessage);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/generateLink")
    public ResponseEntity<?> generatePresignedUrl(@RequestPart MinioFileDTO model,
                                                  @RequestParam Integer expiryHours,
                                                  @RequestParam(required = false) String user,
                                                  @RequestParam(required = false) String versionId) {
        try {
            String url = minioFileService.generatePresignedUrl(model, expiryHours, user, versionId, false);
            return ResponseEntity.ok(url);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error generating presigned URL: " + e.getMessage());
        }
    }


    @GetMapping("/download")
    public ResponseEntity<?> downloadFile(MinioFileDTO model,
                                          @RequestParam(value = "versionId", required = false) String versionId) {
        try {
            return minioFileService.downloadFile(model, versionId, false);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
        }
    }

    @GetMapping("/versions")
    public ResponseEntity<List<String>> getFileVersionIds(
            @RequestPart MinioFileDTO model) {
        try {
            List<String> versionIds = minioFileService.getFileVersionIds(model.getBucketName(), model.getObjectName(), false);
            return ResponseEntity.ok(versionIds);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Collections.singletonList("Error: " + e.getMessage()));
        }
    }

    @DeleteMapping("/bucket")
    public ResponseEntity<?> deleteBucket(@RequestParam String bucketName) {
        try {
            minioFileService.deleteBucket(bucketName, false);
            return ResponseEntity.ok("Bucket " + bucketName + " and all its contents were successfully deleted.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/recents/{bucketName}")
    public ResponseEntity<?> getTwoMostRecentlyModifiedFiles(@PathVariable String bucketName) {
        try {
            List<MinioFileDTO> files = minioFileService.getTwoMostRecentlyModifiedFiles(bucketName, false);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving recent files: " + e.getMessage());
        }
    }

    @GetMapping("/to-be-deleted")
    public ResponseEntity<?> getFilesMarkedToBeDeleted(@RequestParam(required = false) String bucketName) {
        try {
            List<MinioFileDTO> files = minioFileService.getFilesMarkedToBeDeleted(bucketName, false);
            return ResponseEntity.ok(files);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error retrieving files marked to be deleted: " + e.getMessage());
        }
    }

    @PutMapping("/mark-to-be-deleted")
    public ResponseEntity<?> markFileToBeDeleted(@RequestParam String bucketName, @RequestParam String objectName) {
        try {
            minioFileService.markFileToBeDeleted(bucketName, objectName, false);
            return ResponseEntity.ok("Object " + objectName + " marked as not to be deleted.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error marking file as not to be deleted: " + e.getMessage());
        }
    }

    @PutMapping("/mark-not-to-be-deleted")
    public ResponseEntity<?> markFileNotToBeDeleted(@RequestParam String bucketName, @RequestParam String objectName) {
        try {
            minioFileService.markFileNotToBeDeleted(bucketName, objectName, false);
            return ResponseEntity.ok("Object " + objectName + " marked as not to be deleted.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error marking file as not to be deleted: " + e.getMessage());
        }
    }
    @PutMapping("/{bucketName}/max-size")
    public ResponseEntity<String> updateMaxSize(
            @PathVariable String bucketName,
            @RequestParam String maxSize
    ) {
        try {
            minioFileService.updateMaxSize(bucketName, maxSize, true);
            return ResponseEntity.ok("Updated maxSize to " + maxSize + " for bucket: " + bucketName);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Internal server error: " + e.getMessage());
        }
    }

}

