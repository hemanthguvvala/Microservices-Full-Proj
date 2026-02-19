import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatePipe, DecimalPipe } from '@angular/common';
import { PayrollService } from '../../../../core/services/payroll.service';
import { Payroll } from '../../../../core/models';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-payroll-list',
  standalone: true,
  imports: [
    RouterLink, DatePipe, DecimalPipe,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>Payroll Management</h1>
      <a mat-flat-button color="primary" routerLink="/payroll/create">
        <mat-icon>add_card</mat-icon> Create Payroll
      </a>
    </div>

    <mat-card>
      <div class="table-container">
        <table mat-table [dataSource]="dataSource" matSort>
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
            <td mat-cell *matCellDef="let p">{{ p.id }}</td>
          </ng-container>

          <ng-container matColumnDef="employeeId">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Employee</th>
            <td mat-cell *matCellDef="let p">
              <a [routerLink]="['/employees', p.employeeId]" class="employee-link">
                #{{ p.employeeId }}
              </a>
            </td>
          </ng-container>

          <ng-container matColumnDef="baseSalary">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Base Salary</th>
            <td mat-cell *matCellDef="let p">\${{ p.baseSalary | number:'1.2-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="bonus">
            <th mat-header-cell *matHeaderCellDef>Bonus</th>
            <td mat-cell *matCellDef="let p">\${{ p.bonus | number:'1.2-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="deductions">
            <th mat-header-cell *matHeaderCellDef>Deductions</th>
            <td mat-cell *matCellDef="let p">\${{ p.deductions | number:'1.2-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="netPay">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Net Pay</th>
            <td mat-cell *matCellDef="let p" class="net-pay">\${{ p.netPay | number:'1.2-2' }}</td>
          </ng-container>

          <ng-container matColumnDef="payPeriod">
            <th mat-header-cell *matHeaderCellDef>Pay Period</th>
            <td mat-cell *matCellDef="let p">
              {{ p.payPeriodStart | date:'shortDate' }} - {{ p.payPeriodEnd | date:'shortDate' }}
            </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let p">
              <span class="status-badge" [class]="p.status.toLowerCase()">{{ p.status }}</span>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let p">
              <button mat-icon-button matTooltip="View" [routerLink]="['/payroll', p.id]">
                <mat-icon>visibility</mat-icon>
              </button>
              @if (p.status === 'PENDING') {
                <button mat-icon-button matTooltip="Approve" color="primary" (click)="onApprove(p)">
                  <mat-icon>check_circle</mat-icon>
                </button>
              }
              @if (p.status === 'APPROVED') {
                <button mat-icon-button matTooltip="Process Payment" color="accent" (click)="onProcess(p)">
                  <mat-icon>payments</mat-icon>
                </button>
              }
              @if (p.status === 'PENDING') {
                <button mat-icon-button matTooltip="Delete" color="warn" (click)="onDelete(p)">
                  <mat-icon>delete</mat-icon>
                </button>
              }
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" [colSpan]="displayedColumns.length">
              <div class="empty-state">
                <mat-icon>payments</mat-icon>
                <p>No payroll records found</p>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [length]="totalElements"
        [pageSize]="pageSize"
        [pageSizeOptions]="[5, 10, 25]"
        (page)="onPageChange($event)"
        showFirstLastButtons>
      </mat-paginator>
    </mat-card>
  `,
  styles: [`
    .employee-link { color: #3f51b5; text-decoration: none; &:hover { text-decoration: underline; } }
    .net-pay { font-weight: 500; color: #2e7d32; }
  `],
})
export class PayrollListComponent implements OnInit {
  private payrollService = inject(PayrollService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  displayedColumns = ['id', 'employeeId', 'baseSalary', 'bonus', 'deductions', 'netPay', 'payPeriod', 'status', 'actions'];
  dataSource = new MatTableDataSource<Payroll>();
  totalElements = 0;
  pageSize = 10;
  currentPage = 0;

  ngOnInit(): void {
    this.loadPayrolls();
  }

  loadPayrolls(): void {
    this.payrollService.getPayrolls(this.currentPage, this.pageSize).subscribe({
      next: (res) => {
        this.dataSource.data = res.content;
        this.totalElements = res.totalElements;
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadPayrolls();
  }

  onApprove(payroll: Payroll): void {
    this.payrollService.approvePayroll(payroll.id).subscribe({
      next: () => {
        this.snackBar.open('Payroll approved!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.loadPayrolls();
      },
    });
  }

  onProcess(payroll: Payroll): void {
    this.payrollService.processPayment(payroll.id).subscribe({
      next: () => {
        this.snackBar.open('Payment processed!', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
        this.loadPayrolls();
      },
    });
  }

  onDelete(payroll: Payroll): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete Payroll', message: `Delete payroll #${payroll.id}?`, confirmText: 'Delete', color: 'warn' },
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.payrollService.deletePayroll(payroll.id).subscribe({
          next: () => {
            this.snackBar.open('Payroll deleted', 'Close', { duration: 3000, panelClass: ['success-snackbar'] });
            this.loadPayrolls();
          },
        });
      }
    });
  }
}
