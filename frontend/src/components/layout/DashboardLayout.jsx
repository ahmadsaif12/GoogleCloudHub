import { useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useApp } from '../../context/AppContext'
import api from '../../config/api'
import Sidebar from './Sidebar'
import Header from './Header'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

const DashboardLayout = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const fileInputRef = useRef(null)
  const location = useLocation()
  const navigate = useNavigate()
  const {
    currentFolderID,
    setCurrentFolderID,
    setIsUploading,
    setUploadProgress,
    fetchDriveContent,
    refreshUser,
    searchQuery,
    sortBy,
  } = useApp()

  const isDriveRoute = location.pathname === '/' || location.pathname.startsWith('/drive/')
  const openDriveIfNeeded = () => {
    if (!isDriveRoute) {
      setCurrentFolderID(null)
      navigate('/')
    }
  }

  const handleCreateFolder = async (event) => {
    event.preventDefault()
    const name = folderName.trim()
    if (!name) return
    setIsCreating(true)
    try {
      await api.post('/api/folders', { name, parent_id: currentFolderID || null })
      toast.success('Folder created')
      setFolderName('')
      setIsCreateOpen(false)
      await fetchDriveContent(currentFolderID, searchQuery, sortBy)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create folder')
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpload = async (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    if (!selectedFiles.length) return
    const formData = new FormData()
    selectedFiles.forEach((file) => formData.append('files', file))
    formData.append('folder_id', currentFolderID || 'null')

    setIsUploading(true)
    setUploadProgress(0)
    try {
      await api.post('/api/files/upload', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            setUploadProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
          }
        },
      })
      setUploadProgress(100)
      await Promise.all([
        fetchDriveContent(currentFolderID, searchQuery, sortBy),
        refreshUser(),
      ])
      toast.success(selectedFiles.length === 1 ? 'File uploaded' : `${selectedFiles.length} files uploaded`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Upload failed')
    } finally {
      setIsUploading(false)
      window.setTimeout(() => setUploadProgress(0), 500)
      event.target.value = ''
    }
  }

  const openCreate = () => {
    openDriveIfNeeded()
    setIsCreateOpen(true)
    setIsMobileOpen(false)
  }

  const openUpload = () => {
    openDriveIfNeeded()
    setIsMobileOpen(false)
    fileInputRef.current?.click()
  }

  return (
    <div className='min-h-screen bg-slate-50 text-slate-800'>
      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onCreateFolderClick={openCreate}
        onUploadClick={openUpload}
      />
      <div className='flex min-h-screen flex-col md:pl-56'>
        <Header onMobileMenuToggle={() => setIsMobileOpen(true)} />
        <main className='min-h-0 flex-1 p-4'>
          <Outlet />
        </main>
      </div>

      <input ref={fileInputRef} type='file' className='hidden' multiple onChange={handleUpload} />

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title='Create a folder'>
        <form onSubmit={handleCreateFolder}>
          <Input
            label='Folder name'
            autoFocus
            required
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder='Untitled folder'
          />
          <div className='mt-6 flex justify-end gap-2'>
            <Button variant='ghost' onClick={() => setIsCreateOpen(false)} disabled={isCreating}>Cancel</Button>
            <Button type='submit' isLoading={isCreating}>Create folder</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default DashboardLayout
