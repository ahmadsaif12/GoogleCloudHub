import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { ArchiveRestoreIcon, FileIcon, FolderIcon, LoaderCircleIcon, Trash2Icon } from 'lucide-react'
import api from '../config/api'
import { formatBytes } from '../assets/assets'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

const Trash = () => {
  const [files, setFiles] = useState([])
  const [folders, setFolders] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionTarget, setActionTarget] = useState(null)
  const [isWorking, setIsWorking] = useState(false)

  const loadTrash = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/api/trash')
      setFiles(data.files || [])
      setFolders(data.folders || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load Trash')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadTrash() }, [loadTrash])

  const restore = async (item, type) => {
    try {
      await api.post(`/api/${type}/${item.id}/restore`)
      toast.success('Item restored')
      await loadTrash()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not restore item')
    }
  }

  const confirmAction = async () => {
    if (!actionTarget) return
    setIsWorking(true)
    try {
      if (actionTarget.type === 'empty') {
        await api.delete('/api/trash/empty')
        toast.success('Trash emptied')
      } else {
        await api.delete(`/api/${actionTarget.type}/${actionTarget.item.id}/permanent`)
        toast.success('Item permanently deleted')
      }
      setActionTarget(null)
      await loadTrash()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not delete item')
    } finally {
      setIsWorking(false)
    }
  }

  const items = [
    ...folders.map((item) => ({ item, type: 'folders' })),
    ...files.map((item) => ({ item, type: 'files' })),
  ]

  return (
    <div className='mx-auto w-full max-w-[1500px]'>
      <div className='mb-5 flex items-end justify-between gap-3'>
        <div>
          <h1 className='text-lg font-semibold text-slate-800'>Trash</h1>
          <p className='mt-1 text-sm text-slate-500'>Deleted items stay here until you restore or remove them permanently.</p>
        </div>
        {items.length > 0 && <Button size='sm' variant='secondary' icon={Trash2Icon} onClick={() => setActionTarget({ type: 'empty' })}>Empty trash</Button>}
      </div>
      {isLoading ? (
        <div className='flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500'><LoaderCircleIcon size={18} className='animate-spin text-orange-600' />Loading Trash...</div>
      ) : items.length === 0 ? (
        <div className='rounded-xl border border-slate-200 bg-white'><EmptyState icon={Trash2Icon} title='Trash is empty' description='Items you delete will appear here.' /></div>
      ) : (
        <div className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
          {items.map(({ item, type }) => {
            const isFolder = type === 'folders'
            const Icon = isFolder ? FolderIcon : FileIcon
            return (
              <div key={`${type}-${item.id}`} className='flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0'>
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${isFolder ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-500'}`}><Icon size={16} /></span>
                <div className='min-w-0 flex-1'>
                  <p className='truncate text-sm font-medium text-slate-800'>{item.name}</p>
                  <p className='text-xs text-slate-500'>
                    {isFolder ? 'Folder' : formatBytes(item.size)}{item.trashed_at ? ` · Deleted ${format(new Date(item.trashed_at), 'MMM d, yyyy')}` : ''}
                  </p>
                </div>
                <div className='flex shrink-0 items-center gap-1.5'>
                  <Button size='sm' variant='ghost' icon={ArchiveRestoreIcon} onClick={() => restore(item, type)}>Restore</Button>
                  <button type='button' aria-label={`Delete ${item.name} permanently`} onClick={() => setActionTarget({ type, item })} className='rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600'><Trash2Icon size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ConfirmDialog
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        onConfirm={confirmAction}
        title={actionTarget?.type === 'empty' ? 'Empty Trash?' : 'Delete permanently?'}
        message={actionTarget?.type === 'empty' ? 'All items in Trash will be permanently deleted.' : `“${actionTarget?.item?.name || ''}” will be permanently deleted.`}
        confirmText={actionTarget?.type === 'empty' ? 'Empty trash' : 'Delete permanently'}
        isLoading={isWorking}
      />
    </div>
  )
}

export default Trash
