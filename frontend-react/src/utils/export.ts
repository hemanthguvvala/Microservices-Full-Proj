// Production data export utilities (CSV, Excel, PDF)
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Papa from 'papaparse'
import type { Employee } from '../types'

/**
 * Export data to CSV
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string = 'export.csv',
  columns?: Array<{ key: keyof T; label: string }>
) {
  try {
    // If columns specified, filter and rename
    let exportData = data
    if (columns) {
      exportData = data.map(row => {
        const filtered: any = {}
        columns.forEach(col => {
          filtered[col.label] = row[col.key]
        })
        return filtered
      })
    }

    // Convert to CSV
    const csv = Papa.unparse(exportData)
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(blob, filename)

    return true
  } catch (error) {
    console.error('CSV export failed:', error)
    return false
  }
}

/**
 * Export data to Excel
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string = 'export.xlsx',
  sheetName: string = 'Sheet1',
  columns?: Array<{ key: keyof T; label: string; width?: number }>
) {
  try {
    // Prepare data
    let exportData = data
    if (columns) {
      exportData = data.map(row => {
        const filtered: any = {}
        columns.forEach(col => {
          filtered[col.label] = row[col.key]
        })
        return filtered
      })
    }

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(exportData)

    // Set column widths
    if (columns) {
      ws['!cols'] = columns.map(col => ({
        wch: col.width || 20,
      }))
    }

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })

    // Save file
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    saveAs(blob, filename)

    return true
  } catch (error) {
    console.error('Excel export failed:', error)
    return false
  }
}

/**
 * Export data to PDF
 */
export function exportToPDF<T extends Record<string, any>>(
  data: T[],
  filename: string = 'export.pdf',
  title: string = 'Data Export',
  columns: Array<{ key: keyof T; label: string }>,
  orientation: 'portrait' | 'landscape' = 'portrait'
) {
  try {
    const doc = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    })

    // Add title
    doc.setFontSize(16)
    doc.text(title, 14, 15)

    // Add timestamp
    doc.setFontSize(10)
    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      22
    )

    // Prepare table data
    const headers = columns.map(col => col.label)
    const rows = data.map(row =>
      columns.map(col => String(row[col.key] || ''))
    )

    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 30,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246], // Primary color
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
    })

    // Save PDF
    doc.save(filename)

    return true
  } catch (error) {
    console.error('PDF export failed:', error)
    return false
  }
}

/**
 * Employee-specific export functions
 */
export const employeeExport = {
  csv: (employees: Employee[], filename: string = 'employees.csv') => {
    return exportToCSV(
      employees,
      filename,
      [
        { key: 'id', label: 'ID' },
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'phoneNumber', label: 'Phone' },
        { key: 'department', label: 'Department' },
        { key: 'position', label: 'Position' },
        { key: 'salary', label: 'Salary' },
        { key: 'hireDate', label: 'Hire Date' },
      ]
    )
  },

  excel: (employees: Employee[], filename: string = 'employees.xlsx') => {
    return exportToExcel(
      employees,
      filename,
      'Employees',
      [
        { key: 'id', label: 'ID', width: 10 },
        { key: 'firstName', label: 'First Name', width: 15 },
        { key: 'lastName', label: 'Last Name', width: 15 },
        { key: 'email', label: 'Email', width: 25 },
        { key: 'phoneNumber', label: 'Phone', width: 15 },
        { key: 'department', label: 'Department', width: 15 },
        { key: 'position', label: 'Position', width: 20 },
        { key: 'salary', label: 'Salary', width: 12 },
        { key: 'hireDate', label: 'Hire Date', width: 12 },
      ]
    )
  },

  pdf: (employees: Employee[], filename: string = 'employees.pdf') => {
    return exportToPDF(
      employees,
      filename,
      'Employee Directory',
      [
        { key: 'id', label: 'ID' },
        { key: 'firstName', label: 'First Name' },
        { key: 'lastName', label: 'Last Name' },
        { key: 'email', label: 'Email' },
        { key: 'department', label: 'Department' },
        { key: 'position', label: 'Position' },
      ],
      'landscape'
    )
  },
}

/**
 * Import CSV data
 */
export function importFromCSV<T = any>(
  file: File,
  callback: (data: T[], errors: any[]) => void
) {
  Papa.parse<T>(file, {
    header: true,
    skipEmptyLines: true,
    complete: (results) => {
      callback(results.data, results.errors)
    },
    error: (error) => {
      console.error('CSV import failed:', error)
      callback([], [error])
    },
  })
}

/**
 * Import Excel data
 */
export async function importFromExcel<T = any>(
  file: File,
  sheetIndex: number = 0
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        
        const sheetName = workbook.SheetNames[sheetIndex]
        const worksheet = workbook.Sheets[sheetName]
        
        const jsonData = XLSX.utils.sheet_to_json<T>(worksheet)
        resolve(jsonData)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Print current page
 */
export function printPage() {
  window.print()
}

/**
 * Generate shareable link
 */
export function generateShareLink(data: any, expiresIn: number = 3600000) { // 1 hour
  const encoded = btoa(JSON.stringify(data))
  const expires = Date.now() + expiresIn
  return `${window.location.origin}/share?data=${encoded}&expires=${expires}`
}
