import { Component, output, input, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../features/auth/services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [MatToolbarModule, MatIconModule, MatButtonModule, MatMenuModule, MatBadgeModule, MatDividerModule],
  template: `
    <mat-toolbar color="primary" class="header-toolbar">
      <button mat-icon-button (click)="menuToggle.emit()">
        <mat-icon>menu</mat-icon>
      </button>
      <span class="app-title">Employee Management System</span>

      <span class="spacer"></span>

      <button mat-icon-button matBadge="3" matBadgeColor="warn" matBadgeSize="small">
        <mat-icon>notifications</mat-icon>
      </button>

      <button mat-icon-button [matMenuTriggerFor]="userMenu">
        <mat-icon>account_circle</mat-icon>
      </button>

      <mat-menu #userMenu="matMenu">
        <div class="user-info">
          <mat-icon>person</mat-icon>
          <span>{{ username() }}</span>
        </div>
        <mat-divider></mat-divider>
        <button mat-menu-item>
          <mat-icon>settings</mat-icon>
          <span>Settings</span>
        </button>
        <button mat-menu-item (click)="onLogout()">
          <mat-icon>logout</mat-icon>
          <span>Logout</span>
        </button>
      </mat-menu>
    </mat-toolbar>
  `,
  styles: [`
    .header-toolbar {
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .app-title {
      margin-left: 8px;
      font-size: 1.1rem;
    }
    .user-info {
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
    }
  `],
})
export class HeaderComponent {
  username = input<string>('User');
  menuToggle = output<void>();

  private authService = inject(AuthService);

  onLogout(): void {
    this.authService.logout();
  }
}
