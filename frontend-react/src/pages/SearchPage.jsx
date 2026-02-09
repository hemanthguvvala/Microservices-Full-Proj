import { useState } from 'react'
import { Search as SearchIcon } from 'lucide-react'
import employeeService from '../services/employeeService'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return

    setSearching(true)
    setHasSearched(true)

    try {
      // Using Elasticsearch full-text search
      const data = await employeeService.search(query)
      setResults(data.content || [])
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Employee Search</h1>
        <p className="text-gray-600 mt-2">
          Search employees using Elasticsearch full-text search
        </p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="card">
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, email, department, or position..."
              className="input"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !query.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <SearchIcon className="w-5 h-5" />
            {searching ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {/* Results */}
      {hasSearched && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">
            Search Results ({results.length})
          </h2>

          {results.length === 0 ? (
            <div className="text-center py-12">
              <SearchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No employees found matching your search.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((employee) => (
                <div
                  key={employee.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900">
                        {employee.firstName} {employee.lastName}
                      </h3>
                      <p className="text-gray-600">{employee.position}</p>
                      <div className="flex gap-4 mt-2 text-sm text-gray-600">
                        <span>{employee.email}</span>
                        <span className="badge-info">{employee.department}</span>
                      </div>
                    </div>
                    <a
                      href={`/employees/${employee.id}`}
                      className="btn-secondary text-sm"
                    >
                      View Details
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search Tips */}
      {!hasSearched && (
        <div className="card bg-gray-50">
          <h3 className="font-semibold mb-3">Search Tips</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• Search by employee name, email, department, or position</li>
            <li>• Elasticsearch provides fuzzy matching and relevance scoring</li>
            <li>• Results are ranked by relevance</li>
            <li>• Try partial words like "eng" to find "Engineering"</li>
          </ul>
        </div>
      )}
    </div>
  )
}
