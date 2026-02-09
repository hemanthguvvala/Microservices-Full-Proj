// Zod validation schemas for form validation
import { z } from 'zod'

// Employee creation/update schema
export const employeeSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s-]+$/, 'First name can only contain letters, spaces, and hyphens'),
  
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s-]+$/, 'Last name can only contain letters, spaces, and hyphens'),
  
  email: z
    .string()
    .email('Invalid email address')
    .toLowerCase(),
  
  phoneNumber: z
    .string()
    .regex(/^\+?[\d\s-()]+$/, 'Invalid phone number format')
    .optional()
    .or(z.literal('')),
  
  department: z
    .string()
    .min(1, 'Department is required'),
  
  position: z
    .string()
    .min(2, 'Position must be at least 2 characters')
    .max(100, 'Position must be less than 100 characters'),
  
  salary: z
    .number()
    .positive('Salary must be positive')
    .min(1000, 'Salary must be at least $1,000')
    .max(10000000, 'Salary must be less than $10,000,000'),
  
  hireDate: z
    .string()
    .optional()
    .refine((date) => {
      if (!date) return true
      const d = new Date(date)
      const now = new Date()
      const yearAgo = new Date()
      yearAgo.setFullYear(now.getFullYear() - 1)
      return d >= yearAgo && d <= now
    }, 'Hire date must be within the last year'),
})

export type EmployeeFormData = z.infer<typeof employeeSchema>

// Login schema
export const loginSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters'),
  
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be less than 100 characters'),
})

export type LoginFormData = z.infer<typeof loginSchema>

// Search schema
export const searchSchema = z.object({
  query: z
    .string()
    .min(1, 'Search query cannot be empty')
    .max(200, 'Search query is too long'),
})

export type SearchFormData = z.infer<typeof searchSchema>

// Employee update schema (all fields optional)
export const employeeUpdateSchema = employeeSchema.partial()

export type EmployeeUpdateFormData = z.infer<typeof employeeUpdateSchema>
