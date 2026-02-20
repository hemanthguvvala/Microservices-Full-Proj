package com.example.employee.cloud;

import java.io.InputStream;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Cloud Storage Abstraction — Strategy Pattern for Multi-Cloud Portability
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "How do you make a microservice cloud-portable?"
 * → Define an interface for each cloud-dependent operation (storage, messaging,
 *   secrets). Provide AWS (S3), Azure (Blob Storage), and GCP (Cloud Storage)
 *   implementations. Spring @Profile activates the correct one at deploy time.
 *   Application code never imports AWS/Azure/GCP classes directly.
 *
 * This pattern is the Strategy pattern applied to infrastructure.
 * The switch is a deployment config change, not a code change.
 */
public interface CloudStorageService {

    /**
     * Upload a file to cloud storage.
     *
     * @param bucket    The bucket/container name
     * @param key       The object key (path within the bucket)
     * @param content   The file content stream
     * @param contentType MIME type (e.g., "application/pdf")
     * @return The URL or URI of the uploaded object
     */
    String uploadFile(String bucket, String key, InputStream content, String contentType);

    /**
     * Download a file from cloud storage.
     *
     * @param bucket The bucket/container name
     * @param key    The object key
     * @return The file content as an InputStream
     */
    InputStream downloadFile(String bucket, String key);

    /**
     * Delete a file from cloud storage.
     *
     * @param bucket The bucket/container name
     * @param key    The object key
     */
    void deleteFile(String bucket, String key);

    /**
     * Generate a pre-signed URL for temporary access (upload or download).
     *
     * @param bucket         The bucket/container name
     * @param key            The object key
     * @param expirationMinutes How long the URL remains valid
     * @return A pre-signed URL string
     */
    String generatePresignedUrl(String bucket, String key, int expirationMinutes);
}
