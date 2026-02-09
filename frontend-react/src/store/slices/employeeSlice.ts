// Redux Toolkit slice for employee management
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import type { Employee, PaginatedResponse } from '../../types'
import employeeService from '../../services/employeeService'

interface EmployeeState {
  employees: Employee[]
  currentEmployee: Employee | null
  loading: boolean
  error: string | null
  totalPages: number
  currentPage: number
  totalElements: number
}

const initialState: EmployeeState = {
  employees: [],
  currentEmployee: null,
  loading: false,
  error: null,
  totalPages: 0,
  currentPage: 0,
  totalElements: 0
}

// Async thunks
export const fetchEmployees = createAsyncThunk(
  'employees/fetchAll',
  async ({ page = 0, size = 10 }: { page?: number; size?: number }) => {
    const response = await employeeService.getAll(page, size)
    return response
  }
)

export const fetchEmployeeById = createAsyncThunk(
  'employees/fetchById',
  async (id: number) => {
    const response = await employeeService.getById(id)
    return response
  }
)

export const createEmployee = createAsyncThunk(
  'employees/create',
  async (employeeData: any) => {
    const response = await employeeService.create(employeeData)
    return response
  }
)

export const updateEmployee = createAsyncThunk(
  'employees/update',
  async ({ id, data }: { id: number; data: any }) => {
    const response = await employeeService.update(id, data)
    return response
  }
)

export const deleteEmployee = createAsyncThunk(
  'employees/delete',
  async (id: number) => {
    await employeeService.delete(id)
    return id
  }
)

export const searchEmployees = createAsyncThunk(
  'employees/search',
  async ({ query, page = 0, size = 20 }: { query: string; page?: number; size?: number }) => {
    const response = await employeeService.search(query, page, size)
    return response
  }
)

// Slice
const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    clearCurrentEmployee: (state) => {
      state.currentEmployee = null
    },
    clearError: (state) => {
      state.error = null
    }
  },
  extraReducers: (builder) => {
    // Fetch all employees
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchEmployees.fulfilled, (state, action: PayloadAction<PaginatedResponse<Employee>>) => {
        state.loading = false
        state.employees = action.payload.content
        state.totalPages = action.payload.totalPages
        state.currentPage = action.payload.number
        state.totalElements = action.payload.totalElements
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch employees'
      })

    // Fetch employee by ID
    builder
      .addCase(fetchEmployeeById.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchEmployeeById.fulfilled, (state, action: PayloadAction<Employee>) => {
        state.loading = false
        state.currentEmployee = action.payload
      })
      .addCase(fetchEmployeeById.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch employee'
      })

    // Create employee
    builder
      .addCase(createEmployee.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(createEmployee.fulfilled, (state, action: PayloadAction<Employee>) => {
        state.loading = false
        state.employees.push(action.payload)
      })
      .addCase(createEmployee.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to create employee'
      })

    // Update employee
    builder
      .addCase(updateEmployee.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(updateEmployee.fulfilled, (state, action: PayloadAction<Employee>) => {
        state.loading = false
        const index = state.employees.findIndex(emp => emp.id === action.payload.id)
        if (index !== -1) {
          state.employees[index] = action.payload
        }
        if (state.currentEmployee?.id === action.payload.id) {
          state.currentEmployee = action.payload
        }
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to update employee'
      })

    // Delete employee
    builder
      .addCase(deleteEmployee.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(deleteEmployee.fulfilled, (state, action: PayloadAction<number>) => {
        state.loading = false
        state.employees = state.employees.filter(emp => emp.id !== action.payload)
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to delete employee'
      })

    // Search employees
    builder
      .addCase(searchEmployees.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(searchEmployees.fulfilled, (state, action: PayloadAction<PaginatedResponse<Employee>>) => {
        state.loading = false
        state.employees = action.payload.content
        state.totalPages = action.payload.totalPages
        state.currentPage = action.payload.number
        state.totalElements = action.payload.totalElements
      })
      .addCase(searchEmployees.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to search employees'
      })
  }
})

export const { clearCurrentEmployee, clearError } = employeeSlice.actions
export default employeeSlice.reducer
