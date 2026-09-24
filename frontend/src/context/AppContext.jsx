import { createContext, useContext, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../config/api.js'

const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null)

  const authAction = async (requestFn, successMsg, errorFallback) => {
    try {
      const { data } = await requestFn()

      setUser(data.user)

      if (successMsg) {
        toast.success(successMsg)
      }

      return true
    } catch (error) {
      toast.error(error.response?.data?.message || errorFallback)
      return false
    }
  }

  const login = (email, password) => {
    return authAction(
      () => api.post('/api/auth/login', { email, password }),
      'Welcome back!',
      'Login failed'
    )
  }

  const register = (name, email, password) => {
    return authAction(
      () => api.post('/api/auth/register', { name, email, password }),
      'Account created successfully!',
      'Registration failed'
    )
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout')
      setUser(null)
      toast.success('Logged out successfully')
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Logout failed'
      )
    }
  }

  const value = {
    user,
    setUser,
    login,
    logout,
    register,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)