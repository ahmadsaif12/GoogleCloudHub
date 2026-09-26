import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import {
  ArchiveRestoreIcon,
  FileIcon,
  FolderIcon,
  LoaderCircleIcon,
  Trash2Icon,
} from 'lucide-react'

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
      toast.error(
        error.response?.data?.message || 'Could not load Trash'
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrash()
  }, [loadTrash])

  const restore = async (item, type) => {
    try {
      await api.post(`/api/${type}/${item.id}/restore`)
      toast.success('Item restored')
      await loadTrash()
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Could not restore item'
      )
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
        await api.delete(
          `/api/${actionTarget.type}/${actionTarget.item.id}/permanent`
        )
        toast.success('Item permanently deleted')
      }

      setActionTarget(null)
      await loadTrash()
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Could not delete item'
      )
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
      {/* Header */}
      <div className='mb-6 flex items-center justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2'>
            <span className='flex size-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600'>
              <Trash2Icon size={18} />
            </span>

            <h1 className='text-xl font-semibold text-slate-800'>
              Trash
            </h1>
          </div>

          <p className='mt-1.5 text-sm text-slate-500'>
            Deleted items stay here until you restore or remove them permanently.
          </p>
        </div>

        {items.length > 0 && (
          <Button
            size='sm'
            variant='secondary'
            icon={Trash2Icon}
            onClick={() => setActionTarget({ type: 'empty' })}
          >
            Empty trash
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className='flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500'>
          <LoaderCircleIcon
            size={18}
            className='animate-spin text-orange-600'
          />
          Loading Trash...
        </div>
      ) : items.length === 0 ? (
        <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
          <EmptyState
            icon={Trash2Icon}
            title='Trash is empty'
            description='Items you delete will appear here.'
          />
        </div>
      ) : (
        <div className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
          {/* Table Header */}
          <div className='hidden border-b border-slate-200 bg-slate-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 sm:flex sm:items-center'>
            <div className='flex-1'>Name</div>
            <div className='w-36'>Deleted</div>
            <div className='w-44 text-right'>Actions</div>
          </div>

          {items.map(({ item, type }) => {
            const isFolder = type === 'folders'
            const Icon = isFolder ? FolderIcon : FileIcon

            return (
              <div
                key={`${type}-${item.id}`}
                className='group flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-4 transition-colors last:border-b-0 hover:bg-orange-50/30 sm:flex-nowrap sm:px-5'
              >
                {/* Icon */}
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                    isFolder
                      ? 'bg-orange-50 text-orange-600 group-hover:bg-orange-100'
                      : 'bg-slate-50 text-slate-500 group-hover:bg-slate-100'
                  }`}
                >
                  <Icon size={19} />
                </span>

                {/* Name + info */}
                <div className='min-w-0 flex-1'>
                  <p
                    className='truncate text-sm font-semibold text-slate-800'
                    title={item.name}
                  >
                    {item.name}
                  </p>

                  <p className='mt-1 text-xs text-slate-500'>
                    <span className='font-medium text-slate-600'>
                      {isFolder ? 'Folder' : formatBytes(item.size)}
                    </span>

                    <span className='mx-1.5 text-slate-300'>•</span>

                    <span className='text-red-400'>
                      Deleted
                    </span>
                  </p>
                </div>

                {/* Deleted Date */}
                <div className='hidden w-36 text-xs text-slate-500 sm:block'>
                  {item.trashed_at
                    ? format(new Date(item.trashed_at), 'MMM d, yyyy')
                    : '—'}
                </div>

                {/* Actions */}
                <div className='flex w-full shrink-0 items-center justify-end gap-1.5 sm:w-44'>
                  <Button
                    size='sm'
                    variant='ghost'
                    icon={ArchiveRestoreIcon}
                    onClick={() => restore(item, type)}
                    className='hover:bg-green-50 hover:text-green-600'
                  >
                    Restore
                  </Button>

                  <button
                    type='button'
                    aria-label={`Delete ${item.name} permanently`}
                    onClick={() =>
                      setActionTarget({ type, item })
                    }
                    className='rounded-lg border border-transparent p-2 text-slate-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-600'
                  >
                    <Trash2Icon size={16} />
                  </button>
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
        title={
          actionTarget?.type === 'empty'
            ? 'Empty Trash?'
            : 'Delete permanently?'
        }
        message={
          actionTarget?.type === 'empty'
            ? 'All items in Trash will be permanently deleted.'
            : `“${actionTarget?.item?.name || ''}” will be permanently deleted.`
        }
        confirmText={
          actionTarget?.type === 'empty'
            ? 'Empty trash'
            : 'Delete permanently'
        }
        isLoading={isWorking}
      />
    </div>
  )
}

export default Trash
