import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { environment } from '@env/environment';
import { AuthUser, LoginRequest, LoginResponse, RegisterRequest } from '@core/models';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private baseUrl = environment.authApiUrl;

  // Signals for reactive state
  currentUser = signal<AuthUser | null>(null);
  isAuthenticated = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.roles?.includes('ROLE_ADMIN') ?? false);

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap((response) => {
        const user: AuthUser = {
          id: response.id,
          username: response.username,
          email: response.email,
          roles: response.roles,
          token: response.token,
        };
        this.setSession(user);
      })
    );
  }

  register(data: RegisterRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/register`, data);
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  loadUserFromStorage(): void {
    const userJson = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (userJson && token) {
      try {
        const user: AuthUser = JSON.parse(userJson);
        user.token = token;
        this.currentUser.set(user);
      } catch {
        this.logout();
      }
    }
  }

  private setSession(user: AuthUser): void {
    localStorage.setItem(TOKEN_KEY, user.token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }
}
