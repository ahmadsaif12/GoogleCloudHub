import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { CopyIcon, FileIcon, FolderIcon, Link2Icon, LoaderCircleIcon, Trash2Icon } from 'lucide-react'
import api from '../config/api'
import { formatBytes } from '../assets/assets'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

const SharedWithMe = () => {
  const [shares, setShares] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [revokeTarget, setRevokeTarget] = useState(null)
  const [isRevoking, setIsRevoking] = useState(false)

  const loadShares = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/api/shares')
      setShares(data.share_links || data.shares || [])
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load shared files')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadShares() }, [loadShares])

  const copyLink = async (share) => {
    const url = `${window.location.origin}/s/${share.token}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement('textarea')
      input.value = url
      input.style.position = 'fixed'
      input.style.opacity = '0'
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      input.remove()
    }
    toast.success('Link copied to clipboard')
  }

  const revoke = async () => {
    if (!revokeTarget) return
    setIsRevoking(true)
    try {
      await api.delete(`/api/shares/${revokeTarget.id}`)
      toast.success('Share link revoked')
      setRevokeTarget(null)
      await loadShares()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not revoke link')
    } finally {
      setIsRevoking(false)
    }
  }

  return (
    <div className='mx-auto w-full max-w-[1500px]'>
      <div className='mb-5'>
        <h1 className='text-lg font-semibold text-slate-800'>Shared Files</h1>
        <p className='mt-1 text-sm text-slate-500'>Manage links you’ve shared.</p>
      </div>
      {isLoading ? (
        <div className='flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500'><LoaderCircleIcon size={18} className='animate-spin text-orange-600' />Loading shared files...</div>
      ) : shares.length === 0 ? (
        <div className='rounded-xl border border-slate-200 bg-white'><EmptyState icon={Link2Icon} title='No shared links yet' description='Create a share link from the actions menu on any file or folder.' /></div>
      ) : (
        <div className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
          <div className='hidden grid-cols-[minmax(0,1.5fr)_120px_150px_auto] items-center gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:grid'>
            <span>Item</span><span>Type</span><span>Created</span><span>Actions</span>
          </div>
          {shares.map((share) => {
            const resource = share.resource || {}
            const isFolder = share.resource_type === 'folder'
            const Icon = isFolder ? FolderIcon : FileIcon
            return (
              <div key={share.id} className='grid grid-cols-1 items-center gap-3 border-b border-slate-100 px-4 py-3 text-center last:border-b-0 sm:grid-cols-[minmax(0,1.5fr)_120px_150px_auto] sm:items-center sm:gap-4'>
                <div className='flex min-w-0 items-center justify-center gap-3 text-center sm:justify-start sm:text-left'>
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${isFolder ? 'bg-orange-50 text-orange-600' : 'bg-slate-50 text-slate-500'}`}><Icon size={16} /></span>
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-medium text-slate-800'>{resource.name || (isFolder ? 'Shared folder' : 'Shared file')}</p>
                    <p className='text-xs text-slate-500'>{!isFolder && resource.size ? formatBytes(resource.size) : 'Share link'}</p>
                  </div>
                </div>
                <span className='text-xs text-slate-500'>{isFolder ? 'Folder' : 'File'}</span>
                <span className='text-xs text-slate-500'>{share.created_at ? format(new Date(share.created_at), 'MMM d, yyyy') : '—'}</span>
                <div className='flex items-center justify-center gap-2 sm:justify-end'>
                  <Button size='sm' variant='secondary' icon={CopyIcon} onClick={() => copyLink(share)}>Copy link</Button>
                  <button type='button' aria-label={`Revoke link for ${resource.name || 'item'}`} onClick={() => setRevokeTarget(share)} className='rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600'><Trash2Icon size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <ConfirmDialog
        isOpen={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        onConfirm={revoke}
        title='Revoke share link?'
        message={`People with this link will no longer be able to access “${revokeTarget?.resource?.name || 'this item'}”.`}
        confirmText='Revoke link'
        isLoading={isRevoking}
      />
    </div>
  )
}

export default SharedWithMe
