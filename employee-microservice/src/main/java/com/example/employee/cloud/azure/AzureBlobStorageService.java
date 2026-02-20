package com.example.employee.cloud.azure;

import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.sas.BlobSasPermission;
import com.azure.storage.blob.sas.BlobServiceSasSignatureValues;
import com.example.employee.cloud.CloudStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.OffsetDateTime;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Azure Blob Storage Implementation of CloudStorageService
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "How does Azure Blob compare to S3 in your architecture?"
 * → Conceptually identical: container ≈ bucket, blob ≈ object.
 *   Key differences:
 *   - Azure uses Managed Identity (Workload Identity) instead of IRSA
 *   - SAS tokens instead of pre-signed URLs (more granular: read/write/list/delete)
 *   - Tiering: Hot → Cool → Cold → Archive (4 tiers vs AWS's 3+Glacier)
 *   - Azure CDN integrates natively via Blob endpoint
 *
 * Auth: Azure Workload Identity → Managed Identity → RBAC role on storage account
 *
 * Activated when: spring.profiles.active=azure
 */
@Slf4j
@Service
@Profile("azure")
@RequiredArgsConstructor
public class AzureBlobStorageService implements CloudStorageService {

    private final BlobServiceClient blobServiceClient;

    @Override
    public String uploadFile(String container, String blobName, InputStream content, String contentType) {
        log.info("Azure Blob: Uploading to {}/{}", container, blobName);

        BlobContainerClient containerClient = blobServiceClient.getBlobContainerClient(container);
        if (!containerClient.exists()) {
            containerClient.create();
            log.info("Azure Blob: Created container={}", container);
        }

        BlobClient blobClient = containerClient.getBlobClient(blobName);
        blobClient.upload(content, true);
        blobClient.setHttpHeaders(new BlobHttpHeaders().setContentType(contentType));

        String url = blobClient.getBlobUrl();
        log.info("Azure Blob: Upload complete → {}", url);
        return url;
    }

    @Override
    public InputStream downloadFile(String container, String blobName) {
        log.info("Azure Blob: Downloading {}/{}", container, blobName);

        BlobClient blobClient = blobServiceClient
                .getBlobContainerClient(container)
                .getBlobClient(blobName);

        return blobClient.openInputStream();
    }

    @Override
    public void deleteFile(String container, String blobName) {
        log.info("Azure Blob: Deleting {}/{}", container, blobName);

        blobServiceClient
                .getBlobContainerClient(container)
                .getBlobClient(blobName)
                .delete();
    }

    @Override
    public String generatePresignedUrl(String container, String blobName, int expirationMinutes) {
        log.info("Azure Blob: Generating SAS URL for {}/{} ({}min)", container, blobName, expirationMinutes);

        BlobClient blobClient = blobServiceClient
                .getBlobContainerClient(container)
                .getBlobClient(blobName);

        BlobSasPermission permission = new BlobSasPermission().setReadPermission(true);
        BlobServiceSasSignatureValues sasValues = new BlobServiceSasSignatureValues(
                OffsetDateTime.now().plusMinutes(expirationMinutes),
                permission
        );

        String sasToken = blobClient.generateSas(sasValues);
        return blobClient.getBlobUrl() + "?" + sasToken;
    }
}
