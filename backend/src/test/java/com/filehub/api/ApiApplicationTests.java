package com.filehub.api;

import com.filehub.api.dtos.MinioFileDTO;
import com.filehub.api.services.MinioFileService;
import io.minio.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;

import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ApiApplicationTests {

	@Mock
	private MultipartFile mockFile;

	@Mock
	private Supplier<MinioClient> userClientSupplier;

	@Mock
	private MinioClient minioClient;

	@Mock
	private MinioFileDTO fileModel;

	private MinioFileService minioFileService;


	@BeforeEach
	void setUp() {
		MockitoAnnotations.openMocks(this);
		minioFileService = new MinioFileService(userClientSupplier, minioClient);
	}

	@Test
	void createBucketTest() throws Exception {

		when(minioClient.bucketExists(BucketExistsArgs.builder().bucket("test-bucket").build()))
				.thenReturn(false);

		when(minioClient.putObject(any(PutObjectArgs.class))).thenReturn(null);
		minioFileService.createBucket("test-bucket", true);

		verify(minioClient).bucketExists(any(BucketExistsArgs.class));
		verify(minioClient).makeBucket(any(MakeBucketArgs.class));
		verify(minioClient).setBucketVersioning(any(SetBucketVersioningArgs.class));
		verify(minioClient).putObject(any(PutObjectArgs.class));
		verify(minioClient).setObjectTags(any(SetObjectTagsArgs.class));
	}

	@Test
	void testGetFileMIMEType_ValidFile() throws IOException {
		String content = "This is a test file";
		String filename = "test.txt";
		InputStream inputStream = new ByteArrayInputStream(content.getBytes());

		when(mockFile.getInputStream()).thenReturn(inputStream);
		when(mockFile.getOriginalFilename()).thenReturn(filename);

		String mimeType = minioFileService.getFileMIMEType(mockFile);

		assertEquals("text/plain", mimeType);
	}

	@Test
	void testDoesFileExist_FileExists() throws Exception {
		when(fileModel.getBucketName()).thenReturn("bucket-name");
		when(fileModel.getObjectName()).thenReturn("file-name");

		boolean result = minioFileService.doesFileExist(fileModel, true);

		assertTrue(result);
	}

//	@Test
//	void testDeleteFile_FileExists() throws Exception {
//		// Arrange
//		MinioFileDTO fileModel = mock(MinioFileDTO.class);
//		when(fileModel.getObjectName()).thenReturn("testfile.txt");
//		when(fileModel.getBucketName()).thenReturn("testbucket");
//
//		boolean result = minioFileService.doesFileExist(fileModel, true);
//		assertTrue(result);
//
//		minioFileService.deleteFile(fileModel, "1", true);
//		verify(minioClient, times(1)).removeObject(any(RemoveObjectArgs.class));  // Two versions to remove
//	}

}
