import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '@env/environment';
import { EmployeeMetrics, ResilienceMetrics } from '../models';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private api = inject(ApiService);
  private baseUrl = environment.metricsApiUrl;

  getEmployeeMetrics(): Observable<EmployeeMetrics> {
    return this.api.get<EmployeeMetrics>(`${this.baseUrl}/employee-operations`);
  }

  getResilienceMetrics(): Observable<ResilienceMetrics> {
    return this.api.get<ResilienceMetrics>(`${this.baseUrl}/resilience`);
  }
}
