import { useCallback, useEffect, useState } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { CopyIcon, ExternalLinkIcon, FileIcon, FolderIcon, Link2Icon, LoaderCircleIcon, Trash2Icon, UsersIcon } from 'lucide-react'
import api from '../config/api'
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
      <div className='mb-5 flex items-center gap-3'>
        <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600'>
          <UsersIcon size={19} strokeWidth={1.8} />
        </span>
        <div>
          <h1 className='text-lg font-semibold leading-5 text-slate-800'>Shared Links</h1>
          <p className='mt-1 text-xs text-slate-500'>Share links you have created</p>
        </div>
      </div>
      {isLoading ? (
        <div className='flex min-h-48 items-center justify-center gap-2 text-sm text-slate-500'><LoaderCircleIcon size={18} className='animate-spin text-orange-600' />Loading shared files...</div>
      ) : shares.length === 0 ? (
        <div className='rounded-xl border border-slate-200 bg-white'><EmptyState icon={Link2Icon} title='No shared links yet' description='Create a share link from the actions menu on any file or folder.' /></div>
      ) : (
        <div className='grid grid-cols-1 gap-3 xl:grid-cols-2'>
          {shares.map((share) => {
            const resource = share.resource || {}
            const isFolder = share.resource_type === 'folder'
            const Icon = isFolder ? FolderIcon : FileIcon
            const resourceName = resource.name || (isFolder ? 'Shared folder' : 'Shared file')
            const shareUrl = `/s/${share.token}`
            const createdDate = share.created_at ? format(new Date(share.created_at), 'MMM d, yyyy') : '—'

            return (
              <article key={share.id} className='min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 sm:px-4'>
                <div className='flex min-w-0 items-center gap-2.5'>
                  <Icon size={21} strokeWidth={1.8} className={isFolder ? 'shrink-0 text-amber-600' : 'shrink-0 text-rose-600'} />
                  <h2 className='min-w-0 flex-1 truncate text-sm font-semibold text-slate-800'>{resourceName}</h2>
                  <button
                    type='button'
                    aria-label={`Revoke link for ${resourceName}`}
                    title='Revoke link'
                    onClick={() => setRevokeTarget(share)}
                    className='flex size-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600'
                  >
                    <Trash2Icon size={15} />
                  </button>
                </div>

                <dl className='mt-3 space-y-1 text-xs leading-4 text-slate-500'>
                  <div className='flex gap-1'><dt>Access:</dt><dd className='text-slate-700'>Anyone with link</dd></div>
                  <div className='flex gap-1'><dt>Views:</dt><dd className='text-slate-700'>{Number(share.access_count ?? share.views ?? 0)}</dd></div>
                  <div className='flex gap-1'><dt>Created:</dt><dd className='text-slate-700'>{createdDate}</dd></div>
                </dl>

                <div className='mt-3 flex items-center justify-between border-t border-slate-100 pt-2'>
                  <button
                    type='button'
                    onClick={() => copyLink(share)}
                    className='inline-flex min-h-7 items-center gap-1.5 rounded-md px-1 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-50'
                  >
                    <CopyIcon size={14} />
                    Copy Link
                  </button>
                  <a
                    href={shareUrl}
                    target='_blank'
                    rel='noreferrer'
                    aria-label={`Open shared link for ${resourceName}`}
                    title='Open shared link'
                    className='flex size-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700'
                  >
                    <ExternalLinkIcon size={14} />
                  </a>
                </div>
              </article>
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
