# Employee Management System - React Frontend

A modern React frontend application for the Employee Management microservices platform, featuring real-time WebSocket notifications, Saga pattern monitoring, and full-text search capabilities.

## 🚀 Features

### Core Features
- **Dashboard**: Overview with statistics and charts
- **Employee Management**: Full CRUD operations with pagination
- **Employee Search**: Elasticsearch-powered full-text search
- **Saga Monitoring**: Real-time distributed transaction tracking
- **JWT Authentication**: Secure login/logout
- **WebSocket Notifications**: Real-time updates via STOMP

### Technical Highlights
- ⚡ **Vite** - Lightning-fast development server
- ⚛️ **React 18** - Latest React features
- 🎨 **Tailwind CSS** - Utility-first styling
- 📊 **Recharts** - Beautiful data visualization
- 🔄 **Axios** - HTTP client with interceptors
- 🔌 **STOMP over WebSocket** - Real-time communication
- 🔐 **Protected Routes** - Auth-based navigation

## 📁 Project Structure

```
frontend-react/
├── src/
│   ├── components/
│   │   └── Layout.jsx           # Main layout with sidebar/header
│   ├── context/
│   │   ├── AuthContext.jsx      # Authentication state
│   │   └── NotificationContext.jsx  # WebSocket notifications
│   ├── pages/
│   │   ├── Login.jsx            # Login page
│   │   ├── Dashboard.jsx        # Dashboard with charts
│   │   ├── EmployeeList.jsx     # Employee table with pagination
│   │   ├── EmployeeDetail.jsx   # View/edit employee
│   │   ├── EmployeeCreate.jsx   # Create employee (with Saga option)
│   │   ├── SearchPage.jsx       # Elasticsearch search
│   │   ├── SagaMonitor.jsx      # Monitor distributed transactions
│   │   └── NotFound.jsx         # 404 page
│   ├── services/
│   │   ├── api.js               # Axios instance with interceptors
│   │   ├── employeeService.js   # Employee API calls
│   │   └── sagaService.js       # Saga API calls
│   ├── App.jsx                  # Routes configuration
│   ├── main.jsx                 # Entry point
│   └── index.css                # Tailwind + custom styles
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🛠️ Installation

### Prerequisites
- Node.js 18+ and npm
- Backend services running (API Gateway on port 8080)

### Steps

1. **Navigate to frontend directory**
```bash
cd frontend-react
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure API endpoint** 
The app is configured to proxy API calls to `http://localhost:8080` (see `vite.config.js`)

4. **Start development server**
```bash
npm run dev
```

The application will open at `http://localhost:3000`

## 🔑 Login Credentials

**Demo Account:**
- Username: `admin`
- Password: `admin123`

## 🎯 Key Features Guide

### 1. Dashboard
- View total employees, departments, and active sagas
- Charts showing employee distribution by department
- Quick action cards for common tasks
- System health indicators

### 2. Employee Management

**List View:**
- Paginated table (10 employees per page)
- Search, view details, delete actions
- Department badges for quick filtering

**Create Employee:**
- Standard form for direct creation
- **Saga Option**: Checkbox to trigger Employee Onboarding Saga
  - Creates employee, payroll, sends email, grants access
  - Returns Saga ID for tracking
  
**Employee Details:**
- View comprehensive employee information
- Inline editing capability
- Audit trail (created/modified dates)

### 3. Employee Search (Elasticsearch)
- Full-text search across all employee fields
- Fuzzy matching and relevance scoring
- Instant results with highlighted matches
- Search tips and query suggestions

### 4. Saga Monitor
- Enter Saga ID to check status
- View step-by-step execution progress
- See compensation status if saga fails
- Retry failed sagas
- Visual indicators for each saga state:
  - 🟢 COMPLETED - All steps successful
  - 🔵 IN_PROGRESS - Currently executing
  - 🟠 COMPENSATING - Rolling back changes
  - 🔴 FAILED - Saga failed

### 5. WebSocket Notifications
- Real-time toast notifications
- Connection status indicator in header
- Auto-dismiss after 5 seconds
- Shows employee creation, updates, saga events

