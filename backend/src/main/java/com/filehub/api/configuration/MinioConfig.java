package com.filehub.api.configuration;

import com.filehub.api.services.MinioFileService;
import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.credentials.Jwt;
import io.minio.credentials.WebIdentityProvider;
import io.minio.errors.MinioException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.context.annotation.RequestScope;

import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;

@Configuration
public class MinioConfig {

    @Value("${minio.server.url}")
    private String minioUrl;

    @Value("${minio.server.access-key}")
    private String accessKey;

    @Value("${minio.server.secret-key}")
    private String secretKey;

    Logger logger = LoggerFactory.getLogger(MinioConfig.class);

    @Bean("AdminMinIOClient")
    public MinioClient adminClient() {
        MinioClient client = MinioClient.builder()
                .endpoint(minioUrl)
                .credentials(accessKey, secretKey)
                .build();

        createBucketForDefaultUser(client);

        return client;
    }

    @Bean("UserMinIOSupplier")
    public Supplier<MinioClient> userClientSupplier() {
        return () -> {
            var auth = getJwtToken();

            if (auth.isPresent()) {
                return MakeMinioClient(auth.get());
            }
            
            throw new NullPointerException("Missing jwt token");
        };
    }

    public Optional<JwtAuthenticationToken> getJwtToken() {
        Object authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken) {
            return Optional.of((JwtAuthenticationToken) authentication);
        }
//        throw new IllegalStateException("JWT token is not available in the SecurityContext");
        return Optional.empty();
    }

    private MinioClient MakeMinioClient(JwtAuthenticationToken auth) {
        io.minio.credentials.Jwt minioJwt = new Jwt(
                auth.getToken().getTokenValue(),
                0 // TODO: set expiry properly
        );

        WebIdentityProvider provider = new WebIdentityProvider(
                () -> { return minioJwt; },
                minioUrl,
                86000,
                null, // TODO: set policy properly
                null,
                null,
                null
        );

        MinioClient client = MinioClient.builder()
                .endpoint(minioUrl)
                .credentialsProvider(provider)
                .build();

        return client;
    }

    public void createBucketForDefaultUser(MinioClient client) {
        String testBucket = "testuser";

        try {
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(testBucket).build());

            if (!exists) {
//                client.makeBucket(MakeBucketArgs.builder().bucket(testBucket).build());

                MinioFileService service = new MinioFileService(userClientSupplier() , client);

                service.createBucket(testBucket, true);

                logger.info("Bucket created: " + testBucket);
            }
        } catch (Exception e) {
            System.err.println("Error creating bucket for default user: " + e.getMessage());
            System.exit(1);
        }
    }

    public void testMinioConnection(MinioClient client) {
        try {
            String testBucket = "test-bucket";
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(testBucket).build());
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(testBucket).build());
                System.out.println("Bucket created: " + testBucket);
            } else {
                System.out.println("Bucket already exists: " + testBucket);
            }
        } catch (MinioException | IOException | InvalidKeyException | NoSuchAlgorithmException e) {
            System.err.println("Error connecting to MinIO: " + e.getMessage());
        }
    }
}
