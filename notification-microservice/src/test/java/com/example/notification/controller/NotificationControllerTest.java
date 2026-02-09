package com.example.notification.controller;

import com.example.notification.dto.NotificationRequest;
import com.example.notification.dto.NotificationResponse;
import com.example.notification.model.Notification.ChannelType;
import com.example.notification.model.Notification.NotificationStatus;
import com.example.notification.model.Notification.Priority;
import com.example.notification.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.bean.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Web layer tests — HATEOAS links and File Upload validation.
 */
@WebMvcTest({NotificationController.class, FileController.class})
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private NotificationService notificationService;

    @Test
    @DisplayName("should return HATEOAS links in response")
    void shouldReturnHateoasLinks() throws Exception {
        NotificationResponse response = new NotificationResponse(
                1L, "user-123", "Test", "Hello",
                ChannelType.EMAIL, NotificationStatus.SENT, Priority.MEDIUM,
                "system", null, LocalDateTime.now(), null);

        when(notificationService.getById(1L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/notifications/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.recipientId").value("user-123"))
                .andExpect(jsonPath("$._links.self.href").exists())
                .andExpect(jsonPath("$._links.collection.href").exists())
                .andExpect(jsonPath("$._links.mark-read.href").exists())
                .andExpect(jsonPath("$._links.delete.href").exists());
    }

    @Test
    @DisplayName("should NOT include mark-read link for already-read notification")
    void shouldOmitMarkReadForReadNotification() throws Exception {
        NotificationResponse response = new NotificationResponse(
                1L, "user-123", "Test", "Hello",
                ChannelType.EMAIL, NotificationStatus.READ, Priority.MEDIUM,
                "system", null, LocalDateTime.now(), LocalDateTime.now());

        when(notificationService.getById(1L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/notifications/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$._links.mark-read").doesNotExist());
    }

    @Test
    @DisplayName("should create notification via POST")
    void shouldCreateNotification() throws Exception {
        NotificationRequest request = new NotificationRequest(
                "user-123", "Test", "Hello", ChannelType.EMAIL, Priority.MEDIUM, null, null, null);

        NotificationResponse response = new NotificationResponse(
                1L, "user-123", "Test", "Hello",
                ChannelType.EMAIL, NotificationStatus.PENDING, Priority.MEDIUM,
                null, null, LocalDateTime.now(), null);

        when(notificationService.create(any())).thenReturn(response);

        mockMvc.perform(post("/api/v1/notifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1));
    }

    @Test
    @DisplayName("should reject invalid request (validation)")
    void shouldRejectInvalidRequest() throws Exception {
        // Missing required fields
        String invalidJson = """
                {
                    "recipientId": "",
                    "title": "",
                    "message": ""
                }
                """;

        mockMvc.perform(post("/api/v1/notifications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidJson))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("should upload file via multipart")
    void shouldUploadFile() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "test.txt", "text/plain", "Hello World".getBytes());

        mockMvc.perform(multipart("/api/v1/files").file(file)
                        .param("description", "Test file"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalName").value("test.txt"))
                .andExpect(jsonPath("$.contentType").value("text/plain"))
                .andExpect(jsonPath("$.downloadUrl").exists());
    }

    @Test
    @DisplayName("should reject empty file upload")
    void shouldRejectEmptyFile() throws Exception {
        MockMultipartFile emptyFile = new MockMultipartFile(
                "file", "empty.txt", "text/plain", new byte[0]);

        mockMvc.perform(multipart("/api/v1/files").file(emptyFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("File is empty"));
    }
}
