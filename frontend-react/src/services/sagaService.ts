// TypeScript version of sagaService with proper typing
import api from './api'
import type { SagaInstance, EmployeeCreateRequest } from '../types'

export const sagaService = {
  /**
   * Start employee onboarding saga
   */
  async startOnboarding(employeeData: EmployeeCreateRequest): Promise<SagaInstance> {
    const response = await api.post<SagaInstance>('/api/sagas/employee-onboarding', employeeData)
    return response.data
  },

  /**
   * Get saga status by ID
   */
  async getStatus(sagaId: string): Promise<SagaInstance> {
    const response = await api.get<SagaInstance>(`/api/sagas/${sagaId}`)
    return response.data
  },

  /**
   * Retry a failed saga
   */
  async retry(sagaId: string): Promise<SagaInstance> {
    const response = await api.post<SagaInstance>(`/api/sagas/${sagaId}/retry`)
    return response.data
  },

  /**
   * Get all sagas (paginated)
   */
  async getAll(_page: number = 0, _size: number = 20): Promise<{ content: SagaInstance[] }> {
    // Mock implementation - replace with actual API call when endpoint is available
    return { content: [] }
  }
}

export default sagaService
