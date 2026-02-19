import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { LoadingSpinnerComponent } from './shared/components/loading-spinner/loading-spinner.component';
import { AuthService } from './features/auth/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, SidebarComponent, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner />

    @if (authService.isAuthenticated()) {
      <div class="app-container">
        <app-sidebar
          [collapsed]="sidebarCollapsed()"
          (toggleSidebar)="toggleSidebar()" />
        <div class="main-content">
          <app-header
            (menuToggle)="toggleSidebar()"
            [username]="authService.currentUser()?.username ?? 'User'" />
          <main class="page-content">
            <router-outlet />
          </main>
        </div>
      </div>
    } @else {
      <router-outlet />
    }
  `,
  styles: [`
    :host { display: block; height: 100vh; }
  `],
})
export class AppComponent implements OnInit {
  authService = inject(AuthService);
  sidebarCollapsed = signal(false);

  ngOnInit(): void {
    this.authService.loadUserFromStorage();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((v) => !v);
  }
}
