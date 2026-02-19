import { Component, inject, OnInit, signal, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { Notification } from '../../../../core/models';
import { NotificationService } from '../../../../core/services/notification.service';

@Component({
  selector: 'app-notification-detail',
  standalone: true,
  imports: [
    RouterLink, DatePipe, KeyValuePipe,
    MatCardModule, MatButtonModule, MatIconModule,
    MatListModule, MatChipsModule, MatDividerModule,
  ],
  template: `
    <div class="page-header">
      <h1>Notification Details</h1>
      <a mat-button routerLink="/notifications">
        <mat-icon>arrow_back</mat-icon> Back
      </a>
    </div>

    @if (notification(); as notif) {
      <div class="grid grid-2">
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>{{ notif.read ? 'drafts' : 'mark_email_unread' }}</mat-icon>
            <mat-card-title>{{ notif.subject }}</mat-card-title>
            <mat-card-subtitle>
              <mat-chip>{{ notif.type }}</mat-chip>
              <mat-chip>{{ notif.channel }}</mat-chip>
              <span class="status-badge" [class]="notif.read ? 'read' : 'unread'">
                {{ notif.read ? 'Read' : 'Unread' }}
              </span>
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="message-body">
              {{ notif.message }}
            </div>
          </mat-card-content>
          <mat-card-actions>
            @if (!notif.read) {
              <button mat-flat-button color="primary" (click)="markAsRead()">
                <mat-icon>done</mat-icon> Mark as Read
              </button>
            }
          </mat-card-actions>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>Details</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon>person</mat-icon>
                <span matListItemTitle>{{ notif.recipientId }}</span>
                <span matListItemLine>Recipient ID</span>
              </mat-list-item>
              @if (notif.recipientEmail) {
                <mat-list-item>
                  <mat-icon matListItemIcon>email</mat-icon>
                  <span matListItemTitle>{{ notif.recipientEmail }}</span>
                  <span matListItemLine>Recipient Email</span>
                </mat-list-item>
              }
              <mat-list-item>
                <mat-icon matListItemIcon>schedule</mat-icon>
                <span matListItemTitle>{{ notif.createdAt | date:'medium' }}</span>
                <span matListItemLine>Created At</span>
              </mat-list-item>
              @if (notif.sentAt) {
                <mat-list-item>
                  <mat-icon matListItemIcon>send</mat-icon>
                  <span matListItemTitle>{{ notif.sentAt | date:'medium' }}</span>
                  <span matListItemLine>Sent At</span>
                </mat-list-item>
              }
            </mat-list>

            @if (notif.metadata) {
              <mat-divider></mat-divider>
              <h4 class="mt-2">Metadata</h4>
              <mat-list dense>
                @for (entry of notif.metadata | keyvalue; track entry.key) {
                  <mat-list-item>
                    <span matListItemTitle>{{ entry.key }}</span>
                    <span matListItemMeta>{{ entry.value }}</span>
                  </mat-list-item>
                }
              </mat-list>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .message-body {
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
      margin-top: 16px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    mat-card-subtitle { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  `],
})
export class NotificationDetailComponent implements OnInit {
  id = input.required<string>();

  private notificationService = inject(NotificationService);
  private snackBar = inject(MatSnackBar);

  notification = signal<Notification | null>(null);

  ngOnInit(): void {
    this.loadNotification();
  }

  private loadNotification(): void {
    this.notificationService.getNotificationById(this.id()).subscribe({
      next: (n) => this.notification.set(n),
    });
  }

  markAsRead(): void {
    this.notificationService.markAsRead(this.id()).subscribe({
      next: () => {
        this.snackBar.open('Marked as read', 'Close', { duration: 2000, panelClass: ['success-snackbar'] });
        this.loadNotification();
      },
    });
  }
}
