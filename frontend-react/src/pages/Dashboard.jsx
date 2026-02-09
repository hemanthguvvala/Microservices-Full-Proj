import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Users, TrendingUp, Activity, CheckCircle } from 'lucide-react'
import employeeService from '../services/employeeService'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    newThisMonth: 0,
    departments: [],
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // In a real app, this would come from your backend
      const employees = await employeeService.getAll(0, 100)
      
      // Calculate stats
      const departmentCounts = {}
      employees.content?.forEach(emp => {
        departmentCounts[emp.department] = (departmentCounts[emp.department] || 0) + 1
      })

      const deptData = Object.entries(departmentCounts).map(([name, count]) => ({
        name,
        employees: count
      }))

      setStats({
        totalEmployees: employees.totalElements || 0,
        newThisMonth: 5, // Mock data
        departments: deptData,
        activeSagas: 2 // Mock data
      })
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const StatCard = ({ icon: Icon, title, value, color, link }) => (
    <Link to={link} className="card hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
      </div>
    </Link>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to your employee management system</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Total Employees"
          value={stats.totalEmployees}
          color="bg-primary-500"
          link="/employees"
        />
        <StatCard
          icon={TrendingUp}
          title="New This Month"
          value={stats.newThisMonth}
          color="bg-green-500"
          link="/employees"
        />
        <StatCard
          icon={Activity}
          title="Active Sagas"
          value={stats.activeSagas}
          color="bg-yellow-500"
          link="/sagas"
        />
        <StatCard
          icon={CheckCircle}
          title="Departments"
          value={stats.departments.length}
          color="bg-purple-500"
          link="/employees"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department Distribution */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Employees by Department
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.departments}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="employees" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              to="/employees/create"
              className="block p-4 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-primary-900">Create New Employee</p>
              <p className="text-sm text-primary-600 mt-1">
                Add a new employee to the system
              </p>
            </Link>
            <Link
              to="/search"
              className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-gray-900">Search Employees</p>
              <p className="text-sm text-gray-600 mt-1">
                Find employees using full-text search
              </p>
            </Link>
            <Link
              to="/sagas"
              className="block p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <p className="font-medium text-gray-900">Monitor Sagas</p>
              <p className="text-sm text-gray-600 mt-1">
                View and manage distributed transactions
              </p>
            </Link>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          System Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">API Gateway</p>
              <p className="text-xs text-gray-600">Operational</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Database</p>
              <p className="text-xs text-gray-600">Healthy</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">WebSocket</p>
              <p className="text-xs text-gray-600">Connected</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
