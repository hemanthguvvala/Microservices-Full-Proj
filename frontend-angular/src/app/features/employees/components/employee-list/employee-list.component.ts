import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { EmployeeService } from '../../../../core/services/employee.service';
import { Employee } from '../../../../core/models';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DecimalPipe,
    MatTableModule, MatPaginatorModule, MatSortModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatChipsModule, MatTooltipModule,
  ],
  template: `
    <div class="page-header">
      <h1>Employees</h1>
      <a mat-flat-button color="primary" routerLink="/employees/create">
        <mat-icon>person_add</mat-icon> Add Employee
      </a>
    </div>

    <!-- Search & Filters -->
    <mat-card class="mb-2">
      <mat-card-content>
        <div class="search-bar">
          <mat-form-field appearance="outline">
            <mat-label>Search employees</mat-label>
            <input matInput [(ngModel)]="searchTerm" (keyup.enter)="onSearch()" placeholder="Name, email, department..." />
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" style="width: 200px;">
            <mat-label>Department</mat-label>
            <mat-select [(ngModel)]="departmentFilter" (selectionChange)="onSearch()">
              <mat-option value="">All Departments</mat-option>
              @for (dept of departments; track dept) {
                <mat-option [value]="dept">{{ dept }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <button mat-stroked-button (click)="clearFilters()">
            <mat-icon>clear</mat-icon> Clear
          </button>
        </div>
      </mat-card-content>
    </mat-card>

    <!-- Table -->
    <mat-card>
      <div class="table-container">
        <table mat-table [dataSource]="dataSource" matSort (matSortChange)="onSortChange($event)">
          <!-- ID Column -->
          <ng-container matColumnDef="id">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>ID</th>
            <td mat-cell *matCellDef="let employee">{{ employee.id }}</td>
          </ng-container>

          <!-- Name Column -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
            <td mat-cell *matCellDef="let employee">
              <a [routerLink]="['/employees', employee.id]" class="employee-link">
                {{ employee.firstName }} {{ employee.lastName }}
              </a>
            </td>
          </ng-container>

          <!-- Email Column -->
          <ng-container matColumnDef="email">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Email</th>
            <td mat-cell *matCellDef="let employee">{{ employee.email }}</td>
          </ng-container>

          <!-- Department Column -->
          <ng-container matColumnDef="department">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Department</th>
            <td mat-cell *matCellDef="let employee">
              <mat-chip>{{ employee.department }}</mat-chip>
            </td>
          </ng-container>

          <!-- Position Column -->
          <ng-container matColumnDef="position">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Position</th>
            <td mat-cell *matCellDef="let employee">{{ employee.position }}</td>
          </ng-container>

          <!-- Salary Column -->
          <ng-container matColumnDef="salary">
            <th mat-header-cell *matHeaderCellDef mat-sort-header>Salary</th>
            <td mat-cell *matCellDef="let employee">\${{ employee.salary | number:'1.2-2' }}</td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let employee">
              <span class="status-badge" [class]="employee.status?.toLowerCase()">
                {{ employee.status }}
              </span>
            </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>Actions</th>
            <td mat-cell *matCellDef="let employee">
              <button mat-icon-button matTooltip="View" [routerLink]="['/employees', employee.id]">
                <mat-icon>visibility</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Edit" [routerLink]="['/employees', employee.id, 'edit']">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Delete" color="warn" (click)="onDelete(employee)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell" [colSpan]="displayedColumns.length">
              <div class="empty-state">
                <mat-icon>people_outline</mat-icon>
                <p>No employees found</p>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <mat-paginator
        [length]="totalElements"
        [pageSize]="pageSize"
        [pageSizeOptions]="[5, 10, 25, 50]"
        (page)="onPageChange($event)"
        showFirstLastButtons>
      </mat-paginator>
    </mat-card>
  `,
  styles: [`
    .employee-link {
      color: #3f51b5;
      text-decoration: none;
      font-weight: 500;
      &:hover { text-decoration: underline; }
    }
  `],
})
export class EmployeeListComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  displayedColumns = ['id', 'name', 'email', 'department', 'position', 'salary', 'status', 'actions'];
  dataSource = new MatTableDataSource<Employee>();

  totalElements = 0;
  pageSize = 10;
  currentPage = 0;
  sortField = 'id';
  sortDirection = 'asc';
  searchTerm = '';
  departmentFilter = '';

  departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'IT', 'Legal'];

  ngOnInit(): void {
    this.loadEmployees();
  }

  loadEmployees(): void {
    const sortParam = `${this.sortField},${this.sortDirection}`;
    this.employeeService.getEmployees(this.currentPage, this.pageSize, sortParam).subscribe({
      next: (response) => {
        this.dataSource.data = response.content;
        this.totalElements = response.totalElements;
      },
    });
  }

  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadEmployees();
  }

  onSortChange(sort: Sort): void {
    this.sortField = sort.active === 'name' ? 'firstName' : sort.active;
    this.sortDirection = sort.direction || 'asc';
    this.loadEmployees();
  }

  onSearch(): void {
    if (this.departmentFilter) {
      this.employeeService.getEmployeesByDepartment(this.departmentFilter).subscribe({
        next: (data) => {
          this.dataSource.data = data;
          this.totalElements = data.length;
        },
      });
    } else if (this.searchTerm.trim()) {
      this.employeeService.searchByName(this.searchTerm.trim()).subscribe({
        next: (data) => {
          this.dataSource.data = data;
          this.totalElements = data.length;
        },
      });
    } else {
      this.loadEmployees();
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.departmentFilter = '';
    this.currentPage = 0;
    this.loadEmployees();
  }

  onDelete(employee: Employee): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Employee',
        message: `Are you sure you want to delete ${employee.firstName} ${employee.lastName}?`,
        confirmText: 'Delete',
        color: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.employeeService.deleteEmployee(employee.id).subscribe({
          next: () => {
            this.snackBar.open('Employee deleted successfully', 'Close', {
              duration: 3000,
              panelClass: ['success-snackbar'],
            });
            this.loadEmployees();
          },
        });
      }
    });
  }
}
