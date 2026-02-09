import api from './api'

const sagaService = {
  // Start employee onboarding saga
  startOnboarding: async (employeeData) => {
    const response = await api.post('/api/sagas/employee-onboarding', employeeData)
    return response.data
  },

  // Get saga status
  getStatus: async (sagaId) => {
    const response = await api.get(`/api/sagas/${sagaId}`)
    return response.data
  },

  // Retry failed saga
  retry: async (sagaId) => {
    await api.post(`/api/sagas/${sagaId}/retry`)
  },

  // Get all sagas (mock - you can implement in backend)
  getAll: async () => {
    // This would need a backend endpoint
    // For now, return empty array
    return []
  }
}

export default sagaService
