// Component tests for Login page
import { render, screen, waitFor } from '../../test-utils'
import userEvent from '@testing-library/user-event'
import Login from '../Login'
import { AuthContext } from '../../context/AuthContext'

const mockLogin = jest.fn()
const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const mockAuthContext = {
  user: null,
  login: mockLogin,
  logout: jest.fn(),
}

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render login form', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Login />
      </AuthContext.Provider>
    )

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('should show demo credentials', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Login />
      </AuthContext.Provider>
    )

    expect(screen.getByText(/demo credentials/i)).toBeInTheDocument()
    expect(screen.getByText(/admin/)).toBeInTheDocument()
  })

  it('should handle form submission with valid credentials', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue(undefined)

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Login />
      </AuthContext.Provider>
    )

    await user.type(screen.getByLabelText(/username/i), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'admin123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('admin', 'admin123')
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  it('should display error message on login failure', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new Error('Invalid credentials'))

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Login />
      </AuthContext.Provider>
    )

    await user.type(screen.getByLabelText(/username/i), 'wrong')
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('should disable submit button while loading', async () => {
    const user = userEvent.setup()
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <Login />
      </AuthContext.Provider>
    )

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    
    await user.type(screen.getByLabelText(/username/i), 'admin')
    await user.type(screen.getByLabelText(/password/i), 'admin123')
    await user.click(submitButton)

    expect(submitButton).toBeDisabled()
  })
})
