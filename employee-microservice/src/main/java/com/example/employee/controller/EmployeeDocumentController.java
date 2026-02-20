package com.example.employee.controller;

import com.example.employee.cloud.CloudStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Employee Document Controller — Cloud-Agnostic File Operations
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Interview: "Show me how your code is cloud-portable."
 * → This controller injects CloudStorageService (the interface).
 *   At runtime, Spring activates AwsS3StorageService, AzureBlobStorageService,
 *   or GcpCloudStorageService based on the active profile.
 *   Zero code changes. Zero if/else for cloud provider. Pure Strategy pattern.
 *
 * Endpoints:
 *   POST   /api/employees/{id}/documents   — Upload a document
 *   GET    /api/employees/{id}/documents/{key}/url — Get pre-signed download URL
 *   DELETE /api/employees/{id}/documents/{key}   — Delete a document
 */
@Slf4j
@RestController
@RequestMapping("/api/employees/{employeeId}/documents")
@RequiredArgsConstructor
public class EmployeeDocumentController {

    private final CloudStorageService cloudStorageService;

    @Value("${cloud.storage.bucket:employee-documents-dev}")
    private String defaultBucket;

    /**
     * Upload an employee document (offer letter, ID proof, contract, etc.)
     * Stored in cloud-native storage: S3 / Blob Storage / Cloud Storage.
     */
    @PostMapping
    public ResponseEntity<Map<String, String>> uploadDocument(
            @PathVariable Long employeeId,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "category", defaultValue = "general") String category) throws IOException {

        String key = String.format("employees/%d/%s/%s", employeeId, category, file.getOriginalFilename());

        log.info("Uploading document for employee={}, key={}, size={} bytes",
                employeeId, key, file.getSize());

        String url = cloudStorageService.uploadFile(
                defaultBucket,
                key,
                file.getInputStream(),
                file.getContentType()
        );

        return ResponseEntity.ok(Map.of(
                "url", url,
                "key", key,
                "bucket", defaultBucket,
                "message", "Document uploaded successfully"
        ));
    }

    /**
     * Generate a pre-signed/SAS/signed URL for temporary download access.
     * Interview: "Why pre-signed URLs instead of proxying through the app?"
     * → Browser downloads directly from cloud storage. App server doesn't
     *   become a bottleneck for large files. URL expires in 15 minutes.
     */
    @GetMapping("/{key}/url")
    public ResponseEntity<Map<String, String>> getDownloadUrl(
            @PathVariable Long employeeId,
            @PathVariable String key,
            @RequestParam(value = "expiry", defaultValue = "15") int expiryMinutes) {

        String fullKey = String.format("employees/%d/%s", employeeId, key);

        String presignedUrl = cloudStorageService.generatePresignedUrl(
                defaultBucket, fullKey, expiryMinutes);

        return ResponseEntity.ok(Map.of(
                "downloadUrl", presignedUrl,
                "expiresInMinutes", String.valueOf(expiryMinutes)
        ));
    }

    /**
     * Delete an employee document from cloud storage.
     */
    @DeleteMapping("/{key}")
    public ResponseEntity<Map<String, String>> deleteDocument(
            @PathVariable Long employeeId,
            @PathVariable String key) {

        String fullKey = String.format("employees/%d/%s", employeeId, key);

        log.info("Deleting document for employee={}, key={}", employeeId, fullKey);
        cloudStorageService.deleteFile(defaultBucket, fullKey);

        return ResponseEntity.ok(Map.of(
                "message", "Document deleted successfully",
                "key", fullKey
        ));
    }
}
