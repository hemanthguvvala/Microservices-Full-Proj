package com.example.notification.mapper;

import com.example.notification.dto.NotificationRequest;
import com.example.notification.dto.NotificationResponse;
import com.example.notification.model.Notification;
import com.example.notification.model.Notification.NotificationStatus;
import org.mapstruct.*;

/**
 * MapStruct mapper for Notification entity ↔ DTO conversions.
 *
 * Interview insight:
 * - MapStruct generates type-safe mapping code at COMPILE TIME (not reflection)
 * - 10-100x faster than ModelMapper/Dozer which use reflection at runtime
 * - Compile-time errors if fields don't match → catches bugs early
 * - With @MappingConstants.ComponentModel.SPRING → produces a Spring @Component
 *
 * Key annotations:
 * - @Mapping(target, ignore) — skip unmapped fields
 * - @Mapping(target, constant) — set fixed values
 * - @Mapping(target, expression) — custom Java expression
 * - @InheritInverseConfiguration — reverse a mapping automatically
 */
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING,
        unmappedTargetPolicy = ReportingPolicy.IGNORE,
        builder = @Builder(disableBuilder = false))
public interface NotificationMapper {

    // ── NotificationRequest → Notification (entity) ──────────────────────────
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "status", constant = "PENDING")
    @Mapping(target = "retryCount", constant = "0")
    @Mapping(target = "sentAt", ignore = true)
    @Mapping(target = "readAt", ignore = true)
    @Mapping(target = "attachmentPath", ignore = true)
    @Mapping(target = "createdDate", ignore = true)
    @Mapping(target = "lastModifiedDate", ignore = true)
    @Mapping(target = "version", ignore = true)
    Notification toEntity(NotificationRequest request);

    // ── Notification (entity) → NotificationResponse ─────────────────────────
    NotificationResponse toResponse(Notification notification);
}
