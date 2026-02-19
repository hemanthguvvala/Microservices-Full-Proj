import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '@env/environment';
import {
  Employee,
  EmployeeCreateRequest,
  EmployeeStats,
  PaginatedResponse,
} from '../models';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private api = inject(ApiService);
  private baseUrl = environment.employeeApiUrl;
  private searchUrl = environment.searchApiUrl;

  // ===== CRUD Operations =====
  getEmployees(page = 0, size = 10, sort = 'id,asc'): Observable<PaginatedResponse<Employee>> {
    return this.api.get<PaginatedResponse<Employee>>(this.baseUrl, { page, size, sort });
  }

  getEmployeeById(id: number): Observable<Employee> {
    return this.api.get<Employee>(`${this.baseUrl}/${id}`);
  }

  getEmployeeByEmail(email: string): Observable<Employee> {
    return this.api.get<Employee>(`${this.baseUrl}/email/${email}`);
  }

  getEmployeesByDepartment(department: string): Observable<Employee[]> {
    return this.api.get<Employee[]>(`${this.baseUrl}/department/${department}`);
  }

  createEmployee(employee: EmployeeCreateRequest): Observable<Employee> {
    return this.api.post<Employee>(this.baseUrl, employee);
  }

  updateEmployee(id: number, employee: EmployeeCreateRequest): Observable<Employee> {
    return this.api.put<Employee>(`${this.baseUrl}/${id}`, employee);
  }

  deleteEmployee(id: number): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${id}`);
  }

  // ===== Search Operations =====
  searchByName(name: string): Observable<Employee[]> {
    return this.api.get<Employee[]>(`${this.searchUrl}/employees/name`, { name });
  }

  searchByDepartment(department: string): Observable<Employee[]> {
    return this.api.get<Employee[]>(`${this.searchUrl}/employees/department`, { department });
  }

  searchByPosition(position: string): Observable<Employee[]> {
    return this.api.get<Employee[]>(`${this.searchUrl}/employees/position`, { position });
  }

  searchBySkill(skill: string): Observable<Employee[]> {
    return this.api.get<Employee[]>(`${this.searchUrl}/employees/skill`, { skill });
  }

  searchBySalaryRange(min: number, max: number): Observable<Employee[]> {
    return this.api.get<Employee[]>(`${this.searchUrl}/employees/salary`, { min, max });
  }

  // ===== Stats =====
  getEmployeeStats(): Observable<EmployeeStats> {
    return this.api.get<EmployeeStats>(`${this.baseUrl}/stats`);
  }
}
