import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../features/auth/services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';

      switch (error.status) {
        case 0:
          errorMessage = 'Unable to connect to server. Please check your connection.';
          break;
        case 401:
          errorMessage = 'Session expired. Please login again.';
          authService.logout();
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'The requested resource was not found.';
          break;
        case 409:
          errorMessage = error.error?.message || 'A conflict occurred. The resource may already exist.';
          break;
        case 422:
          errorMessage = error.error?.message || 'Validation failed. Please check your input.';
          break;
        case 500:
          errorMessage = 'Internal server error. Please try again later.';
          break;
        default:
          errorMessage = error.error?.message || errorMessage;
      }

      snackBar.open(errorMessage, 'Close', {
        duration: 5000,
        panelClass: ['error-snackbar'],
      });

      return throwError(() => error);
    })
  );
};
