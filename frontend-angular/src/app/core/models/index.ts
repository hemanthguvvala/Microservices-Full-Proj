// ===== Employee Models =====
export interface Employee {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  salary: number;
  dateOfBirth?: string;
  hireDate: string;
  status: EmployeeStatus;
  skills?: string[];
  address?: Address;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department: string;
  position: string;
  salary: number;
  dateOfBirth?: string;
  hireDate: string;
  skills?: string[];
  address?: Address;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export interface EmployeeStats {
  totalEmployees: number;
  activeEmployees: number;
  departmentCounts: Record<string, number>;
  averageSalary: number;
}

// ===== Payroll Models =====
export interface Payroll {
  id: number;
  employeeId: number;
  employeeName?: string;
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPay: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  status: PayrollStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface PayrollCreateRequest {
  employeeId: number;
  baseSalary: number;
  bonus: number;
  deductions: number;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
}

export type PayrollStatus = 'PENDING' | 'APPROVED' | 'PROCESSED' | 'REJECTED';

// ===== Notification Models =====
export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipientId: string;
  recipientEmail?: string;
  subject: string;
  message: string;
  status: NotificationStatus;
  read: boolean;
  metadata?: Record<string, string>;
  createdAt?: string;
  sentAt?: string;
}

export interface NotificationCreateRequest {
  type: NotificationType;
  channel: NotificationChannel;
  recipientId: string;
  recipientEmail?: string;
  subject: string;
  message: string;
  metadata?: Record<string, string>;
}

export type NotificationType = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'SLACK';
export type NotificationChannel = 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'SLACK';
export type NotificationStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';

// ===== Auth Models =====
export interface AuthUser {
  id: number;
  username: string;
  email: string;
  roles: string[];
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
  roles: string[];
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  roles?: string[];
}

// ===== Saga Models =====
export interface SagaInstance {
  sagaId: string;
  type: string;
  status: SagaStatus;
  currentStep: string;
  steps: SagaStep[];
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SagaStep {
  name: string;
  status: SagaStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export type SagaStatus = 'STARTED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'COMPENSATING' | 'COMPENSATED';

// ===== API Response Models =====
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ApiError {
  status: number;
  message: string;
  timestamp: string;
  errors?: string[];
}

// ===== Metrics Models =====
export interface EmployeeMetrics {
  totalOperations: number;
  createCount: number;
  updateCount: number;
  deleteCount: number;
  averageResponseTime: number;
}

export interface ResilienceMetrics {
  circuitBreakerState: string;
  failureCount: number;
  successCount: number;
  retryCount: number;
}
