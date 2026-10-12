package com.filehub.api.services;

import com.filehub.api.dtos.FileQueryDTO;
import com.filehub.api.dtos.MinioFileDTO;
import io.minio.*;
import io.minio.credentials.Jwt;
import io.minio.credentials.WebIdentityProvider;
import io.minio.errors.ErrorResponseException;
import io.minio.errors.MinioException;
import io.minio.http.Method;
import io.minio.messages.Bucket;
import io.minio.messages.Item;
import io.minio.messages.Tags;
import io.minio.messages.VersioningConfiguration;
import org.apache.tika.Tika;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.temporal.ChronoField;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@Service
public class MinioFileService {

    private static Logger logger = LoggerFactory.getLogger(MinioFileService.class);

    private int maxNrRows = 20;

    @Value("${minio.server.url}")
    private String minioUrl;

    private final Supplier<MinioClient> userClientSupplier;
    private final MinioClient adminClient;

    @Autowired
    public MinioFileService(
            @Qualifier("UserMinIOSupplier")
            Supplier<MinioClient> userClientSupplier,
            @Qualifier("AdminMinIOClient")
            MinioClient adminClient)
    {
        this.userClientSupplier = userClientSupplier;
        this.adminClient = adminClient;
    }

    MinioClient chooseClient(boolean asSystem) {
        if (asSystem) {
            logger.info("Using admin client for this request");
            return this.adminClient;
        }

        logger.info("Using user client for this request");
        return this.userClientSupplier.get();
    }

    public void createBucket(String bucketName, boolean asSystem) throws Exception {
        try {
            MinioClient minioClient = chooseClient(asSystem);

            if (minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build())) {
                throw new IllegalArgumentException("Bucket already exists: " + bucketName);
            }

            minioClient.makeBucket(MakeBucketArgs.builder().bucket(bucketName).build());

            VersioningConfiguration versioningConfig = new VersioningConfiguration(VersioningConfiguration.Status.ENABLED, null);
            minioClient.setBucketVersioning(
                    SetBucketVersioningArgs.builder()
                            .bucket(bucketName)
                            .config(versioningConfig)
                            .build()
            );
            System.out.println("Bucket versioning enabled for: " + bucketName);

            // Add metadata marker with maxSize tag
            String markerObject = "_metadata_marker";
            byte[] emptyContent = new byte[0];
            ByteArrayInputStream inputStream = new ByteArrayInputStream(emptyContent);

            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(bucketName)
                    .object(markerObject)
                    .stream(inputStream, 0, -1)
                    .build());

