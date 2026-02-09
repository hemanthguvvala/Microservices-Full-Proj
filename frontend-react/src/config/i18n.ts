// i18next configuration for multi-language support
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

// Translation resources (can be loaded from backend)
const resources = {
  en: {
    translation: {
      // Common
      common: {
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        create: 'Create',
        search: 'Search',
        filter: 'Filter',
        export: 'Export',
        import: 'Import',
        refresh: 'Refresh',
        close: 'Close',
        back: 'Back',
        next: 'Next',
        previous: 'Previous',
        submit: 'Submit',
        confirm: 'Confirm',
        yes: 'Yes',
        no: 'No',
      },
      
      // Navigation
      nav: {
        dashboard: 'Dashboard',
        employees: 'Employees',
        sagas: 'Sagas',
        search: 'Search',
        settings: 'Settings',
        logout: 'Logout',
      },
      
      // Auth
      auth: {
        login: 'Sign In',
        username: 'Username',
        password: 'Password',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot password?',
        loginSuccess: 'Login successful',
        loginError: 'Invalid credentials',
        logoutSuccess: 'Logged out successfully',
      },
      
      // Employee
      employee: {
        title: 'Employees',
        create: 'Create Employee',
        edit: 'Edit Employee',
        delete: 'Delete Employee',
        deleteConfirm: 'Are you sure you want to delete this employee?',
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        phone: 'Phone Number',
        department: 'Department',
        position: 'Position',
        salary: 'Salary',
        hireDate: 'Hire Date',
        status: 'Status',
        actions: 'Actions',
        noEmployees: 'No employees found',
        createSuccess: 'Employee created successfully',
        updateSuccess: 'Employee updated successfully',
        deleteSuccess: 'Employee deleted successfully',
      },
      
      // Dashboard
      dashboard: {
        title: 'Dashboard',
        totalEmployees: 'Total Employees',
        newThisMonth: 'New This Month',
        activeSagas: 'Active Sagas',
        departments: 'Departments',
        quickActions: 'Quick Actions',
        recentActivity: 'Recent Activity',
      },
      
      // Saga
      saga: {
        title: 'Saga Monitor',
        status: 'Status',
        startOnboarding: 'Start Onboarding',
        retryFailed: 'Retry Failed',
        viewDetails: 'View Details',
        completed: 'Completed',
        failed: 'Failed',
        inProgress: 'In Progress',
        compensating: 'Compensating',
      },
      
      // Errors
      errors: {
        genericError: 'An error occurred. Please try again.',
        networkError: 'Network error. Please check your connection.',
        notFound: 'Page not found',
        unauthorized: 'Unauthorized access',
        forbidden: 'Access forbidden',
        serverError: 'Server error. Please try again later.',
        validationError: 'Please check your input',
      },
    },
  },
  
  es: {
    translation: {
      common: {
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        save: 'Guardar',
        cancel: 'Cancelar',
        delete: 'Eliminar',
        edit: 'Editar',
        create: 'Crear',
        search: 'Buscar',
        export: 'Exportar',
        import: 'Importar',
      },
      nav: {
        dashboard: 'Tablero',
        employees: 'Empleados',
        sagas: 'Sagas',
        search: 'Buscar',
        settings: 'Configuración',
        logout: 'Cerrar sesión',
      },
      auth: {
        login: 'Iniciar sesión',
        username: 'Usuario',
        password: 'Contraseña',
        loginSuccess: 'Inicio de sesión exitoso',
        loginError: 'Credenciales inválidas',
      },
      employee: {
        title: 'Empleados',
        create: 'Crear Empleado',
        firstName: 'Nombre',
        lastName: 'Apellido',
        email: 'Correo',
        department: 'Departamento',
        position: 'Posición',
        salary: 'Salario',
      },
    },
  },
  
  fr: {
    translation: {
      common: {
        loading: 'Chargement...',
        error: 'Erreur',
        success: 'Succès',
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
      },
      nav: {
        dashboard: 'Tableau de bord',
        employees: 'Employés',
        sagas: 'Sagas',
        search: 'Rechercher',
        logout: 'Déconnexion',
      },
    },
  },
}

i18n
  // Load translations from backend (optional)
  .use(Backend)
  
  // Detect user language
  .use(LanguageDetector)
  
  // Pass i18n instance to react-i18next
  .use(initReactI18next)
  
  // Initialize i18next
  .init({
    resources,
    
    // Default language
    fallbackLng: 'en',
    
    // Allowed languages
    supportedLngs: ['en', 'es', 'fr'],
    
    // Debug mode (only in development)
    debug: import.meta.env.DEV,
    
    // Namespace
    defaultNS: 'translation',
    
    // Interpolation options
    interpolation: {
      escapeValue: false, // React already escapes
    },
    
    // Detection options
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    
    // Backend options (if loading from API)
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
  })

export default i18n
