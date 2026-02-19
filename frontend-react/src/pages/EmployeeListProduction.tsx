/**
 * Example Employee List Page with ALL Production Features
 * 
 * This demonstrates how to use production features together:
 * - Error Boundaries
 * - Lazy Loading
 * - Infinite Scroll
 * - Internationalization
 * - Analytics Tracking
 * - Performance Monitoring
 * - File Upload/Export
 * - Dark Mode
 * - Production Hooks
 */

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Upload, Search, AlertCircle } from 'lucide-react'

// Production hooks
import { 
  useDebounce, 
  useOnlineStatus,
} from '../hooks/useProduction'

// Components
import { InfiniteScroll, useInfiniteScrollData } from '../components/InfiniteScroll'
import FileUpload from '../components/FileUpload'
import ErrorBoundary from '../components/ErrorBoundary'

// Services
import { employeeService } from '../services/employeeService'
import { employeeExport, importFromExcel } from '../utils/export'

// Analytics
import { useAnalytics, useComponentTracking } from '../utils/analytics'

// Types
import type { Employee } from '../types'

const EmployeeListProduction: React.FC = () => {
  const { t } = useTranslation('employee')
  const { track, pageView } = useAnalytics()
  const isOnline = useOnlineStatus()
  
  // Component tracking
  useComponentTracking('EmployeeListProduction')

  // State
  const [searchQuery, setSearchQuery] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Debounced search
  const debouncedSearch = useDebounce(searchQuery, 500)

  // Page view tracking
  useEffect(() => {
    pageView('/employees', 'Employee List')
  }, [pageView])

  // Track search
  useEffect(() => {
    if (debouncedSearch) {
      track('search', {
        query: debouncedSearch,
        resultsCount: items.length,
        filters: { status: filter } as any,
      })
    }
  }, [debouncedSearch, filter, track])

  // Infinite scroll data
  const {
    items,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
  } = useInfiniteScrollData<Employee>({
    fetchItems: async (page, pageSize) => {
      if (debouncedSearch) {
        const response = await employeeService.search(debouncedSearch, page, pageSize)
        return response.content
      }
      const response = await employeeService.getAll(page, pageSize)
      return response.content
    },
    pageSize: 20,
  })

  // Reset list when search or filter changes
  useEffect(() => {
    reset()
  }, [debouncedSearch, filter, reset])

  // Export handlers
  const handleExportCSV = () => {
    employeeExport.csv(items, `employees_${Date.now()}.csv`)
    track('employee_export', { format: 'csv', count: items.length })
  }

  const handleExportExcel = () => {
    employeeExport.excel(items, `employees_${Date.now()}.xlsx`)
    track('employee_export', { format: 'excel', count: items.length })
  }

  const handleExportPDF = () => {
    employeeExport.pdf(items, `employees_${Date.now()}.pdf`)
    track('employee_export', { format: 'pdf', count: items.length })
  }

  // Import handler
  const handleImport = async (files: File[]) => {
    const file = files[0]
    if (!file) return

    try {
      const data = await importFromExcel<Partial<Employee>>(file)
      
      // Validate and import
      let successCount = 0
      let errorCount = 0

      for (const row of data) {
        try {
          await employeeService.create(row as any)
          successCount++
        } catch {
          errorCount++
        }
      }

      track('employee_import', {
        format: 'excel',
        count: successCount,
        errors: errorCount,
      })

      alert(
        t('importSuccess', {
          success: successCount,
          errors: errorCount,
        })
      )

      reset() // Reload list
    } catch (error) {
      track('error_occurred', {
        error: 'Import failed',
        component: 'EmployeeList',
        severity: 'high',
      })
      alert(t('importError'))
    }
  }

  // Delete handler
  const handleDelete = async (id: number) => {
    if (!confirm(t('deleteConfirm'))) return

    try {
      await employeeService.delete(id)
      track('employee_delete', { employeeId: String(id) })
      reset()
    } catch (error) {
      track('error_occurred', {
        error: 'Delete failed',
        component: 'EmployeeList',
        severity: 'medium',
      })
      alert(t('deleteError'))
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Offline banner */}
      {!isOnline && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {t('offlineWarning')}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>

        <div className="flex gap-2">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Upload className="h-5 w-5" />
            {t('import')}
          </button>

          <div className="relative group">
            <button
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Download className="h-5 w-5" />
              {t('export')}
            </button>

            {/* Export dropdown */}
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
              <button
                onClick={handleExportCSV}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
              >
                Export as CSV
              </button>
              <button
                onClick={handleExportExcel}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Export as Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg"
              >
                Export as PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* File upload */}
      {showUpload && (
        <div className="mb-6">
          <FileUpload
            onUpload={handleImport}
            accept={{
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
              'application/vnd.ms-excel': ['.xls'],
              'text/csv': ['.csv'],
            }}
            maxFiles={1}
            multiple={false}
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>

        {/* Status filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
        >
          <option value="all">{t('filterAll')}</option>
          <option value="active">{t('filterActive')}</option>
          <option value="inactive">{t('filterInactive')}</option>
        </select>
      </div>

      {/* Employee list with infinite scroll */}
      <ErrorBoundary fallback={<div>Error loading employees</div>}>
        <InfiniteScroll
          items={items}
          renderItem={(employee) => (
            <div
              key={employee.id}
              className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow mb-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {employee.firstName} {employee.lastName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {employee.email}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {employee.department} • {employee.position}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      track('employee_view', { employeeId: String(employee.id) })
                      // Navigate to detail
                    }}
                    className="px-3 py-1 text-sm text-primary-600 hover:bg-primary-50 rounded"
                  >
                    {t('view')}
                  </button>
                  <button
                    onClick={() => handleDelete(employee.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                  >
                    {t('delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
          onLoadMore={loadMore}
          loading={loading}
          hasMore={hasMore}
          error={error}
          className="space-y-4"
        />
      </ErrorBoundary>

      {/* Stats */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('loadedCount', { count: items.length })}
          {hasMore && ` • ${t('moreAvailable')}`}
        </p>
      </div>
    </div>
  )
}

export default EmployeeListProduction