            // Add the "maxSize" tag to the marker object
            Map<String, String> tags = new HashMap<>();
            tags.put("maxSize", "1073741824");
            minioClient.setObjectTags(SetObjectTagsArgs.builder()
                    .bucket(bucketName)
                    .object(markerObject)
                    .tags(tags)
                    .build());
            System.out.println("Metadata marker added with maxSize tag for: " + bucketName);
        } catch (MinioException e) {
            throw new Exception("Error creating bucket: " + e.getMessage(), e);
        }
    }

    public String getFileMIMEType(MultipartFile file) throws IOException {
        Tika tika = new Tika();
        try (InputStream inputStream = file.getInputStream()) {

            String mimeType = tika.detect(inputStream, file.getOriginalFilename());
            return mimeType != null ? mimeType : "application/octet-stream";
        }
    }

    public boolean doesFileExist(MinioFileDTO fileModel, boolean asSystem) throws Exception {
        try {
            MinioClient minioClient = chooseClient(asSystem);

            minioClient.statObject(StatObjectArgs.builder()
                    .bucket(fileModel.getBucketName())
                    .object(fileModel.getObjectName())
                    .build());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private Map<String, String> setTags(MinioFileDTO fileModel) {
        Map<String, String> tags = new HashMap<>();
        tags.put("FileID", String.valueOf(fileModel.getId()));
        tags.put("CreatedBy", fileModel.getCreatedBy() != null ? fileModel.getCreatedBy() : "Unknown");
        tags.put("FileSize", String.valueOf(fileModel.getFileSize()));
        tags.put("CreatedTime", String.valueOf(fileModel.getCreatedAt().getTime()));
        tags.put("ModifiedTime", String.valueOf(fileModel.getModifiedAt().getTime()));
        tags.put("isFolder", "false");
        tags.put("toBeDeleted", "false");
        return tags;
    }

    private Map<String, String> getTags(String bucketName, String objectName, boolean asSystem) throws Exception {
        try {
            MinioClient minioClient = chooseClient(asSystem);

            Tags tags = minioClient.getObjectTags(GetObjectTagsArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .build());

            return tags.get();
        } catch (Exception e) {
            throw new Exception("Error fetching tags for Bucket: " + bucketName + ", Object: " + objectName, e);
        }
    }

    public MinioFileDTO uploadFile(MinioFileDTO fileModel, MultipartFile file, boolean asSystem) throws Exception {
        MinioClient minioClient = chooseClient(asSystem);

        String objectName = fileModel.getObjectName();
        if (objectName.contains("/")) {
            String folderPath = objectName.substring(0, objectName.lastIndexOf("/"));

            if (doesFolderExist(fileModel.getBucketName(), folderPath, asSystem)) {
                Map<String, String> folderTags = getTags(fileModel.getBucketName(), folderPath, asSystem);
                if (folderTags != null && "true".equals(folderTags.get("isFolder"))) {
                    try {
                        if (folderPath.endsWith("/")) {
                            folderPath = folderPath.substring(0, folderPath.length() - 1);
                        }

                        MinioFileDTO fakeFolderModel = new MinioFileDTO();
                        fakeFolderModel.setBucketName(fileModel.getBucketName());
                        fakeFolderModel.setObjectName(folderPath);

                        deleteFile(fakeFolderModel, null, asSystem);
                    } catch (Exception e) {
                        throw new Exception("Error deleting fake folder: " + folderPath, e);
                    }
                }
            }
        }

        if (doesFileExist(fileModel, asSystem)) {
            // Dacă fișierul există deja, apelăm funcția updateFile și returnăm răspunsul acesteia
            return updateFile(fileModel, fileModel, file, asSystem);
        }

        // Check if there is enough space in the bucket
        checkBucketSpace(fileModel.getBucketName(), file.getSize(), null, asSystem);

        try (InputStream inputStream = file.getInputStream()) {
            minioClient.putObject(PutObjectArgs.builder()
                    .bucket(fileModel.getBucketName())
                    .object(fileModel.getObjectName())
                    .stream(inputStream, file.getSize(), -1)
                    .contentType(file.getContentType())
                    .build());

            fileModel.setId(0); //asta va fi din BD
            fileModel.setFileSize(file.getSize());
            fileModel.setCreatedAt(new Date());
            fileModel.setModifiedAt(new Date());

            String fileType = getFileMIMEType(file);
            fileModel.setFileType(fileType);

            Map<String, String> tags = setTags(fileModel);

            minioClient.setObjectTags(SetObjectTagsArgs.builder()
                    .bucket(fileModel.getBucketName())
                    .object(fileModel.getObjectName())
                    .tags(tags)
                    .build());

            List<String> versionIds = this.getFileVersionIds(fileModel.getBucketName(), fileModel.getObjectName(), asSystem);
            fileModel.setVersionIds(versionIds);

            return fileModel; // Returnăm detaliile fișierului nou creat
        } catch (MinioException e) {
            throw new Exception("Error uploading file: " + e.getMessage(), e);
        }
    }


    public MinioFileDTO getFileDetailsByBucketAndObjectName(String bucketName, String objectName, boolean asSystem) throws Exception {
        try {
            MinioClient minioClient = chooseClient(asSystem);

            if(objectName.equals("_metadata_marker")) {
                throw new Exception("_metadata_marker can't be accessed.");
            }

            Map<String, String> tags = getTags(bucketName, objectName, asSystem);
            if (tags == null || tags.isEmpty()) {
                throw new Exception("No tags found for Bucket: " + bucketName + ", Object: " + objectName);
            }

            StatObjectResponse objectStats = minioClient.statObject(
                    StatObjectArgs.builder()
                            .bucket(bucketName)
                            .object(objectName)
                            .build()
            );
            String fileType = objectStats.contentType();

            List<String> versionIds = this.getFileVersionIds(bucketName, objectName, asSystem);

            String isFolder = tags.getOrDefault("isFolder", "false");

            return new MinioFileDTO(
                    Integer.parseInt(tags.getOrDefault("FileID", "0")),
                    bucketName,objectName,Long.parseLong(tags.getOrDefault("FileSize", "0")),
                    new Date(Long.parseLong(tags.getOrDefault("CreatedTime", "0"))),
                    new Date(Long.parseLong(tags.getOrDefault("ModifiedTime", "0"))),
                    tags.getOrDefault("CreatedBy", "Unknown"),
                    fileType,
                    versionIds,
                    isFolder);
        } catch (Exception e) {
            throw new Exception("Error fetching file details for Bucket: " + bucketName + ", Object: " + objectName + " " + e.getMessage(), e);
        }
    }

    public List<MinioFileDTO> getAllFiles(FileQueryDTO queryDTO, boolean asSystem) throws Exception {
        List<MinioFileDTO> resultFiles = new ArrayList<>();

        if (queryDTO == null || queryDTO.getBucketName() == null || queryDTO.getBucketName().isEmpty()) {
            throw new IllegalArgumentException("Bucket name must be provided.");
        }

        MinioClient minioClient = chooseClient(asSystem);

        String bucketName = queryDTO.getBucketName();

        Iterable<Result<Item>> results = minioClient.listObjects(
                ListObjectsArgs.builder()
                        .bucket(bucketName)
                        .recursive(true)
                        .maxKeys(maxNrRows)
                        .build()
        );

        for (Result<Item> result : results) {
            Item item = result.get();
            String objectName = item.objectName();

            if (objectName.endsWith("/") || objectName.equals("_metadata_marker")) {
                continue; // Skip folders
            }

            Map<String, String> tags = getTags(bucketName, objectName, asSystem);

            if ("true".equalsIgnoreCase(tags.get("toBeDeleted"))) {
                System.out.println("Skipping file " + objectName + " because it is marked for deletion.");
                continue;
            }


            try {
                MinioFileDTO model = getFileDetailsByBucketAndObjectName(bucketName, objectName, asSystem);

                // Apply filters from queryDTO
                if (applyFilters(model, queryDTO)) {
                    resultFiles.add(model);
                }
            } catch (Exception e) {
                throw new Exception("Error fetching file details for object: " + objectName, e);
            }
        }

        return resultFiles;
    }

    public List<MinioFileDTO> getAllFilesFromAllBuckets(FileQueryDTO queryDTO, boolean asSystem) throws Exception {
        List<MinioFileDTO> resultFiles = new ArrayList<>();

        MinioClient minioClient = chooseClient(asSystem);

        List<Bucket> buckets = minioClient.listBuckets();

        for (Bucket bucket : buckets) {
            String bucketName = bucket.name();

            if (bucketName.startsWith("group-")) {
                continue;
            }

            FileQueryDTO bucketQueryDTO = new FileQueryDTO(
                    bucketName,
                    queryDTO.getMinFileSize(),
                    queryDTO.getMaxFileSize(),
                    queryDTO.getEqualFileSize(),
                    queryDTO.getMinCreatedAt(),
                    queryDTO.getMaxCreatedAt(),
                    queryDTO.getEqualCreatedAt(),
                    queryDTO.getMinModifiedAt(),
                    queryDTO.getMaxModifiedAt(),
                    queryDTO.getEqualModifiedAt(),
                    queryDTO.getCreatedBy(),
                    queryDTO.getFileType()
            );

            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .recursive(true)
                            .maxKeys(maxNrRows)
                            .build()
            );

            for (Result<Item> result : results) {
                Item item = result.get();
                String objectName = item.objectName();

                if (objectName.endsWith("/") || objectName.equals("_metadata_marker")) {
                    continue;
                }

                try {
                    MinioFileDTO model = getFileDetailsByBucketAndObjectName(bucketName, objectName, asSystem);

                    Map<String, String> tags = getTags(bucketName, objectName, asSystem);

                    if ("true".equalsIgnoreCase(tags.get("toBeDeleted"))) {
                        continue;
                    }

                    if (applyFilters(model, bucketQueryDTO)) {
                        resultFiles.add(model);
                    }
                } catch (Exception e) {
                    throw new Exception("Error fetching file details for object: " + objectName + " in bucket: " + bucketName, e);
                }
            }
        }

        return resultFiles;
    }



    private boolean applyFilters(MinioFileDTO model, FileQueryDTO queryDTO) {
        // Filter by file size
        if (queryDTO.getEqualFileSize() != null && queryDTO.getEqualFileSize() > 0 && model.getFileSize() != queryDTO.getEqualFileSize()) {
            return false;
        }
        if (queryDTO.getMinFileSize() != null && queryDTO.getMinFileSize() > 0 && model.getFileSize() < queryDTO.getMinFileSize()) {
            return false;
        }
        if (queryDTO.getMaxFileSize() != null && queryDTO.getMaxFileSize() > 0 && model.getFileSize() > queryDTO.getMaxFileSize()) {
            return false;
        }

        // Filter by createdBy
        if (queryDTO.getCreatedBy() != null && !queryDTO.getCreatedBy().isEmpty() &&
                !queryDTO.getCreatedBy().equals(model.getCreatedBy())) {
            return false;
        }

        // Filter by fileType
        if (queryDTO.getFileType() != null && !queryDTO.getFileType().isEmpty() &&
                !queryDTO.getFileType().equals(model.getFileType())) {
            return false;
        }

        // Filter by createdAt
        if (queryDTO.getEqualCreatedAt() != null && !queryDTO.getEqualCreatedAt().equals(model.getCreatedAt())) {
            return false;
        }
        if (queryDTO.getMinCreatedAt() != null && model.getCreatedAt().before(queryDTO.getMinCreatedAt())) {
            return false;
        }
        if (queryDTO.getMaxCreatedAt() != null && model.getCreatedAt().after(queryDTO.getMaxCreatedAt())) {
            return false;
        }

        // Filter by modifiedAt
        if (queryDTO.getEqualModifiedAt() != null && !queryDTO.getEqualModifiedAt().equals(model.getModifiedAt())) {
            return false;
        }
        if (queryDTO.getMinModifiedAt() != null && model.getModifiedAt().before(queryDTO.getMinModifiedAt())) {
            return false;
        }
        if (queryDTO.getMaxModifiedAt() != null && model.getModifiedAt().after(queryDTO.getMaxModifiedAt())) {
            return false;
        }

        return true; // Passes all filters
    }


    public MinioFileDTO updateFile(MinioFileDTO oldFileData, MinioFileDTO newFileData, MultipartFile newFileOptional, boolean asSystem) throws Exception {

        MinioClient minioClient = chooseClient(asSystem);

        if(oldFileData.getObjectName().equals("_metadata_marker")) {
            throw new Exception("_metadata_marker can't be modified.");
        }

        if (oldFileData == null) {
            throw new IllegalArgumentException("Old file metadata must be provided.");
        }

        if (newFileData == null) {
            throw new IllegalArgumentException("New file metadata must be provided.");
        }

        MinioFileDTO newlyModifiedFileData = this.getFileDetailsByBucketAndObjectName(oldFileData.getBucketName(), oldFileData.getObjectName(), asSystem);


        if (!doesFileExist(newlyModifiedFileData, asSystem)) {
            throw new Exception("File doesn't exist in bucket: " + oldFileData.getBucketName() + " in " + oldFileData.getObjectName());
        }

        String oldBucketName = oldFileData.getBucketName();
        String oldObjectName = oldFileData.getObjectName();

        String newBucketName = newFileData.getBucketName() != null ? newFileData.getBucketName() : oldBucketName;
        String newObjectName = newFileData.getObjectName() != null ? newFileData.getObjectName() : oldObjectName;

        // verificam daca s-a modificat bucketName sau objectName
        // daca da, atunci stergem vechiul obiect si adaugam unul nou
        if(!newBucketName.equals(oldBucketName) || !newObjectName.equals(oldObjectName)) {
            minioClient.copyObject(CopyObjectArgs.builder()
                    .source(CopySource.builder()
                            .bucket(oldBucketName)
                            .object(oldObjectName)
                            .build())
                    .bucket(newBucketName)
                    .object(newObjectName)
                    .build());

            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(oldBucketName)
                    .object(oldObjectName)
                    .build());
        }


        // daca se adauga un fisier in request, atunci continutul fisierului va fi modificat
        if (newFileOptional != null) {
            // Check if there is enough space in the bucket
            checkBucketSpace(newBucketName, newFileOptional.getSize(), newlyModifiedFileData.getFileSize(), asSystem);
            try (InputStream inputStream = newFileOptional.getInputStream()) {

                newlyModifiedFileData.setFileSize(newFileOptional.getSize());
                newlyModifiedFileData.setModifiedAt(new Date());

                String fileType = getFileMIMEType(newFileOptional);
                newlyModifiedFileData.setFileType(fileType);

                minioClient.putObject(PutObjectArgs.builder()
                        .bucket(newBucketName)
                        .object(newObjectName)
                        .stream(inputStream, newFileOptional.getSize(), -1)
                        .contentType(newFileOptional.getContentType())
                        .build());


            } catch (MinioException e) {
                throw new Exception("Error uploading file to MinIO: " + e.getMessage(), e);
            }
        } else {
            newlyModifiedFileData.setModifiedAt(new Date());
        }

        newlyModifiedFileData.setBucketName(newFileData.getBucketName() != null ? newBucketName : oldBucketName);
        newlyModifiedFileData.setObjectName(newFileData.getObjectName() != null ? newObjectName: oldObjectName);


        //daca in request apare campul createdBy, atunci setez in newlyModified campul,
        // altfel il las cum e deja preluat mai sus din fisierul vechi
        if (newFileData.getCreatedBy() != null) {
            newlyModifiedFileData.setCreatedBy(newFileData.getCreatedBy());
        }
        //la fel ca la createdBy pentru alte metadate


        //acum actualizam tag-urile ramase, cele vechi sunt automat atribuite
        Map<String, String> tags = setTags(newlyModifiedFileData);

        minioClient.setObjectTags(SetObjectTagsArgs.builder()
                .bucket(newlyModifiedFileData.getBucketName())
                .object(newlyModifiedFileData.getObjectName())
                .tags(tags)
                .build());

        List<String> versionIds = this.getFileVersionIds(newlyModifiedFileData.getBucketName(), newlyModifiedFileData.getObjectName(), asSystem);
        newlyModifiedFileData.setVersionIds(versionIds);

        return newlyModifiedFileData;
    }

    public void deleteFile(MinioFileDTO fileModel, String versionId, boolean asSystem) throws Exception {
        MinioClient minioClient = chooseClient(asSystem);

        if (fileModel.getObjectName().equals("_metadata_marker")) {
            throw new Exception("Can't delete _metadata_marker.");
        }

        boolean ok = true;
        String name;
        if (fileModel.getObjectName().endsWith("/")) {
            name = fileModel.getObjectName().substring(0, fileModel.getObjectName().length() - 1);

            MinioFileDTO folderResponse = getFileDetailsByBucketAndObjectName(fileModel.getBucketName(), name, asSystem);
            if ("true".equalsIgnoreCase(folderResponse.getIsFolder())) {
                ok = false;
                fileModel.setObjectName(name);
            }

        }

        boolean isFolder = fileModel.getObjectName().endsWith("/");

        if (isFolder && ok) {
            try {
                Iterable<Result<Item>> objects = minioClient.listObjects(
                        ListObjectsArgs.builder()
                                .bucket(fileModel.getBucketName())
                                .prefix(fileModel.getObjectName())
                                .recursive(true)
                                .build()
                );

                boolean isFolderEmpty = true; // Track if the folder is empty after deleting marked files.

                for (Result<Item> result : objects) {
                    Item item = result.get();
                    String childObjectName = item.objectName();

                    MinioFileDTO childFileModel = new MinioFileDTO(
                            fileModel.getBucketName(),
                            childObjectName,
                            null,
                            null
                    );

                    Map<String, String> tags = getTags(childFileModel.getBucketName(), childFileModel.getObjectName(), asSystem);

                    if ("true".equalsIgnoreCase(tags.get("toBeDeleted"))) {
                        deleteFile(childFileModel, null, asSystem); // Recursively delete marked files.
                    } else {
                        isFolderEmpty = false; // Folder is not empty if there are unmarked files.
                    }
                }

                // After processing all child files, delete the folder if it is empty.
                if (isFolderEmpty) {
                    minioClient.removeObject(
                            RemoveObjectArgs.builder()
                                    .bucket(fileModel.getBucketName())
                                    .object(fileModel.getObjectName())
                                    .build()
                    );
                }

            } catch (MinioException e) {
                throw new Exception("Error processing folder deletion from MinIO: " + e.getMessage(), e);
            }
        } else {
            if (!doesFileExist(fileModel, asSystem)) {
                throw new Exception(fileModel.getBucketName() + " doesn't contain " + fileModel.getObjectName());
            }

            Map<String, String> tags = getTags(fileModel.getBucketName(), fileModel.getObjectName(), asSystem);

            // Delete file only if it is marked as "toBeDeleted".
            if ("true".equalsIgnoreCase(tags.get("toBeDeleted")) || "true".equalsIgnoreCase(tags.get("isFolder"))) {
                if (versionId == null || versionId.isEmpty()) {
                    try {
                        List<String> versionIds = getFileVersionIds(fileModel.getBucketName(), fileModel.getObjectName(), asSystem);

                        if (versionIds.isEmpty()) {
                            throw new Exception("No versions found for the file " + fileModel.getObjectName() + " in bucket " + fileModel.getBucketName());
                        }

                        for (String vId : versionIds) {
                            minioClient.removeObject(RemoveObjectArgs.builder()
                                    .bucket(fileModel.getBucketName())
                                    .object(fileModel.getObjectName())
                                    .versionId(vId)
                                    .build());
                        }
                    } catch (MinioException e) {
                        throw new Exception("Error deleting file versions from MinIO: " + e.getMessage(), e);
                    }
                } else {
                    try {
                        minioClient.removeObject(RemoveObjectArgs.builder()
                                .bucket(fileModel.getBucketName())
                                .object(fileModel.getObjectName())
                                .versionId(versionId)
                                .build());
                    } catch (MinioException e) {
                        throw new Exception("Error deleting file version from MinIO: " + e.getMessage(), e);
                    }
                }
            }
        }
    }

    public void renameFolder(String oldPrefix, String newPrefix, String bucketName, boolean asSystem) throws Exception {
        if (oldPrefix == null || oldPrefix.isEmpty()) {
            throw new IllegalArgumentException("Old folder prefix must be provided.");
        }

        if (newPrefix == null || newPrefix.isEmpty()) {
            throw new IllegalArgumentException("New folder prefix must be provided.");
        }

        if (bucketName == null || bucketName.isEmpty()) {
            throw new IllegalArgumentException("Bucket name must be provided.");
        }

        MinioClient minioClient = chooseClient(asSystem);

        Iterable<Result<Item>> results = minioClient.listObjects(ListObjectsArgs.builder()
                .bucket(bucketName)
                .prefix(oldPrefix)
                .recursive(true)
                .build());

        boolean prefixFound = false;

        for (Result<Item> result : results) {
            prefixFound = true;
            Item item = result.get();
            String oldObjectName = item.objectName();

            String newObjectName = newPrefix + oldObjectName.substring(oldPrefix.length());

            minioClient.copyObject(CopyObjectArgs.builder()
                    .source(CopySource.builder()
                            .bucket(bucketName)
                            .object(oldObjectName)
                            .build())
                    .bucket(bucketName)
                    .object(newObjectName)
                    .build());

            minioClient.removeObject(RemoveObjectArgs.builder()
                    .bucket(bucketName)
                    .object(oldObjectName)
                    .build());
        }
        if (!prefixFound) {
            throw new IllegalArgumentException("No folders found with this name");
        }
    }


    //TODO
    public boolean userHasAccessToResource(String user){
        return true;
    }
    //TODO

    public String generatePresignedUrl(MinioFileDTO fileDTO, Integer hrs, String user, String versionId, boolean asSystem) throws Exception {
        if (!userHasAccessToResource(user)) {
            throw new Exception(user + " doesn't have access to resource!");
        }

        MinioClient minioClient = chooseClient(asSystem);

        if (versionId != null && !versionId.isEmpty()) {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(fileDTO.getBucketName())
                            .object(fileDTO.getObjectName())
                            .versionId(versionId)
                            .expiry(hrs, TimeUnit.HOURS)
                            .build()
            );
        } else {
            return minioClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(fileDTO.getBucketName())
                            .object(fileDTO.getObjectName())
                            .expiry(hrs, TimeUnit.HOURS)
                            .build()
            );
        }
    }


    public ResponseEntity<Resource> downloadFile(MinioFileDTO fileModel, String versionId, boolean asSystem) throws Exception {
        if (fileModel == null) {
            throw new IllegalArgumentException("File info must be provided.");
        }

        MinioClient minioClient = chooseClient(asSystem);

        String bucketName = fileModel.getBucketName();
        String objectName = fileModel.getObjectName();

        MinioFileDTO model = this.getFileDetailsByBucketAndObjectName(bucketName, objectName, asSystem);

        if (!doesFileExist(model, asSystem)) {
            throw new Exception("File doesn't exist in bucket: " + objectName + " in " + bucketName);
        }

        try {
            GetObjectArgs.Builder getObjectArgsBuilder = GetObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName);

            if (versionId != null && !versionId.isEmpty()) {
                getObjectArgsBuilder.versionId(versionId);
            }

            InputStream inputStream = minioClient.getObject(getObjectArgsBuilder.build());

            InputStreamResource resource = new InputStreamResource(inputStream);

            StatObjectResponse objectStats = minioClient.statObject(StatObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .versionId(versionId)
                    .build());

            String contentType = objectStats.contentType();
            long contentLength = objectStats.size();

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + objectName + "\"")
                    .contentLength(contentLength)
                    .body(resource);
        } catch (MinioException e) {
            throw new Exception("Error downloading file from MinIO: " + e.getMessage(), e);
        }
    }


    public List<String> getFileVersionIds(String bucketName, String objectName, boolean asSystem) throws Exception {
        List<String> versionIds = new ArrayList<>();

        MinioClient minioClient = chooseClient(asSystem);

        try {
            Iterable<Result<Item>> versionResults = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .prefix(objectName)
                            .recursive(true)
                            .includeVersions(true)
                            .build()
            );

            for (Result<Item> result : versionResults) {
                Item item = result.get();

                if (item.objectName().equals(objectName) && item.versionId() != null) {
                    versionIds.add(item.versionId());
                }
            }
        } catch (Exception e) {
            throw new Exception("Error retrieving version IDs for object: " + objectName + " in bucket: " + bucketName, e);
        }

        return versionIds;
    }

    public void deleteBucket(String bucketName, boolean asSystem) throws Exception {

        MinioClient minioClient = chooseClient(asSystem);

        if (!minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build())) {
            throw new Exception("Bucket " + bucketName + " does not exist.");
        }

        try {
            // List all objects in the bucket, including versions
            Iterable<Result<Item>> items = minioClient.listObjects(
                    ListObjectsArgs.builder().bucket(bucketName).recursive(true).includeVersions(true).build()
            );

            // Delete all objects and their versions
            for (Result<Item> result : items) {
                Item item = result.get();
                String objectName = item.objectName();
                String versionId = item.versionId();

                minioClient.removeObject(RemoveObjectArgs.builder()
                        .bucket(bucketName)
                        .object(objectName)
                        .versionId(versionId)
                        .build());
            }

            // Delete the bucket
            minioClient.removeBucket(RemoveBucketArgs.builder().bucket(bucketName).build());
        } catch (MinioException e) {
            throw new Exception("Error deleting bucket " + bucketName + ": " + e.getMessage(), e);
        }
    }

    public long getBucketSize(String bucketName, boolean asSystem) throws Exception {
        long totalSize = 0;

        MinioClient minioClient = chooseClient(asSystem);

        try {
            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .recursive(true)
                            .build()
            );

            for (Result<Item> result : results) {
                Item item = result.get();

                if (!item.objectName().endsWith("/") && !item.objectName().equals("_metadata_marker")) {
                    totalSize += item.size();
                }
            }
        } catch (MinioException e) {
            throw new Exception("Error calculating bucket size: " + e.getMessage(), e);
        }

        return totalSize;
    }


    private void checkBucketSpace(String bucketName, long fileSize, Long oldFileSize, boolean asSystem) throws Exception {
        // Retrieve the maxSize from the metadata marker
        String markerObject = "_metadata_marker";

        MinioClient minioClient = chooseClient(asSystem);

        Tags tags = minioClient.getObjectTags(GetObjectTagsArgs.builder()
                .bucket(bucketName)
                .object(markerObject)
                .build());

        String maxSizeStr = tags.get().get("maxSize");
        if (maxSizeStr == null) {
            throw new Exception("Metadata marker does not contain a maxSize tag.");
        }

        long maxBucketSize;
        try {
            maxBucketSize = Long.parseLong(maxSizeStr);
        } catch (NumberFormatException e) {
            throw new Exception("Invalid maxSize value in metadata: " + maxSizeStr, e);
        }

        // Calculate current bucket usage
        long bucketUsage = getBucketSize(bucketName, asSystem);

        // Adjust bucket usage for the old file size if provided
        if (oldFileSize != null) {
            bucketUsage -= oldFileSize;
            if (bucketUsage < 0) {
                bucketUsage = 0;
            }
        }

        long newSize = bucketUsage + fileSize;

        // Check if the new size exceeds the max bucket size
        if (newSize > maxBucketSize) {
            throw new Exception("Not enough space in the bucket.");
        }
    }

    public boolean doesFolderExist(String bucketName, String objectName, boolean asSystem) throws Exception {
        MinioClient minioClient = chooseClient(asSystem);
        try {
            minioClient.statObject(StatObjectArgs.builder()
                    .bucket(bucketName)
                    .object(objectName)
                    .build());
            return true;
        } catch (ErrorResponseException e) {
            if ("NoSuchKey".equals(e.errorResponse().code())) {
                return false;
            }
            throw e;
        }
    }

    public void createFolder(MinioFileDTO model, boolean asSystem) throws Exception {
        try {
            MinioClient minioClient = chooseClient(asSystem);

            String folderName = model.getObjectName();

            if (folderName.contains("/")) {
                String folderPath = folderName.substring(0, folderName.lastIndexOf("/"));

                if (doesFolderExist(model.getBucketName(), folderPath, asSystem)) {
                    Map<String, String> folderTags = getTags(model.getBucketName(), folderPath, asSystem);
                    if (folderTags != null && "true".equals(folderTags.get("isFolder"))) {
                        try {
                            if (folderPath.endsWith("/")) {
                                folderPath = folderPath.substring(0, folderPath.length() - 1);
                            }

                            MinioFileDTO fakeFolderModel = new MinioFileDTO();
                            fakeFolderModel.setBucketName(model.getBucketName());
                            fakeFolderModel.setObjectName(folderPath);

                            deleteFile(fakeFolderModel, null, asSystem);
                        } catch (Exception e) {
                            throw new Exception("Error deleting fake folder: " + folderPath, e);
                        }
                    }
                }
            }

            InputStream emptyContent = new ByteArrayInputStream(new byte[0]);

            minioClient.putObject(
                    PutObjectArgs.builder()
                            .bucket(model.getBucketName())
                            .object(folderName)
                            .stream(emptyContent, 0, -1)
                            .build()
            );

            Map<String, String> tags = new HashMap<>();
            tags.put("isFolder", "true");
            tags.put("toBeDeleted", "false");

            minioClient.setObjectTags(
                    SetObjectTagsArgs.builder()
                            .bucket(model.getBucketName())
                            .object(folderName)
                            .tags(tags)
                            .build()
            );

        } catch (Exception e) {
            throw new Exception("Error creating folder: " + e.getMessage(), e);
        }
    }

    public List<MinioFileDTO> partialSearch(String bucketName, String searchTerm, boolean asSystem) throws Exception {
        if (bucketName == null || bucketName.isEmpty()) {
            throw new IllegalArgumentException("Bucket name must be provided.");
        }
        if (searchTerm == null || searchTerm.isEmpty()) {
            throw new IllegalArgumentException("Search term must be provided.");
        }

        List<MinioFileDTO> matchingFiles = new ArrayList<>();

        try {
            MinioClient minioClient = chooseClient(asSystem);

            Iterable<Result<Item>> results = minioClient.listObjects(
                    ListObjectsArgs.builder()
                            .bucket(bucketName)
                            .recursive(true)
                            .build()
            );

            for (Result<Item> result : results) {
                Item item = result.get();

                // Skip folders or special metadata markers
                if (item.objectName().endsWith("/") || item.objectName().equals("_metadata_marker")) {
                    continue;
                }

                // Check if the object name contains the search term
                String objectName = item.objectName();
                if (objectName.contains(searchTerm)) {
                    try {
                        // Get file details and map to MinioFileDTO
                        MinioFileDTO fileDTO = getFileDetailsByBucketAndObjectName(bucketName, objectName, asSystem);

                        Map<String, String> tags = getTags(bucketName, objectName, asSystem);
                        if ("true".equalsIgnoreCase(tags.get("toBeDeleted"))) {
                            continue;
                        }
                        matchingFiles.add(fileDTO);
                    } catch (Exception e) {
                        logger.error("Error fetching file details for object: " + objectName, e);
                    }
                }
            }
        } catch (Exception e) {
            throw new Exception("Error performing partial search in bucket: " + bucketName, e);
        }

        return matchingFiles;
    }

    public List<MinioFileDTO> partialSearchInAllBuckets(String searchTerm, boolean asSystem) throws Exception {
        if (searchTerm == null || searchTerm.isEmpty()) {
            throw new IllegalArgumentException("Search term must be provided.");
        }

        List<MinioFileDTO> allMatchingFiles = new ArrayList<>();

        try {
            MinioClient minioClient = chooseClient(asSystem);

            // Get the list of all buckets
            List<Bucket> buckets = minioClient.listBuckets();

            // Iterate through all buckets
            for (Bucket bucket : buckets) {
                String bucketName = bucket.name();

                try {
                    // Use partialSearch for each bucket
                    List<MinioFileDTO> matchingFiles = partialSearch(bucketName, searchTerm, asSystem);

                    matchingFiles = matchingFiles.stream()
                            .filter(file -> {
                                try {
                                    Map<String, String> tags = getTags(file.getBucketName(), file.getObjectName(), asSystem);
                                    return !"true".equalsIgnoreCase(tags.get("toBeDeleted"));
                                } catch (Exception e) {
                                    logger.error("Error fetching tags for file: " + file.getObjectName(), e);
                                    return false;
                                }
                            })
                            .collect(Collectors.toList());

                    allMatchingFiles.addAll(matchingFiles);
                } catch (Exception e) {
                    throw new Exception("Error performing search in bucket: " + bucketName, e);
                }
            }
        } catch (Exception e) {
            throw new Exception("Error performing search across all buckets", e);
        }

        return allMatchingFiles;
    }



    public List<MinioFileDTO> getTwoMostRecentlyModifiedFiles(String bucketName, boolean asSystem) throws Exception {
        List<MinioFileDTO> resultFiles = new ArrayList<>();

        if (bucketName == null) {
            throw new IllegalArgumentException("Bucket name must be provided.");
        }

        MinioClient minioClient = chooseClient(asSystem);

        Iterable<Result<Item>> results = minioClient.listObjects(
                ListObjectsArgs.builder()
                        .bucket(bucketName)
                        .recursive(true)
                        .maxKeys(maxNrRows)
                        .build()
        );

        List<MinioFileDTO> allFiles = new ArrayList<>();

        for (Result<Item> result : results) {
            Item item = result.get();
            String objectName = item.objectName();

            if (objectName.endsWith("/") || objectName.equals("_metadata_marker")) {
                continue; // Skip folders
            }

            try {
                MinioFileDTO model = getFileDetailsByBucketAndObjectName(bucketName, objectName, asSystem);

                allFiles.add(model);
            } catch (Exception e) {
                throw new Exception("Error fetching file details for object: " + objectName, e);
            }
        }

        // Sort files by the last modified date in descending order
        allFiles.sort((file1, file2) -> file2.getModifiedAt().compareTo(file1.getModifiedAt()));

        // Get the top two most recently modified files
        if (allFiles.size() > 0) {
            resultFiles.add(allFiles.get(0));
        }
        if (allFiles.size() > 1) {
            resultFiles.add(allFiles.get(1));
        }
        if (allFiles.size() > 2) {
            resultFiles.add(allFiles.get(2));
        }
        if (allFiles.size() > 3) {
            resultFiles.add(allFiles.get(3));
        }
        if (allFiles.size() > 4) {
            resultFiles.add(allFiles.get(4));
        }


        return resultFiles;
    }

    public List<MinioFileDTO> getFilesMarkedToBeDeleted(String bucketName, boolean asSystem) throws Exception {
        List<MinioFileDTO> filesToBeDeleted = new ArrayList<>();

        MinioClient minioClient = chooseClient(asSystem);

        if (bucketName == null || bucketName.isEmpty()) {
            List<Bucket> buckets = minioClient.listBuckets();

            for (Bucket bucket : buckets) {
                String currentBucketName = bucket.name();
                filesToBeDeleted.addAll(getFilesMarkedToBeDeleted(currentBucketName, asSystem));
            }

            return filesToBeDeleted;
        }


        Iterable<Result<Item>> results = minioClient.listObjects(
                ListObjectsArgs.builder()
                        .bucket(bucketName)
                        .recursive(true)
                        .build()
        );

        for (Result<Item> result : results) {
            Item item = result.get();
            String objectName = item.objectName();

            if (objectName.endsWith("/") || objectName.equals("_metadata_marker")) {
                continue;
            }

            try {
                Map<String, String> tags = getTags(bucketName, objectName, asSystem);

                if ("true".equalsIgnoreCase(tags.get("toBeDeleted"))) {
                    MinioFileDTO model = getFileDetailsByBucketAndObjectName(bucketName, objectName, asSystem);
                    filesToBeDeleted.add(model);
                }
            } catch (Exception e) {
                throw new Exception("Error fetching file details for object: " + objectName, e);
            }
        }

        return filesToBeDeleted;
    }

    public void markFileToBeDeleted(String bucketName, String objectName, boolean asSystem) throws Exception {
        if (bucketName == null || bucketName.isEmpty() || objectName == null || objectName.isEmpty()) {
            throw new IllegalArgumentException("Bucket name and object name must be provided.");
        }

        MinioClient minioClient = chooseClient(asSystem);

        boolean ok = true;
        String name;
        if (objectName.endsWith("/")) {
            name = objectName.substring(0, objectName.length() - 1);

            MinioFileDTO folderResponse = new MinioFileDTO();
            try {
                folderResponse = getFileDetailsByBucketAndObjectName(bucketName, name, asSystem);
            } catch (Exception e){
                System.out.println("Folder is not fake.");
            }

            if ("true".equalsIgnoreCase(folderResponse.getIsFolder())) {
                ok = false;
                objectName = name;
            }

        }

        try {
            boolean isFolder = objectName.endsWith("/");

            if (isFolder && ok) {
                Iterable<Result<Item>> results = minioClient.listObjects(
                        ListObjectsArgs.builder()
                                .bucket(bucketName)
                                .prefix(objectName)
                                .recursive(true)
                                .build()
                );

                for (Result<Item> result : results) {
                    Item item = result.get();
                    String childObjectName = item.objectName();

                    MinioFileDTO fileResponse = getFileDetailsByBucketAndObjectName(bucketName, childObjectName, asSystem);

                    Map<String, String> updatedTags = new HashMap<>();
                    updatedTags.put("FileID", String.valueOf(fileResponse.getId()));
                    updatedTags.put("CreatedBy", fileResponse.getCreatedBy() != null ? fileResponse.getCreatedBy() : "Unknown");
                    updatedTags.put("FileSize", String.valueOf(fileResponse.getFileSize()));
                    updatedTags.put("CreatedTime", String.valueOf(fileResponse.getCreatedAt().getTime()));
                    updatedTags.put("ModifiedTime", String.valueOf(fileResponse.getModifiedAt().getTime()));
                    updatedTags.put("isFolder", String.valueOf(fileResponse.getIsFolder()));
                    updatedTags.put("toBeDeleted", "true");

                    minioClient.setObjectTags(
                            SetObjectTagsArgs.builder()
                                    .bucket(bucketName)
                                    .object(childObjectName)
                                    .tags(updatedTags)
                                    .build()
                    );
                }
            } else {
                MinioFileDTO fileResponse = getFileDetailsByBucketAndObjectName(bucketName, objectName, asSystem);

                Map<String, String> updatedTags = new HashMap<>();
                updatedTags.put("FileID", String.valueOf(fileResponse.getId()));
                updatedTags.put("CreatedBy", fileResponse.getCreatedBy() != null ? fileResponse.getCreatedBy() : "Unknown");
                updatedTags.put("FileSize", String.valueOf(fileResponse.getFileSize()));
                updatedTags.put("CreatedTime", String.valueOf(fileResponse.getCreatedAt().getTime()));
                updatedTags.put("ModifiedTime", String.valueOf(fileResponse.getModifiedAt().getTime()));
                updatedTags.put("isFolder", String.valueOf(fileResponse.getIsFolder()));
                updatedTags.put("toBeDeleted", "true");

                minioClient.setObjectTags(
                        SetObjectTagsArgs.builder()
                                .bucket(bucketName)
                                .object(objectName)
                                .tags(updatedTags)
                                .build()
                );
            }
        } catch (MinioException e) {
            throw new Exception("Error marking object or folder as to be deleted: " + e.getMessage(), e);
        }
    }


    public void markFileNotToBeDeleted(String bucketName, String objectName, boolean asSystem) throws Exception {
        if (bucketName == null || bucketName.isEmpty() || objectName == null || objectName.isEmpty()) {
            throw new IllegalArgumentException("Bucket name and object name must be provided.");
        }

        MinioClient minioClient = chooseClient(asSystem);

        boolean ok = true;
        String name;
        if (objectName.endsWith("/")) {
            name = objectName.substring(0, objectName.length() - 1);

            MinioFileDTO folderResponse = new MinioFileDTO();
            try {
                folderResponse = getFileDetailsByBucketAndObjectName(bucketName, name, asSystem);
            } catch (Exception e){
                System.out.println("Folder is not fake.");
            }
            if ("true".equalsIgnoreCase(folderResponse.getIsFolder())) {
                ok = false;
                objectName = name;
            }

        }

        try {
            boolean isFolder = objectName.endsWith("/");

            if (isFolder && ok) {
                Iterable<Result<Item>> results = minioClient.listObjects(
                        ListObjectsArgs.builder()
                                .bucket(bucketName)
                                .prefix(objectName)
                                .recursive(true)
                                .build()
                );

                for (Result<Item> result : results) {
                    Item item = result.get();
                    String childObjectName = item.objectName();

                    MinioFileDTO fileResponse = getFileDetailsByBucketAndObjectName(bucketName, childObjectName, asSystem);

                    Map<String, String> updatedTags = new HashMap<>();
                    updatedTags.put("FileID", String.valueOf(fileResponse.getId()));
                    updatedTags.put("CreatedBy", fileResponse.getCreatedBy() != null ? fileResponse.getCreatedBy() : "Unknown");
                    updatedTags.put("FileSize", String.valueOf(fileResponse.getFileSize()));
                    updatedTags.put("CreatedTime", String.valueOf(fileResponse.getCreatedAt().getTime()));
                    updatedTags.put("ModifiedTime", String.valueOf(fileResponse.getModifiedAt().getTime()));
                    updatedTags.put("isFolder", String.valueOf(fileResponse.getIsFolder()));
                    updatedTags.put("toBeDeleted", "false");

                    minioClient.setObjectTags(
                            SetObjectTagsArgs.builder()
                                    .bucket(bucketName)
                                    .object(childObjectName)
                                    .tags(updatedTags)
                                    .build()
                    );
                }
            } else {
                MinioFileDTO fileResponse = getFileDetailsByBucketAndObjectName(bucketName, objectName, asSystem);

                Map<String, String> updatedTags = new HashMap<>();
                updatedTags.put("FileID", String.valueOf(fileResponse.getId()));
                updatedTags.put("CreatedBy", fileResponse.getCreatedBy() != null ? fileResponse.getCreatedBy() : "Unknown");
                updatedTags.put("FileSize", String.valueOf(fileResponse.getFileSize()));
                updatedTags.put("CreatedTime", String.valueOf(fileResponse.getCreatedAt().getTime()));
                updatedTags.put("ModifiedTime", String.valueOf(fileResponse.getModifiedAt().getTime()));
                updatedTags.put("isFolder", String.valueOf(fileResponse.getIsFolder()));
                updatedTags.put("toBeDeleted", "false");

                minioClient.setObjectTags(
                        SetObjectTagsArgs.builder()
                                .bucket(bucketName)
                                .object(objectName)
                                .tags(updatedTags)
                                .build()
                );
            }
        } catch (MinioException e) {
            throw new Exception("Error marking object or folder as not to be deleted: " + e.getMessage(), e);
        }
    }

    public void updateMaxSize(String bucketName, String newSize, boolean asSystem) throws Exception {
        try {
            MinioClient minioClient = chooseClient(asSystem);

            if (!minioClient.bucketExists(BucketExistsArgs.builder().bucket(bucketName).build())) {
                throw new IllegalArgumentException("Bucket does not exist: " + bucketName);
            }

            String markerObject = "_metadata_marker";

            try {
                minioClient.statObject(StatObjectArgs.builder()
                        .bucket(bucketName)
                        .object(markerObject)
                        .build());
            } catch (MinioException e) {
                throw new IllegalArgumentException("Metadata marker not found in bucket: " + bucketName, e);
            }

            Tags existingTags = minioClient.getObjectTags(GetObjectTagsArgs.builder()
                    .bucket(bucketName)
                    .object(markerObject)
                    .build());

            Map<String, String> updatedTags = new HashMap<>(existingTags.get());
            updatedTags.put("maxSize", newSize);

            minioClient.setObjectTags(SetObjectTagsArgs.builder()
                    .bucket(bucketName)
                    .object(markerObject)
                    .tags(updatedTags)
                    .build());

            System.out.println("Updated maxSize tag to " + newSize + " for bucket: " + bucketName);
        } catch (MinioException e) {
            throw new Exception("Error updating maxSize for bucket: " + e.getMessage(), e);
        }
    }

}

