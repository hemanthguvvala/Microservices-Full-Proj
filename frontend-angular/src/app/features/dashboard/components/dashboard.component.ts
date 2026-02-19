import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { DecimalPipe, KeyValuePipe } from '@angular/common';
import { EmployeeService } from '../../../core/services/employee.service';
import { PayrollService } from '../../../core/services/payroll.service';
import { NotificationService } from '../../../core/services/notification.service';
import { EmployeeStats, Payroll, Notification } from '../../../core/models';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink, DecimalPipe, KeyValuePipe,
    MatCardModule, MatIconModule, MatButtonModule,
    MatDividerModule, MatListModule, MatChipsModule,
    RelativeTimePipe,
  ],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-4 mb-3">
      <mat-card class="stat-card">
        <mat-icon class="stat-icon" style="color: #3f51b5;">people</mat-icon>
        <div class="stat-value">{{ stats()?.totalEmployees ?? 0 }}</div>
        <div class="stat-label">Total Employees</div>
      </mat-card>

      <mat-card class="stat-card">
        <mat-icon class="stat-icon" style="color: #4caf50;">check_circle</mat-icon>
        <div class="stat-value">{{ stats()?.activeEmployees ?? 0 }}</div>
        <div class="stat-label">Active Employees</div>
      </mat-card>

      <mat-card class="stat-card">
        <mat-icon class="stat-icon" style="color: #ff9800;">attach_money</mat-icon>
        <div class="stat-value">{{ stats()?.averageSalary ?? 0 | number:'1.0-0' }}</div>
        <div class="stat-label">Average Salary</div>
      </mat-card>

      <mat-card class="stat-card">
        <mat-icon class="stat-icon" style="color: #f44336;">notifications_active</mat-icon>
        <div class="stat-value">{{ recentNotifications().length }}</div>
        <div class="stat-label">Notifications</div>
      </mat-card>
    </div>

    <!-- Content Grid -->
    <div class="grid grid-2">
      <!-- Department Distribution -->
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>business</mat-icon>
          <mat-card-title>Department Distribution</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-list>
            @for (dept of stats()?.departmentCounts | keyvalue; track dept.key) {
              <mat-list-item>
                <span matListItemTitle>{{ dept.key }}</span>
                <span matListItemMeta>
                  <mat-chip>{{ dept.value }}</mat-chip>
                </span>
              </mat-list-item>
            } @empty {
              <mat-list-item>
                <span matListItemTitle class="text-center">No department data available</span>
              </mat-list-item>
            }
          </mat-list>
        </mat-card-content>
        <mat-card-actions>
          <a mat-button color="primary" routerLink="/employees">View All Employees</a>
        </mat-card-actions>
      </mat-card>

      <!-- Recent Payrolls -->
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>payments</mat-icon>
          <mat-card-title>Recent Payrolls</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-list>
            @for (payroll of recentPayrolls(); track payroll.id) {
              <mat-list-item>
                <span matListItemTitle>Employee #{{ payroll.employeeId }}</span>
                <span matListItemLine>Net Pay: \${{ payroll.netPay | number:'1.2-2' }}</span>
                <span matListItemMeta>
                  <span class="status-badge" [class]="payroll.status.toLowerCase()">
                    {{ payroll.status }}
                  </span>
                </span>
              </mat-list-item>
            } @empty {
              <mat-list-item>
                <span matListItemTitle>No recent payrolls</span>
              </mat-list-item>
            }
          </mat-list>
        </mat-card-content>
        <mat-card-actions>
          <a mat-button color="primary" routerLink="/payroll">View All Payrolls</a>
        </mat-card-actions>
      </mat-card>

      <!-- Recent Notifications -->
      <mat-card class="notifications-card">
        <mat-card-header>
          <mat-icon mat-card-avatar>notifications</mat-icon>
          <mat-card-title>Recent Notifications</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <mat-list>
            @for (notif of recentNotifications(); track notif.id) {
              <mat-list-item>
                <mat-icon matListItemIcon [class]="notif.read ? 'read' : 'unread'">
                  {{ notif.read ? 'mark_email_read' : 'mark_email_unread' }}
                </mat-icon>
                <span matListItemTitle>{{ notif.subject }}</span>
                <span matListItemLine>{{ (notif.createdAt ?? '') | relativeTime }}</span>
              </mat-list-item>
            } @empty {
              <mat-list-item>
                <span matListItemTitle>No notifications</span>
              </mat-list-item>
            }
          </mat-list>
        </mat-card-content>
        <mat-card-actions>
          <a mat-button color="primary" routerLink="/notifications">View All</a>
        </mat-card-actions>
      </mat-card>

      <!-- Quick Actions -->
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>flash_on</mat-icon>
          <mat-card-title>Quick Actions</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="quick-actions">
            <a mat-stroked-button color="primary" routerLink="/employees/create">
              <mat-icon>person_add</mat-icon> Add Employee
            </a>
            <a mat-stroked-button color="accent" routerLink="/payroll/create">
              <mat-icon>add_card</mat-icon> Create Payroll
            </a>
            <a mat-stroked-button routerLink="/employees">
              <mat-icon>search</mat-icon> Search Employees
            </a>
            <a mat-stroked-button routerLink="/notifications">
              <mat-icon>notifications</mat-icon> View Notifications
            </a>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .stat-icon { font-size: 36px; width: 36px; height: 36px; margin-bottom: 8px; }
    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 8px 0;

      a {
        display: flex;
        align-items: center;
        gap: 8px;
        justify-content: flex-start;
      }
    }
    .unread { color: #1565c0; }
    .read { color: #9e9e9e; }
  `],
})
export class DashboardComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private payrollService = inject(PayrollService);
  private notificationService = inject(NotificationService);

  stats = signal<EmployeeStats | null>(null);
  recentPayrolls = signal<Payroll[]>([]);
  recentNotifications = signal<Notification[]>([]);

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private loadDashboardData(): void {
    this.employeeService.getEmployeeStats().subscribe({
      next: (data) => this.stats.set(data),
      error: () => this.stats.set({
        totalEmployees: 0,
        activeEmployees: 0,
        departmentCounts: {},
        averageSalary: 0,
      }),
    });

    this.payrollService.getPayrolls(0, 5).subscribe({
      next: (data) => this.recentPayrolls.set(data.content),
      error: () => this.recentPayrolls.set([]),
    });

    this.notificationService.getNotifications(0, 5).subscribe({
      next: (data) => this.recentNotifications.set(data.content),
      error: () => this.recentNotifications.set([]),
    });
  }
}
