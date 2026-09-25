import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../config/api.js'

const AppContext = createContext()
const ROOT_BREADCRUMB = [{ id: null, name: 'My Drive' }]

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Global upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Drive view state
  const [currentFolderID, setCurrentFolderID] = useState(null)
  const [breadcrumbs, setBreadcrumbs] = useState(ROOT_BREADCRUMB)
  const [folders, setFolders] = useState([])
  const [files, setFiles] = useState([])
  const [isDriveLoading, setIsDriveLoading] = useState(false)

  // Filters and sorting state
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('name_asc')

  // Refresh user profile and storage status
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me')
      setUser(data.user)
      return data.user
    } catch (error) {
      setUser(null)
      return null
    }
  }, [])

  // Check authentication status when the application loads
  useEffect(() => {
    refreshUser().finally(() => setIsLoading(false))
  }, [refreshUser])

  // Handle login and registration requests
  const authAction = async (requestFn, successMsg, errorFallback) => {
    try {
      const { data } = await requestFn()

      setUser(data.user)

      if (successMsg) {
        toast.success(successMsg)
      }

      return true
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        errorFallback ||
        'Something went wrong'
      )
      return false
    }
  }

  // Login user
  const login = (email, password) => {
    return authAction(
      () => api.post('/api/auth/login', { email, password }),
      'Welcome back!',
      'Login failed'
    )
  }

  // Register new user
  const register = (name, email, password) => {
    return authAction(
      () => api.post('/api/auth/register', { name, email, password }),
      'Account created successfully!',
      'Registration failed'
    )
  }

  // Logout current user
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

  // Fetch folders, files and breadcrumb information
  const fetchDriveContent = useCallback(
    async (
      folderId = currentFolderID,
      search = searchQuery,
      sort = sortBy
    ) => {
      if (!user) return

      setIsDriveLoading(true)

      try {
        const parentParam = folderId || 'null'

        const [folderRes, fileRes, detailRes] = await Promise.all([
          api.get('/api/folders', {
            params: {
              parent_id: parentParam,
            },
          }),

          api.get('/api/files', {
            params: {
              folder_id: parentParam,
              search,
              sort,
            },
          }),

          folderId
            ? api.get(`/api/folders/${folderId}`)
            : null,
        ])

        const matchingFolders = search
          ? folderRes.data.folders.filter((folder) =>
              folder.name.toLowerCase().includes(search.toLowerCase())
            )
          : folderRes.data.folders

        setFolders(matchingFolders)
        setFiles(fileRes.data.files)

        const currentFolder = detailRes?.data?.folder
        setBreadcrumbs(
          currentFolder
            ? [
                ...ROOT_BREADCRUMB,
                ...(detailRes.data.breadcrumbs || []),
                { id: currentFolder.id, name: currentFolder.name },
              ]
            : ROOT_BREADCRUMB
        )
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
          'Failed to load drive content'
        )
      } finally {
        setIsDriveLoading(false)
      }
    },
    [user, currentFolderID, searchQuery, sortBy]
  )

  const value = {
    user,
    setUser,
    login,
    logout,
    register,
    refreshUser,
    isLoading,
    isAuthenticated: !!user,
    isUploading,
    setIsUploading,
    uploadProgress,
    setUploadProgress,
    currentFolderID,
    setCurrentFolderID,
    breadcrumbs,
    setBreadcrumbs,
    folders,
    setFolders,
    files,
    setFiles,
    isDriveLoading,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    fetchDriveContent,
  }

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)