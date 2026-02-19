import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'

// ─── Lazy-loaded route components (code splitting) ──────────────────────────
// Interview: "How do you optimize initial load time in a React SPA?"
// → "React.lazy + Suspense splits each route into separate JS chunks.
//    The browser only downloads the code for the current page. Combined with
//    Vite's automatic chunk hashing, returning users get cache hits on
//    unchanged routes while new code is fetched on-demand."
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const EmployeeList = lazy(() => import('./pages/EmployeeList'))
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'))
const EmployeeCreate = lazy(() => import('./pages/EmployeeCreate'))
const SagaMonitor = lazy(() => import('./pages/SagaMonitor'))
const SearchPage = lazy(() => import('./pages/SearchPage'))
const NotFound = lazy(() => import('./pages/NotFound'))

function RouteLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )
}

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" />
}

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="employees" element={<EmployeeList />} />
            <Route path="employees/create" element={<EmployeeCreate />} />
            <Route path="employees/:id" element={<EmployeeDetail />} />
            <Route path="sagas" element={<SagaMonitor />} />
            <Route path="search" element={<SearchPage />} />
          </Route>
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </Router>
  )
}

export default App
