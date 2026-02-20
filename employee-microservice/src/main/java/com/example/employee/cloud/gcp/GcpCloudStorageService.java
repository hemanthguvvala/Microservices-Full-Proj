package com.example.employee.cloud.gcp;

import com.example.employee.cloud.CloudStorageService;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.concurrent.TimeUnit;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * GCP Cloud Storage Implementation of CloudStorageService
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "How does GCS differ from S3 and Azure Blob?"
 * → GCS is the simplest: bucket → object, flat namespace.
 *   Key differences:
 *   - Signed URLs (equivalent to S3 pre-signed URLs / Azure SAS tokens)
 *   - Storage classes: Standard → Nearline → Coldline → Archive
 *   - Object Versioning + Object Lifecycle Management (same as S3)
 *   - Uniform bucket-level access (no object ACLs — cleaner IAM model)
 *   - Dual/multi-region buckets for geo-redundancy without replication config
 *
 * Auth: Workload Identity Federation → GCP Service Account → IAM binding on bucket
 *
 * Activated when: spring.profiles.active=gcp
 */
@Slf4j
@Service
@Profile("gcp")
@RequiredArgsConstructor
public class GcpCloudStorageService implements CloudStorageService {

    private final Storage storage;

    @Override
    public String uploadFile(String bucket, String objectName, InputStream content, String contentType) {
        log.info("GCP Cloud Storage: Uploading to gs://{}/{}", bucket, objectName);

        BlobId blobId = BlobId.of(bucket, objectName);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType(contentType)
                .build();

        try {
            byte[] bytes = content.readAllBytes();
            storage.create(blobInfo, bytes);
        } catch (Exception e) {
            throw new RuntimeException("GCS upload failed: " + objectName, e);
        }

        String url = String.format("gs://%s/%s", bucket, objectName);
        log.info("GCP Cloud Storage: Upload complete → {}", url);
        return url;
    }

    @Override
    public InputStream downloadFile(String bucket, String objectName) {
        log.info("GCP Cloud Storage: Downloading gs://{}/{}", bucket, objectName);

        byte[] content = storage.readAllBytes(BlobId.of(bucket, objectName));
        return new ByteArrayInputStream(content);
    }

    @Override
    public void deleteFile(String bucket, String objectName) {
        log.info("GCP Cloud Storage: Deleting gs://{}/{}", bucket, objectName);
        storage.delete(BlobId.of(bucket, objectName));
    }

    @Override
    public String generatePresignedUrl(String bucket, String objectName, int expirationMinutes) {
        log.info("GCP Cloud Storage: Generating signed URL for gs://{}/{} ({}min)",
                bucket, objectName, expirationMinutes);

        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucket, objectName)).build();
        URL signedUrl = storage.signUrl(
                blobInfo,
                expirationMinutes,
                TimeUnit.MINUTES,
                Storage.SignUrlOption.withV4Signature()
        );

        return signedUrl.toString();
    }
}
