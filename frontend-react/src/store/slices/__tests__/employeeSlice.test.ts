// Tests for Redux employee slice
import employeeReducer, {
  fetchEmployees,
  fetchEmployeeById,
  createEmployee,
  deleteEmployee,
  clearCurrentEmployee,
  clearError,
} from '../employeeSlice'
import { configureStore } from '@reduxjs/toolkit'
import employeeService from '../../services/employeeService'

jest.mock('../../services/employeeService')

const mockedService = employeeService as jest.Mocked<typeof employeeService>

describe('employeeSlice', () => {
  describe('reducers', () => {
    it('should return the initial state', () => {
      expect(employeeReducer(undefined, { type: 'unknown' })).toEqual({
        employees: [],
        currentEmployee: null,
        loading: false,
        error: null,
        totalPages: 0,
        currentPage: 0,
        totalElements: 0,
      })
    })

    it('should handle clearCurrentEmployee', () => {
      const previousState = {
        employees: [],
        currentEmployee: { id: 1, firstName: 'John', lastName: 'Doe' } as any,
        loading: false,
        error: null,
        totalPages: 0,
        currentPage: 0,
        totalElements: 0,
      }

      expect(employeeReducer(previousState, clearCurrentEmployee())).toEqual({
        ...previousState,
        currentEmployee: null,
      })
    })

    it('should handle clearError', () => {
      const previousState = {
        employees: [],
        currentEmployee: null,
        loading: false,
        error: 'Some error',
        totalPages: 0,
        currentPage: 0,
        totalElements: 0,
      }

      expect(employeeReducer(previousState, clearError())).toEqual({
        ...previousState,
        error: null,
      })
    })
  })

  describe('fetchEmployees thunk', () => {
    it('should handle successful employee fetch', async () => {
      const mockData = {
        content: [
          { id: 1, firstName: 'John', lastName: 'Doe' },
          { id: 2, firstName: 'Jane', lastName: 'Smith' },
        ],
        totalPages: 5,
        totalElements: 50,
        number: 0,
        size: 10,
      }

      mockedService.getAll.mockResolvedValue(mockData as any)

      const store = configureStore({ reducer: { employees: employeeReducer } })
      await store.dispatch(fetchEmployees({ page: 0, size: 10 }) as any)

      const state = store.getState().employees
      expect(state.loading).toBe(false)
      expect(state.employees).toHaveLength(2)
      expect(state.totalPages).toBe(5)
      expect(state.error).toBeNull()
    })

    it('should handle failed employee fetch', async () => {
      mockedService.getAll.mockRejectedValue(new Error('Network error'))

      const store = configureStore({ reducer: { employees: employeeReducer } })
      await store.dispatch(fetchEmployees({ page: 0, size: 10 }) as any)

      const state = store.getState().employees
      expect(state.loading).toBe(false)
      expect(state.error).toBeTruthy()
      expect(state.employees).toHaveLength(0)
    })
  })

  describe('createEmployee thunk', () => {
    it('should add new employee to state', async () => {
      const newEmployee = {
        id: 3,
        firstName: 'Alice',
        lastName: 'Johnson',
        email: 'alice@example.com',
      }

      mockedService.create.mockResolvedValue(newEmployee as any)

      const store = configureStore({ reducer: { employees: employeeReducer } })
      await store.dispatch(createEmployee(newEmployee as any) as any)

      const state = store.getState().employees
      expect(state.employees).toContainEqual(newEmployee)
      expect(state.loading).toBe(false)
    })
  })

  describe('deleteEmployee thunk', () => {
    it('should remove employee from state', async () => {
      const initialState = {
        employees: [
          { id: 1, firstName: 'John', lastName: 'Doe' },
          { id: 2, firstName: 'Jane', lastName: 'Smith' },
        ] as any,
        currentEmployee: null,
        loading: false,
        error: null,
        totalPages: 0,
        currentPage: 0,
        totalElements: 2,
      }

      mockedService.delete.mockResolvedValue(undefined)

      const store = configureStore({
        reducer: { employees: employeeReducer },
        preloadedState: { employees: initialState },
      })

      await store.dispatch(deleteEmployee(1) as any)

      const state = store.getState().employees
      expect(state.employees).toHaveLength(1)
      expect(state.employees[0].id).toBe(2)
    })
  })
})
