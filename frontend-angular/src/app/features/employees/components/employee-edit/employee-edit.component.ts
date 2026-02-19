import { Component, inject, OnInit, signal, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { EmployeeService } from '../../../../core/services/employee.service';

@Component({
  selector: 'app-employee-edit',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule,
    MatChipsModule, MatDividerModule,
  ],
  template: `
    <div class="page-header">
      <h1>Edit Employee</h1>
      <a mat-button routerLink="/employees">
        <mat-icon>arrow_back</mat-icon> Back
      </a>
    </div>

    <mat-card class="form-container">
      <mat-card-content>
        <form [formGroup]="editForm" (ngSubmit)="onSubmit()">
          <h3>Personal Information</h3>
          <div class="grid grid-2">
            <mat-form-field appearance="outline">
              <mat-label>First Name</mat-label>
              <input matInput formControlName="firstName" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Last Name</mat-label>
              <input matInput formControlName="lastName" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Email</mat-label>
            <input matInput formControlName="email" type="email" />
          </mat-form-field>

          <div class="grid grid-2">
            <mat-form-field appearance="outline">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phone" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Date of Birth</mat-label>
              <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth" />
              <mat-datepicker-toggle matSuffix [for]="dobPicker"></mat-datepicker-toggle>
              <mat-datepicker #dobPicker></mat-datepicker>
            </mat-form-field>
          </div>

          <mat-divider class="mb-2 mt-1"></mat-divider>
          <h3>Job Details</h3>

          <div class="grid grid-2">
            <mat-form-field appearance="outline">
              <mat-label>Department</mat-label>
              <mat-select formControlName="department">
                @for (dept of departments; track dept) {
                  <mat-option [value]="dept">{{ dept }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Position</mat-label>
              <input matInput formControlName="position" />
            </mat-form-field>
          </div>

          <div class="grid grid-2">
            <mat-form-field appearance="outline">
              <mat-label>Salary</mat-label>
              <input matInput formControlName="salary" type="number" />
              <span matPrefix>$&nbsp;</span>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Hire Date</mat-label>
              <input matInput [matDatepicker]="hirePicker" formControlName="hireDate" />
              <mat-datepicker-toggle matSuffix [for]="hirePicker"></mat-datepicker-toggle>
              <mat-datepicker #hirePicker></mat-datepicker>
            </mat-form-field>
          </div>

          <!-- Skills -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Add Skill</mat-label>
            <input matInput #skillInput (keyup.enter)="addSkill(skillInput)" />
          </mat-form-field>
          <mat-chip-set class="mb-2">
            @for (skill of skills(); track skill; let i = $index) {
              <mat-chip (removed)="removeSkill(i)">
                {{ skill }}
                <button matChipRemove><mat-icon>cancel</mat-icon></button>
              </mat-chip>
            }
          </mat-chip-set>

          <div class="form-actions">
            <a mat-button [routerLink]="['/employees', id()]">Cancel</a>
            <button mat-flat-button color="primary" type="submit"
                    [disabled]="editForm.invalid || loading()">
              <mat-icon>save</mat-icon> Save Changes
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .form-container { max-width: 800px; }
    h3 { margin-bottom: 12px; color: #555; }
  `],
})
export class EmployeeEditComponent implements OnInit {
  id = input.required<string>();

  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  skills = signal<string[]>([]);
  departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'IT', 'Legal'];

  editForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    dateOfBirth: [''],
    department: ['', Validators.required],
    position: ['', Validators.required],
    salary: [0, [Validators.required, Validators.min(0)]],
    hireDate: ['', Validators.required],
  });

  ngOnInit(): void {
    this.employeeService.getEmployeeById(Number(this.id())).subscribe({
      next: (emp) => {
        this.editForm.patchValue({
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          phone: emp.phone || '',
          dateOfBirth: emp.dateOfBirth || '',
          department: emp.department,
          position: emp.position,
          salary: emp.salary,
          hireDate: emp.hireDate,
        });
        this.skills.set(emp.skills || []);
      },
    });
  }

  addSkill(input: HTMLInputElement): void {
    const value = input.value.trim();
    if (value && !this.skills().includes(value)) {
      this.skills.update((s) => [...s, value]);
      input.value = '';
    }
  }

  removeSkill(index: number): void {
    this.skills.update((s) => s.filter((_, i) => i !== index));
  }

  onSubmit(): void {
    if (this.editForm.invalid) return;
    this.loading.set(true);

    const form = this.editForm.getRawValue();
    const request = {
      firstName: form.firstName!,
      lastName: form.lastName!,
      email: form.email!,
      phone: form.phone || undefined,
      department: form.department!,
      position: form.position!,
      salary: form.salary!,
      hireDate: form.hireDate ? new Date(form.hireDate).toISOString().split('T')[0] : '',
      dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString().split('T')[0] : undefined,
      skills: this.skills().length > 0 ? this.skills() : undefined,
    };

    this.employeeService.updateEmployee(Number(this.id()), request).subscribe({
      next: () => {
        this.snackBar.open('Employee updated successfully!', 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.router.navigate(['/employees', this.id()]);
      },
      error: () => this.loading.set(false),
    });
  }
}
