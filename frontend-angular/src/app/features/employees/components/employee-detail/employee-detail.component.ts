import { Component, inject, OnInit, signal, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe, DecimalPipe } from '@angular/common';
import { EmployeeService } from '../../../../core/services/employee.service';
import { PayrollService } from '../../../../core/services/payroll.service';
import { Employee, Payroll } from '../../../../core/models';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [
    RouterLink, DatePipe, DecimalPipe,
    MatCardModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTabsModule, MatListModule, MatDividerModule,
  ],
  template: `
    <div class="page-header">
      <h1>Employee Details</h1>
      <div class="d-flex gap-1">
        <a mat-button routerLink="/employees">
          <mat-icon>arrow_back</mat-icon> Back
        </a>
        @if (employee()) {
          <a mat-flat-button color="primary" [routerLink]="['/employees', employee()!.id, 'edit']">
            <mat-icon>edit</mat-icon> Edit
          </a>
          <button mat-flat-button color="warn" (click)="onDelete()">
            <mat-icon>delete</mat-icon> Delete
          </button>
        }
      </div>
    </div>

    @if (employee(); as emp) {
      <div class="grid grid-3 mb-3">
        <!-- Profile Card -->
        <mat-card class="profile-card">
          <mat-card-content>
            <div class="profile-avatar">
              <mat-icon>account_circle</mat-icon>
            </div>
            <h2>{{ emp.firstName }} {{ emp.lastName }}</h2>
            <p class="position">{{ emp.position }}</p>
            <span class="status-badge" [class]="emp.status.toLowerCase()">{{ emp.status }}</span>
          </mat-card-content>
        </mat-card>

        <!-- Contact Info -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Contact Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon>email</mat-icon>
                <span matListItemTitle>{{ emp.email }}</span>
                <span matListItemLine>Email</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon>phone</mat-icon>
                <span matListItemTitle>{{ emp.phone || 'N/A' }}</span>
                <span matListItemLine>Phone</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon>cake</mat-icon>
                <span matListItemTitle>{{ emp.dateOfBirth | date:'mediumDate' }}</span>
                <span matListItemLine>Date of Birth</span>
              </mat-list-item>
            </mat-list>
          </mat-card-content>
        </mat-card>

        <!-- Job Info -->
        <mat-card>
          <mat-card-header>
            <mat-card-title>Job Details</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon>business</mat-icon>
                <span matListItemTitle>{{ emp.department }}</span>
                <span matListItemLine>Department</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon>attach_money</mat-icon>
                <span matListItemTitle>\${{ emp.salary | number:'1.2-2' }}</span>
                <span matListItemLine>Salary</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon>event</mat-icon>
                <span matListItemTitle>{{ emp.hireDate | date:'mediumDate' }}</span>
                <span matListItemLine>Hire Date</span>
              </mat-list-item>
            </mat-list>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Tabs: Skills, Address, Payroll History -->
      <mat-card>
        <mat-tab-group>
          <!-- Skills Tab -->
          <mat-tab label="Skills">
            <div class="p-3">
              @if (emp.skills && emp.skills.length > 0) {
                <mat-chip-set>
                  @for (skill of emp.skills; track skill) {
                    <mat-chip color="primary" highlighted>{{ skill }}</mat-chip>
                  }
                </mat-chip-set>
              } @else {
                <div class="empty-state">
                  <mat-icon>code</mat-icon>
                  <p>No skills listed</p>
                </div>
              }
            </div>
          </mat-tab>

          <!-- Address Tab -->
          <mat-tab label="Address">
            <div class="p-3">
              @if (emp.address) {
                <mat-list>
                  <mat-list-item>
                    <mat-icon matListItemIcon>location_on</mat-icon>
                    <span matListItemTitle>{{ emp.address.street }}</span>
                    <span matListItemLine>
                      {{ emp.address.city }}, {{ emp.address.state }} {{ emp.address.zipCode }}
                    </span>
                    <span matListItemLine>{{ emp.address.country }}</span>
                  </mat-list-item>
                </mat-list>
              } @else {
                <div class="empty-state">
                  <mat-icon>location_off</mat-icon>
                  <p>No address on file</p>
                </div>
              }
            </div>
          </mat-tab>

          <!-- Payroll Tab -->
          <mat-tab label="Payroll History">
            <div class="p-3">
              @if (payrolls().length > 0) {
                <mat-list>
                  @for (p of payrolls(); track p.id) {
                    <mat-list-item>
                      <span matListItemTitle>
                        {{ p.payPeriodStart | date:'shortDate' }} - {{ p.payPeriodEnd | date:'shortDate' }}
                      </span>
                      <span matListItemLine>Net: \${{ p.netPay | number:'1.2-2' }}</span>
                      <span matListItemMeta>
                        <span class="status-badge" [class]="p.status.toLowerCase()">{{ p.status }}</span>
                      </span>
                    </mat-list-item>
                  }
                </mat-list>
              } @else {
                <div class="empty-state">
                  <mat-icon>payments</mat-icon>
                  <p>No payroll records</p>
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-card>
    } @else {
      <div class="empty-state">
        <mat-icon>hourglass_empty</mat-icon>
        <p>Loading employee details...</p>
      </div>
    }
  `,
  styles: [`
    .profile-card {
      text-align: center;
      padding: 24px;
    }
    .profile-avatar mat-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: #3f51b5;
    }
    .position { color: #666; margin: 4px 0 12px; }
  `],
})
export class EmployeeDetailComponent implements OnInit {
  id = input.required<string>();

  private employeeService = inject(EmployeeService);
  private payrollService = inject(PayrollService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  employee = signal<Employee | null>(null);
  payrolls = signal<Payroll[]>([]);

  ngOnInit(): void {
    const empId = Number(this.id());
    this.employeeService.getEmployeeById(empId).subscribe({
      next: (emp) => this.employee.set(emp),
    });

    this.payrollService.getPayrollsByEmployeeId(empId).subscribe({
      next: (data) => this.payrolls.set(data),
      error: () => this.payrolls.set([]),
    });
  }

  onDelete(): void {
    const emp = this.employee();
    if (!emp) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Employee',
        message: `Are you sure you want to delete ${emp.firstName} ${emp.lastName}?`,
        confirmText: 'Delete',
        color: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.employeeService.deleteEmployee(emp.id).subscribe({
          next: () => {
            this.snackBar.open('Employee deleted', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar'],
            });
            this.router.navigate(['/employees']);
          },
        });
      }
    });
  }
}
