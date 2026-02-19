import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '@env/environment';
import { Payroll, PayrollCreateRequest, PaginatedResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private api = inject(ApiService);
  private baseUrl = environment.payrollApiUrl;

  getPayrolls(page = 0, size = 10): Observable<PaginatedResponse<Payroll>> {
    return this.api.get<PaginatedResponse<Payroll>>(this.baseUrl, { page, size });
  }

  getPayrollById(id: number): Observable<Payroll> {
    return this.api.get<Payroll>(`${this.baseUrl}/${id}`);
  }

  getPayrollsByEmployeeId(employeeId: number): Observable<Payroll[]> {
    return this.api.get<Payroll[]>(`${this.baseUrl}/employee/${employeeId}`);
  }

  createPayroll(payroll: PayrollCreateRequest): Observable<Payroll> {
    return this.api.post<Payroll>(this.baseUrl, payroll);
  }

  updatePayroll(id: number, payroll: PayrollCreateRequest): Observable<Payroll> {
    return this.api.put<Payroll>(`${this.baseUrl}/${id}`, payroll);
  }

  deletePayroll(id: number): Observable<void> {
    return this.api.delete<void>(`${this.baseUrl}/${id}`);
  }

  approvePayroll(id: number): Observable<Payroll> {
    return this.api.post<Payroll>(`${this.baseUrl}/${id}/approve`, {});
  }

  processPayment(id: number): Observable<Payroll> {
    return this.api.post<Payroll>(`${this.baseUrl}/${id}/process-payment`, {});
  }
}
