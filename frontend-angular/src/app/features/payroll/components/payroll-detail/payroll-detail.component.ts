import { Component, inject, OnInit, signal, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DatePipe, DecimalPipe } from '@angular/common';
import { PayrollService } from '../../../../core/services/payroll.service';
import { Payroll } from '../../../../core/models';

@Component({
  selector: 'app-payroll-detail',
  standalone: true,
  imports: [
    RouterLink, DatePipe, DecimalPipe,
    MatCardModule, MatButtonModule, MatIconModule, MatListModule, MatDividerModule,
  ],
  template: `
    <div class="page-header">
      <h1>Payroll Details</h1>
      <a mat-button routerLink="/payroll">
        <mat-icon>arrow_back</mat-icon> Back
      </a>
    </div>

    @if (payroll(); as p) {
      <div class="grid grid-2">
        <!-- Payroll Info -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>receipt_long</mat-icon>
            <mat-card-title>Payroll #{{ p.id }}</mat-card-title>
            <mat-card-subtitle>
              <span class="status-badge" [class]="p.status.toLowerCase()">{{ p.status }}</span>
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <mat-icon matListItemIcon>person</mat-icon>
                <span matListItemTitle>
                  <a [routerLink]="['/employees', p.employeeId]">Employee #{{ p.employeeId }}</a>
                </span>
                <span matListItemLine>Employee</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon>calendar_today</mat-icon>
                <span matListItemTitle>{{ p.payPeriodStart | date:'mediumDate' }} - {{ p.payPeriodEnd | date:'mediumDate' }}</span>
                <span matListItemLine>Pay Period</span>
              </mat-list-item>
              <mat-list-item>
                <mat-icon matListItemIcon>event</mat-icon>
                <span matListItemTitle>{{ p.payDate | date:'mediumDate' }}</span>
                <span matListItemLine>Pay Date</span>
              </mat-list-item>
            </mat-list>
          </mat-card-content>
        </mat-card>

        <!-- Compensation Breakdown -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>account_balance</mat-icon>
            <mat-card-title>Compensation Breakdown</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-list>
              <mat-list-item>
                <span matListItemTitle>Base Salary</span>
                <span matListItemMeta>\${{ p.baseSalary | number:'1.2-2' }}</span>
              </mat-list-item>
              <mat-list-item>
                <span matListItemTitle>Bonus</span>
                <span matListItemMeta class="bonus">+\${{ p.bonus | number:'1.2-2' }}</span>
              </mat-list-item>
              <mat-list-item>
                <span matListItemTitle>Deductions</span>
                <span matListItemMeta class="deduction">-\${{ p.deductions | number:'1.2-2' }}</span>
              </mat-list-item>
              <mat-divider></mat-divider>
              <mat-list-item>
                <span matListItemTitle class="net-pay-label">Net Pay</span>
                <span matListItemMeta class="net-pay">\${{ p.netPay | number:'1.2-2' }}</span>
              </mat-list-item>
            </mat-list>
          </mat-card-content>

          <mat-card-actions>
            @if (p.status === 'PENDING') {
              <button mat-flat-button color="primary" (click)="onApprove()">
                <mat-icon>check_circle</mat-icon> Approve
              </button>
            }
            @if (p.status === 'APPROVED') {
              <button mat-flat-button color="accent" (click)="onProcess()">
                <mat-icon>payments</mat-icon> Process Payment
              </button>
            }
          </mat-card-actions>
        </mat-card>
      </div>
    }
  `,
  styles: [`
    .bonus { color: #2e7d32; }
    .deduction { color: #c62828; }
    .net-pay-label { font-weight: 500; font-size: 1.1rem; }
    .net-pay { font-weight: 700; font-size: 1.2rem; color: #2e7d32; }
    a { color: #3f51b5; text-decoration: none; }
  `],
})
export class PayrollDetailComponent implements OnInit {
  id = input.required<string>();

  private payrollService = inject(PayrollService);
  private snackBar = inject(MatSnackBar);

  payroll = signal<Payroll | null>(null);

  ngOnInit(): void {
    this.loadPayroll();
  }

  private loadPayroll(): void {
    this.payrollService.getPayrollById(Number(this.id())).subscribe({
      next: (p) => this.payroll.set(p),
    });
  }

  onApprove(): void {
    this.payrollService.approvePayroll(Number(this.id())).subscribe({
      next: () => {
        this.snackBar.open('Payroll approved!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.loadPayroll();
      },
    });
  }

  onProcess(): void {
    this.payrollService.processPayment(Number(this.id())).subscribe({
      next: () => {
        this.snackBar.open('Payment processed!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.loadPayroll();
      },
    });
  }
}
