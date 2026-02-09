// React Query hooks for saga management
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import sagaService from '../services/sagaService'
import type { SagaInstance, EmployeeCreateRequest } from '../types'

// Query keys
export const sagaKeys = {
  all: ['sagas'] as const,
  detail: (sagaId: string) => [...sagaKeys.all, sagaId] as const,
}

// Fetch saga status by ID
export function useSagaStatus(sagaId: string | null) {
  return useQuery({
    queryKey: sagaKeys.detail(sagaId || ''),
    queryFn: () => sagaService.getStatus(sagaId!),
    enabled: !!sagaId,
    refetchInterval: (data) => {
      // Auto-refetch every 2 seconds if saga is in progress
      if (data?.status === 'IN_PROGRESS' || data?.status === 'STARTED') {
        return 2000
      }
      return false
    },
    staleTime: 1000, // Fresh for 1 second
  })
}

// Start onboarding saga mutation
export function useStartOnboardingSaga() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (employeeData: EmployeeCreateRequest) =>
      sagaService.startOnboarding(employeeData),
    onSuccess: (data) => {
      // Cache the new saga
      queryClient.setQueryData(sagaKeys.detail(data.sagaId), data)
    },
  })
}

// Retry saga mutation
export function useRetrySaga() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (sagaId: string) => sagaService.retry(sagaId),
    onSuccess: (data, sagaId) => {
      // Update the saga in cache
      queryClient.setQueryData(sagaKeys.detail(sagaId), data)
      // Invalidate to trigger refetch
      queryClient.invalidateQueries({ queryKey: sagaKeys.detail(sagaId) })
    },
  })
}
