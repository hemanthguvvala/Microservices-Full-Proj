import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="register-container">
      <mat-card class="register-card">
        <mat-card-header>
          <mat-icon mat-card-avatar class="register-icon">person_add</mat-icon>
          <mat-card-title>Create Account</mat-card-title>
          <mat-card-subtitle>Register for Employee Management System</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Username</mat-label>
              <input matInput formControlName="username" />
              <mat-icon matSuffix>person</mat-icon>
              @if (registerForm.get('username')?.hasError('required') && registerForm.get('username')?.touched) {
                <mat-error>Username is required</mat-error>
              }
              @if (registerForm.get('username')?.hasError('minlength')) {
                <mat-error>Minimum 3 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Email</mat-label>
              <input matInput formControlName="email" type="email" />
              <mat-icon matSuffix>email</mat-icon>
              @if (registerForm.get('email')?.hasError('required') && registerForm.get('email')?.touched) {
                <mat-error>Email is required</mat-error>
              }
              @if (registerForm.get('email')?.hasError('email')) {
                <mat-error>Invalid email format</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Password</mat-label>
              <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="password" />
              <button mat-icon-button matSuffix type="button" (click)="hidePassword.set(!hidePassword())">
                <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (registerForm.get('password')?.hasError('required') && registerForm.get('password')?.touched) {
                <mat-error>Password is required</mat-error>
              }
              @if (registerForm.get('password')?.hasError('minlength')) {
                <mat-error>Minimum 6 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Confirm Password</mat-label>
              <input matInput [type]="hidePassword() ? 'password' : 'text'" formControlName="confirmPassword" />
              @if (registerForm.get('confirmPassword')?.hasError('passwordMismatch')) {
                <mat-error>Passwords do not match</mat-error>
              }
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" class="w-100 register-btn"
                    [disabled]="registerForm.invalid || loading()">
              @if (loading()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                Create Account
              }
            </button>
          </form>
        </mat-card-content>

        <mat-card-actions align="end">
          <a mat-button routerLink="/login" color="primary">Already have an account? Sign In</a>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .register-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .register-card { width: 100%; max-width: 420px; padding: 24px; }
    .register-icon { font-size: 40px; width: 40px; height: 40px; color: #3f51b5; }
    .register-btn { height: 48px; font-size: 1rem; }
  `],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  hidePassword = signal(true);
  loading = signal(false);

  registerForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: this.passwordMatchValidator });

  private passwordMatchValidator(control: AbstractControl) {
    const password = control.get('password')?.value;
    const confirm = control.get('confirmPassword')?.value;
    if (password !== confirm) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
    }
    return null;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.loading.set(true);
    const { username, email, password } = this.registerForm.getRawValue();

    this.authService.register({ username: username!, email: email!, password: password! }).subscribe({
      next: () => {
        this.snackBar.open('Registration successful! Please login.', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.router.navigate(['/login']);
      },
      error: () => this.loading.set(false),
    });
  }
}
