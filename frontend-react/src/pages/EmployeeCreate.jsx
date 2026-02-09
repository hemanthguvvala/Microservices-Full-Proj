import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import employeeService from '../services/employeeService'
import sagaService from '../services/sagaService'

export default function EmployeeCreate() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [useSaga, setUseSaga] = useState(false)
  const [sagaId, setSagaId] = useState(null)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    department: '',
    position: '',
    salary: '',
    hireDate: new Date().toISOString().split('T')[0]
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (useSaga) {
        // Use Saga pattern for onboarding
        const saga = await sagaService.startOnboarding(formData)
        setSagaId(saga.sagaId)
        alert(`Onboarding saga started! Saga ID: ${saga.sagaId}. Check the Sagas page for status.`)
        setTimeout(() => navigate('/sagas'), 2000)
      } else {
        // Direct employee creation
        await employeeService.create(formData)
        alert('Employee created successfully!')
        navigate('/employees')
      }
    } catch (error) {
      console.error('Failed to create employee:', error)
      alert(error.response?.data?.message || 'Failed to create employee')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'salary' ? parseFloat(value) || 0 : value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/employees" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Employee</h1>
          <p className="text-gray-600 mt-1">Add a new employee to the system</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Saga Option */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={useSaga}
              onChange={(e) => setUseSaga(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <div>
              <p className="font-medium text-gray-900">Use Employee Onboarding Saga</p>
              <p className="text-sm text-gray-600">
                Creates employee, payroll, sends email, and grants access (distributed transaction)
              </p>
            </div>
          </label>
        </div>

        {/* Personal Information */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="label">
                First Name *
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="label">
                Last Name *
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="label">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="phoneNumber" className="label">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="input"
                placeholder="+1234567890"
              />
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Employment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="department" className="label">
                Department *
              </label>
              <select
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="input"
                required
              >
                <option value="">Select Department</option>
                <option value="Engineering">Engineering</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
            <div>
              <label htmlFor="position" className="label">
                Position *
              </label>
              <input
                id="position"
                name="position"
                type="text"
                value={formData.position}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label htmlFor="salary" className="label">
                Salary *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  id="salary"
                  name="salary"
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={handleChange}
                  className="input pl-7"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="hireDate" className="label">
                Hire Date
              </label>
              <input
                id="hireDate"
                name="hireDate"
                type="date"
                value={formData.hireDate}
                onChange={handleChange}
                className="input"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link to="/employees" className="btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {loading ? 'Creating...' : useSaga ? 'Start Saga' : 'Create Employee'}
          </button>
        </div>
      </form>

      {sagaId && (
        <div className="card bg-green-50 border border-green-200">
          <p className="font-medium text-green-900">Saga Started Successfully!</p>
          <p className="text-sm text-green-700 mt-1">
            Saga ID: <code className="font-mono">{sagaId}</code>
          </p>
        </div>
      )}
    </div>
  )
}
