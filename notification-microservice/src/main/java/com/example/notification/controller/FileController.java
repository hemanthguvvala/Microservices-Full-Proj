package com.example.notification.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Map;
import java.util.UUID;

/**
 * File Upload / Download Controller using MultipartFile.
 *
 * Interview Insight:
 *   "How does Spring handle file uploads?"
 *   → "Spring uses MultipartFile backed by Commons FileUpload or Servlet 3.0+ API.
 *
 *      Key annotations:
 *        @RequestParam('file') MultipartFile file  — binds uploaded file
 *        spring.servlet.multipart.max-file-size    — limits file size (default 1MB)
 *        spring.servlet.multipart.max-request-size — limits total request size
 *
 *      MultipartFile API:
 *        getOriginalFilename()  — client's file name
 *        getContentType()       — MIME type (e.g., 'image/png')
 *        getSize()              — file size in bytes
 *        getBytes()             — file contents as byte[]
 *        getInputStream()       — for streaming large files
 *        transferTo(File dest)  — saves to disk directly
 *
 *      Security considerations:
 *        - Always validate file type (don't trust Content-Type header)
 *        - Limit file size (spring.servlet.multipart.max-file-size)
 *        - Don't use original filename (path traversal: ../../../etc/passwd)
 *        - Generate UUID filename, store original name in DB
 *        - Virus scan uploaded files in production
 *        - Store outside web root / use cloud storage (S3/Azure Blob)
 *
 *      Production pattern:
 *        1. Receive MultipartFile
 *        2. Validate size + type
 *        3. Generate safe filename (UUID)
 *        4. Store metadata in DB (original name, size, type, user)
 *        5. Save file to storage (local / S3 / Azure Blob)
 *        6. Return file ID for retrieval"
 */
@RestController
@RequestMapping("/api/v1/files")
@Tag(name = "File Upload", description = "MultipartFile Upload & Download API")
@RequiredArgsConstructor
@Slf4j
public class FileController {

    @Value("${app.file.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${app.file.max-size:10485760}") // 10MB
    private long maxFileSize;

    private static final java.util.Set<String> ALLOWED_TYPES = java.util.Set.of(
            "image/jpeg", "image/png", "image/gif",
            "application/pdf", "text/plain", "text/csv",
            "application/json", "application/xml"
    );

    /**
     * Upload a file using MultipartFile.
     * Demonstrates: @RequestParam("file"), validation, UUID naming, disk storage.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload a file attachment")
    public ResponseEntity<Map<String, Object>> uploadFile(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {

        // ── Validate ────────────────────────────────────────────────────────────
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File is empty"));
        }

        if (file.getSize() > maxFileSize) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File exceeds maximum size of " + maxFileSize + " bytes"));
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "File type not allowed: " + contentType,
                            "allowedTypes", ALLOWED_TYPES));
        }

        try {
            // ── Generate safe filename (UUID) — never trust original ──────────
            String originalFilename = file.getOriginalFilename();
            String extension = getFileExtension(originalFilename);
            String storedFilename = UUID.randomUUID() + extension;

            // ── Create upload directory if needed ─────────────────────────────
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // ── Save file ────────────────────────────────────────────────────
            Path targetPath = uploadPath.resolve(storedFilename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            log.info("File uploaded: {} -> {} ({} bytes, type: {})",
                    originalFilename, storedFilename, file.getSize(), contentType);

            return ResponseEntity.status(201).body(Map.of(
                    "fileId", storedFilename,
                    "originalName", originalFilename != null ? originalFilename : "unknown",
                    "size", file.getSize(),
                    "contentType", contentType,
                    "description", description != null ? description : "",
                    "downloadUrl", "/api/v1/files/" + storedFilename
            ));
        } catch (IOException e) {
            log.error("Failed to upload file", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to store file: " + e.getMessage()));
        }
    }

    /**
     * Upload multiple files.
     * Demonstrates: @RequestParam("files") MultipartFile[] for batch upload.
     */
    @PostMapping(value = "/batch", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload multiple files at once")
    public ResponseEntity<Map<String, Object>> uploadMultipleFiles(
            @RequestParam("files") MultipartFile[] files) {

        var results = new java.util.ArrayList<Map<String, Object>>();
        int successCount = 0;
        int failCount = 0;

        for (MultipartFile file : files) {
            try {
                if (file.isEmpty()) {
                    failCount++;
                    continue;
                }

                String storedFilename = UUID.randomUUID() + getFileExtension(file.getOriginalFilename());
                Path uploadPath = Paths.get(uploadDir);
                Files.createDirectories(uploadPath);
                Files.copy(file.getInputStream(), uploadPath.resolve(storedFilename),
                        StandardCopyOption.REPLACE_EXISTING);

                results.add(Map.of(
                        "fileId", storedFilename,
                        "originalName", file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown",
                        "size", file.getSize()
                ));
                successCount++;
            } catch (IOException e) {
                log.error("Failed to upload file: {}", file.getOriginalFilename(), e);
                failCount++;
            }
        }

        return ResponseEntity.ok(Map.of(
                "uploaded", successCount,
                "failed", failCount,
                "files", results
        ));
    }

    /**
     * Download a file by its stored ID.
     * Demonstrates: Resource response, Content-Disposition header, UrlResource.
     */
    @GetMapping("/{fileId}")
    @Operation(summary = "Download a file by its ID")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileId) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(fileId).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            String contentType;
            try {
                contentType = Files.probeContentType(filePath);
            } catch (IOException e) {
                contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(
                            contentType != null ? contentType : MediaType.APPLICATION_OCTET_STREAM_VALUE))
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + fileId + "\"")
                    .body(resource);
        } catch (MalformedURLException e) {
            log.error("Invalid file path: {}", fileId, e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Delete a previously uploaded file.
     */
    @DeleteMapping("/{fileId}")
    @Operation(summary = "Delete an uploaded file")
    public ResponseEntity<Void> deleteFile(@PathVariable String fileId) {
        try {
            Path filePath = Paths.get(uploadDir).resolve(fileId).normalize();
            if (Files.deleteIfExists(filePath)) {
                log.info("File deleted: {}", fileId);
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.notFound().build();
        } catch (IOException e) {
            log.error("Failed to delete file: {}", fileId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ── Helper ───────────────────────────────────────────────────────────────────

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.'));
    }
}
