package com.example.employee.cloud.aws;

import com.example.employee.cloud.CloudStorageService;
import io.awspring.cloud.s3.S3Template;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.core.sync.RequestBody;

import java.io.InputStream;
import java.time.Duration;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AWS S3 Implementation of CloudStorageService
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "Walk me through how S3 works in your architecture."
 * → Employee documents (offer letters, ID proofs) stored in S3 with:
 *   - SSE-S3 or SSE-KMS encryption at rest
 *   - Pre-signed URLs for browser-direct upload/download (bypasses app server)
 *   - Lifecycle policies: Standard → IA (30d) → Glacier (90d)
 *   - Versioning enabled for document history
 *   - IAM via IRSA (IAM Roles for Service Accounts) — pod-level least-privilege
 *
 * Activated when: spring.profiles.active=aws
 */
@Slf4j
@Service
@Profile("aws")
@RequiredArgsConstructor
public class AwsS3StorageService implements CloudStorageService {

    private final S3Client s3Client;
    private final S3Presigner s3Presigner;

    @Override
    public String uploadFile(String bucket, String key, InputStream content, String contentType) {
        log.info("AWS S3: Uploading to s3://{}/{}", bucket, key);

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .serverSideEncryption("aws:kms")  // KMS encryption at rest
                .build();

        s3Client.putObject(request, RequestBody.fromInputStream(content, content.available()));

        String url = String.format("s3://%s/%s", bucket, key);
        log.info("AWS S3: Upload complete → {}", url);
        return url;
    }

    @Override
    public InputStream downloadFile(String bucket, String key) {
        log.info("AWS S3: Downloading s3://{}/{}", bucket, key);

        GetObjectRequest request = GetObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        return s3Client.getObject(request);
    }

    @Override
    public void deleteFile(String bucket, String key) {
        log.info("AWS S3: Deleting s3://{}/{}", bucket, key);

        DeleteObjectRequest request = DeleteObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();

        s3Client.deleteObject(request);
    }

    @Override
    public String generatePresignedUrl(String bucket, String key, int expirationMinutes) {
        log.info("AWS S3: Generating pre-signed URL for s3://{}/{} ({}min)", bucket, key, expirationMinutes);

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(expirationMinutes))
                .getObjectRequest(GetObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build())
                .build();

        return s3Presigner.presignGetObject(presignRequest).url().toString();
    }
}
