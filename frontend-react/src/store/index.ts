// Redux Toolkit store configuration
import { configureStore } from '@reduxjs/toolkit'
import employeeReducer from './slices/employeeSlice'

export const store = configureStore({
  reducer: {
    employees: employeeReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization check
        ignoredActions: ['notifications/add'],
      },
    }),
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
