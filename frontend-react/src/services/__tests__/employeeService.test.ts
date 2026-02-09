// Unit tests for employeeService
import employeeService from '../services/employeeService'
import api from '../services/api'

// Mock the api module
jest.mock('../services/api')

const mockedApi = api as jest.Mocked<typeof api>

describe('employeeService', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getAll', () => {
    it('should fetch employees with pagination', async () => {
      const mockResponse = {
        data: {
          content: [
            { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
          ],
          totalPages: 5,
          totalElements: 50,
          number: 0,
          size: 10,
        },
      }

      mockedApi.get.mockResolvedValue(mockResponse)

      const result = await employeeService.getAll(0, 10)

      expect(mockedApi.get).toHaveBeenCalledWith('/api/employees', {
        params: { page: 0, size: 10 },
      })
      expect(result).toEqual(mockResponse.data)
      expect(result.content).toHaveLength(2)
    })
  })

  describe('getById', () => {
    it('should fetch a single employee by ID', async () => {
      const mockEmployee = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        department: 'Engineering',
        position: 'Software Engineer',
        salary: 75000,
      }

      mockedApi.get.mockResolvedValue({ data: mockEmployee })

      const result = await employeeService.getById(1)

      expect(mockedApi.get).toHaveBeenCalledWith('/api/employees/1')
      expect(result).toEqual(mockEmployee)
    })
  })

  describe('create', () => {
    it('should create a new employee', async () => {
      const newEmployee = {
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
        department: 'Marketing',
        position: 'Marketing Manager',
        salary: 65000,
      }

      const createdEmployee = { id: 3, ...newEmployee }
      mockedApi.post.mockResolvedValue({ data: createdEmployee })

      const result = await employeeService.create(newEmployee)

      expect(mockedApi.post).toHaveBeenCalledWith('/api/employees', newEmployee)
      expect(result).toEqual(createdEmployee)
      expect(result.id).toBe(3)
    })
  })

  describe('update', () => {
    it('should update an existing employee', async () => {
      const updatedData = { position: 'Senior Software Engineer', salary: 85000 }
      const updatedEmployee = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        ...updatedData,
      }

      mockedApi.put.mockResolvedValue({ data: updatedEmployee })

      const result = await employeeService.update(1, updatedData)

      expect(mockedApi.put).toHaveBeenCalledWith('/api/employees/1', updatedData)
      expect(result.position).toBe('Senior Software Engineer')
    })
  })

  describe('delete', () => {
    it('should delete an employee', async () => {
      mockedApi.delete.mockResolvedValue({ data: undefined })

      await employeeService.delete(1)

      expect(mockedApi.delete).toHaveBeenCalledWith('/api/employees/1')
    })
  })

  describe('search', () => {
    it('should search employees with query', async () => {
      const mockResults = {
        data: {
          content: [
            { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
          ],
          totalPages: 1,
          totalElements: 1,
          number: 0,
          size: 20,
        },
      }

      mockedApi.get.mockResolvedValue(mockResults)

      const result = await employeeService.search('John', 0, 20)

      expect(mockedApi.get).toHaveBeenCalledWith('/api/employees/search', {
        params: { q: 'John', page: 0, size: 20 },
      })
      expect(result.content).toHaveLength(1)
    })
  })
})
