import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MatStepperModule } from '@angular/material/stepper';
import { MatDividerModule } from '@angular/material/divider';
import { EmployeeService } from '../../../../core/services/employee.service';

@Component({
  selector: 'app-employee-create',
  standalone: true,
  imports: [
    ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule,
    MatChipsModule, MatStepperModule, MatDividerModule,
  ],
  template: `
    <div class="page-header">
      <h1>Add New Employee</h1>
      <a mat-button routerLink="/employees">
        <mat-icon>arrow_back</mat-icon> Back to List
      </a>
    </div>

    <mat-card class="form-container">
      <mat-card-content>
        <mat-stepper linear #stepper>
          <!-- Step 1: Personal Info -->
          <mat-step [stepControl]="personalForm" label="Personal Information">
            <form [formGroup]="personalForm">
              <div class="grid grid-2 mt-2">
                <mat-form-field appearance="outline">
                  <mat-label>First Name</mat-label>
                  <input matInput formControlName="firstName" />
                  @if (personalForm.get('firstName')?.hasError('required') && personalForm.get('firstName')?.touched) {
                    <mat-error>First name is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Last Name</mat-label>
                  <input matInput formControlName="lastName" />
                  @if (personalForm.get('lastName')?.hasError('required') && personalForm.get('lastName')?.touched) {
                    <mat-error>Last name is required</mat-error>
                  }
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="w-100">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email" />
                <mat-icon matSuffix>email</mat-icon>
                @if (personalForm.get('email')?.hasError('email')) {
                  <mat-error>Invalid email format</mat-error>
                }
              </mat-form-field>

              <div class="grid grid-2">
                <mat-form-field appearance="outline">
                  <mat-label>Phone</mat-label>
                  <input matInput formControlName="phone" />
                  <mat-icon matSuffix>phone</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Date of Birth</mat-label>
                  <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth" />
                  <mat-datepicker-toggle matSuffix [for]="dobPicker"></mat-datepicker-toggle>
                  <mat-datepicker #dobPicker></mat-datepicker>
                </mat-form-field>
              </div>

              <div class="form-actions">
                <button mat-flat-button color="primary" matStepperNext [disabled]="personalForm.invalid">
                  Next <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Step 2: Job Info -->
          <mat-step [stepControl]="jobForm" label="Job Details">
            <form [formGroup]="jobForm">
              <div class="grid grid-2 mt-2">
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
                <input matInput #skillInput placeholder="Type skill and press Enter"
                       (keyup.enter)="addSkill(skillInput)" />
                <mat-icon matSuffix>add</mat-icon>
              </mat-form-field>

              <mat-chip-set class="mb-2">
                @for (skill of skills(); track skill; let i = $index) {
                  <mat-chip (removed)="removeSkill(i)">
                    {{ skill }}
                    <button matChipRemove>
                      <mat-icon>cancel</mat-icon>
                    </button>
                  </mat-chip>
                }
              </mat-chip-set>

              <div class="form-actions">
                <button mat-button matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon> Back
                </button>
                <button mat-flat-button color="primary" matStepperNext [disabled]="jobForm.invalid">
                  Next <mat-icon>arrow_forward</mat-icon>
                </button>
              </div>
            </form>
          </mat-step>

          <!-- Step 3: Address -->
          <mat-step label="Address (Optional)">
            <form [formGroup]="addressForm">
              <mat-form-field appearance="outline" class="w-100 mt-2">
                <mat-label>Street</mat-label>
                <input matInput formControlName="street" />
              </mat-form-field>

              <div class="grid grid-2">
                <mat-form-field appearance="outline">
                  <mat-label>City</mat-label>
                  <input matInput formControlName="city" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>State</mat-label>
                  <input matInput formControlName="state" />
                </mat-form-field>
              </div>

              <div class="grid grid-2">
                <mat-form-field appearance="outline">
                  <mat-label>Zip Code</mat-label>
                  <input matInput formControlName="zipCode" />
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Country</mat-label>
                  <input matInput formControlName="country" />
                </mat-form-field>
              </div>

              <div class="form-actions">
                <button mat-button matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon> Back
                </button>
                <button mat-flat-button color="primary" (click)="onSubmit()" [disabled]="loading()">
                  <mat-icon>save</mat-icon> Create Employee
                </button>
              </div>
            </form>
          </mat-step>
        </mat-stepper>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .form-container { max-width: 800px; }
  `],
})
export class EmployeeCreateComponent {
  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  skills = signal<string[]>([]);

  departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'IT', 'Legal'];

  personalForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
    dateOfBirth: [''],
  });

  jobForm = this.fb.group({
    department: ['', Validators.required],
    position: ['', Validators.required],
    salary: [0, [Validators.required, Validators.min(0)]],
    hireDate: ['', Validators.required],
  });

  addressForm = this.fb.group({
    street: [''],
    city: [''],
    state: [''],
    zipCode: [''],
    country: [''],
  });

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
    if (this.personalForm.invalid || this.jobForm.invalid) return;

    this.loading.set(true);

    const personal = this.personalForm.getRawValue();
    const job = this.jobForm.getRawValue();
    const addr = this.addressForm.getRawValue();

    const request = {
      firstName: personal.firstName!,
      lastName: personal.lastName!,
      email: personal.email!,
      phone: personal.phone || undefined,
      department: job.department!,
      position: job.position!,
      salary: job.salary!,
      hireDate: job.hireDate ? new Date(job.hireDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      dateOfBirth: personal.dateOfBirth ? new Date(personal.dateOfBirth).toISOString().split('T')[0] : undefined,
      skills: this.skills().length > 0 ? this.skills() : undefined,
      address: addr.street ? {
        street: addr.street!,
        city: addr.city!,
        state: addr.state!,
        zipCode: addr.zipCode!,
        country: addr.country!,
      } : undefined,
    };

    this.employeeService.createEmployee(request).subscribe({
      next: (employee) => {
        this.snackBar.open(`Employee ${employee.firstName} created successfully!`, 'Close', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
        this.router.navigate(['/employees', employee.id]);
      },
      error: () => this.loading.set(false),
    });
  }
}
