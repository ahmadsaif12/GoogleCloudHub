import { useEffect } from 'react'
import { useApp } from '../context/AppContext'

export const useDrive = (folderId = null) => {
  const {
    user,
    currentFolderID,
    setCurrentFolderID,
    breadcrumbs,
    folders,
    files,
    isDriveLoading,
    searchQuery,
    sortBy,
    fetchDriveContent,
  } = useApp()

  useEffect(() => {
    setCurrentFolderID(folderId || null)
  }, [folderId, setCurrentFolderID])

  useEffect(() => {
    if (!user) return undefined

    const timeout = window.setTimeout(() => {
      fetchDriveContent(folderId || null, searchQuery, sortBy)
    }, searchQuery ? 180 : 0)

    return () => window.clearTimeout(timeout)
  }, [user, folderId, searchQuery, sortBy, fetchDriveContent])

  return {
    currentFolderID,
    breadcrumbs,
    folders,
    files,
    isDriveLoading,
    searchQuery,
    sortBy,
    fetchDriveContent,
  }
}