## 🎨 UI Components

### Custom Tailwind Classes
```css
.btn-primary     /* Primary action button */
.btn-secondary   /* Secondary action button */
.btn-danger      /* Delete/danger button */
.card            /* White container with shadow */
.input           /* Form input with focus styles */
.badge           /* Colored badge (success/warning/danger/info) */
```

### Color Palette
- **Primary**: Blue (`#3b82f6`)
- **Success**: Green (`#10b981`)
- **Warning**: Yellow (`#f59e0b`)
- **Danger**: Red (`#ef4444`)
- **Info**: Blue (`#3b82f6`)

## 🔧 Configuration

### API Proxy (vite.config.js)
```javascript
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
    }
  }
}
```

### WebSocket Connection
```javascript
// In NotificationContext.jsx
const socket = new SockJS('http://localhost:8081/ws')
```

## 📊 State Management

### Auth Context
- Manages JWT token in localStorage
- Auto-login on page refresh
- Axios interceptor for auth headers
- Logout clears token and redirects

### Notification Context
- WebSocket connection management
- Real-time notification queue
- Auto-dismiss timer
- Connection status tracking

## 🔐 Authentication Flow

1. User enters credentials on Login page
2. POST to `/api/auth/login`
3. Store JWT token in localStorage
4. Set Authorization header in Axios
5. Redirect to Dashboard
6. All subsequent requests include token
7. 401 response triggers logout

## 📡 API Integration

### Employee Service
```javascript
GET    /api/employees?page=0&size=10     // List with pagination
GET    /api/employees/{id}               // Get by ID
POST   /api/employees                    // Create
PUT    /api/employees/{id}               // Update
DELETE /api/employees/{id}               // Delete
GET    /api/employees/search?q=john      // Search
```

### Saga Service
```javascript
POST /api/sagas/employee-onboarding   // Start saga
GET  /api/sagas/{sagaId}               // Get status
POST /api/sagas/{sagaId}/retry         // Retry failed saga
```

## 🧪 Development

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

## 🎬 Demo Walkthrough

1. **Login** with admin/admin123
2. **Dashboard** - See employee statistics
3. **Create Employee** - Try with Saga checkbox enabled
4. **Check Saga Status** - Copy Saga ID and check in Sagas page
5. **Search** - Use Elasticsearch search for "engineer"
6. **View Employee** - Click any employee to see details
7. **Edit Employee** - Make changes and save
8. **Observe WebSocket** - Watch for real-time notifications

## 🌐 Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🐛 Troubleshooting

### CORS Errors
- Ensure backend has CORS enabled for `http://localhost:3000`
- Check API Gateway CORS configuration

### WebSocket Connection Failed
- Verify Employee Service is running on port 8081
- Check WebSocket endpoint configuration
- Ensure no firewall blocking WebSocket

### 401 Unauthorized
- Login again to refresh JWT token
- Check token expiration time
- Verify backend auth service

### Search Not Working
- Ensure Elasticsearch is running
- Check if employees are indexed
- Verify search endpoint `/api/employees/search`

## 📝 Interview Talking Points

When showcasing this frontend:

> "I built a modern React frontend using **Vite** for fast development and **Tailwind CSS** for responsive styling. The app features:
> 
> - **Real-time WebSocket** integration using STOMP protocol for live notifications
> - **Saga Pattern monitoring** to visualize distributed transactions with step-by-step progress
> - **Elasticsearch integration** for powerful full-text search with fuzzy matching
> - **Axios interceptors** for handling JWT authentication and 401 redirects
> - **Context API** for clean state management without Redux overhead
> - **Protected routes** with automatic redirect to login
> 
> The architecture demonstrates separation of concerns with dedicated service layers, reusable components, and a mobile-responsive design. The WebSocket connection maintains real-time sync with the backend, showing notifications for employee creation, updates, and saga status changes."

## 🤝 Contributing

This is a demo project for learning and interviews. Feel free to fork and extend!

## 📄 License

MIT

---

**Built with ❤️ for learning microservices architecture**
