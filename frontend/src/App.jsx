import { Toaster } from 'react-hot-toast'
import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Drive from './pages/Drive'
import SharedFile from './pages/SharedFile'
import SharedWithMe from './pages/SharedWithMe'
import Trash from './pages/Trash'
import ProtectedRoute from './components/auth/ProtectedRoute'
import DashboardLayout from './components/layout/DashboardLayout'

const App = () => (
  <>
    <Toaster />

    <Routes>
      {/* Authentication pages */}
      <Route path='/login' element={<Login mode='login' />} />
      <Route path='/register' element={<Login mode='register' />} />

      {/* Shared links are accessible without signing in. */}
      <Route path='/s/:token' element={<SharedFile />} />

      {/* Drive pages require authentication and share the dashboard layout. */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Drive />} />
          <Route path='drive/:folderId' element={<Drive />} />
          <Route path='shared' element={<SharedWithMe />} />
          <Route path='trash' element={<Trash />} />
        </Route>
      </Route>

      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  </>
)

export default App
