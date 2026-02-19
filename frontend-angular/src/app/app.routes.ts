import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/components/login/login.component').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/components/register/register.component').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/components/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'employees',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/employees/components/employee-list/employee-list.component').then(
            (m) => m.EmployeeListComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./features/employees/components/employee-create/employee-create.component').then(
            (m) => m.EmployeeCreateComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/employees/components/employee-detail/employee-detail.component').then(
            (m) => m.EmployeeDetailComponent
          ),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./features/employees/components/employee-edit/employee-edit.component').then(
            (m) => m.EmployeeEditComponent
          ),
      },
    ],
  },
  {
    path: 'payroll',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/payroll/components/payroll-list/payroll-list.component').then(
            (m) => m.PayrollListComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./features/payroll/components/payroll-create/payroll-create.component').then(
            (m) => m.PayrollCreateComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/payroll/components/payroll-detail/payroll-detail.component').then(
            (m) => m.PayrollDetailComponent
          ),
      },
    ],
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/notifications/components/notification-list/notification-list.component').then(
            (m) => m.NotificationListComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./features/notifications/components/notification-detail/notification-detail.component').then(
            (m) => m.NotificationDetailComponent
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
