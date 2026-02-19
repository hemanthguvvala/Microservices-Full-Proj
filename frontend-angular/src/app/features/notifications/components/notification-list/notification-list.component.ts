import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Notification } from '../../../../core/models';
import { NotificationService } from '../../../../core/services/notification.service';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';
import { TruncatePipe } from '../../../../shared/pipes/truncate.pipe';

@Component({
  selector: 'app-notification-list',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatListModule, MatChipsModule, MatBadgeModule,
    MatPaginatorModule, MatTabsModule,
    RelativeTimePipe, TruncatePipe,
  ],
  template: `
    <div class="page-header">
      <h1>Notifications</h1>
    </div>

    <mat-card>
      <mat-tab-group (selectedTabChange)="onTabChange($event.index)">
        <mat-tab label="All">
          <ng-template matTabContent>
            <ng-container *ngTemplateOutlet="notificationList"></ng-container>
          </ng-template>
        </mat-tab>
        <mat-tab label="Unread">
          <ng-template matTabContent>
            <ng-container *ngTemplateOutlet="notificationList"></ng-container>
          </ng-template>
        </mat-tab>
      </mat-tab-group>
    </mat-card>

    <ng-template #notificationList>
      <mat-list class="notification-list">
        @for (notif of notifications(); track notif.id) {
          <mat-list-item class="notification-item" [class.unread-item]="!notif.read"
                         [routerLink]="['/notifications', notif.id]">
            <mat-icon matListItemIcon [class]="notif.read ? 'read-icon' : 'unread-icon'">
              @switch (notif.type) {
                @case ('EMAIL') { email }
                @case ('SMS') { sms }
                @case ('PUSH') { notifications }
                @case ('IN_APP') { inbox }
                @case ('SLACK') { chat }
                @default { notifications }
              }
            </mat-icon>
            <span matListItemTitle>
              {{ notif.subject }}
              @if (!notif.read) {
                <mat-chip class="new-badge">NEW</mat-chip>
              }
            </span>
            <span matListItemLine>{{ notif.message | truncate:80 }}</span>
            <span matListItemLine class="notif-meta">
              <mat-chip>{{ notif.channel }}</mat-chip>
              <span>{{ (notif.createdAt ?? '') | relativeTime }}</span>
            </span>
            <div matListItemMeta>
              @if (!notif.read) {
                <button mat-icon-button (click)="markAsRead($event, notif)" matTooltip="Mark as read">
                  <mat-icon>done</mat-icon>
                </button>
              }
            </div>
          </mat-list-item>
        } @empty {
          <div class="empty-state">
            <mat-icon>notifications_none</mat-icon>
            <p>No notifications</p>
          </div>
        }
      </mat-list>

      <mat-paginator
        [length]="totalElements"
        [pageSize]="pageSize"
        [pageSizeOptions]="[10, 25, 50]"
        (page)="onPageChange($event)"
        showFirstLastButtons>
      </mat-paginator>
    </ng-template>
  `,
  styles: [`
    .notification-list { padding: 0; }
    .notification-item {
      cursor: pointer;
      border-bottom: 1px solid #f0f0f0;
      &:hover { background: #fafafa; }
    }
    .unread-item { background: #e3f2fd; }
    .unread-icon { color: #1565c0; }
    .read-icon { color: #9e9e9e; }
    .new-badge { font-size: 0.7rem; margin-left: 8px; }
    .notif-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
      color: #999;
      font-size: 0.85rem;
    }
  `],
})
export class NotificationListComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private snackBar = inject(MatSnackBar);

  notifications = signal<Notification[]>([]);
  totalElements = 0;
  pageSize = 10;
  currentPage = 0;
  activeTab = 0;

  ngOnInit(): void {
    this.loadNotifications();
  }

  loadNotifications(): void {
    this.notificationService.getNotifications(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        let items = res.content;
        if (this.activeTab === 1) {
          items = items.filter((n) => !n.read);
        }
        this.notifications.set(items);
        this.totalElements = res.totalElements;
      },
      error: () => this.notifications.set([]),
    });
  }

  onTabChange(index: number): void {
    this.activeTab = index;
    this.currentPage = 0;
    this.loadNotifications();
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadNotifications();
  }

  markAsRead(event: Event, notif: Notification): void {
    event.stopPropagation();
    event.preventDefault();
    this.notificationService.markAsRead(notif.id).subscribe({
      next: () => {
        this.snackBar.open('Marked as read', 'Close', { duration: 2000 });
        this.loadNotifications();
      },
    });
  }
}
