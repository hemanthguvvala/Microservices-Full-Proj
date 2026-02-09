// React Query hooks for employee management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import employeeService from '../services/employeeService'
import type { Employee, EmployeeCreateRequest } from '../types'

// Query keys
export const employeeKeys = {
  all: ['employees'] as const,
  lists: () => [...employeeKeys.all, 'list'] as const,
  list: (page: number, size: number) => [...employeeKeys.lists(), { page, size }] as const,
  details: () => [...employeeKeys.all, 'detail'] as const,
  detail: (id: number) => [...employeeKeys.details(), id] as const,
  search: (query: string) => [...employeeKeys.all, 'search', query] as const,
  stats: () => [...employeeKeys.all, 'stats'] as const,
}

// Fetch employees with pagination
export function useEmployees(page: number = 0, size: number = 10) {
  return useQuery({
    queryKey: employeeKeys.list(page, size),
    queryFn: () => employeeService.getAll(page, size),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
  })
}

// Fetch single employee by ID
export function useEmployee(id: number) {
  return useQuery({
    queryKey: employeeKeys.detail(id),
    queryFn: () => employeeService.getById(id),
    enabled: !!id, // Only run if ID exists
    staleTime: 5 * 60 * 1000,
  })
}

// Search employees
export function useEmployeeSearch(query: string) {
  return useQuery({
    queryKey: employeeKeys.search(query),
    queryFn: () => employeeService.search(query),
    enabled: query.length > 0, // Only search if query exists
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Get employee stats
export function useEmployeeStats() {
  return useQuery({
    queryKey: employeeKeys.stats(),
    queryFn: () => employeeService.getStats(),
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Create employee mutation
export function useCreateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (employeeData: EmployeeCreateRequest) => 
      employeeService.create(employeeData),
    onSuccess: () => {
      // Invalidate and refetch all employee queries
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() })
      queryClient.invalidateQueries({ queryKey: employeeKeys.stats() })
    },
  })
}

// Update employee mutation
export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EmployeeCreateRequest> }) =>
      employeeService.update(id, data),
    onSuccess: (data, variables) => {
      // Update the specific employee in cache
      queryClient.setQueryData(employeeKeys.detail(variables.id), data)
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() })
    },
  })
}

// Delete employee mutation
export function useDeleteEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => employeeService.delete(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: employeeKeys.detail(id) })
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: employeeKeys.lists() })
      queryClient.invalidateQueries({ queryKey: employeeKeys.stats() })
    },
  })
}
