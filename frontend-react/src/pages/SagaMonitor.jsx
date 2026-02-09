import { useState } from 'react'
import { Workflow, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import sagaService from '../services/sagaService'

export default function SagaMonitor() {
  const [sagaId, setSagaId] = useState('')
  const [sagaStatus, setSagaStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleCheck = async () => {
    if (!sagaId.trim()) return

    setLoading(true)
    try {
      const status = await sagaService.getStatus(sagaId)
      setSagaStatus(status)
    } catch (error) {
      console.error('Failed to fetch saga status:', error)
      alert('Saga not found or an error occurred')
      setSagaStatus(null)
    } finally {
      setLoading(false)
    }
  }

  const handleRetry = async () => {
    if (!sagaId) return

    try {
      await sagaService.retry(sagaId)
      alert('Saga retry initiated')
      // Refresh status
      handleCheck()
    } catch (error) {
      console.error('Failed to retry saga:', error)
      alert('Failed to retry saga')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'FAILED':
        return <XCircle className="w-6 h-6 text-red-500" />
      case 'COMPENSATING':
      case 'COMPENSATED':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />
      case 'IN_PROGRESS':
      case 'STARTED':
        return <Clock className="w-6 h-6 text-blue-500 animate-spin" />
      default:
        return <Workflow className="w-6 h-6 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'badge-success'
      case 'FAILED':
        return 'badge-danger'
      case 'COMPENSATING':
      case 'COMPENSATED':
        return 'badge-warning'
      case 'IN_PROGRESS':
      case 'STARTED':
        return 'badge-info'
      default:
        return 'badge'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Saga Monitor</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage distributed transactions (Saga Pattern)
        </p>
      </div>

      {/* Search Form */}
      <div className="card">
        <label className="label">Enter Saga ID</label>
        <div className="flex gap-4">
          <input
            type="text"
            value={sagaId}
            onChange={(e) => setSagaId(e.target.value)}
            placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
            className="input flex-1"
          />
          <button
            onClick={handleCheck}
            disabled={loading || !sagaId.trim()}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Check Status'}
          </button>
        </div>
      </div>

      {/* Saga Status Display */}
      {sagaStatus && (
        <div className="space-y-6">
          {/* Status Overview */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                {getStatusIcon(sagaStatus.status)}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {sagaStatus.sagaType.replace(/_/g, ' ')}
                  </h2>
                  <p className="text-gray-600 text-sm mt-1">
                    Saga ID: <code className="font-mono text-xs">{sagaStatus.sagaId}</code>
                  </p>
                </div>
              </div>
              <span className={`${getStatusColor(sagaStatus.status)}`}>
                {sagaStatus.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Started At</p>
                <p className="font-medium">
                  {sagaStatus.startedAt ? new Date(sagaStatus.startedAt).toLocaleString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed At</p>
                <p className="font-medium">
                  {sagaStatus.completedAt ? new Date(sagaStatus.completedAt).toLocaleString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Step</p>
                <p className="font-medium">{sagaStatus.currentStep || '-'}</p>
              </div>
            </div>

            {sagaStatus.errorMessage && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-medium text-red-900">Error Message:</p>
                <p className="text-sm text-red-700 mt-1">{sagaStatus.errorMessage}</p>
              </div>
            )}
          </div>

          {/* Step Status */}
          {sagaStatus.stepStatuses && Object.keys(sagaStatus.stepStatuses).length > 0 && (
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Saga Steps</h3>
              <div className="space-y-3">
                {Object.entries(sagaStatus.stepStatuses).map(([step, status], index) => (
                  <div
                    key={step}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {step.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <span className={`${getStatusColor(status)}`}>
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {sagaStatus.status === 'FAILED' && (
            <div className="card bg-yellow-50 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-yellow-900">Saga Failed</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    You can retry this saga to attempt execution again
                  </p>
                </div>
                <button
                  onClick={handleRetry}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Saga
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">About Saga Pattern</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>
            The Saga pattern manages distributed transactions across microservices. Each saga is a 
            sequence of local transactions with compensating actions for rollback.
          </p>
          <p className="mt-3">
            <strong>Employee Onboarding Saga includes:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Create employee record</li>
            <li>Create payroll entry (remote call to Payroll Service)</li>
            <li>Send welcome email</li>
            <li>Grant system access</li>
          </ul>
          <p className="mt-3">
            If any step fails, compensating transactions execute in reverse order to maintain consistency.
          </p>
        </div>
      </div>
    </div>
  )
}
