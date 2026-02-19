import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '@env/environment';
import { Notification, NotificationCreateRequest, PaginatedResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private api = inject(ApiService);
  private baseUrl = environment.notificationApiUrl;

  getNotifications(page = 0, size = 10): Observable<PaginatedResponse<Notification>> {
    return this.api.get<PaginatedResponse<Notification>>(this.baseUrl, { page, size });
  }

  getNotificationById(id: string): Observable<Notification> {
    return this.api.get<Notification>(`${this.baseUrl}/${id}`);
  }

  getNotificationsByRecipient(recipientId: string): Observable<Notification[]> {
    return this.api.get<Notification[]>(`${this.baseUrl}/recipient/${recipientId}`);
  }

  searchNotifications(params: Record<string, string>): Observable<Notification[]> {
    return this.api.get<Notification[]>(`${this.baseUrl}/search`, params);
  }

  createNotification(notification: NotificationCreateRequest): Observable<Notification> {
    return this.api.post<Notification>(this.baseUrl, notification);
  }

  markAsRead(id: string): Observable<Notification> {
    return this.api.patch<Notification>(`${this.baseUrl}/${id}/read`);
  }

  getUnreadCount(recipientId: string): Observable<number> {
    return this.api.get<number>(`${this.baseUrl}/recipient/${recipientId}/unread-count`);
  }
}
