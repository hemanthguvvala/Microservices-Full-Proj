package com.example.notification.controller;

import com.example.notification.dto.NotificationFilter;
import com.example.notification.dto.NotificationRequest;
import com.example.notification.dto.NotificationResponse;
import com.example.notification.model.Notification.ChannelType;
import com.example.notification.model.Notification.NotificationStatus;
import com.example.notification.model.Notification.Priority;
import com.example.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.hateoas.PagedModel;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

/**
 * REST Controller with HATEOAS — Hypermedia-Driven API (REST Level 3).
 *
 * Interview Insight:
 *   "What is HATEOAS and why is it important?"
 *   → "HATEOAS = Hypermedia As The Engine Of Application State.
 *      It's the highest level of REST maturity (Richardson Maturity Model):
 *        Level 0: Single URL, single HTTP method (SOAP-like)
 *        Level 1: Multiple resources (URLs)
 *        Level 2: HTTP verbs (GET, POST, PUT, DELETE) ← Most APIs stop here
 *        Level 3: Hypermedia controls (links) ← HATEOAS
 *
 *      HATEOAS responses include links telling the client WHAT ACTIONS are
 *      available next. The client doesn't hardcode URLs — it follows links.
 *
 *      Example response:
 *        {
 *          'id': 1, 'title': 'Welcome',
 *          '_links': {
 *            'self':      { 'href': '/api/v1/notifications/1' },
 *            'mark-read': { 'href': '/api/v1/notifications/1/read' },
 *            'delete':    { 'href': '/api/v1/notifications/1' },
 *            'collection':{ 'href': '/api/v1/notifications' }
 *          }
 *        }
 *
 *      Benefits:
 *        - Discoverability: clients navigate the API like a website
 *        - Evolvability: server can change URLs without breaking clients
 *        - Self-documenting: links tell what operations are valid
 *
 *      Spring HATEOAS:
 *        EntityModel<T>     — wraps a single resource + links
 *        CollectionModel<T> — wraps a collection + links
 *        WebMvcLinkBuilder  — type-safe link generation from controller methods"
 */
@RestController
@RequestMapping("/api/v1/notifications")
@Tag(name = "Notifications", description = "HATEOAS-driven Notification API")
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping
    @Operation(summary = "Create a notification")
    public ResponseEntity<EntityModel<NotificationResponse>> create(
            @Valid @RequestBody NotificationRequest request) {
        NotificationResponse response = notificationService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(toModel(response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get notification by ID (with HATEOAS links)")
    public ResponseEntity<EntityModel<NotificationResponse>> getById(@PathVariable Long id) {
        NotificationResponse response = notificationService.getById(id);
        return ResponseEntity.ok(toModel(response));
    }

    @GetMapping("/recipient/{recipientId}")
    @Operation(summary = "Get notifications for a recipient (paginated)")
    public ResponseEntity<CollectionModel<EntityModel<NotificationResponse>>> getByRecipient(
            @PathVariable String recipientId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        Page<NotificationResponse> result = notificationService.getByRecipient(
                recipientId, PageRequest.of(page, size, Sort.by("createdDate").descending()));

        List<EntityModel<NotificationResponse>> models = result.getContent().stream()
                .map(this::toModel)
                .toList();

        return ResponseEntity.ok(CollectionModel.of(models,
                linkTo(methodOn(NotificationController.class)
                        .getByRecipient(recipientId, page, size)).withSelfRel()));
    }

    @GetMapping("/search")
    @Operation(summary = "Search notifications with dynamic filters (JPA Specifications)")
    public ResponseEntity<CollectionModel<EntityModel<NotificationResponse>>> search(
            @RequestParam(required = false) String recipientId,
            @RequestParam(required = false) ChannelType channelType,
            @RequestParam(required = false) NotificationStatus status,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) String searchTerm,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {

        NotificationFilter filter = new NotificationFilter(
                recipientId, channelType, status, priority, null, null, searchTerm);

        Page<NotificationResponse> result = notificationService.search(
                filter, PageRequest.of(page, size, Sort.by("createdDate").descending()));

        List<EntityModel<NotificationResponse>> models = result.getContent().stream()
                .map(this::toModel)
                .toList();

        return ResponseEntity.ok(CollectionModel.of(models,
                linkTo(methodOn(NotificationController.class)
                        .search(recipientId, channelType, status, priority, searchTerm, page, size)).withSelfRel()));
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Mark notification as read")
    public ResponseEntity<EntityModel<NotificationResponse>> markAsRead(@PathVariable Long id) {
        NotificationResponse response = notificationService.markAsRead(id);
        return ResponseEntity.ok(toModel(response));
    }

    @PatchMapping("/recipient/{recipientId}/read-all")
    @Operation(summary = "Mark all notifications as read for a user")
    public ResponseEntity<Void> markAllAsRead(@PathVariable String recipientId) {
        notificationService.markAllAsRead(recipientId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/recipient/{recipientId}/unread-count")
    @Operation(summary = "Get unread notification count")
    public ResponseEntity<Long> getUnreadCount(@PathVariable String recipientId) {
        return ResponseEntity.ok(notificationService.getUnreadCount(recipientId));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a notification")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        notificationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── HATEOAS Link Builder ─────────────────────────────────────────────────────

    /**
     * Wraps a NotificationResponse in an EntityModel with hypermedia links.
     *
     * Links are context-dependent:
     *   - All: self, collection
     *   - Not read: mark-read link
     *   - Any: delete link
     */
    private EntityModel<NotificationResponse> toModel(NotificationResponse response) {
        EntityModel<NotificationResponse> model = EntityModel.of(response,
                linkTo(methodOn(NotificationController.class).getById(response.id())).withSelfRel(),
                linkTo(methodOn(NotificationController.class)
                        .getByRecipient(response.recipientId(), 0, 10)).withRel("collection"));

        // Conditional links based on state
        if (response.status() != NotificationStatus.READ) {
            model.add(linkTo(methodOn(NotificationController.class)
                    .markAsRead(response.id())).withRel("mark-read"));
        }

        model.add(linkTo(methodOn(NotificationController.class)
                .delete(response.id())).withRel("delete"));

        return model;
    }
}
