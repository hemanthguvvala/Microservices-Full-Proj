// Shared TypeScript types and interfaces

export interface Employee {
  id: number
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  department: string
  position: string
  salary: number
  hireDate?: string
  createdDate?: string
  lastModifiedDate?: string
}

export interface EmployeeCreateRequest {
  firstName: string
  lastName: string
  email: string
  phoneNumber?: string
  department: string
  position: string
  salary: number
  hireDate?: string
}

export interface PaginatedResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface EmployeeStats {
  totalEmployees: number
  newThisMonth: number
  activeSagas: number
  departments: number
}

export interface SagaInstance {
  sagaId: string
  sagaType: string
  status: SagaStatus
  startedAt?: string
  completedAt?: string
  currentStep?: string
  errorMessage?: string
  stepStatuses?: Record<string, SagaStepStatus>
  sagaData?: any
}

export type SagaStatus = 
  | 'STARTED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'COMPENSATING' 
  | 'COMPENSATED'

export type SagaStepStatus = 
  | 'PENDING' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'COMPENSATED'

export interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
}

export interface AuthUser {
  username: string
  token: string
  roles?: string[]
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  username: string
  roles?: string[]
}

export interface ApiError {
  message: string
  status: number
  timestamp: string
  path?: string
}
