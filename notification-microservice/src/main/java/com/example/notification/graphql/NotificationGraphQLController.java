package com.example.notification.graphql;

import com.example.notification.dto.NotificationFilter;
import com.example.notification.dto.NotificationRequest;
import com.example.notification.dto.NotificationResponse;
import com.example.notification.model.Notification.ChannelType;
import com.example.notification.model.Notification.NotificationStatus;
import com.example.notification.model.Notification.Priority;
import com.example.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.Map;

/**
 * GraphQL Controller — Spring for GraphQL (since Spring Boot 3.x).
 *
 * Interview Insight:
 *   "How does Spring for GraphQL work?"
 *   → "Spring for GraphQL uses annotation-based controllers similar to REST:
 *        @QueryMapping    = GraphQL Query  (like @GetMapping)
 *        @MutationMapping = GraphQL Mutation (like @PostMapping)
 *        @Argument        = binds GraphQL arguments to method parameters
 *
 *      The schema.graphqls file defines the contract (types, queries, mutations).
 *      Spring auto-maps controller methods to schema operations by name.
 *
 *      Endpoint: POST /graphql (single endpoint for all operations)
 *      Playground: /graphiql (dev tool for testing queries)"
 *
 *   "GraphQL N+1 Problem?"
 *   → "When resolving nested objects, GraphQL can trigger N+1 DB queries.
 *      Solutions: @BatchMapping (Spring), DataLoader (general), or
 *      JPA JOIN FETCH in the repository query."
 */
@Controller
@RequiredArgsConstructor
@Slf4j
public class NotificationGraphQLController {

    private final NotificationService notificationService;

    // ── Queries ──────────────────────────────────────────────────────────────────

    @QueryMapping
    public NotificationResponse notification(@Argument Long id) {
        return notificationService.getById(id);
    }

    @QueryMapping
    public Map<String, Object> notificationsByRecipient(
            @Argument String recipientId,
            @Argument int page,
            @Argument int size) {
        Page<NotificationResponse> result = notificationService.getByRecipient(
                recipientId, PageRequest.of(page, size));
        return toPageMap(result);
    }

    @QueryMapping
    public Map<String, Object> searchNotifications(
            @Argument String recipientId,
            @Argument ChannelType channelType,
            @Argument NotificationStatus status,
            @Argument Priority priority,
            @Argument String searchTerm,
            @Argument int page,
            @Argument int size) {

        NotificationFilter filter = new NotificationFilter(
                recipientId, channelType, status, priority, null, null, searchTerm);

        Page<NotificationResponse> result = notificationService.search(
                filter, PageRequest.of(page, size));
        return toPageMap(result);
    }

    @QueryMapping
    public long unreadCount(@Argument String recipientId) {
        return notificationService.getUnreadCount(recipientId);
    }

    // ── Mutations ────────────────────────────────────────────────────────────────

    @MutationMapping
    public NotificationResponse createNotification(@Argument("input") NotificationRequest input) {
        return notificationService.create(input);
    }

    @MutationMapping
    public NotificationResponse markAsRead(@Argument Long id) {
        return notificationService.markAsRead(id);
    }

    @MutationMapping
    public boolean markAllAsRead(@Argument String recipientId) {
        notificationService.markAllAsRead(recipientId);
        return true;
    }

    @MutationMapping
    public boolean deleteNotification(@Argument Long id) {
        notificationService.delete(id);
        return true;
    }

    // ── Helper ───────────────────────────────────────────────────────────────────

    private Map<String, Object> toPageMap(Page<NotificationResponse> page) {
        return Map.of(
                "content", page.getContent(),
                "totalElements", page.getTotalElements(),
                "totalPages", page.getTotalPages(),
                "pageNumber", page.getNumber(),
                "pageSize", page.getSize(),
                "hasNext", page.hasNext()
        );
    }
}
