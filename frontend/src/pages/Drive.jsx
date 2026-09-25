import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { CopyIcon, FolderIcon, FilesIcon, LoaderCircleIcon } from 'lucide-react'
import { useDrive } from '../hooks/useDrive'
import api from '../config/api'
import FolderCard from '../components/folders/FolderCard'
import FileGrid from '../components/files/FileGrid'
import BreadCrumbs from '../components/layout/BreadCrumbs'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

const Drive = () => {
  const { folderId } = useParams()
  const navigate = useNavigate()
  const {
    breadcrumbs,
    folders,
    files,
    isDriveLoading,
    searchQuery,
    sortBy,
    fetchDriveContent,
  } = useDrive(folderId || null)
  const [dialog, setDialog] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [moveFolders, setMoveFolders] = useState([])
  const [moveDestination, setMoveDestination] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const refresh = () => fetchDriveContent(folderId || null, searchQuery, sortBy)
  const getType = (item) => item.mime_type ? 'file' : 'folder'

  const openRename = (item) => {
    setRenameValue(item.name)
    setDialog({ type: 'rename', item })
  }

  const openMove = async (item) => {
    try {
      const { data } = await api.get('/api/folders')
      const type = getType(item)
      const options = (data.folders || []).filter((folder) => {
        if (type !== 'folder') return true
        return folder.id !== item.id && !(folder.path || []).includes(item.id)
      })
      setMoveFolders(options)
      setMoveDestination(type === 'folder' ? (item.parent_id || '') : (item.folder_id || ''))
      setDialog({ type: 'move', item })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load folders')
    }
  }

  const openShare = async (item) => {
    try {
      const { data } = await api.post('/api/shares', {
        resource_id: item.id,
        resource_type: getType(item),
      })
      const share = data.share || data.share_link
      const url = `${window.location.origin}/s/${share.token}`
      setDialog({ type: 'share', item, url })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create share link')
    }
  }

  const openPreview = async (file) => {
    try {
      const { data } = await api.get(`/api/files/${file.id}/preview`)
      setPreviewUrl(data.preview_url || data.url)
      setDialog({ type: 'preview', item: file })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Preview is unavailable')
    }
  }

  const confirmDelete = (item) => setDialog({ type: 'delete', item })

  const handleRename = async (event) => {
    event.preventDefault()
    const name = renameValue.trim()
    if (!name) return
    const { item } = dialog
    setIsSaving(true)
    try {
      const type = getType(item)
      await api.patch(`/api/${type === 'file' ? 'files' : 'folders'}/${item.id}/rename`, { name })
      toast.success(`${type === 'file' ? 'File' : 'Folder'} renamed`)
      setDialog(null)
      await refresh()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Rename failed')
    } finally {
      setIsSaving(false)
    }
  }

  const handleMove = async (event) => {
    event.preventDefault()
    const { item } = dialog
    const type = getType(item)
    setIsSaving(true)
    try {
      const path = type === 'file' ? 'files' : 'folders'
      const targetKey = type === 'file' ? 'target_folder' : 'target_parent'
      await api.patch(`/api/${path}/${item.id}/move`, { [targetKey]: moveDestination || null })
      toast.success(`${type === 'file' ? 'File' : 'Folder'} moved`)
      setDialog(null)
      await refresh()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Move failed')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    const { item } = dialog
    const type = getType(item)
    setIsSaving(true)
    try {
      await api.delete(`/api/${type === 'file' ? 'files' : 'folders'}/${item.id}`)
      toast.success('Moved to trash')
      setDialog(null)
      await refresh()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete item')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(dialog.url)
      toast.success('Link copied to clipboard')
    } catch {
      const input = document.getElementById('share-link')
      input?.select()
      document.execCommand('copy')
      toast.success('Link copied to clipboard')
    }
  }

  const handleFolderOpen = (folder) => navigate(`/drive/${folder.id}`)
  const handleBreadcrumb = (item) => navigate(item.id ? `/drive/${item.id}` : '/')
  const empty = !folders.length && !files.length

  return (
    <div className='mx-auto w-full max-w-[1500px]'>
      <div className='mb-2 flex min-h-7 items-center justify-between gap-3'>
        <BreadCrumbs items={breadcrumbs} onNavigate={handleBreadcrumb} />
        {searchQuery && <span className='shrink-0 text-xs text-slate-500'>Search: “{searchQuery}”</span>}
      </div>

      {isDriveLoading ? (
        <div className='flex min-h-56 items-center justify-center gap-2 text-sm text-slate-500'>
          <LoaderCircleIcon size={18} className='animate-spin text-orange-600' />
          Loading your drive...
        </div>
      ) : empty ? (
        <div className='rounded-xl border border-slate-200 bg-white'>
          <EmptyState
            icon={searchQuery ? FilesIcon : FolderIcon}
            title={searchQuery ? 'No matching items' : 'This folder is empty'}
            description={searchQuery ? 'Try a different name or clear the search.' : 'Create a folder or upload files to get started.'}
          />
        </div>
      ) : (
        <div className='space-y-4'>
          {folders.length > 0 && (
            <section aria-labelledby='folders-heading'>
              <h2 id='folders-heading' className='mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500'>Folders</h2>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,176px))]'>
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onOpen={handleFolderOpen}
                    onShare={openShare}
                    onRename={openRename}
                    onMove={openMove}
                    onDelete={confirmDelete}
                  />
                ))}
              </div>
            </section>
          )}

          {files.length > 0 && (
            <section aria-labelledby='files-heading'>
              <h2 id='files-heading' className='mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500'>Files</h2>
              <FileGrid
                files={files}
                onPreview={openPreview}
                onShare={openShare}
                onRename={openRename}
                onMove={openMove}
                onDelete={confirmDelete}
              />
            </section>
          )}
        </div>
      )}

      <Modal isOpen={dialog?.type === 'rename'} onClose={() => setDialog(null)} title={`Rename ${dialog ? getType(dialog.item) : 'item'}`}>
        <form onSubmit={handleRename}>
          <Input label='Name' autoFocus required value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
          <div className='mt-6 flex justify-end gap-2'>
            <Button variant='ghost' onClick={() => setDialog(null)} disabled={isSaving}>Cancel</Button>
            <Button type='submit' isLoading={isSaving}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={dialog?.type === 'move'} onClose={() => setDialog(null)} title='Move to'>
        <form onSubmit={handleMove}>
          <label className='block text-xs font-medium text-slate-700'>Destination folder</label>
          <select
            value={moveDestination}
            onChange={(event) => setMoveDestination(event.target.value)}
            className='mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500'
          >
            <option value=''>My Drive</option>
            {moveFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
          <div className='mt-6 flex justify-end gap-2'>
            <Button variant='ghost' onClick={() => setDialog(null)} disabled={isSaving}>Cancel</Button>
            <Button type='submit' isLoading={isSaving}>Move</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={dialog?.type === 'share'} onClose={() => setDialog(null)} title='Share link'>
        <p className='mb-4 text-sm text-slate-600'>Anyone with this link can access <span className='font-medium text-slate-800'>{dialog?.item?.name}</span>.</p>
        <div className='flex gap-2'>
          <input id='share-link' readOnly value={dialog?.url || ''} className='min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 outline-none' />
          <Button icon={CopyIcon} onClick={handleCopyLink}>Copy</Button>
        </div>
      </Modal>

      <Modal isOpen={dialog?.type === 'preview'} onClose={() => setDialog(null)} title={dialog?.item?.name || 'Preview'} maxWidth='max-w-5xl'>
        <div className='flex min-h-64 items-center justify-center overflow-hidden rounded-lg bg-slate-100'>
          {dialog?.item?.mime_type?.startsWith('image/') ? (
            <img src={previewUrl} alt={dialog.item.name} className='max-h-[70vh] max-w-full object-contain' />
          ) : dialog?.item?.mime_type?.startsWith('video/') ? (
            <video src={previewUrl} controls className='max-h-[70vh] max-w-full' />
          ) : dialog?.item?.mime_type?.startsWith('audio/') ? (
            <audio src={previewUrl} controls className='w-full max-w-lg' />
          ) : (
            <iframe title={`Preview ${dialog?.item?.name || 'file'}`} src={previewUrl} className='h-[65vh] w-full border-0 bg-white' />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={dialog?.type === 'delete'}
        onClose={() => setDialog(null)}
        onConfirm={handleDelete}
        title='Move to trash?'
        message={`“${dialog?.item?.name || ''}” will be moved to Trash.`}
        confirmText='Move to trash'
        isLoading={isSaving}
      />
    </div>
  )
}

export default Drive
