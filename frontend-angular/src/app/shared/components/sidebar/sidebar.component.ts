import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  icon: string;
  label: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatListModule, MatIconModule, MatTooltipModule],
  template: `
    <nav class="sidebar" [class.collapsed]="collapsed()">
      <mat-nav-list>
        @for (item of navItems; track item.route) {
          <a mat-list-item
             [routerLink]="item.route"
             routerLinkActive="active-link"
             [matTooltip]="collapsed() ? item.label : ''"
             matTooltipPosition="right">
            <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
            @if (!collapsed()) {
              <span matListItemTitle>{{ item.label }}</span>
            }
          </a>
        }
      </mat-nav-list>

      <div class="sidebar-footer">
        <button mat-icon-button (click)="toggleSidebar.emit()" class="toggle-btn">
          <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
        </button>
      </div>
    </nav>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      height: 100vh;
      background: #fff;
      border-right: 1px solid #e0e0e0;
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease;
      overflow: hidden;

      &.collapsed { width: 64px; }
    }

    mat-nav-list { flex: 1; padding-top: 8px; }

    .active-link {
      background-color: rgba(63, 81, 181, 0.08) !important;
      color: #3f51b5 !important;

      mat-icon { color: #3f51b5; }
    }

    .sidebar-footer {
      padding: 8px;
      border-top: 1px solid #e0e0e0;
      display: flex;
      justify-content: center;
    }

    .toggle-btn { color: #666; }
  `],
})
export class SidebarComponent {
  collapsed = input(false);
  toggleSidebar = output<void>();

  navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/dashboard' },
    { icon: 'people', label: 'Employees', route: '/employees' },
    { icon: 'payments', label: 'Payroll', route: '/payroll' },
    { icon: 'notifications', label: 'Notifications', route: '/notifications' },
  ];
}
