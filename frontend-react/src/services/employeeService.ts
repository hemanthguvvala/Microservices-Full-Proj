// TypeScript version of employeeService with proper typing
import api from './api'
import type { 
  Employee, 
  EmployeeCreateRequest, 
  PaginatedResponse, 
  EmployeeStats 
} from '../types'

export const employeeService = {
  /**
   * Get all employees with pagination
   */
  async getAll(page: number = 0, size: number = 10): Promise<PaginatedResponse<Employee>> {
    const response = await api.get<PaginatedResponse<Employee>>('/api/v1/employees', {
      params: { page, size }
    })
    return response.data
  },

  /**
   * Get employee by ID
   */
  async getById(id: number): Promise<Employee> {
    const response = await api.get<Employee>(`/api/v1/employees/${id}`)
    return response.data
  },

  /**
   * Create new employee
   */
  async create(employeeData: EmployeeCreateRequest): Promise<Employee> {
    const response = await api.post<Employee>('/api/v1/employees', employeeData)
    return response.data
  },

  /**
   * Update existing employee
   */
  async update(id: number, employeeData: Partial<EmployeeCreateRequest>): Promise<Employee> {
    const response = await api.put<Employee>(`/api/v1/employees/${id}`, employeeData)
    return response.data
  },

  /**
   * Delete employee
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/api/v1/employees/${id}`)
  },

  /**
   * Search employees using Elasticsearch
   */
  async search(query: string, page: number = 0, size: number = 20): Promise<PaginatedResponse<Employee>> {
    const response = await api.get<PaginatedResponse<Employee>>('/api/v1/employees/search', {
      params: { q: query, page, size }
    })
    return response.data
  },

  /**
   * Get employee statistics
   */
  async getStats(): Promise<EmployeeStats> {
    const response = await api.get<EmployeeStats>('/api/v1/employees/stats')
    return response.data
  }
}

export default employeeService
