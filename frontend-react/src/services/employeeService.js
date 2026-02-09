import api from './api'

const employeeService = {
  // Get all employees with pagination
  getAll: async (page = 0, size = 10) => {
    const response = await api.get(`/api/employees?page=${page}&size=${size}`)
    return response.data
  },

  // Get employee by ID
  getById: async (id) => {
    const response = await api.get(`/api/employees/${id}`)
    return response.data
  },

  // Create new employee
  create: async (employeeData) => {
    const response = await api.post('/api/employees', employeeData)
    return response.data
  },

  // Update employee
  update: async (id, employeeData) => {
    const response = await api.put(`/api/employees/${id}`, employeeData)
    return response.data
  },

  // Delete employee
  delete: async (id) => {
    await api.delete(`/api/employees/${id}`)
  },

  // Search employees
  search: async (query, page = 0, size = 10) => {
    const response = await api.get(`/api/employees/search?q=${query}&page=${page}&size=${size}`)
    return response.data
  },

  // Get employee statistics
  getStats: async () => {
    const response = await api.get('/api/employees/stats')
    return response.data
  }
}

export default employeeService
