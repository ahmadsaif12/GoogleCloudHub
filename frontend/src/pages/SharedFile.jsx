import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { DownloadIcon, FileIcon, FolderIcon, LoaderCircleIcon, ShieldCheckIcon } from 'lucide-react'
import api from '../config/api'
import { formatBytes, getFileIcon } from '../assets/assets'
import { Button } from '../components/ui/Button'

const SharedFile = () => {
  const { token } = useParams()
  const [shared, setShared] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewFile, setPreviewFile] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    const loadShare = async () => {
      setIsLoading(true)
      try {
        const { data } = await api.get(`/api/shares/access/${token}`)
        if (!active) return
        setShared(data)
        setPreviewUrl(data.preview_url || '')
        setPreviewFile(data.file || null)
      } catch (error) {
        if (active) toast.error(error.response?.data?.message || 'This share link is unavailable')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadShare()
    return () => { active = false }
  }, [token])

  const previewFolderFile = async (file) => {
    try {
      const { data } = await api.get(`/api/files/${file.id}/preview`)
      setPreviewFile(file)
      setPreviewUrl(data.preview_url || data.url)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Preview is unavailable')
    }
  }

  const file = previewFile || shared?.file
  const isFolder = shared?.resource_type === 'folder'
  const resourceName = isFolder ? shared?.folder?.name : file?.name

  return (
    <main className='min-h-screen bg-slate-50 px-4 py-8 sm:px-6'>
      <div className='mx-auto max-w-5xl'>
        <header className='mb-6 flex items-center gap-2'>
          <span className='flex size-8 items-center justify-center rounded-lg bg-orange-600 text-white' aria-hidden='true'>
            <svg viewBox='0 0 32 32' className='size-5' fill='currentColor'><path d='M12.2 3 1.5 24.5h11L23.2 3H12.2Z' /><path d='m17.5 16.5 7.1 14h7.9L25 16.5h-7.5Z' /></svg>
          </span>
          <span className='text-sm font-semibold tracking-wide text-slate-800'>DRIVEA</span>
          <span className='text-sm text-slate-400'>/</span>
          <span className='text-sm text-slate-500'>Shared item</span>
        </header>

        {isLoading ? (
          <div className='flex min-h-64 items-center justify-center gap-2 text-sm text-slate-500'><LoaderCircleIcon size={18} className='animate-spin text-orange-600' />Opening shared item...</div>
        ) : shared ? (
          <div className='overflow-hidden rounded-xl border border-slate-200 bg-white'>
            <div className='flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-5 py-4'>
              <div className='flex min-w-0 items-center gap-3'>
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${isFolder ? 'bg-orange-50 text-orange-600' : 'bg-slate-50'}`}>
                  {isFolder ? <FolderIcon size={18} /> : file ? getFileIcon(file.mime_type, 'size-5') : <FileIcon size={18} />}
                </span>
                <div className='min-w-0'>
                  <h1 className='truncate text-base font-semibold text-slate-800'>{resourceName || 'Shared item'}</h1>
                  <p className='mt-0.5 text-xs text-slate-500'>
                    {isFolder ? 'Shared folder' : `${formatBytes(file?.size)}${file?.created_at ? ` · Added ${format(new Date(file.created_at), 'MMM d, yyyy')}` : ''}`}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2 text-xs text-slate-500'>
                <ShieldCheckIcon size={15} className='text-emerald-600' />
                {shared.permission === 'view' ? 'View access' : 'Download access'}
              </div>
            </div>

            {isFolder ? (
              <div className='grid gap-5 p-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.4fr)]'>
                <section>
                  <h2 className='mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500'>Files in this folder</h2>
                  <div className='divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200'>
                    {(shared.files || []).length ? shared.files.map((folderFile) => (
                      <button key={folderFile.id} type='button' onClick={() => previewFolderFile(folderFile)} className='flex w-full items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50'>
                        <span>{getFileIcon(folderFile.mime_type, 'size-4')}</span>
                        <span className='min-w-0 flex-1 truncate text-sm text-slate-700'>{folderFile.name}</span>
                        <span className='shrink-0 text-[11px] text-slate-500'>{formatBytes(folderFile.size)}</span>
                      </button>
                    )) : <p className='px-3 py-5 text-sm text-slate-500'>This folder has no files.</p>}
                  </div>
                </section>
                <SharedPreview file={previewFile} previewUrl={previewUrl} />
              </div>
            ) : (
              <div className='p-5'>
                <SharedPreview file={file} previewUrl={previewUrl} />
                {previewUrl && shared.permission !== 'view' && (
                  <div className='mt-4 flex justify-end'>
                    <Button icon={DownloadIcon} onClick={() => window.open(previewUrl, '_blank', 'noopener,noreferrer')}>Open file</Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className='rounded-xl border border-slate-200 bg-white px-6 py-12 text-center'>
            <h1 className='text-lg font-semibold text-slate-800'>Link unavailable</h1>
            <p className='mt-2 text-sm text-slate-500'>This link may have been revoked or expired.</p>
          </div>
        )}
      </div>
    </main>
  )
}

const SharedPreview = ({ file, previewUrl }) => {
  if (!file || !previewUrl) {
    return <div className='flex min-h-64 items-center justify-center rounded-lg bg-slate-50 text-sm text-slate-500'>Select a file to preview it.</div>
  }
  const mimeType = file.mime_type || ''
  return (
    <div className='flex min-h-64 items-center justify-center overflow-hidden rounded-lg bg-slate-100'>
      {mimeType.startsWith('image/') ? <img src={previewUrl} alt={file.name} className='max-h-[68vh] max-w-full object-contain' />
        : mimeType.startsWith('video/') ? <video src={previewUrl} controls className='max-h-[68vh] max-w-full' />
          : mimeType.startsWith('audio/') ? <audio src={previewUrl} controls className='w-full max-w-lg' />
            : <iframe title={`Preview ${file.name}`} src={previewUrl} className='h-[65vh] w-full border-0 bg-white' />}
    </div>
  )
}

export default SharedFile
