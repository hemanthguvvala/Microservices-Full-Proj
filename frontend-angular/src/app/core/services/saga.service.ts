import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { environment } from '@env/environment';
import { SagaInstance } from '../models';

@Injectable({ providedIn: 'root' })
export class SagaService {
  private api = inject(ApiService);
  private baseUrl = environment.sagaApiUrl;

  startOnboarding(employeeData: Record<string, unknown>): Observable<SagaInstance> {
    return this.api.post<SagaInstance>(`${this.baseUrl}/employee-onboarding`, employeeData);
  }

  getSagaStatus(sagaId: string): Observable<SagaInstance> {
    return this.api.get<SagaInstance>(`${this.baseUrl}/${sagaId}`);
  }

  retrySaga(sagaId: string): Observable<SagaInstance> {
    return this.api.post<SagaInstance>(`${this.baseUrl}/${sagaId}/retry`, {});
  }
}
