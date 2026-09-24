import { useApp } from '../../context/AppContext'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '../ui/Spinner'

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useApp()
  const location = useLocation()

  // Show loading screen while checking the user's authentication status
  if (isLoading) {
    return (
      <div className='min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-3'>
        <Spinner size='lg' className='text-orange-600' />
        <p className='text-sm text-slate-500 font-medium'>
          Loading Drivea...
        </p>
      </div>
    )
  }

  // Redirect unauthenticated users to the login page
  if (!isAuthenticated) {
    return (
      <Navigate
        to='/login'
        state={{ from: location }}
        replace
      />
    )
  }

  // Render children if provided, otherwise render nested routes using Outlet
  return children ? <>{children}</> : <Outlet />
}

export default ProtectedRoute