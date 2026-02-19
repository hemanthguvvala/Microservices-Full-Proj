import { Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PayrollService } from '../../../../core/services/payroll.service';

@Component({
  selector: 'app-payroll-create',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule,
    DecimalPipe,
  ],
  template: `
    <div class="page-header">
      <h1>Create Payroll</h1>
      <a mat-button routerLink="/payroll">
        <mat-icon>arrow_back</mat-icon> Back
      </a>
    </div>

    <mat-card class="form-container">
      <mat-card-content>
        <form [formGroup]="payrollForm" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Employee ID</mat-label>
            <input matInput formControlName="employeeId" type="number" />
            <mat-icon matSuffix>person</mat-icon>
          </mat-form-field>

          <div class="grid grid-3">
            <mat-form-field appearance="outline">
              <mat-label>Base Salary</mat-label>
              <input matInput formControlName="baseSalary" type="number" />
              <span matPrefix>$&nbsp;</span>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Bonus</mat-label>
              <input matInput formControlName="bonus" type="number" />
              <span matPrefix>$&nbsp;</span>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Deductions</mat-label>
              <input matInput formControlName="deductions" type="number" />
              <span matPrefix>$&nbsp;</span>
            </mat-form-field>
          </div>

          <!-- Net Pay Preview -->
          <mat-card class="net-pay-preview mb-2">
            <span>Net Pay: </span>
            <strong>\${{ calculateNetPay() | number:'1.2-2' }}</strong>
          </mat-card>

          <div class="grid grid-3">
            <mat-form-field appearance="outline">
              <mat-label>Pay Period Start</mat-label>
              <input matInput [matDatepicker]="startPicker" formControlName="payPeriodStart" />
              <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
              <mat-datepicker #startPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Pay Period End</mat-label>
              <input matInput [matDatepicker]="endPicker" formControlName="payPeriodEnd" />
              <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
              <mat-datepicker #endPicker></mat-datepicker>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Pay Date</mat-label>
              <input matInput [matDatepicker]="payPicker" formControlName="payDate" />
              <mat-datepicker-toggle matSuffix [for]="payPicker"></mat-datepicker-toggle>
              <mat-datepicker #payPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <div class="form-actions">
            <a mat-button routerLink="/payroll">Cancel</a>
            <button mat-flat-button color="primary" type="submit"
                    [disabled]="payrollForm.invalid || loading()">
              <mat-icon>save</mat-icon> Create Payroll
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .net-pay-preview {
      padding: 16px;
      text-align: center;
      background: #e8f5e9;
      font-size: 1.2rem;
      strong { color: #2e7d32; font-size: 1.5rem; }
    }
  `],
})
export class PayrollCreateComponent {
  private fb = inject(FormBuilder);
  private payrollService = inject(PayrollService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);

  payrollForm = this.fb.group({
    employeeId: [null as number | null, [Validators.required, Validators.min(1)]],
    baseSalary: [0, [Validators.required, Validators.min(0)]],
    bonus: [0, Validators.min(0)],
    deductions: [0, Validators.min(0)],
    payPeriodStart: ['', Validators.required],
    payPeriodEnd: ['', Validators.required],
    payDate: ['', Validators.required],
  });

  calculateNetPay(): number {
    const base = this.payrollForm.get('baseSalary')?.value || 0;
    const bonus = this.payrollForm.get('bonus')?.value || 0;
    const deductions = this.payrollForm.get('deductions')?.value || 0;
    return base + bonus - deductions;
  }

  onSubmit(): void {
    if (this.payrollForm.invalid) return;
    this.loading.set(true);

    const form = this.payrollForm.getRawValue();
    const request = {
      employeeId: form.employeeId!,
      baseSalary: form.baseSalary!,
      bonus: form.bonus || 0,
      deductions: form.deductions || 0,
      payPeriodStart: new Date(form.payPeriodStart!).toISOString().split('T')[0],
      payPeriodEnd: new Date(form.payPeriodEnd!).toISOString().split('T')[0],
      payDate: new Date(form.payDate!).toISOString().split('T')[0],
    };

    this.payrollService.createPayroll(request).subscribe({
      next: (payroll) => {
        this.snackBar.open('Payroll created!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.router.navigate(['/payroll', payroll.id]);
      },
      error: () => this.loading.set(false),
    });
  }
}
