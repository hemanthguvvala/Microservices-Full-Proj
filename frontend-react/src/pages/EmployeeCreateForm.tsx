// React Hook Form version with Zod validation
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Save } from 'lucide-react'
import { employeeSchema, type EmployeeFormData } from '../schemas/validation'
import { useCreateEmployee } from '../hooks/useEmployees'
import { useStartOnboardingSaga } from '../hooks/useSagas'

export default function EmployeeCreateForm() {
  const navigate = useNavigate()
  const [useSaga, setUseSaga] = useState(false)
  const [sagaId, setSagaId] = useState<string | null>(null)

  const createEmployeeMutation = useCreateEmployee()
  const startSagaMutation = useStartOnboardingSaga()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      department: '',
      position: '',
      salary: 50000,
      hireDate: new Date().toISOString().split('T')[0],
    },
  })

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      if (useSaga) {
        // Use Saga pattern
        const saga = await startSagaMutation.mutateAsync(data)
        setSagaId(saga.sagaId)
        alert(`Onboarding saga started! Saga ID: ${saga.sagaId}`)
        setTimeout(() => navigate('/sagas'), 2000)
      } else {
        // Direct creation
        await createEmployeeMutation.mutateAsync(data)
        alert('Employee created successfully!')
        navigate('/employees')
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create employee')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/employees" className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Employee (React Hook Form + Zod)</h1>
          <p className="text-gray-600 mt-1">Form validation powered by Zod schema</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
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
                Creates employee, payroll, sends email, and grants access
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
                {...register('firstName')}
                type="text"
                id="firstName"
                className={`input ${errors.firstName ? 'border-red-500' : ''}`}
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="lastName" className="label">
                Last Name *
              </label>
              <input
                {...register('lastName')}
                type="text"
                id="lastName"
                className={`input ${errors.lastName ? 'border-red-500' : ''}`}
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email *
              </label>
              <input
                {...register('email')}
                type="email"
                id="email"
                className={`input ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="phoneNumber" className="label">
                Phone Number
              </label>
              <input
                {...register('phoneNumber')}
                type="tel"
                id="phoneNumber"
                placeholder="+1234567890"
                className={`input ${errors.phoneNumber ? 'border-red-500' : ''}`}
              />
              {errors.phoneNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
              )}
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
                {...register('department')}
                id="department"
                className={`input ${errors.department ? 'border-red-500' : ''}`}
              >
                <option value="">Select Department</option>
                <option value="Engineering">Engineering</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Sales">Sales</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
              </select>
              {errors.department && (
                <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="position" className="label">
                Position *
              </label>
              <input
                {...register('position')}
                type="text"
                id="position"
                className={`input ${errors.position ? 'border-red-500' : ''}`}
              />
              {errors.position && (
                <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="salary" className="label">
                Salary *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">$</span>
                <input
                  {...register('salary', { valueAsNumber: true })}
                  type="number"
                  id="salary"
                  step="0.01"
                  className={`input pl-7 ${errors.salary ? 'border-red-500' : ''}`}
                />
              </div>
              {errors.salary && (
                <p className="mt-1 text-sm text-red-600">{errors.salary.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="hireDate" className="label">
                Hire Date
              </label>
              <input
                {...register('hireDate')}
                type="date"
                id="hireDate"
                className={`input ${errors.hireDate ? 'border-red-500' : ''}`}
              />
              {errors.hireDate && (
                <p className="mt-1 text-sm text-red-600">{errors.hireDate.message}</p>
              )}
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
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Creating...' : useSaga ? 'Start Saga' : 'Create Employee'}
          </button>
        </div>
      </form>

      {sagaId && (
        <div className="card bg-green-50 border border-green-200">
          <p className="font-medium text-green-900">✅ Saga Started Successfully!</p>
          <p className="text-sm text-green-700 mt-1">
            Saga ID: <code className="font-mono">{sagaId}</code>
          </p>
        </div>
      )}
    </div>
  )
}
